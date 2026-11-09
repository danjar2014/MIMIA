// Le Grand Projet final : concevoir un robot complet, de l'idée à la fiche projet.
// 5 étapes : ① Idée  ② Pièces  ③ Montage  ④ Programme  ⑤ Fiche (imprimable)
import { el, S, save, speak, chime } from "./util.js";
import { COMP } from "./boardlogic.js";
import { mountBuild } from "./build.js";
import { mountCode, runRemote } from "./code.js";
import { PROJECTS, PARTS, projectById, projectParts } from "./projectdata.js";
import { speakCode } from "./codeengine.js";
import { robotSvg } from "./robot.js";

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const STAGES = ["Idée", "Pièces", "Montage", "Programme", "Fiche"];
const clone = o => JSON.parse(JSON.stringify(o));

// sheet : si on donne des données enregistrées, on montre seulement la fiche
export function mountProject(stage, hooks = {}, sheet = null) {
  let alive = true, child = null;
  const P = sheet || (S.project = S.project || { stage: 1, reached: 1, parts: [], code: {} });
  const head = el("div", "pstepper"), intro = el("div", "intro"), body = el("div", "pbody"), nav = el("div", "gctl");
  const back = el("button", "gb", "◀ Étape d'avant"), nxt = el("button", "gb go", "Suivant ▶");
  nav.append(back, nxt); stage.append(head, intro, body, nav);
  const say = t => { intro.innerHTML = t; speak(t); };
  const proj = () => projectById(P.pid);
  const persist = () => { if (!sheet) save(); };
  const setNext = (label, on, fn) => { nxt.textContent = label; nxt.disabled = !on; nxt.classList.toggle("dim", !on); nxt.onclick = on ? fn : null; };
  function stepper(n) {
    head.innerHTML = ""; STAGES.forEach((s, i) => { const b = el("button", "pstep" + (i + 1 === n ? " cur" : i + 1 < n ? " done" : "") , `<b>${i + 1}</b><small>${s}</small>`); b.disabled = !!sheet || i + 1 > (P.reached || 1); b.onclick = () => go(i + 1); head.append(b); });
  }
  function clear() { if (child && child.destroy) { try { child.destroy(); } catch (e) {} } child = null; body.innerHTML = ""; nxt.onclick = null; }
  function go(n) {
    clear(); P.stage = n; P.reached = Math.max(P.reached || 1, n); persist(); stepper(n);
    back.style.visibility = n > 1 && !sheet ? "" : "hidden"; back.onclick = () => go(n - 1); nxt.style.display = n === 5 ? "none" : "";
    [s1, s2, s3, s4, s5][n - 1]();
  }
  // ① Idée
  function s1() {
    say("<b>Le Grand Projet.</b> Tu es l'ingénieur ! Tu vas inventer un robot complet : choisir ses pièces, le monter, puis écrire son programme. Choisis ton projet.");
    const cards = el("div", "pcards"), det = el("div", "pdetail"); let cur = P.pid || null;
    const show = id => {
      const p = projectById(id); det.innerHTML = `<h3>${p.icon} ${esc(p.title)} <small>${"⭐".repeat(p.stars)}</small></h3><p>${esc(p.brief)}</p><b>Ce que ton robot doit savoir faire :</b><ul>${p.features.map(f => `<li>${esc(f)}</li>`).join("")}</ul>`;
      const go2 = el("button", "big-btn", P.pid === id && P.reached > 1 ? "▶ Continuer ce projet" : "▶ Je choisis ce projet"); go2.onclick = () => { if (P.pid !== id) { P.pid = id; P.parts = []; P.board = null; P.code = {}; P.reached = 1; } chime("ok"); go(2); }; det.append(go2); speak(p.title + ". " + p.brief);
    };
    PROJECTS.forEach(p => { const b = el("button", "pcard" + (cur === p.id ? " on" : ""), `<span>${p.icon}</span><b>${esc(p.title)}</b><small>Difficulté : ${"⭐".repeat(p.stars)}</small>`); b.dataset.say = p.title + ". Difficulté " + p.stars + " étoiles."; b.onclick = () => { cards.querySelectorAll(".pcard").forEach(x => x.classList.remove("on")); b.classList.add("on"); show(p.id); }; cards.append(b); });
    body.append(cards, det); if (cur) show(cur);
  }
  // ② Pièces
  function s2() {
    const p = proj(); say(`<b>Choisis tes pièces.</b> Pour « ${esc(p.title)} », réfléchis : de quoi ton robot a-t-il besoin ? Touche les pièces à emporter. Pas de pièce inutile, et rien d'oublié !`);
    const sel = new Set(P.parts || []), grid = el("div", "ppartgrid"), msg = el("div", "gmsg", "Touche une pièce pour la prendre ou la reposer."), ok = el("button", "big-btn", "✔ J'ai choisi mes pièces");
    PARTS.forEach(k => { const c = COMP[k], b = el("button", "ppart" + (sel.has(k) ? " on" : ""), `<span>${c.icon}</span><b>${c.court}</b><small>${esc(c.role)}</small>`); b.dataset.say = `${c.court}. ${c.role}`; b.onclick = () => { sel.has(k) ? sel.delete(k) : sel.add(k); b.classList.toggle("on", sel.has(k)); msg.className = "gmsg"; msg.innerHTML = `${sel.size} pièce${sel.size > 1 ? "s" : ""} choisie${sel.size > 1 ? "s" : ""}.`; }; grid.append(b); });
    ok.onclick = () => {
      const need = projectParts(p), missing = need.filter(k => !sel.has(k)), extra = [...sel].filter(k => !need.includes(k));
      if (missing.length) { chime("no"); msg.className = "gmsg warn"; msg.innerHTML = "🙂 Il te manque : " + missing.map(k => `${COMP[k].icon} ${COMP[k].court} (${k === "battery" ? "pour l'énergie" : p.why[k]})`).join(" ; ") + "."; return; }
      if (extra.length) { chime("no"); msg.className = "gmsg warn"; msg.innerHTML = "🙂 Ton robot n'a pas besoin de : " + extra.map(k => `${COMP[k].icon} ${COMP[k].court}`).join(", ") + ". Repose " + (extra.length > 1 ? "ces pièces" : "cette pièce") + " sur l'étagère !"; return; }
      chime("done"); const key = need.slice().sort().join(); if ((P.parts || []).slice().sort().join() !== key) P.board = null; P.parts = need; go(3);
    };
    body.append(grid, msg, ok); setNext("", false); nxt.style.display = "none";
  }
  // ③ Montage : on réutilise la vraie carte du robot
  function s3() {
    const p = proj(); say("<b>Monte ton robot.</b> Pose les pièces sur la carte, puis relie-les : l'énergie, les capteurs (entrées bleues) et les actions (sorties vertes).");
    const sub = el("div", "psub"); body.append(sub);
    const level = { id: "pj", title: "Montage", mission: `Voici ton robot « ${p.title} ». Pose chaque pièce sur la carte, puis relie tout au cerveau : l'énergie (rouge, + et −), les capteurs sur les entrées bleues, les actions sur les sorties vertes.`, tray: P.parts, polar: true, goal: "wired", need: p.needs, band: "c" };
    child = mountBuild(sub, level, { onWin: () => setTimeout(() => { if (!alive || !child) return; P.board = clone(child.state); persist(); setNext("Passer au programme ▶", true, () => go(4)); nxt.style.display = ""; }, 0) }, P.board || null);
    setNext("Passer au programme ▶", false); nxt.style.display = "";
  }
  // ④ Programme du cerveau, en vrai code
  function s4() {
    const p = proj(), lang = S.codeLang || "py";
    say("<b>Programme le cerveau.</b> Écris la fonction <code>boucle()</code> : elle est relue sans arrêt par le cerveau. Tu connais tout ce qu'il faut !");
    body.append(el("div", "lesson", "🎯 <b>Cahier des charges :</b><ul>" + p.features.map(f => `<li>${esc(f)}</li>`).join("") + "</ul>"));
    const sub = el("div", "psub"); body.append(sub);
    const m0 = { noTap: true, id: "pj-" + p.id, title: p.title, mission: "Ton robot doit réussir tous les essais du cahier des charges. Le programme sera testé dans plusieurs situations, les unes après les autres.", lesson: "Tu peux utiliser : if / else, and / or (&& / ||), tic(), distance(), lumiere(), boutonAppuye(), et des variables pour la mémoire. Découpe le problème en petites parties !", example: "", starter: p[lang].starter, hints: p.hints, solution: p[lang].solution, spec: { kind: "brain", goal: p.goal } };
    const done = !!(P.code && P.code[lang]);
    child = mountCode(sub, m0, { lang, speakIntro: false, onLang: l => { S.codeLang = l; save(); go(4); }, onWin: () => setTimeout(() => { if (!alive || !child) return; P.code = P.code || {}; P.code[lang] = child.ta.value; P.codeLang = lang; persist(); setNext("Voir ma fiche projet ▶", true, () => go(5)); nxt.style.display = ""; }, 0) }, done ? P.code[lang] : undefined);
    setNext("Voir ma fiche projet ▶", done, () => go(5)); nxt.style.display = "";
  }
  // ⑤ Fiche projet
  async function s5() {
    const p = proj() || projectById(P.pid); if (!p) return;
    const lang = P.codeLang || (P.code && P.code.py ? "py" : "js"), code = (P.code && P.code[lang]) || "";
    say(sheet ? "<b>Ta fiche projet.</b>" : "<b>Bravo, ton robot est prêt !</b> Voici sa fiche projet. Donne-lui un nom, puis imprime-la ou garde-la.");
    const nameIn = el("input", "pname"); nameIn.value = P.name || S.robot.name || "Bolt"; nameIn.maxLength = 20; nameIn.setAttribute("aria-label", "Nom de ton robot"); nameIn.oninput = () => { P.name = nameIn.value; sheetName.textContent = nameIn.value || "Mon robot"; persist(); };
    const fiche = el("div", "fiche"), sheetName = el("h2", "", esc(nameIn.value));
    const rows = el("ul", "crows"); rows.append(el("li", "", "⏳ Les essais sont en cours…"));
    fiche.append(el("div", "fhead", `<div class="fbot">${robotSvg(S.robot)}</div><div>${""}</div>`), sheetName,
      el("div", "fsub", `${p.icon} ${esc(p.title)} · ingénieur : <b>${esc(S.name || "Petit roboticien")}</b> · ${esc(P.date || new Date().toLocaleDateString(({ en: "en-GB", ar: "ar-SA-u-nu-latn" })[document.documentElement.lang] || "fr-FR"))}`),
      el("h4", "", "🧩 Pièces du robot"), el("ul", "fparts", projectParts(p).map(k => `<li>${COMP[k].icon} <b>${COMP[k].court}</b> — ${k === "battery" ? "l'énergie" : esc(p.why[k])}</li>`).join("")),
      el("h4", "", "🎯 Ce que sait faire mon robot"), el("ul", "", p.features.map(f => `<li>${esc(f)}</li>`).join("")),
      el("h4", "", "✅ Essais réussis"), rows, el("h4", "", `⌨️ Mon programme (${lang === "py" ? "Python" : "JavaScript"})`));
    const pre = el("pre", "excode"); pre.textContent = code || "(pas de programme enregistré)"; pre.dataset.say = "Ton programme. " + speakCode(code, lang); fiche.append(pre);
    const act = el("div", "gctl no-print"), pr = el("button", "gb go", "🖨️ Imprimer ma fiche"), sv = el("button", "gb", "💾 Garder dans Mes créations");
    pr.onclick = () => { document.body.classList.add("print-fiche"); window.print(); setTimeout(() => document.body.classList.remove("print-fiche"), 500); };
    sv.onclick = () => hooks.onSave && hooks.onSave(clone({ pid: P.pid, name: P.name || nameIn.value, code: P.code, codeLang: lang, date: P.date || new Date().toLocaleDateString(({ en: "en-GB", ar: "ar-SA-u-nu-latn" })[document.documentElement.lang] || "fr-FR"), parts: P.parts }));
    act.append(pr, sv);
    if (!sheet) { const fin = el("button", "big-btn", P.finished ? "✔ Projet terminé" : "🏁 Terminer le Grand Projet"); fin.onclick = () => { P.date = P.date || new Date().toLocaleDateString(({ en: "en-GB", ar: "ar-SA-u-nu-latn" })[document.documentElement.lang] || "fr-FR"); P.name = P.name || nameIn.value; P.finished = true; save(); fin.textContent = "✔ Projet terminé"; chime("done"); hooks.onFinish && hooks.onFinish(); }; body.append(el("label", "pnamel", "Nom de mon robot : "), nameIn, fiche, act, fin); }
    else body.append(fiche, act);
    // les essais sont rejoués pour de vrai avec le programme enregistré
    const r = code ? await runRemote({ kind: "brain", goal: p.goal, lang }, code) : null; if (!alive) return; rows.innerHTML = "";
    if (!r || !r.rows) rows.append(el("li", "bad", "✘ Aucun programme à tester pour le moment."));
    else r.rows.forEach(x => rows.append(el("li", x.ok ? "ok" : "bad", `${x.ok ? "✔" : "✘"} ${esc(x.label)}`)));
  }
  if (sheet) { stepper(5); back.style.visibility = "hidden"; nxt.style.display = "none"; s5(); }
  else go(Math.min(P.stage || 1, P.pid ? 5 : 1));
  return { destroy() { alive = false; clear(); document.body.classList.remove("print-fiche"); } };
}
