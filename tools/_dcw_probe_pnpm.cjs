// Did the host fail the boot because the profile's lockfile no longer matched
// package.json (I added a link: dep by hand, without running pnpm)?
const fs = require('node:fs');
const path = require('node:path');
const env = require('./dsh-env.cjs');

const ASAR = env.asar();
const RE = /frozen-lockfile|frozenLockfile|OUTDATED_LOCKFILE|ErrPnpmOutdated|minimum-release-age|minimumReleaseAge|pnpmInstall|pnpm install|installArgs|--config\./i;

const hits = [];
(function walk(dir) {
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { walk(full); continue; }
    if (!/\.(js|mjs|cjs|json)$/.test(e.name)) continue;
    if (full.includes('node_modules\\yaml\\') || full.includes('node_modules/yaml/')) continue;
    let txt; try { txt = fs.readFileSync(full, 'utf8'); } catch { continue; }
    if (!RE.test(txt)) continue;
    const lines = txt.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (!RE.test(lines[i])) continue;
      hits.push({ f: full.slice(ASAR.length), n: i + 1, l: lines[i].trim().slice(0, 165) });
    }
  }
})(ASAR);

const byFile = {};
for (const h of hits) (byFile[h.f] = byFile[h.f] || []).push(h);
console.log('files:', Object.keys(byFile).length, '| hits:', hits.length);
for (const f of Object.keys(byFile).sort()) {
  const a = byFile[f];
  console.log('\n== asar:' + f + '  (' + a.length + ')');
  for (const h of a.slice(0, 12)) console.log('   ' + h.n + ': ' + h.l);
  if (a.length > 12) console.log('   ... +' + (a.length - 12) + ' more');
}
