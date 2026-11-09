// Textes qui contiennent des mots français (connus par le dictionnaire) mais ne sont pas couverts : candidats à traduire -> i18n/gaps.txt
import { readFileSync, writeFileSync } from "node:fs";
const en = JSON.parse(readFileSync("i18n/en.json", "utf8")), all = JSON.parse(readFileSync("i18n/segments.all.json", "utf8"));
const nk = s => s.replace(/[  ]/g, " ").replace(/\s+/g, " ").replace(/\s+([:;!?])/g, "$1").trim();
const tok = s => (s.toLowerCase().match(/[\p{L}'’-]{3,}/gu) || []);
const enW = new Set(); Object.values(en).forEach(v => tok(v).forEach(x => enW.add(x)));
const frW = new Set(); Object.keys(en).forEach(k => tok(k).forEach(x => { if (!enW.has(x)) frW.add(x); }));
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const dict = new Set(), tpls = [];
for (const k of Object.keys(en)) { const key = nk(k); if (/\{\d+\}/.test(key)) { const parts = key.split(/\{\d+\}/); tpls.push(new RegExp("^" + parts.map(esc).join("(.*?)") + "$", "s")); } else dict.add(key); }
const gaps = [];
for (const s of all) {
  const c = nk(s); if (dict.has(c)) continue; if (!tok(c).some(x => frW.has(x))) continue;
  const bare = c.replace(/[.!?…]+$/, ""); if (dict.has(bare) || dict.has(bare + "!") || dict.has(bare + "?") || dict.has(bare + ".")) continue;
  if (tpls.some(r => r.test(c))) continue;
  gaps.push(c);
}
writeFileSync("i18n/gaps.txt", gaps.map((g, i) => `${i}|${g}`).join("\n")); console.log(gaps.length);
