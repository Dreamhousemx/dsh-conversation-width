'use strict';

/**
 * Shared path resolution for these diagnostics.
 *
 * Nothing machine-specific is baked in. Point these at your own DSH install:
 *
 *   DSH_ASAR         <install>/resources/app.asar     the host's bundled source
 *   DSH_PROFILE_DIR  <userData>/.dsh/profiles/<name>  the profile under inspection
 *
 * app.asar is a single file, so a plain `node script.js` cannot open it - run the
 * scripts with the Electron binary in Node mode instead:
 *
 *   set ELECTRON_RUN_AS_NODE=1
 *   "<install>/DeepSeek Harness.exe" tools\_dcw_probe_host.js
 */

function required(name, hint) {
  const value = process.env[name];
  if (!value) {
    console.error('[dcw-tools] ' + name + ' is not set.');
    console.error('[dcw-tools] ' + hint);
    process.exit(2);
  }
  return value;
}

module.exports = {
  required,
  asar: () => required('DSH_ASAR', 'Point it at <install>/resources/app.asar'),
  profileDir: () => required('DSH_PROFILE_DIR', 'Point it at <userData>/.dsh/profiles/<profile>'),
};
