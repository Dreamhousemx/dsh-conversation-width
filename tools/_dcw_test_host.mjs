// Load the plugin's Node half exactly the way the host loader would (real ESM
// import of the package "main"), to prove it cannot break profile startup.
import { fileURLToPath, pathToFileURL } from 'node:url';

const ENTRY = fileURLToPath(new URL('../lib/index.js', import.meta.url));
const url = pathToFileURL(ENTRY);

console.log('importing', url.href);
const mod = await import(url.href);

console.log('  import:            OK');
console.log('  exports:           ' + Object.keys(mod).join(', '));
console.log('  name:              ' + mod.name);
console.log('  inject:            ' + JSON.stringify(mod.inject));
console.log('  apply:             ' + typeof mod.apply);

const calls = [];
const ctx = { effect: (fn, label) => { calls.push(label); return () => {}; } };
const result = mod.apply(ctx, {});
console.log('  apply(ctx, {}):    OK' + (result === undefined ? ' (no return)' : ''));
console.log('  ctx.effect calls:  ' + JSON.stringify(calls));
console.log('RESULT: Node half loads and applies cleanly.');
