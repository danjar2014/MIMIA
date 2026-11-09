// Fusionne les traductions (« N|texte » dans i18n/tr*/ pour l'anglais, i18n/ar-tr*/ pour l'arabe) avec i18n/strings*.json, puis i18n/extra.json (ou ar-extra.json)
// -> i18n/en.json ou i18n/ar.json.   Usage : node i18n/merge.mjs [en|ar]
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
const lang = process.argv[2] === "ar" ? "ar" : "en", pre = lang === "ar" ? "ar-" : "";
const out = {}; let n = 0, warn = 0;
const ph = s => [...s.matchAll(/\{\d+\}/g)].map(x => x[0]).sort().join(",");
function load(strFile, dir) {
  if (!existsSync(strFile) || !existsSync(dir)) return;
  const list = JSON.parse(readFileSync(strFile, "utf8")), seen = new Set();
  for (const f of readdirSync(dir).filter(f => f.endsWith(".txt")).sort()) {
    for (const line of readFileSync(dir + "/" + f, "utf8").split(/\r?\n/)) {
      const m = /^(\d+)\|(.*)$/.exec(line); if (!m) continue; const i = +m[1], tx = m[2]; seen.add(i);
      if (!list[i]) { console.log("index inconnu", dir, i); continue; }
      if (tx === "=") continue;
      const k = list[i].k; if (ph(k) !== ph(tx)) warn++;
      out[k] = tx; n++;
    }
  }
  const missing = list.map((_, i) => i).filter(i => !seen.has(i)); if (missing.length) console.log("non traduits", dir, missing.length);
}
const sets = [["i18n/strings1.json", "tr"], ["i18n/strings2.json", "tr2"], ["i18n/strings3.json", "tr3"], ["i18n/strings4.json", "tr4"], ["i18n/strings5.json", "tr5"]];
for (const [s, d] of sets) load(s, "i18n/" + pre + d);
const exf = "i18n/" + pre + "extra.json";
if (existsSync(exf)) { const ex = JSON.parse(readFileSync(exf, "utf8")); Object.assign(out, ex); console.log("extra:", Object.keys(ex).length); }
// directions du drapeau (hints.js) : « 4 cases vers le bas et 1 case vers la gauche »
{
  const V = lang === "ar" ? [["haut", "لأعلى"], ["bas", "لأسفل"]] : [["haut", "up"], ["bas", "down"]], H = lang === "ar" ? [["droite", "لليمين"], ["gauche", "لليسار"]] : [["droite", "right"], ["gauche", "left"]];
  const C = lang === "ar" ? [["case", "مربع"], ["cases", "مربعات"]] : [["case", "square"], ["cases", "squares"]], AND = lang === "ar" ? "و" : "and";
  for (const [vf, ve] of V) for (const [cf, ce] of C) out[`{1} ${cf} vers le ${vf}`] = `{1} ${ce} ${ve}`;
  for (const [hf, he] of H) for (const [cf, ce] of C) out[`{1} ${cf} vers la ${hf}`] = `{1} ${ce} ${he}`;
  for (const [vf, ve] of V) for (const [hf, he] of H) for (const [c1f, c1e] of C) for (const [c2f, c2e] of C) out[`{1} ${c1f} vers le ${vf} et {2} ${c2f} vers la ${hf}`] = `{1} ${c1e} ${ve} ${AND} {2} ${c2e} ${he}`;
}
// phrases isolées : un texte de plusieurs phrases est souvent affiché en morceaux (la première phrase seule, etc.) -> on enregistre aussi chaque phrase,
// quand le français et la langue cible ont le même nombre de phrases
const SPL = /[^.!?…؟]+(?:[.!?…؟]+\s*|$)/g, SPF = /[^.!?…]+(?:[.!?…]+\s*|$)/g; let frag = 0;
for (const [k, v] of Object.entries({ ...out })) {
  if (/\{\d+\}/.test(k)) continue; const a = k.match(SPF) || [], b = v.match(SPL) || [];
  if (a.length < 2 || a.length !== b.length) continue;
  a.forEach((s, i) => { const key = s.trim(); if (key.length > 8 && !(key in out)) { out[key] = b[i].trim(); frag++; } });
}
console.log("phrases isolées ajoutées:", frag);
writeFileSync("i18n/" + lang + ".json", JSON.stringify(out));
console.log(lang, "entrées:", n, "(placeholders différents:", warn + ")");
