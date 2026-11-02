import { LEVELS } from "./levels.js";
import { gridToCode, brainToCode } from "./blockcode.js";
import { runSpec } from "./codeengine.js";
let bad = 0; const t = (n, c, x) => { console.log(n.padEnd(70), c ? "ok" : "BUG " + (x || "")); if (!c) bad++; };
const scen = lv => (lv.scenarios || [{ map: lv.map, dir: lv.dir }]).map(s => ({ map: s.map, dir: s.dir ?? 1 }));
// 1. les blocs de chaque niveau, traduits, réussissent le même niveau (Python et JavaScript)
for (const [band, list] of Object.entries(LEVELS)) list.forEach((lv, i) => {
  if (band === "t") return; // niveaux « télécommande » : même blocs, autre décor
  for (const lang of ["py", "js"]) {
    const code = gridToCode(JSON.parse(JSON.stringify(lv.sol)), lang), r = runSpec({ kind: "robot", scenarios: scen(lv), auto: !!lv.auto, lang }, code);
    t(`${band}${i + 1} ${lv.title} → ${lang}`, r.ok, code + "\n" + JSON.stringify(r).slice(0, 200));
  }
});
// 2. cerveau : les programmes de blocs des niveaux p1…m2
const IF = (cond, body, els = []) => ({ t: "if", cond, body, else: els }), A = x => ({ t: x });
const P = {
  pbtn: [IF("pressed", [A("lon")])], psafe: [IF("far", [A("mon")])], pblink: [IF("tic", [A("lon")])],
  ptwo: [IF("bright", [IF("far", [A("mon")])]), IF("dark", [A("lon")])], palarm2: [IF("near", [A("lon"), IF("vnear", [A("son")])])],
  pmem1: [IF("just", [A("mflip")]), IF("memyes", [A("lon")])], pmem2: [IF("near", [A("mset1")]), IF("pressed", [A("mset0")]), IF("memyes", [A("lon")])]
};
for (const [goal, main] of Object.entries(P)) for (const lang of ["py", "js"]) { const code = brainToCode({ main }, lang), r = runSpec({ kind: "brain", goal, lang }, code); t(`cerveau ${goal} → ${lang}`, r.ok, code + "\n" + (r.why || JSON.stringify(r.error))); }
// 3. aspect du code
t("python : boucle for avec range", /for i in range\(4\):\n    avancer\(\)/.test(gridToCode({ main: [{ t: "rep", n: 4, body: [{ t: "fd" }] }], fn: [] }, "py")));
t("javascript : boucle for", /for \(let i = 0; i < 4; i\+\+\) \{\n  avancer\(\);\n\}/.test(gridToCode({ main: [{ t: "rep", n: 4, body: [{ t: "fd" }] }], fn: [] }, "js")));
t("boucles imbriquées : i puis j", /for i in range\(2\):\n    for j in range\(3\):/.test(gridToCode({ main: [{ t: "rep", n: 2, body: [{ t: "rep", n: 3, body: [{ t: "fd" }] }] }], fn: [] }, "py")));
t("programme vide expliqué", /vide/.test(gridToCode({ main: [], fn: [] }, "py")) && /vide/.test(brainToCode({ main: [] }, "js")));
t("la mémoire déclare global en Python", /global memoire, avant/.test(brainToCode({ main: P.pmem1 }, "py")));
console.log(bad ? "PROBLEMES: " + bad : "DES BLOCS AU CODE : OK");
