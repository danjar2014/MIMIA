import { S, markDone } from "./util.js";
import { RANKS, rankUnlocked, rankDone, stepUnlocked, highestUnlocked, currentRank, nextStep, cardLocked, CARD_RANK } from "./parcours.js";
import { LEVELS } from "./levels.js";
import { BUILD } from "./boardlogic.js";
import { FLAT } from "./codemissions.js";
import { LESSONS } from "./learn.js";
let bad = 0; const t = (n, c, x) => { console.log(n.padEnd(70), c ? "ok" : "BUG " + (x || "")); if (!c) bad++; };
// 1. toutes les étapes existent vraiment
const known = { learn: id => LESSONS.some(l => l.id === id) || id === "l7", prog: id => !!(LEVELS[id[0]] && LEVELS[id[0]][+id.slice(1) - 1]), build: id => BUILD.some(l => l.id === id), code: id => FLAT.some(m => m.id === id), project: id => id === "pj", disc: id => ["d1", "d2", "d3", "d4"].includes(id), lab: id => ["k1", "k2", "k3", "k4"].includes(id) };
RANKS.forEach((r, i) => r.steps.forEach(s => t(`rang ${i + 1} ${r.name} : étape ${s.sec}:${s.id} existe`, known[s.sec](s.id))));
// 2. aucune étape en double, et tout le contenu « blocs » et « code » est couvert par le parcours
const keys = RANKS.flatMap(r => r.steps.map(s => s.sec + ":" + s.id)); t("pas d'étape en double", new Set(keys).size === keys.length);
t("toutes les missions de code sont dans le parcours", FLAT.every(m => keys.includes("code:" + m.id)), FLAT.filter(m => !keys.includes("code:" + m.id)).map(m => m.id).join());
t("tous les niveaux de blocs a/b/c sont dans le parcours", ["a", "b", "c"].every(b => LEVELS[b].every((_, i) => keys.includes("prog:" + b + (i + 1)))));
t("tous les niveaux de construction sont dans le parcours (sauf la carte libre)", BUILD.filter(l => l.id !== "e9").every(l => keys.includes("build:" + l.id)));
// 3. le déblocage
S.progress = {}; S.unlockAll = false; S.startRank = 0;
t("au début : seul le rang Poussin est ouvert", rankUnlocked(0) && !rankUnlocked(1) && highestUnlocked() === 0 && currentRank() === 0);
t("au début : les cartes avancées sont verrouillées", cardLocked("disc") && cardLocked("code") && cardLocked("adv") && cardLocked("prog"));
t("au début : on avance étape par étape (la 2e est verrouillée)", stepUnlocked(0, 0) && !stepUnlocked(0, 1));
t("la prochaine étape est la leçon 1", nextStep().step.id === "l1");
RANKS[0].steps.forEach(s => markDone(s.sec, s.id));
t("Poussin terminé : Curieux s'ouvre et la carte Découvrir aussi", rankDone(0) && rankUnlocked(1) && !rankUnlocked(2) && !cardLocked("disc") && cardLocked("prog"));
for (let i = 1; i < RANKS.length; i++) { RANKS[i].steps.forEach(s => markDone(s.sec, s.id)); }
t("tout terminé : tout est ouvert, jusqu'à Expert", highestUnlocked() === RANKS.length - 1 && !cardLocked("code") && !cardLocked("adv") && rankDone(RANKS.length - 1));
S.progress = {}; S.startRank = 3;
t("niveau de départ 3 : les rangs 1 à 4 sont ouverts, pas le 5", rankUnlocked(3) && !rankUnlocked(4) && !cardLocked("lab") && cardLocked("create"));
t("niveau de départ : les étapes des rangs d'avant sont libres", stepUnlocked(1, 4) && stepUnlocked(2, 5));
S.startRank = 0; S.unlockAll = true;
t("tout débloquer (parents) : rien n'est verrouillé", highestUnlocked() === RANKS.length - 1 && !cardLocked("adv") && stepUnlocked(5, 6));
S.unlockAll = false;
t("11 rangs, de Poussin à Expert", RANKS.length === 11 && RANKS[0].name === "Poussin" && RANKS[10].name === "Expert");
import { readFileSync } from "node:fs";
t("un rang terminé reste ouvert : ses étapes se refont (écran Mon parcours)", /if \(!un\) \{ groups\.push/.test(readFileSync("./app.js", "utf8")) && !/if \(!un \|\| fin\)/.test(readFileSync("./app.js", "utf8")));
console.log(bad ? "PROBLEMES: " + bad : "LE PARCOURS EST COHERENT");
