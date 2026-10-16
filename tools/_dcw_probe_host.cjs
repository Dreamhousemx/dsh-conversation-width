// Walk the whole app.asar and locate the host client bundles that mention the
// IconWarningOutline family, printing the exact names each one declares.
const fs = require("fs");
const path = require("path");
const env = require("./dsh-env.cjs");

const ASAR = env.asar();

function ls(p) {
  try {
    return fs.readdirSync(p, { withFileTypes: true });
  } catch (e) {
    return null;
  }
}

console.log("TOP=" + JSON.stringify((ls(ASAR) || []).map((e) => e.name + (e.isDirectory() ? "/" : ""))));
for (const sub of ["dsh", "lib", "renderer", "node_modules"]) {
  const e = ls(path.join(ASAR, sub));
  console.log(sub + "/ => " + (e ? JSON.stringify(e.map((x) => x.name + (x.isDirectory() ? "/" : ""))) : "MISSING"));
}
const dsNm = ls(path.join(ASAR, "node_modules", "@deepseek-ai"));
console.log("node_modules/@deepseek-ai => " + (dsNm ? JSON.stringify(dsNm.map((x) => x.name)) : "MISSING"));

const hits = [];
let scanned = 0;
function walk(dir, depth) {
  if (depth > 12) return;
  const entries = ls(dir);
  if (!entries) return;
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full, depth + 1);
    } else if (/\.(js|mjs|cjs|ts)$/.test(e.name)) {
      let st;
      try {
        st = fs.statSync(full);
      } catch {
        continue;
      }
      if (st.size > 60 * 1024 * 1024) continue;
      let text = "";
      try {
        text = fs.readFileSync(full, "utf8");
      } catch {
        continue;
      }
      scanned++;
      if (!text.includes("IconWarningOutline")) continue;
      const found = [...new Set(text.match(/IconWarningOutline[A-Za-z0-9]*/g) || [])].sort();
      hits.push({ file: full.replace(ASAR, "<asar>"), kb: Math.round(st.size / 1024), icons: found });
    }
  }
}
walk(ASAR, 0);
console.log("SCANNED_JS=" + scanned + " HITS=" + hits.length);
for (const h of hits) console.log("HIT " + h.file + " (" + h.kb + "KB) => " + JSON.stringify(h.icons));
