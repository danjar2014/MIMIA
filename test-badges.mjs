import { S, markDone } from "./util.js";
import { BADGES, softStreak, checkBadges, playDays, recordDaily, markFlag, badgeList } from "./badges.js";
import { addSeconds, resetStats, dayKey } from "./stats.js";
import { RANKS , FLAGS } from "./parcours.js";
FLAGS.testUnlock = false;
let bad = 0; const t = (n, c, x) => { console.log(n.padEnd(74), c ? "ok" : "BUG " + (x || "")); if (!c) bad++; };
const DAY = 86400000, NOW = new Date("2026-11-10T12:00:00").getTime(), D = back => dayKey(NOW - back * DAY), set = (...b) => new Set(b.map(D));
// 1. la série douce
t("aujourd'hui + 2 jours d'affilée = 3", softStreak(set(0, 1, 2), NOW).streak === 3);
t("un jour de repos ne casse pas la série (0,2,3 → 3, repos signalé)", (() => { const s = softStreak(set(0, 2, 3), NOW); return s.streak === 3 && s.rested; })());
t("deux jours sans jouer cassent la série (0,3,4 → 1)", softStreak(set(0, 3, 4), NOW).streak === 1);
t("pas encore joué aujourd'hui : la série d'hier reste intacte", softStreak(set(1, 2, 3), NOW).streak === 3 && !softStreak(set(1, 2, 3), NOW).playedToday);
t("hier ET avant-hier manqués, rien aujourd'hui : série à 0 (mais jamais de message négatif)", softStreak(set(3, 4), NOW).streak === 0);
t("un jour de repos n'est signalé que s'il a vraiment été « sauté » (0,1,2 et 0 seul : non)", !softStreak(set(0, 1, 2), NOW).rested && !softStreak(set(0), NOW).rested);
t("aucun jour de jeu : 0", softStreak(new Set(), NOW).streak === 0);
// 2. badges
S.progress = {}; S.badges = null; S.badgesInit = false; S.dailyDays = []; S.flags = {}; resetStats();
t("tout début : aucun badge, et l'initialisation silencieuse ne fête rien", checkBadges(NOW).length === 0 && S.badgesInit && Object.keys(S.badges).length === 0);
markDone("learn", "l1");
let f = checkBadges(NOW).map(b => b.id); t("première étape : badge « Premier pas » (et lui seul)", f.join() === "first", f.join());
t("les badges déjà gagnés ne reviennent pas", checkBadges(NOW).length === 0);
["l2", "l3", "l4", "l5", "l6"].forEach(i => markDone("learn", i)); f = checkBadges(NOW).map(b => b.id);
t("rang Poussin terminé : badges l2, l6 et « Rang 1 »", ["learn-l2", "learn-l6", "rank0"].every(x => f.includes(x)), f.join());
// jours de jeu
resetStats(); for (const b of [0, 1, 2, 4]) addSeconds(120, null, NOW - b * DAY); f = checkBadges(NOW).map(b => b.id);
t("4 jours de jeu : « 3 jours de jeu » et « série de 3 jours »", f.includes("days3") && f.includes("streak3") && !f.includes("days7"), f.join());
t("un jour de moins d'une minute ne compte pas", (() => { resetStats(); addSeconds(30, null, NOW); return !playDays().has(dayKey(NOW)); })());
t("le défi du jour compte comme jour de jeu", (() => { resetStats(); S.dailyDays = []; recordDaily(NOW); return playDays().has(dayKey(NOW)); })());
S.dailyDays = []; recordDaily(NOW); recordDaily(NOW); t("un seul défi compté par jour", S.dailyDays.length === 1);
f = checkBadges(NOW).map(b => b.id); t("premier défi du jour : badge 🎯", f.includes("daily1"));
// persévérance : réussir après beaucoup d'essais ratés
resetStats(); S.stats.acts["prog:c1"] = { t: 600, fails: 9, opens: 3, wins: 1, done: dayKey(NOW), title: "x" }; f = checkBadges(NOW).map(b => b.id);
t("réussir après 9 essais ratés : « Je n'abandonne pas »", f.includes("persist"));
resetStats(); S.stats.acts["prog:c2"] = { t: 600, fails: 9, opens: 3, wins: 0, done: null, title: "y" };
delete S.badges.persist; t("beaucoup d'essais SANS réussite : pas de badge (pas de faux compliment)", !checkBadges(NOW).some(b => b.id === "persist"));
markFlag("explain"); f = checkBadges(NOW).map(b => b.id); t("« Explique mon programme » utilisé : badge 🧐", f.includes("explain"));
// 3. tout terminé
S.progress = {}; RANKS.forEach(r => r.steps.forEach(s => (S.progress[s.sec] = S.progress[s.sec] || {})[s.id] = true)); checkBadges(NOW);
const L = badgeList(); t(`avec tout réussi, ${L.filter(b => b.date).length} badges sur ${L.length} (le reste = jours de jeu et défis)`, ["first", "rank10", "project-pj", "learn-l7", "code-c6"].every(id => L.find(b => b.id === id).date));
t("chaque badge a une icône, un nom et une explication « comment l'obtenir »", BADGES.every(b => b.icon && b.name && b.how && b.id));
t("identifiants uniques", new Set(BADGES.map(b => b.id)).size === BADGES.length);
console.log(bad ? "PROBLEMES: " + bad : "LES BADGES FONCTIONNENT");
