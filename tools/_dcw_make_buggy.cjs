// Rebuild the OLD, broken CSS-injection block (selector via string
// concatenation + JSON.stringify) into a scratch copy of the plugin, so the
// harness can be shown to actually catch the defect it is meant to catch.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'lib', 'client.js');
const OUT = path.join(ROOT, '.scratch', 'buggy', 'lib', 'client.js');

const src = fs.readFileSync(SRC, 'utf8');
const start = src.indexOf('if (typeof document !== "undefined") {');
const noteIdx = src.indexOf('The General Settings row: label');
const end = src.lastIndexOf('/**', noteIdx);
if (start < 0 || noteIdx < 0 || end < 0) {
  console.error('markers not found', { start, noteIdx, end });
  process.exit(1);
}

const buggy = [
  'if (typeof document !== "undefined") {',
  '			if (document.querySelector(\'style[data-plugin-css="\' + JSON.stringify(tagId) + \'"]\') === null) {',
  '				const tag = document.createElement("style");',
  '				tag.dataset.plugin = "dsh-conversation-width";',
  '				tag.dataset.pluginCss = tagId;',
  '				tag.textContent = css;',
  '				document.head.appendChild(tag);',
  '			}',
  '		}',
  ''
].join('\n');

const out = src.slice(0, start) + buggy + src.slice(end);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out);
console.log('wrote buggy copy:', OUT, out.length, 'bytes');
console.log('replaced region bytes:', end - start, '->', buggy.length);
