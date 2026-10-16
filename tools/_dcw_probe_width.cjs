// Does the FIRST-PARTY ui-conversation plugin already accept a width setting?
// If yes, the width feature needs no third-party plugin at all.
const fs = require('node:fs');
const path = require('node:path');
const env = require('./dsh-env.cjs');

const ASAR = env.asar();
const RE = /contentWidth|content-width|chatContentWidth|conversationColumnWidth|userWidth|columnWidth/i;

const hits = [];
function walk(dir) {
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { walk(full); continue; }
    if (!/\.(js|mjs|cjs|ts|css)$/.test(e.name)) continue;
    let txt; try { txt = fs.readFileSync(full, 'utf8'); } catch { continue; }
    if (!RE.test(txt)) continue;
    const lines = txt.split(/\r?\n/);
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
      if (!RE.test(lines[i])) continue;
      count++;
      hits.push({ f: full.slice(ASAR.length), n: i + 1, l: lines[i].trim().slice(0, 170) });
    }
  }
}
walk(ASAR);

const byFile = {};
for (const h of hits) (byFile[h.f] = byFile[h.f] || []).push(h);
console.log('files with width-ish keys:', Object.keys(byFile).length, '| total hits:', hits.length);
for (const f of Object.keys(byFile).sort()) {
  console.log('\n== asar:' + f + '  (' + byFile[f].length + ')');
  for (const h of byFile[f].slice(0, 10)) console.log('   ' + h.n + ': ' + h.l);
  if (byFile[f].length > 10) console.log('   ... +' + (byFile[f].length - 10) + ' more');
}

// The ui-conversation HOST half: what config does it declare?
const conv = path.join(ASAR, 'dsh/node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/index.js');
if (fs.existsSync(conv)) {
  const txt = fs.readFileSync(conv, 'utf8');
  const lines = txt.split(/\r?\n/);
  console.log('\n\n#### ui-conversation host half: lib/index.js (' + lines.length + ' lines) ####');
  for (let i = 0; i < lines.length; i++) {
    if (/Schema\.object|Schema\.|export const Config|Config\s*=|width/i.test(lines[i])) {
      console.log('   ' + (i + 1) + ': ' + lines[i].trim().slice(0, 170));
    }
  }
} else {
  console.log('\n(no ui-conversation host half at the expected path)');
}
