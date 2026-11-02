import { runSpec } from "./codeengine.js";
import { newState, canConnect, goalReached, COMP } from "./boardlogic.js";
import { PROJECTS, projectParts } from "./projectdata.js";
let bad = 0; const t = (n, c, x) => { console.log(n.padEnd(72), c ? "ok" : "BUG " + (x || "")); if (!c) bad++; };
const run = (p, lang, code) => runSpec({ kind: "brain", goal: p.goal, lang }, code);
for (const p of PROJECTS) {
  for (const lang of ["py", "js"]) { const r = run(p, lang, p[lang].solution); t(`${p.id} : solution ${lang} réussie`, r.ok, r.why || JSON.stringify(r.error)); t(`${p.id} : programme de départ ${lang} échoue`, !run(p, lang, p[lang].starter).ok); }
  const parts = projectParts(p), sens = parts.filter(k => COMP[k].cat === "sen").length, acts = parts.filter(k => COMP[k].cat === "act").length;
  t(`${p.id} : tient sur la carte (${sens} capteurs ≤ 2, ${acts} actions ≤ 3)`, sens <= 2 && acts <= 3);
  // le montage : toutes les pièces branchées → objectif « wired »
  const st = newState(true, true), S = ["S1", "S2"], A = ["A1", "A2", "A3"]; let si = 0, ai = 0; const wires = [["B.pp", "BR.pp"], ["B.pm", "BR.pm"]];
  st.slots.B = "battery"; p.needs.forEach(k => { if (COMP[k].cat === "sen") { const s = S[si], n = si + 1; st.slots[s] = k; wires.push([s + ".out", "BR.in" + n]); si++; } else { const a = A[ai], n = ai + 1; st.slots[a] = k; wires.push([a + ".in", "BR.out" + n]); ai++; } });
  const lvl = { goal: "wired", need: p.needs };
  t(`${p.id} : montage incomplet → objectif non atteint`, !goalReached(lvl, st));
  wires.forEach(([a, b]) => { const c = canConnect(st, a, b); if (!c.ok) throw new Error(a + b + c.why); st.wires.push([a, b]); });
  t(`${p.id} : montage complet → objectif atteint`, goalReached(lvl, st));
}
const [expl, gard] = PROJECTS;
t("explorateur : roues toujours en marche → échec", !run(expl, "py", "def boucle():\n    roues(True)").ok);
t("explorateur : sans le noir (lumière) → échec", !run(expl, "py", "def boucle():\n    roues(distance() >= 20)\n    lampe(distance() < 20)\n    haut_parleur(distance() < 8)").ok);
t("explorateur : lampe fixe dans le noir au lieu de clignoter → échec", !run(expl, "py", "def boucle():\n    clair = lumiere() >= 35\n    libre = distance() >= 20\n    roues(clair and libre)\n    lampe(not clair or not libre)\n    haut_parleur(distance() < 8)").ok);
t("gardien : sans mémoire (l'alarme s'arrête quand l'intrus part) → échec", !run(gard, "py", "def boucle():\n    haut_parleur(distance() < 20)\n    lampe(distance() < 20 or tic())").ok);
t("gardien : sans le bouton (l'alarme ne s'arrête jamais) → échec", !run(gard, "js", "let a = false;\nfunction boucle() {\n  if (distance() < 20) { a = true; }\n  hautParleur(a);\n  lampe(a || tic());\n}").ok);
t("gardien : mémoire oubliée avec global (Python) : message clair", (() => { const r = run(gard, "py", "alarme = False\ndef boucle():\n    if distance() < 20:\n        alarme = True\n    haut_parleur(alarme)"); return !r.ok && /global alarme/.test(r.error.msg); })());
t("gardien : variante valable (alarme = alarme or …)", run(gard, "py", "etat = False\ndef boucle():\n    global etat\n    etat = (etat or distance() < 20) and not bouton_appuye()\n    haut_parleur(etat)\n    lampe(etat or tic())").ok);
console.log(bad ? "PROBLEMES: " + bad : "LE GRAND PROJET EST REALISABLE");
