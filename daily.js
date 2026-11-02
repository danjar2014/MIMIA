// Défi du jour : 3 questions courtes de révision. Pas de chronomètre, pas de score négatif : une erreur est expliquée gentiment.
import { el, S, save, chime, speak } from "./util.js";
import { makeDaily } from "./dailyq.js";
import { dayKey } from "./stats.js";
import { recordDaily } from "./badges.js";
import { speakCode } from "./codeengine.js";

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const dailyDoneToday = () => !!(S.daily && S.daily.day === dayKey(Date.now()) && S.daily.done);

export function mountDaily(stage, hooks = {}) {
  const today = dayKey(Date.now()); let alive = true, i = 0, ok = 0, practice = !!hooks.practice, qs = [];
  const root = el("div", "lbox"); stage.append(root);
  function start() {
    qs = makeDaily(practice ? today + "-p" + Math.random() : today, { avoid: S.dailyLast || [] }); i = 0; ok = 0; question();
  }
  function intro() {
    root.innerHTML = ""; const t = el("div", "gmsg lt", dailyDoneToday() ? "✅ Tu as déjà fait le défi d'aujourd'hui ! Reviens demain pour un nouveau. Tu peux aussi t'entraîner encore, sans compter." : "🎯 Le défi du jour : 3 petites questions pour réviser ce que tu as appris. Pas de chrono, pas de souci si tu te trompes !");
    const row = el("div", "gctl");
    if (dailyDoneToday()) { const p = el("button", "big-btn", "🎯 M'entraîner encore"); p.onclick = () => { practice = true; start(); }; row.append(p); }
    else { const g = el("button", "big-btn", "▶ C'est parti !"); g.onclick = start; row.append(g); }
    root.append(el("div", "artbig", "🎯"), t, row);
  }
  function question() {
    const q = qs[i]; root.innerHTML = "";
    root.append(el("div", "ldots", qs.map((_, k) => `<i class="${k < i ? "d" : k === i ? "c" : ""}"></i>`).join("")));
    const text = el("div", "gmsg lt", esc(q.text).replace(/\n/g, "<br>")); root.append(text);
    if (q.art) root.append(el("pre", "dgrid", esc(q.art)));
    if (q.code) { const pre = el("pre", "excode", ""); pre.textContent = q.code; pre.dataset.say = "Voici le programme. " + speakCode(q.code, q.lang); root.append(pre); }
    const row = el("div", "lchoices dchoices"), fb = el("div", "gmsg lt", ""), next = el("button", "gb go", i === qs.length - 1 ? "Terminer ✔" : "Question suivante ▶"); next.style.display = "none"; let answered = false;
    q.choices.forEach(c => { const b = el("button", "lchoice dchoice", `<small>${esc(c.label)}</small>`); b.dataset.say = c.label;
      b.onclick = () => { if (answered) return; answered = true; row.querySelectorAll("button").forEach((x, k) => { if (q.choices[k].ok) x.classList.add("good"); }); if (c.ok) { ok++; b.classList.add("good"); chime("ok"); fb.className = "gmsg lt ok"; fb.innerHTML = "✅ Bravo ! " + esc(q.why); } else { b.classList.add("bad"); chime("step"); fb.className = "gmsg lt warn"; fb.innerHTML = "🙂 Pas tout à fait. " + esc(q.why); } next.style.display = ""; };
      row.append(b); });
    next.onclick = () => { if (i < qs.length - 1) { i++; question(); } else finish(); };
    root.append(row, fb, next);
  }
  function finish() {
    if (!practice) { S.daily = { day: today, done: true, ok }; S.dailyLast = [...(S.dailyLast || []), ...qs.filter(q => q.kind === "concept").map(q => q.id)].slice(-12); save(); recordDaily(); }
    root.innerHTML = ""; chime("done");
    root.append(el("div", "artbig", "⭐".repeat(Math.max(1, ok))), el("div", "gmsg lt ok", `${ok === 3 ? "Parfait !" : ok >= 1 ? "Bien joué !" : "Tu as bien travaillé !"} ${ok} bonne${ok > 1 ? "s" : ""} réponse${ok > 1 ? "s" : ""} sur ${qs.length}. ${practice ? "Entraînement terminé." : "Défi du jour terminé : bravo pour ta régularité !"}`));
    const row = el("div", "gctl"), b1 = el("button", "big-btn", "🗺️ Mon parcours"), b2 = el("button", "big-btn alt", "🏅 Mes badges"); b1.onclick = () => hooks.onParcours && hooks.onParcours(); b2.onclick = () => hooks.onBadges && hooks.onBadges(); row.append(b1, b2); root.append(row);
    hooks.onFinish && hooks.onFinish(ok, practice);
  }
  intro();
  return { destroy() { alive = false; } };
}
