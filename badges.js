// Badges et « série douce » : on récompense la régularité et l'effort, jamais on ne punit un jour manqué.
import { S, save, isDone } from "./util.js";
import { RANKS, rankDone } from "./parcours.js";
import { dayKey } from "./stats.js";

const DAY = 86400000;
// les jours où l'enfant a vraiment joué : au moins 1 minute de jeu, une étape réussie, ou le défi du jour fait
export function playDays() {
  const days = new Set(); const st = S.stats && S.stats.v === 1 ? S.stats.days : {};
  Object.entries(st).forEach(([k, v]) => { if (v.t >= 60 || v.w > 0) days.add(k); });
  (S.dailyDays || []).forEach(k => days.add(k)); return days;
}
// série douce : un jour de repos ne casse rien. Elle ne s'arrête qu'après DEUX jours sans jouer.
export function softStreak(days, now = Date.now()) {
  const today = dayKey(now); let i = days.has(today) ? 0 : 1, streak = 0, misses = 0, rested = false;
  for (; i < 400; i++) { const k = dayKey(now - i * DAY); if (days.has(k)) { if (misses === 1) rested = true; streak++; misses = 0; } else if (misses === 0 && streak > 0) misses = 1; else break; }
  return { streak, rested, playedToday: days.has(today) };
}
const flag = k => !!(S.flags && S.flags[k]);
export const markFlag = k => { S.flags = S.flags || {}; if (!S.flags[k]) { S.flags[k] = true; save(); } };

const step = (sec, id, icon, name, how) => ({ id: `${sec}-${id}`, icon, name, how, test: () => isDone(sec, id) });
export const BADGES = [
  { id: "first", icon: "👣", name: "Premier pas", how: "Réussis ta toute première étape.", test: () => RANKS.some(r => r.steps.some(s => isDone(s.sec, s.id))) },
  step("learn", "l2", "📣", "Je donne des ordres", "Termine la leçon « C'est quoi un ordre ? »."),
  step("learn", "l6", "🌟", "Mon premier programme", "Écris ton tout premier programme."),
  step("prog", "b1", "🔁", "Roi de la boucle", "Réussis ta première boucle « répéter »."),
  step("prog", "c3", "🔀", "Je décide tout seul", "Réussis ta première condition « si »."),
  step("prog", "c4", "🧩", "Ma propre commande", "Crée ton premier « Mon bloc »."),
  step("build", "e3", "⚡", "Électricien", "Allume la lampe de ton robot."),
  step("build", "e4", "👁️", "Les yeux du robot", "Donne un capteur de distance à ton robot."),
  step("build", "p1", "🧠", "Le cerveau programmé", "Programme le cerveau avec des blocs."),
  step("build", "m1", "🐘", "Une mémoire d'éléphant", "Donne une mémoire au cerveau."),
  step("learn", "l7", "🔗", "Traducteur", "Regarde tes blocs devenir du vrai code."),
  step("code", "k1", "⌨️", "Premières lignes de code", "Écris ton premier vrai programme."),
  step("code", "k5", "🔄", "Boucle en vrai code", "Écris une boucle for en Python ou JavaScript."),
  step("code", "k10", "🛠️", "Je crée une fonction", "Écris ta première fonction."),
  step("code", "r5", "🤖", "Je pilote en code", "Fais avancer le robot avec une boucle while."),
  step("code", "c6", "💻", "Cerveau en code", "Écris la mémoire du cerveau en vrai code."),
  step("project", "pj", "🏆", "Ingénieur Expert", "Termine le Grand Projet."),
  ...RANKS.map((r, i) => ({ id: `rank${i}`, icon: r.icon, name: `Rang ${i + 1} · ${r.name}`, how: `Termine tout le rang ${r.name}.`, test: () => rankDone(i) })),
  { id: "days3", icon: "🌱", name: "3 jours de jeu", how: "Joue pendant 3 jours (pas forcément de suite).", test: c => c.days >= 3 },
  { id: "days7", icon: "🌿", name: "7 jours de jeu", how: "Joue pendant 7 jours.", test: c => c.days >= 7 },
  { id: "days14", icon: "🌳", name: "14 jours de jeu", how: "Joue pendant 14 jours.", test: c => c.days >= 14 },
  { id: "days30", icon: "🏔️", name: "30 jours de jeu", how: "Joue pendant 30 jours.", test: c => c.days >= 30 },
  { id: "streak3", icon: "🔥", name: "Série douce de 3 jours", how: "Joue 3 jours presque de suite (un jour de repos est permis).", test: c => c.streak >= 3 },
  { id: "streak7", icon: "☄️", name: "Série douce de 7 jours", how: "Joue 7 jours presque de suite.", test: c => c.streak >= 7 },
  { id: "daily1", icon: "🎯", name: "Premier défi du jour", how: "Termine un défi du jour.", test: c => c.daily >= 1 },
  { id: "daily7", icon: "🎖️", name: "7 défis du jour", how: "Termine 7 défis du jour.", test: c => c.daily >= 7 },
  { id: "persist", icon: "💪", name: "Je n'abandonne pas", how: "Réussis une étape sur laquelle tu avais beaucoup essayé (6 essais ou plus).", test: c => c.persist >= 1 },
  { id: "explain", icon: "🧐", name: "Je comprends mon code", how: "Utilise « Explique mon programme ».", test: () => flag("explain") }
];
function ctx(now = Date.now()) {
  const days = playDays(), acts = (S.stats && S.stats.acts) || {};
  return { days: days.size, streak: softStreak(days, now).streak, daily: (S.dailyDays || []).length, persist: Object.values(acts).filter(a => a.done && a.fails >= 6).length };
}
export const earnedMap = () => S.badges || {};
// vérifie les badges ; renvoie les NOUVEAUX. La toute première fois, on accorde en silence ceux déjà mérités.
export function checkBadges(now = Date.now()) {
  const c = ctx(now), got = (S.badges = S.badges || {}), fresh = [];
  BADGES.forEach(b => { if (!got[b.id]) { let ok = false; try { ok = !!b.test(c); } catch (e) {} if (ok) { got[b.id] = dayKey(now); fresh.push(b); } } });
  const silent = !S.badgesInit; S.badgesInit = true; if (fresh.length || silent) save();
  return silent ? [] : fresh;
}
export const badgeList = () => BADGES.map(b => ({ ...b, date: earnedMap()[b.id] || null }));
export function recordDaily(now = Date.now()) { const k = dayKey(now); S.dailyDays = S.dailyDays || []; if (!S.dailyDays.includes(k)) { S.dailyDays.push(k); S.dailyDays = S.dailyDays.slice(-400); } save(); }
