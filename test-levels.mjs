import { LEVELS } from "./levels.js";
import { simulate } from "./grid.js";
let bad = 0;
for (const [band, list] of Object.entries(LEVELS)) list.forEach((lv, i) => {
  const r = simulate(lv, JSON.parse(JSON.stringify(lv.sol)));
  const ok = r.every(x => x.ok);
  if (!ok) bad++;
  console.log(band + (i + 1), lv.title.padEnd(26), ok ? "OK" : "ECHEC", ok ? "" : JSON.stringify(r.map(x => ({ ok: x.ok, bump: x.bump, atFlag: x.atFlag, missing: x.missing, limit: x.limit }))));
});
// un programme vide ou faux doit échouer
const r0 = simulate(LEVELS.a[0], { main: [], fn: [] }); console.log("vide ->", r0[0].ok ? "BUG" : "echoue (normal)");
const r1 = simulate(LEVELS.a[3], { main: [{ t: "fd" }, { t: "fd" }, { t: "fd" }], fn: [] }); console.log("caillou ->", r1[0].bump ? "cogne (normal)" : "BUG");
const r2 = simulate(LEVELS.c[0], { main: [{ t: "while", cond: "pasarrive", body: [{ t: "tr" }] }], fn: [] }); console.log("boucle infinie ->", r2[0].limit ? "detectee (normal)" : "BUG");
console.log(bad ? "PROBLEMES: " + bad : "TOUS LES NIVEAUX SONT REALISABLES");
