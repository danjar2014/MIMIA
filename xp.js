// Points d'expérience (XP) et objectif du jour : on récompense les étapes réussies, jamais le temps passé ni les erreurs.
import { S, save } from "./util.js";
import { dayKey } from "./stats.js";

export const GOALS = [
  { xp: 50, icon: "🌱", name: "Tranquille", sub: "1 étape par jour" },
  { xp: 100, icon: "🌿", name: "Normal", sub: "2 étapes par jour" },
  { xp: 200, icon: "🌳", name: "Motivé", sub: "4 étapes par jour" }
];
const st = () => (S.xp && S.xp.v === 1 ? S.xp : (S.xp = { v: 1, total: 0, days: {} }));
export const goalXP = () => S.dailyGoalXP || 100;
export const totalXP = () => st().total;
export const todayXP = (now = Date.now()) => st().days[dayKey(now)] || 0;
// 50 XP pour une étape réussie la première fois, +25 si elle a été réussie sans aucun essai raté
export const stepXP = fails => 50 + (fails === 0 ? 25 : 0);
export function addXP(n, now = Date.now()) {
  const s = st(), k = dayKey(now), before = s.days[k] || 0, goal = goalXP();
  s.days[k] = before + n; s.total += n;
  const keys = Object.keys(s.days); if (keys.length > 150) keys.sort().slice(0, keys.length - 120).forEach(d => delete s.days[d]);
  save(); return { before, after: before + n, goal, crossed: before < goal && before + n >= goal, firstOfDay: before === 0 };
}
