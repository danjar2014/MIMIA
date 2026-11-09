// Fusionne i18n/tr/*.txt (« N|texte anglais ») avec i18n/strings1.json, i18n/tr2/*.txt avec strings2.json, puis i18n/extra.json -> i18n/en.json
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
const out = {}; let n = 0, warn = 0;
const ph = s => [...s.matchAll(/\{\d+\}/g)].map(x => x[0]).sort().join(",");
function load(strFile, dir) {
  if (!existsSync(strFile) || !existsSync(dir)) return;
  const list = JSON.parse(readFileSync(strFile, "utf8")), seen = new Set();
  for (const f of readdirSync(dir).filter(f => f.endsWith(".txt")).sort()) {
    for (const line of readFileSync(dir + "/" + f, "utf8").split(/\r?\n/)) {
      const m = /^(\d+)\|(.*)$/.exec(line); if (!m) continue; const i = +m[1], en = m[2]; seen.add(i);
      if (!list[i]) { console.log("index inconnu", dir, i); continue; }
      if (en === "=") continue;
      const k = list[i].k; if (ph(k) !== ph(en)) warn++;
      out[k] = en; n++;
    }
  }
  const missing = list.map((_, i) => i).filter(i => !seen.has(i)); if (missing.length) console.log("non traduits", dir, missing.length, missing.slice(0, 20));
}
load("i18n/strings1.json", "i18n/tr");
load("i18n/strings2.json", "i18n/tr2");
load("i18n/strings3.json", "i18n/tr3");
load("i18n/strings4.json", "i18n/tr4");
load("i18n/strings5.json", "i18n/tr5");
if (existsSync("i18n/extra.json")) { const ex = JSON.parse(readFileSync("i18n/extra.json", "utf8")); Object.assign(out, ex); console.log("extra:", Object.keys(ex).length); }
// directions du drapeau (hints.js) : « 4 cases vers le bas et 1 case vers la gauche »
{
  const V = [["haut", "up"], ["bas", "down"]], H = [["droite", "right"], ["gauche", "left"]], C = [["case", "square"], ["cases", "squares"]];
  for (const [vf, ve] of V) for (const [cf, ce] of C) out[`{1} ${cf} vers le ${vf}`] = `{1} ${ce} ${ve}`;
  for (const [hf, he] of H) for (const [cf, ce] of C) out[`{1} ${cf} vers la ${hf}`] = `{1} ${ce} ${he}`;
  for (const [vf, ve] of V) for (const [hf, he] of H) for (const [c1f, c1e] of C) for (const [c2f, c2e] of C) out[`{1} ${c1f} vers le ${vf} et {2} ${c2f} vers la ${hf}`] = `{1} ${c1e} ${ve} and {2} ${c2e} ${he}`;
}
// phrases isolées : un texte de plusieurs phrases est souvent affiché en morceaux (la première phrase seule, etc.) -> on enregistre aussi chaque phrase,
// quand le français et l'anglais ont le même nombre de phrases
const SPL = /[^.!?…]+(?:[.!?…]+\s*|$)/g; let frag = 0;
for (const [k, v] of Object.entries({ ...out })) {
  if (/\{\d+\}/.test(k)) continue; const a = k.match(SPL) || [], b = v.match(SPL) || [];
  if (a.length < 2 || a.length !== b.length) continue;
  a.forEach((s, i) => { const key = s.trim(); if (key.length > 8 && !(key in out)) { out[key] = b[i].trim(); frag++; } });
}
console.log("phrases isolées ajoutées:", frag);
writeFileSync("i18n/en.json", JSON.stringify(out));
console.log("entrées:", n, "(placeholders différents:", warn + ")");
