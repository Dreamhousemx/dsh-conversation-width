// Validate the live profile patch with the HOST'S OWN YAML parser, read from
// app.asar (a real file, readable only by Electron-as-node).
const fs = require('node:fs');
const path = require('node:path');
const env = require('./dsh-env.cjs');

const ASAR = env.asar();
const PROFILE = env.profileDir();
const live = path.join(PROFILE, 'cordis.patch.yml');

for (const base of [path.join(ASAR, 'dsh', 'node_modules'), path.join(ASAR, 'node_modules')]) {
  let names = [];
  try { names = fs.readdirSync(base); } catch (e) { console.log('cannot read', base, e.code); continue; }
  const hits = names.filter(n => /yaml/i.test(n));
  console.log('yaml-ish in', base, '->', JSON.stringify(hits));
}

let YAML = null;
for (const candidate of [
  path.join(ASAR, 'dsh', 'node_modules', 'yaml'),
  path.join(ASAR, 'node_modules', 'yaml'),
]) {
  try { YAML = require(candidate); console.log('loaded yaml from', candidate); break; } catch (e) { console.log('no yaml at', candidate, '->', e.code || e.message); }
}

if (YAML === null) { console.log('RESULT: no YAML parser available; skipped'); process.exit(0); }

const text = fs.readFileSync(live, 'utf8');
let doc;
try { doc = YAML.parse(text); } catch (e) { console.log('RESULT: YAML PARSE FAILED ->', e.message); process.exit(2); }

console.log('RESULT: YAML parsed OK');
console.log('  top-level type      =', Array.isArray(doc) ? 'array' : typeof doc);
console.log('  entry count         =', doc.length);
console.log('  entry ids           =', JSON.stringify(doc.map(r => r && r.id)));

const byId = Object.fromEntries(doc.filter(r => r && r.id).map(r => [r.id, r]));
const checks = [
  ['permission.presets.defaultPreset', () => byId.permission.config.presets.defaultPreset],
  ['permission is danger-full-access', () => byId.permission.config.defaultPreset === 'danger-full-access'],
  ['ui-usage-billing.disabled === false', () => byId['ui-usage-billing'].disabled === false],
  ['ui-theme.config.fontSize', () => byId['ui-theme'].config.fontSize],
  ['ui-conversation.config.busyEnter', () => byId['ui-conversation'].config.busyEnter],
  ['llm-pi-ai.providers.deepseek.apiKeyEnv', () => byId['llm-pi-ai'].config.providers.deepseek.apiKeyEnv],
  ['agent-default-model.provider', () => byId['agent-default-model'].config.provider],
  ['ui-settings.config.enabled', () => byId['ui-settings'].config.enabled],
  ['agency-agents.enabled count', () => byId['agency-agents'].config.enabled.length],
  ['workbuddy.regions keys', () => Object.keys(byId['dsh-connect-workbuddy'].config.regions)],
  ['workbuddy cn.lastCatalog count', () => byId['dsh-connect-workbuddy'].config.regions.cn.lastCatalog.length],
  ['workbuddy cn.pool.memberAccountIds', () => byId['dsh-connect-workbuddy'].config.regions.cn.pool.memberAccountIds],
];
for (const [label, fn] of checks) {
  try { console.log('  -', label, '=', JSON.stringify(fn())); }
  catch (e) { console.log('  -', label, '=> ERROR', e.message); }
}
