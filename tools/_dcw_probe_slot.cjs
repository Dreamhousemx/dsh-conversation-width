// Verify the exact client-plugin contract my dsh-conversation-width relies on,
// against the HOST'S OWN source inside app.asar.
const fs = require('node:fs');
const path = require('node:path');
const env = require('./dsh-env.cjs');

const ASAR = env.asar();
const ROOTS = [path.join(ASAR, 'dsh', 'node_modules'), path.join(ASAR, 'node_modules')];
const EXT = new Set(['.js', '.mjs', '.cjs']);

const files = [];
function walk(dir, depth) {
  if (depth > 12) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, depth + 1);
    else if (EXT.has(path.extname(e.name))) files.push(p);
  }
}
for (const r of ROOTS) walk(r, 0);
console.log('scanned files:', files.length);

const PATTERNS = process.argv.slice(2);
const LIMIT = 6;
for (const pat of PATTERNS) {
  const re = new RegExp(pat);
  let hits = 0;
  console.log('\n===== /' + pat + '/ =====');
  for (const f of files) {
    if (hits >= LIMIT) break;
    let text;
    try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
    if (!re.test(text)) continue;
    const lines = text.split('\n');
    for (let i = 0; i < lines.length && hits < LIMIT; i++) {
      if (re.test(lines[i])) {
        hits++;
        console.log(`${f.replace(ASAR, '<asar>')}:${i + 1}\n    ${lines[i].trim().slice(0, 260)}`);
      }
    }
  }
  if (hits === 0) console.log('  (no hits)');
}
