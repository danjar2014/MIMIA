// Tableau de bord des parents : où en est l'enfant, combien de temps il joue, où il bloque, quoi faire.
import { el, S, save, speak, toast } from "./util.js";
import { askConfirm } from "./confirm.js";
import { summary, summaryText, fmtMin, resetStats, limitState } from "./stats.js";
import { BANDS } from "./levels.js";
import { badgeList, playDays, softStreak } from "./badges.js";
import { todayXP, totalXP, goalXP } from "./xp.js";

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const frDate = k => { const [y, m, d] = k.split("-"); return `${d}/${m}`; };

export function renderDashboard(host, { onBack, onNext } = {}) {
  host.innerHTML = ""; const sm = summary(), who = S.name || "Votre enfant", lim = limitState();
  const card = (title, html, cls = "") => { const c = el("section", "dcard " + cls); c.append(el("h3", "", title)); if (typeof html === "string") c.insertAdjacentHTML("beforeend", html); else c.append(html); host.append(c); return c; };
  const bar = (pct, label, color) => `<div class="dbar" role="img" aria-label="${esc(label)}"><i style="width:${Math.max(2, Math.round(pct))}%;background:${color || "#3f7fd6"}"></i></div>`;

  // 1. résumé
  const pctAll = Math.round(100 * sm.doneSteps / sm.totalSteps);
  card(`👋 ${esc(who)}${S.age ? " · " + BANDS[S.age].name : ""}`, `
    <div class="dhero"><div class="dbig">${sm.rank.icon}</div><div><b>Aventure ${sm.rank.i + 1} sur 11 : ${esc(sm.rank.name)}</b><div class="dsmall">${sm.rank.done}/${sm.rank.total} étapes dans cette aventure</div></div></div>
    ${bar(pctAll, `${pctAll} pour cent du parcours`, "#4caf6a")}<div class="dsmall">${sm.doneSteps} étape${sm.doneSteps > 1 ? "s" : ""} réussie${sm.doneSteps > 1 ? "s" : ""} sur ${sm.totalSteps} (${pctAll} % du parcours)</div>
    <div class="dstats"><div><b>${fmtMin(sm.todaySec)}</b><span>aujourd'hui</span></div><div><b>${fmtMin(sm.weekSec)}</b><span>cette semaine</span></div><div><b>${sm.streak}</b><span>jour${sm.streak > 1 ? "s" : ""} d'affilée</span></div><div><b>${sm.sessions}</b><span>séance${sm.sessions > 1 ? "s" : ""}</span></div></div>
    ${S.placementResult ? `<div class="dsmall">🎯 Test de niveau du ${esc(S.placementResult.date)} : ${S.placementResult.passes} bonne${S.placementResult.passes > 1 ? "s" : ""} réponse${S.placementResult.passes > 1 ? "s" : ""} d'affilée sur 5, départ à l'aventure ${S.placementResult.rank + 1}.</div>` : ""}
    ${sm.next ? `<div class="dsmall">Prochaine étape conseillée : <b>${esc(onNext ? onNext(sm.next) : sm.next.id)}</b></div>` : ""}`);

  // 2. semaine
  const max = Math.max(30 * 60, ...sm.week.map(d => d.sec));
  card("📅 Temps de jeu des 7 derniers jours", `<div class="dweek">${sm.week.map(d => `<div class="dday${d.today ? " today" : ""}"><span class="dval">${d.sec ? Math.max(1, Math.round(d.sec / 60)) : ""}</span><div class="dcol" role="img" aria-label="${d.label} : ${fmtMin(d.sec)}"><i style="height:${d.sec ? Math.max(4, Math.round(100 * d.sec / max)) : 0}%"></i></div><span class="dlab">${d.label}</span></div>`).join("")}</div>
    <div class="dsmall">Minutes de jeu actif par jour (le temps où l'écran reste sans être touché ne compte pas). Moyenne les jours de jeu : <b>${fmtMin(sm.avgActive)}</b>. Total depuis le début : <b>${fmtMin(sm.totalSec)}</b>.</div>`);

  // 3. compétences
  card("🧠 Compétences", sm.cats.map(c => { const p = Math.round(100 * c.done / c.total); return `<div class="drow"><span>${esc(c.name)}</span><span class="dsmall">${c.done}/${c.total}</span></div>${bar(p, `${c.name} : ${p} pour cent`, p === 100 ? "#4caf6a" : "#3f7fd6")}`; }).join(""));

  // 4. parcours
  card("🗺️ Les 11 aventures", `<div class="dranks">${sm.ranks.map((r, i) => `<div class="drank${r.complete ? " ok" : i === sm.rank.i ? " cur" : ""}"><span>${r.icon}</span><b>${esc(r.name)}</b><small>${r.done}/${r.total}${r.complete ? " ✅" : ""}</small></div>`).join("")}</div>`);

  // 4 bis. motivation
  { const L = badgeList(), got = L.filter(b => b.date).length, ss = softStreak(playDays());
    card("🏅 Motivation", `<div class="dstats"><div><b>${got}/${L.length}</b><span>badges</span></div><div><b>${ss.streak}</b><span>jour${ss.streak > 1 ? "s" : ""} de série douce</span></div><div><b>${(S.dailyDays || []).length}</b><span>défi${(S.dailyDays || []).length > 1 ? "s" : ""} du jour</span></div><div><b>${playDays().size}</b><span>jours de jeu</span></div><div><b>${todayXP()}/${goalXP()}</b><span>XP du jour</span></div><div><b>${totalXP()}</b><span>XP au total</span></div></div><div class="dsmall">La « série douce » compte les jours de jeu : un jour de repos ne la casse pas (elle s'arrête après deux jours sans jouer), et un jour manqué n'est jamais affiché comme un échec. Les badges récompensent l'effort et la régularité.</div>${got ? `<div class="dsmall">Derniers badges : ${L.filter(b => b.date).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4).map(b => b.icon + " " + esc(b.name)).join(" · ")}</div>` : ""}`); }

  // 5. à surveiller
  card("👀 À surveiller", sm.stuck.length ? `<ul class="dlist">${sm.stuck.map(x => `<li><b>${esc(x.title)}</b><br><span class="dsmall">${x.fails} essai${x.fails > 1 ? "s" : ""} raté${x.fails > 1 ? "s" : ""} · ${x.min} min passées · pas encore réussi</span></li>`).join("")}</ul><div class="dsmall">Ces étapes lui demandent plus de temps. Un coup de main de votre part (lire la consigne ensemble, utiliser 💡 Indice) fait souvent la différence.</div>` : `<div>Rien à signaler pour le moment 🎉</div>`, sm.stuck.length ? "warn" : "");

  // 6. réussites récentes
  card("⭐ Dernières réussites", sm.recentDone.length ? `<ul class="dlist">${sm.recentDone.map(x => `<li>${esc(x.title)} <span class="dsmall">· ${frDate(x.day)}</span></li>`).join("")}</ul>` : "<div>Pas encore de réussite enregistrée : le suivi démarre dès la première activité terminée.</div>");

  // 7. conseils
  card("💬 Conseils pour vous", `<ul class="dlist">${sm.tips.map(t => `<li>${esc(t)}</li>`).join("")}</ul>`);

  // 8. réglages
  const set = el("div", "dset"), sel = el("select", "csel"); [[0, "Pas de limite"], [20, "20 minutes"], [30, "30 minutes"], [45, "45 minutes"], [60, "1 heure"], [90, "1 h 30"]].forEach(([v, l]) => { const o = el("option", "", l); o.value = v; if ((S.dailyLimit || 0) === v) o.selected = true; sel.append(o); });
  sel.onchange = () => { S.dailyLimit = +sel.value; S.limitShown = null; save(); toast("Limite enregistrée ✔"); };
  set.append(el("label", "drow", "<span>Limite de temps par jour</span>"), sel, el("div", "dsmall", lim.limit ? `Aujourd'hui : ${lim.used} min sur ${lim.limit + lim.extra} min.` : "Sans limite, l'appli propose seulement une pause (rappel réglable dans les réglages)."));
  const acts = el("div", "gctl no-print"), mk = (txt, fn) => { const b = el("button", "gb", txt); b.onclick = fn; acts.append(b); return b; };
  mk("🔊 Lire le résumé", () => speak(summaryText(sm, who), { force: true }));
  mk("🖨️ Imprimer le rapport", () => { document.body.classList.add("print-dash"); window.print(); setTimeout(() => document.body.classList.remove("print-dash"), 500); });
  mk("📋 Copier le résumé", async () => { try { await navigator.clipboard.writeText(summaryText(sm, who)); toast("Résumé copié ✔"); } catch (e) { toast("Copie impossible sur cet appareil"); } });
  mk("🗑 Effacer les statistiques", () => { const ov = document.getElementById("overlay"), shut = () => { ov.style.display = "none"; ov.innerHTML = ""; }; askConfirm(ov, { title: "Effacer les statistiques ?", sub: "La progression de l'enfant est gardée.", onYes: () => { shut(); resetStats(); renderDashboard(host, { onBack, onNext }); toast("Statistiques effacées (la progression est gardée)"); }, onNo: shut }); });
  set.append(acts); card("⚙️ Réglages et outils", set, "no-print-card");
  host.append(el("div", "dsmall dprivacy", "🔒 Ces informations restent sur cet appareil. Rien n'est envoyé sur Internet."));
  return sm;
}
