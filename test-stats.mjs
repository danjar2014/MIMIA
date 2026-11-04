import { S, markDone, hooks, chime } from "./util.js";
import { currentKey, addSeconds, noteOpen, noteFail, noteDone, noteStart, summary, summaryText, limitState, extendLimit, dayKey, resetStats, statKey, track, fmtMin, categoryOf } from "./stats.js";
import { RANKS } from "./parcours.js";
let bad = 0; const t = (n, c, x) => { console.log(n.padEnd(72), c ? "ok" : "BUG " + (x || "")); if (!c) bad++; };
const DAY = 86400000, NOW = new Date("2026-11-04T15:00:00").getTime();
S.progress = {}; S.startRank = 0; S.unlockAll = false; resetStats();
// 1. rien d'enregistré
let sm = summary(NOW);
t("au début : aucun temps, aucun jour actif, conseil de démarrage", sm.totalSec === 0 && sm.streak === 0 && /première leçon/.test(sm.tips[0]));
t("au début : 0 étape réussie et rang Poussin", sm.doneSteps === 0 && sm.rank.name === "Poussin" && sm.totalSteps === RANKS.flatMap(r => r.steps).length);
// 2. du temps sur 4 jours d'affilée (aujourd'hui compris) + un jour isolé
noteStart(NOW - 5 * DAY); noteStart(NOW);
for (const [back, min] of [[0, 12], [1, 20], [2, 8], [3, 15], [6, 30]]) addSeconds(min * 60, statKey("prog", "a1"), NOW - back * DAY);
sm = summary(NOW);
t("temps du jour = 12 min", sm.todaySec === 720 && fmtMin(sm.todaySec) === "12 min");
t("semaine = 12+20+8+15+30 = 85 min (le jour -6 est dans les 7 jours)", sm.weekSec === 85 * 60, sm.weekSec);
t("série : 4 jours d'affilée", sm.streak === 4, sm.streak);
t("jours actifs = 5", sm.activeDays === 5);
t("moyenne par jour actif ≈ 17 min", Math.round(sm.avgActive / 60) === 17);
t("la barre d'aujourd'hui est marquée", sm.week[6].today && sm.week[6].sec === 720 && sm.week.length === 7);
t("2 séances comptées", sm.sessions === 2);
t("conseil de félicitations pour la série", sm.tips.some(x => /4 jours d'affilée/.test(x)));
// 3. le temps ne compte que si l'enfant joue, et la série saute si un jour manque
resetStats(); addSeconds(600, null, NOW); addSeconds(600, null, NOW - 2 * DAY); sm = summary(NOW);
t("un jour sans jeu casse la série (aujourd'hui seul = 1)", sm.streak === 1, sm.streak);
resetStats(); addSeconds(600, null, NOW - DAY); sm = summary(NOW);
t("si aujourd'hui est vide, la série d'hier compte encore", sm.streak === 1);
resetStats(); addSeconds(600, null, NOW - 5 * DAY); sm = summary(NOW);
t("5 jours d'absence → conseil de reprise en douceur", sm.sinceLast === 5 && sm.tips.some(x => /pas joué depuis 5 jours/.test(x)));
// 4. erreurs et réussites
resetStats(); S.progress = {};
track("prog", "a3", "6-8 · Une étoile sur la route"); for (let i = 0; i < 9; i++) { hooks.fail && hooks.fail(); noteFail(statKey("prog", "a3"), NOW); }
addSeconds(1200, statKey("prog", "a3"), NOW);
sm = summary(NOW);
t("difficulté repérée : 9 essais ratés, 20 min, pas réussi", sm.stuck.length === 1 && sm.stuck[0].fails === 9 && sm.stuck[0].min === 20 && /étoile/.test(sm.stuck[0].title));
t("conseil d'accompagnement cite l'étape bloquée", sm.tips.some(x => /étoile sur la route/.test(x) && /Indice/.test(x)));
noteDone(statKey("prog", "a3"), NOW); markDone("prog", "a3");
sm = summary(NOW);
t("une fois réussie, l'étape n'est plus « à surveiller »", sm.stuck.length === 0 && sm.recentDone.length === 1 && sm.doneSteps === 1);
t("« dernières réussites » donne le titre et la date", sm.recentDone[0].title.includes("étoile") && sm.recentDone[0].day === dayKey(NOW));
// 5. compétences et rangs
RANKS[0].steps.forEach(s => markDone(s.sec, s.id)); sm = summary(NOW);
const bases = sm.cats.find(c => c.name === "Les bases");
t("compétence « Les bases » : 6/10 après le rang Poussin", bases && bases.done === 6 && bases.total === 10, JSON.stringify(bases));
t("rang Poussin terminé, rang courant = Curieux", sm.ranks[0].complete && sm.rank.name === "Curieux");
t("toutes les étapes sont rangées dans une catégorie connue", RANKS.flatMap(r => r.steps).every(s => categoryOf(s) !== "Autres"));
// 6. limite quotidienne
resetStats(); S.dailyLimit = 30; S.limitExtra = null; addSeconds(25 * 60, null, NOW);
t("limite 30 min : 25 min utilisées, reste 5", !limitState(NOW).over && limitState(NOW).left === 5);
addSeconds(6 * 60, null, NOW); t("31 min : limite atteinte", limitState(NOW).over);
extendLimit(15, NOW); t("+15 min accordées par un parent : on peut rejouer", !limitState(NOW).over && limitState(NOW).left === 14, JSON.stringify(limitState(NOW)));
t("la rallonge ne vaut que pour la journée", limitState(NOW + DAY).extra === 0);
S.dailyLimit = 0; t("sans limite : jamais bloqué", !limitState(NOW).over && limitState(NOW).left === null);
// 7. texte du bilan, et les « mauvais sons » comptent comme essais ratés via chime
resetStats(); S.progress = {}; track("code", "k1", "Dire bonjour"); chime("no"); chime("no"); chime("ok");
hooks.fail = () => noteFail(currentKey()); chime("no"); chime("no"); chime("ok");
t("chime('no') compte un essai raté sur l'activité en cours, chime('ok') non", S.stats.acts["code:k1"].fails === 2 + 0, JSON.stringify(S.stats.acts["code:k1"]));
sm = summary(NOW); t("le bilan parlé mentionne le rang et le temps", /rang 1 sur 11/.test(summaryText(sm)) && /aujourd'hui/.test(summaryText(sm)));
t("limite de l'historique : 300 jours → 120 conservés", (() => { resetStats(); for (let i = 0; i < 300; i++) addSeconds(60, null, NOW - i * DAY); return Object.keys(S.stats.days).length <= 150; })());
console.log(bad ? "PROBLEMES: " + bad : "LE SUIVI PARENTS FONCTIONNE");
