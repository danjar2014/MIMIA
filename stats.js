// Suivi pour les parents : temps passé (seulement quand l'enfant joue vraiment), réussites, difficultés.
// Tout reste sur l'appareil (localStorage), rien n'est envoyé nulle part.
import { S, save, hooks } from "./util.js";
import { RANKS, stepDone, rankDone, rankProgress, currentRank, nextStep } from "./parcours.js";

const pad = n => String(n).padStart(2, "0");
export const dayKey = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const DAYS = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
const state = () => (S.stats && S.stats.v === 1 ? S.stats : (S.stats = { v: 1, days: {}, acts: {}, recent: [], sessions: 0, lastStart: 0 }));
const dayOf = (t) => { const s = state(), k = dayKey(t); return s.days[k] || (s.days[k] = { t: 0, f: 0, w: 0 }); };
const actOf = k => { const s = state(); return s.acts[k] || (s.acts[k] = { t: 0, fails: 0, opens: 0, wins: 0, done: null, title: "" }); };
export const statKey = (sec, id) => sec + ":" + id;

// ----- enregistrement -----
export function addSeconds(n, cur, now = Date.now()) {
  const d = dayOf(now); d.t += n; if (cur) actOf(cur).t += n;
  const keys = Object.keys(state().days); if (keys.length > 150) keys.sort().slice(0, keys.length - 120).forEach(k => delete state().days[k]);
}
export function noteOpen(k, title, now = Date.now()) { const a = actOf(k); a.opens++; if (title) a.title = title; }
export function noteFail(k, now = Date.now()) { if (!k) return; actOf(k).fails++; dayOf(now).f++; }
export function noteDone(k, now = Date.now()) {
  const a = actOf(k), s = state(); a.wins++; dayOf(now).w++;
  if (!a.done) { a.done = dayKey(now); s.recent.unshift({ t: now, k }); s.recent = s.recent.slice(0, 60); }
}
export function noteStart(now = Date.now()) { const s = state(); if (now - (s.lastStart || 0) > 30 * 60000) s.sessions++; s.lastStart = now; }
export const resetStats = () => { S.stats = null; state(); save(); };

// ----- suivi en direct dans l'appli -----
let cur = null, lastInput = Date.now(), started = false;
export function track(sec, id, title) { cur = sec ? statKey(sec, id) : null; if (cur) noteOpen(cur, title); }
export const currentKey = () => cur;
export function initStats({ onLimit } = {}) {
  if (started) return; started = true; noteStart();
  ["pointerdown", "keydown", "input", "touchstart"].forEach(e => document.addEventListener(e, () => { lastInput = Date.now(); }, true));
  hooks.fail = () => { noteFail(cur); };
  hooks.done = (sec, id) => { noteDone(statKey(sec, id)); save(); };
  setInterval(() => {
    if (document.hidden || Date.now() - lastInput > 60000) return;
    addSeconds(5, cur); save();
    if (onLimit && limitState().over) onLimit();
  }, 5000);
}
// limite quotidienne (réglée par les parents) : 0 = pas de limite
export function limitState(now = Date.now()) {
  const limit = S.dailyLimit || 0, today = dayKey(now), extra = S.limitExtra && S.limitExtra.day === today ? S.limitExtra.mins : 0, used = Math.floor(((state().days[today] || {}).t || 0) / 60);
  return { limit, used, extra, over: limit > 0 && used >= limit + extra, left: limit > 0 ? Math.max(0, limit + extra - used) : null };
}
export const extendLimit = (mins = 15, now = Date.now()) => { const today = dayKey(now), e = S.limitExtra && S.limitExtra.day === today ? S.limitExtra.mins : 0; S.limitExtra = { day: today, mins: e + mins }; S.limitShown = null; save(); };

// ----- le bilan -----
export function categoryOf(s) {
  if (s.sec === "learn" && s.id === "l7") return "Blocs de programmation";
  if (s.sec === "learn" || s.sec === "disc") return "Les bases";
  if (s.sec === "prog") return "Blocs de programmation";
  if (s.sec === "build" || s.sec === "lab") return "Électronique et capteurs";
  if (s.sec === "project") return "Grand projet";
  if (s.sec === "code") return /^k/.test(s.id) ? "Code : premiers pas" : /^r/.test(s.id) ? "Robot en code" : "Cerveau en code";
  return "Autres";
}
const fmtMin = sec => { const m = Math.round(sec / 60); return m < 1 ? (sec > 0 ? "< 1 min" : "0 min") : m < 60 ? m + " min" : Math.floor(m / 60) + " h " + pad(m % 60); };
export { fmtMin };

export function summary(now = Date.now()) {
  const s = state(), today = dayKey(now), steps = RANKS.flatMap(r => r.steps);
  const week = []; for (let i = 6; i >= 0; i--) { const d = new Date(now - i * 86400000), k = dayKey(d); week.push({ day: k, label: DAYS[d.getDay()], sec: (s.days[k] || {}).t || 0, today: k === today }); }
  const activeDays = Object.entries(s.days).filter(([k, v]) => v.t >= 60).map(([k]) => k).sort();
  let streak = 0; { let i = (s.days[today] || {}).t >= 60 ? 0 : 1; for (; i < 400; i++) { const k = dayKey(now - i * 86400000); if (((s.days[k] || {}).t || 0) >= 60) streak++; else break; } }
  const weekSec = week.reduce((a, d) => a + d.sec, 0), totalSec = Object.values(s.days).reduce((a, d) => a + d.t, 0), last = activeDays[activeDays.length - 1];
  const sinceLast = last ? Math.floor((new Date(today) - new Date(last)) / 86400000) : null;
  const cats = {}; steps.forEach(st => { const c = categoryOf(st), o = cats[c] || (cats[c] = { name: c, done: 0, total: 0 }); o.total++; if (stepDone(st)) o.done++; });
  const stuck = Object.entries(s.acts).filter(([k, a]) => !a.done && (a.fails >= 6 || a.t >= 900)).sort((x, y) => y[1].fails - x[1].fails || y[1].t - x[1].t).slice(0, 5).map(([k, a]) => ({ key: k, title: a.title || k, fails: a.fails, min: Math.round(a.t / 60) }));
  const recentDone = s.recent.slice(0, 8).map(r => ({ t: r.t, day: dayKey(r.t), title: (s.acts[r.k] || {}).title || r.k }));
  const doneSteps = steps.filter(stepDone).length, cr = currentRank(), ns = nextStep();
  const ranks = RANKS.map((r, i) => ({ icon: r.icon, name: r.name, ...rankProgress(i), complete: rankDone(i) }));
  const todaySec = (s.days[today] || {}).t || 0, tips = [];
  if (totalSec === 0) tips.push("Aucune activité enregistrée pour l'instant. Installez-vous à côté de votre enfant pour sa première leçon : 10 minutes suffisent.");
  else {
    if (sinceLast != null && sinceLast >= 3) tips.push(`Votre enfant n'a pas joué depuis ${sinceLast} jours. Reprenez en douceur : une leçon courte de 10 minutes, en commençant par une étape qu'il a réussie.`);
    if (todaySec >= 45 * 60) tips.push(`Déjà ${fmtMin(todaySec)} aujourd'hui : c'est beaucoup. Proposez une vraie pause (bouger, boire de l'eau) avant de continuer.`);
    if (streak >= 3) tips.push(`🎉 ${streak} jours d'affilée ! Félicitez-le pour sa régularité, c'est plus utile que de longues séances.`);
    if (stuck.length) tips.push(`Il bute sur « ${stuck[0].title} » (${stuck[0].fails} essais ratés). Asseyez-vous avec lui : faites-lui lire la consigne à voix haute, utilisez le bouton 💡 Indice, et félicitez chaque petit progrès.`);
    if (cr >= 7) tips.push("Il écrit du vrai code. Demandez-lui d'expliquer son programme avec ses mots : s'il sait l'expliquer, il l'a compris.");
  }
  tips.push("Idéal : une séance de 15 à 20 minutes, une idée à la fois, sans chronomètre. L'erreur fait partie de l'apprentissage.");
  return { today, week, weekSec, totalSec, todaySec, activeDays: activeDays.length, avgActive: activeDays.length ? Math.round(totalSec / activeDays.length) : 0, streak, sinceLast, sessions: s.sessions || 0, cats: Object.values(cats), stuck, recentDone, doneSteps, totalSteps: steps.length, rank: { i: cr, icon: RANKS[cr].icon, name: RANKS[cr].name, ...rankProgress(cr) }, next: ns ? ns.step : null, ranks, tips, fails: Object.values(s.days).reduce((a, d) => a + d.f, 0) };
}
// texte lu à voix haute / copiable
export function summaryText(sum, who = "Votre enfant") {
  return `${who} est à l'aventure ${sum.rank.i + 1} sur ${RANKS.length} : ${sum.rank.name}. ${sum.doneSteps} étapes réussies sur ${sum.totalSteps}. Temps de jeu : ${fmtMin(sum.todaySec)} aujourd'hui, ${fmtMin(sum.weekSec)} cette semaine. ${sum.streak ? sum.streak + " jours d'affilée. " : ""}${sum.stuck.length ? "À surveiller : " + sum.stuck.map(x => x.title).join(", ") + ". " : "Rien à signaler. "}${sum.tips[0]}`;
}
