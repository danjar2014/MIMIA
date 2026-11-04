import { S } from "./util.js";
import { placementQuestions, placeFrom, PLACEMENT_START, PLACEMENT_TOPICS, walk, CONCEPTS } from "./dailyq.js";
import { runSpec } from "./codeengine.js";
import { RANKS, highestUnlocked, rankUnlocked, cardLocked, stepUnlocked } from "./parcours.js";
let bad = 0; const t = (n, c, x) => { console.log(n.padEnd(76), c ? "ok" : "BUG " + (x || "")); if (!c) bad++; };
let sound = true, why = "", kinds = [0, 0, 0, 0, 0].map(() => ({}));
const fail = m => { sound = false; if (!why) why = m; };
for (let d = 0; d < 300; d++) {
  const q = placementQuestions("s" + d), q2 = placementQuestions("s" + d);
  if (JSON.stringify(q) !== JSON.stringify(q2)) fail("pas déterministe");
  if (q.length !== 5 || q.some((x, i) => x.level !== i + 1)) fail("5 questions de niveau 1 à 5");
  q.forEach((x, i) => {
    kinds[i][x.kind] = (kinds[i][x.kind] || 0) + 1;
    if (x.choices.filter(c => c.ok).length !== 1) fail("niveau " + (i + 1) + " : pas une seule bonne réponse");
    if (new Set(x.choices.map(c => c.label)).size !== x.choices.length) fail("réponses identiques");
    if (x.kind === "output") { const r = runSpec({ kind: "console", free: true, lang: "py" }, x.code); if (!r.ok || r.output.join(", ") !== x.choices.find(c => c.ok).label) fail("sortie annoncée ≠ sortie réelle"); }
    if (x.kind === "robot") { const m = /Il suit ce programme : (.*)\n/.exec(x.text), seq = m[1].split(" ").map(e => ({ "⬆️": "fd", "↷": "tr", "↶": "tl" })[e]), dir = /haut/.test(x.text) ? 0 : /droite/.test(x.text) ? 1 : /bas/.test(x.text) ? 2 : 3;
      const map = x.art.split("\n").map(r => [...r].map(ch => ({ "🤖": "R", "🏁": "F", "⭐": "*", "🪨": "#" }[ch] || ".")).join("")), w = walk(map, dir, seq); if ((w.atFlag && !w.bump) !== x.choices.find(c => c.ok).label.startsWith("Oui")) fail("robot : vérité fausse"); }
  });
}
t("300 tests : 5 niveaux, une seule bonne réponse, sorties et trajets vérifiés par le moteur", sound, why);
t("niveau 1 = compréhension, 2 = robot sur la grille, 4 = lecture de code Python", Object.keys(kinds[0]).join() === "concept" && Object.keys(kinds[1]).join() === "robot" && Object.keys(kinds[3]).join() === "output", JSON.stringify(kinds));
const lv = [["c2", "c3", "c5"], ["c10", "c14", "c15", "c16"], ["c22", "c24", "c25", "c26"]]; let okBank = true; for (let d = 0; d < 100; d++) { const q = placementQuestions("b" + d); if (!lv[0].includes(q[0].id) || !lv[1].includes(q[2].id) || !lv[2].includes(q[4].id)) okBank = false; }
t("niveaux 1, 3 et 5 tirés des bonnes familles de questions", okBank);
// le calcul du niveau de départ
t("aucune bonne réponse → Poussin (rang 0)", placeFrom(["ko"]).rank === 0 && placeFrom(["dk"]).rank === 0 && placeFrom([]).rank === 0);
t("1 bonne réponse puis « je ne sais pas » → rang 1", placeFrom(["ok", "dk"]).rank === 1);
t("2 bonnes → rang 3, 3 → rang 5, 4 → rang 7, 5 → rang 9", [2, 3, 4, 5].map(n => placeFrom(Array(n).fill("ok")).rank).join() === "3,5,7,9");
t("seules les bonnes réponses D'AFFILÉE comptent (ok, ko, ok, ok → 1)", placeFrom(["ok", "ko", "ok", "ok"]).passes === 1);
t("un coup de chance tardif ne remonte pas le niveau (ko, ok, ok, ok, ok → 0)", placeFrom(["ko", "ok", "ok", "ok", "ok"]).rank === 0);
t("les rangs de départ existent tous et croissent", PLACEMENT_START.every(r => r >= 0 && r < RANKS.length) && PLACEMENT_START.every((r, i) => !i || r > PLACEMENT_START[i - 1]));
t("5 thèmes décrits pour les 5 niveaux", PLACEMENT_TOPICS.length === 5);
// effet sur le parcours : cartes et étapes
S.progress = {}; S.unlockAll = false; S.startRank = PLACEMENT_START[2];
t("départ au rang 3 : rangs 0 à 3 ouverts, pas le 4 ; Programmer et Capteurs libres, Créer encore verrouillé", highestUnlocked() === 3 && !rankUnlocked(4) && !cardLocked("prog") && !cardLocked("lab") && cardLocked("create"));
S.startRank = 7; t("départ au rang 7 : « Coder pour de vrai » ouvert, étapes des rangs d'avant libres", !cardLocked("code") && stepUnlocked(2, 5) && highestUnlocked() === 7);
S.startRank = 9; t("départ au rang 9 : « Aller plus loin » ouvert", !cardLocked("adv") && highestUnlocked() === 9);
console.log(bad ? "PROBLEMES: " + bad : "LE TEST DE PLACEMENT EST FIABLE");
