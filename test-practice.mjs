// S'entraîner : parcours aléatoires toujours réalisables, de plus en plus difficiles, avec une récompense mesurée.
import { makePractice, rngFrom, stageOf, paramsFor, MAX_STAGE, trainReward, TRAIN_XP, TRAIN_MAX_PER_DAY } from "./practice.js";
import { simulate, shortestProgram, hintFor } from "./hints.js";
import { parseScenario } from "./scenario.js";
let bad = 0; const t = (n, c, x) => { console.log(n.padEnd(84), c ? "ok" : "BUG " + (x || "")); if (!c) bad++; };
const L = ops => ({ main: ops.map(o => ({ t: o })), fn: [] });
const gen = (band, n, seed) => makePractice(band, n, rngFrom(seed));

// 1. toujours réalisable : 3 âges × 6 niveaux × 40 graines
let total = 0, solvable = 0, simOk = 0, shapeOk = 0, hasTurn = 0, hasSol = 0;
for (const band of ["a", "b", "c"]) for (let n = 0; n < 12; n += 2) for (let seed = 1; seed <= 40; seed++) {
  const lv = gen(band, n, seed * 97 + n); total++;
  const flat = lv.map.join(""), sc = parseScenario(lv);
  if ((flat.match(/R/g) || []).length === 1 && (flat.match(/F/g) || []).length === 1 && /^[R.F#*]+$/.test(flat) && lv.map.every(r => r.length === lv.map[0].length)) shapeOk++;
  const p = shortestProgram(sc, lv.auto); if (p) solvable++;
  if (lv.sol && lv.sol.main.length) hasSol++;
  if (p && simulate(lv, lv.sol).ok) simOk++;
  if (lv.sol.main.some(o => o.t !== "fd")) hasTurn++;
}
t(`cartes bien formées (un robot, un drapeau, rectangle) : ${shapeOk}/${total}`, shapeOk === total);
t(`toutes réalisables : ${solvable}/${total}`, solvable === total);
t(`la solution fournie réussit dans le simulateur : ${simOk}/${total}`, simOk === total);
t(`chaque parcours a une solution (pour les indices) : ${hasSol}/${total}`, hasSol === total);
t(`aucun parcours n'est « tout droit » : ${hasTurn}/${total}`, hasTurn === total);

// 2. même graine = même parcours ; graines différentes = parcours différents
t("même graine : même parcours", JSON.stringify(gen("b", 4, 7).map) === JSON.stringify(gen("b", 4, 7).map));
t("graines différentes : des parcours différents (au moins 20 sur 30)", new Set(Array.from({ length: 30 }, (_, i) => gen("b", 4, 1000 + i).map.join("|"))).size >= 20);

// 3. la difficulté monte
const avgLen = (band, n) => Array.from({ length: 40 }, (_, i) => gen(band, n, 500 + i).sol.main.length).reduce((a, b) => a + b, 0) / 40;
for (const band of ["a", "b", "c"]) { const lo = avgLen(band, 0), hi = avgLen(band, 10); t(`âge ${band} : le chemin s'allonge entre le niveau 0 et le niveau 5 (${lo.toFixed(1)} → ${hi.toFixed(1)} blocs)`, hi > lo + 1); }
t("un niveau de plus toutes les 2 réussites, plafonné", stageOf(0) === 0 && stageOf(1) === 0 && stageOf(2) === 1 && stageOf(99) === MAX_STAGE);
t("les âges demandent plus de blocs : a < b < c", avgLen("a", 4) < avgLen("b", 4) && avgLen("b", 4) < avgLen("c", 4));

// 4. les blocs proposés dépendent de l'âge
t("6-8 ans : avancer et tourner seulement", gen("a", 0, 1).allow.join() === "fd,tl,tr");
t("8-10 ans : + répéter", gen("b", 0, 1).allow.includes("rep") && !gen("b", 0, 1).allow.includes("while"));
t("10-12 ans : tous les blocs, étoiles à ramasser à la main", gen("c", 0, 1).allow.includes("pick") && gen("c", 0, 1).auto === false);
t("consigne courte (moins de 20 mots)", ["a", "b", "c"].every(b => gen(b, 6, 3).intro.split(/\s+/).length < 20));
t("les indices marchent sur ces parcours", /drapeau/.test(hintFor(gen("a", 0, 5), L([]), 0).text) && /Une solution/.test(hintFor(gen("c", 8, 5), L([]), 3).text));
t("sans graine (Math.random) : ça marche aussi", (() => { for (let i = 0; i < 60; i++) { const lv = makePractice(["a", "b", "c"][i % 3], i % 12); if (!shortestProgram(parseScenario(lv), lv.auto)) return false; } return true; })());
t("paramètres : les bornes de chemin montent avec le niveau", paramsFor("b", 5).maxOps > paramsFor("b", 0).maxOps && paramsFor("b", 5).minOps >= paramsFor("b", 0).minOps);

// 5. récompense
const S = {}; let got = 0; for (let i = 0; i < 10; i++) got += trainReward(S, "2026-11-05");
t(`récompense : ${TRAIN_XP} XP par réussite, au plus ${TRAIN_XP * TRAIN_MAX_PER_DAY} XP par jour`, got === TRAIN_XP * TRAIN_MAX_PER_DAY, String(got));
t("le compteur repart à zéro le lendemain", trainReward(S, "2026-11-06") === TRAIN_XP && S.train.n === 1);
console.log(bad ? "PROBLEMES: " + bad : "L'ENTRAINEMENT EST FIABLE");
