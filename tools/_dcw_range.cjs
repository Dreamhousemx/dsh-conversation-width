// Print line ranges from files inside app.asar. Argv: "relpath|from|to" ...
const fs = require('node:fs');
const path = require('node:path');
const env = require('./dsh-env.cjs');
const ASAR = env.asar();

for (const spec of process.argv.slice(2)) {
  const [rel, from, to] = spec.split('|');
  const full = path.join(ASAR, rel);
  let lines;
  try { lines = fs.readFileSync(full, 'utf8').split(/\r?\n/); }
  catch (e) { console.log('\n!! cannot read asar:' + rel + ' -> ' + e.message); continue; }
  const a = Math.max(0, Number(from) - 1);
  const b = Math.min(lines.length, Number(to));
  console.log('\n===== ' + rel + '  [' + (a + 1) + '-' + b + ' of ' + lines.length + '] =====');
  for (let i = a; i < b; i++) console.log(String(i + 1).padStart(5) + ': ' + lines[i].slice(0, 190));
}
