// Read-only proof of the market fix: the crash site is only reachable while
// the host-recovery banner decides to render. Use the market's OWN predicate.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import env from './dsh-env.cjs';

const PROFILE = env.profileDir();
const MARKET = path.join(PROFILE, 'node_modules', 'dshmarket', 'lib', 'host-recovery.js');
const PATCH = path.join(PROFILE, 'cordis.patch.yml');

const mod = await import(pathToFileURL(MARKET).href);
const view = mod.readHostRecoveryView(PATCH);

console.log('currentBytes:  ' + view.currentBytes);
console.log('currentRowIds: ' + JSON.stringify(view.currentRowIds));
console.log('lostRowIds:    ' + JSON.stringify(view.lostRowIds));
console.log('newest backup: ' + (view.newest === undefined ? '(none)' : view.newest.name + ' @ ' + view.newest.bytes + ' bytes'));
console.log('offerRestore:  ' + view.offerRestore);
console.log(view.offerRestore
  ? 'FAIL: banner WOULD render -> the #130 crash site is reachable'
  : 'PASS: banner suppressed -> market renders without touching the icon');
