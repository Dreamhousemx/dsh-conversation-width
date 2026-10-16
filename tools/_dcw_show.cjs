const fs = require('fs');
const [file, start, end] = process.argv.slice(2);
const lines = fs.readFileSync(file, 'utf8').split('\n');
const s = Number(start);
const e = end ? Number(end) : s + 40;
for (let i = s; i <= e && i <= lines.length; i++) console.log(String(i).padStart(6) + ': ' + lines[i - 1]);
