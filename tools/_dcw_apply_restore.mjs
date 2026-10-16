// Put the merged union patch in place of the live profile patch, then verify
// with the market's OWN reader — the same code the crashing banner calls.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import env from './dsh-env.cjs';

const profileDir = env.profileDir();
const live = path.join(profileDir, 'cordis.patch.yml');
const merged = live + '.dcw-merged';
// Deliberately NOT `.bak-<digits>`: readHostRecoveryView only accepts that
// shape, so this rollback copy can never be mistaken for a recovery candidate.
const rollback = path.join(profileDir, 'cordis.patch.yml.pre-dcw-restore');

if (!fs.existsSync(merged)) {
  console.error('FATAL: merged file not found:', merged);
  process.exit(1);
}

if (!fs.existsSync(rollback)) {
  fs.copyFileSync(live, rollback);
  console.log('1. rollback copy written :', rollback, fs.statSync(rollback).size, 'bytes');
} else {
  console.log('1. rollback copy exists  :', rollback, fs.statSync(rollback).size, 'bytes (left untouched)');
}

const tmp = live + '.dcw-tmp';
fs.copyFileSync(merged, tmp);
fs.renameSync(tmp, live);
console.log('2. live patch replaced   :', live, fs.statSync(live).size, 'bytes');

const mod = await import(
  pathToFileURL(path.join(profileDir, 'node_modules', 'dshmarket', 'lib', 'host-recovery.js')).href
);
const view = mod.readHostRecoveryView(live);
console.log('3. market readHostRecoveryView(live):');
console.log('   offerRestore  =', view.offerRestore);
console.log('   currentBytes  =', view.currentBytes);
console.log('   currentRowIds =', JSON.stringify(view.currentRowIds));
console.log('   lostRowIds    =', JSON.stringify(view.lostRowIds));
console.log('   backups       =', JSON.stringify(view.backups.map(b => ({ name: b.name, bytes: b.bytes, rows: b.rowIds }))));
