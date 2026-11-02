// « Coder pour de vrai » : un éditeur de JavaScript, des touches d'aide, et le résultat montré pas à pas
import { el, S, save, sleep, chime, speak, tone, voiceMode } from "./util.js";
import { runSpec, speakCode, symbolName, wordName } from "./codeengine.js";
import { DOC, API } from "./codemissions.js";
import { forLang, DOC_PY, API_PY } from "./codepy.js";
import { robotSvg } from "./robot.js";
import { parseScenario } from "./scenario.js";
import { describeOut } from "./boardlogic.js";
import { explainCode, explainSpeech } from "./explain.js";
import { markFlag } from "./badges.js";
import { tapEligible, buildGuide, mountTapCode } from "./tapcode.js";

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const nl = n => (n === 1 ? "" : "s");

// exécute le code dans un Worker (impossible de bloquer la page) ; 3,5 s maximum
export function runRemote(spec, code, ms = 3500) {
  return new Promise(res => {
    let w; try { w = new Worker(new URL("./codeworker.js", import.meta.url), { type: "module" }); } catch (e) { return res(runSpec(spec, code)); }
    const t = setTimeout(() => { w.terminate(); res({ ok: false, stage: "timeout", output: [] }); }, ms);
    w.onmessage = e => { clearTimeout(t); w.terminate(); res(e.data); };
    w.onerror = () => { clearTimeout(t); w.terminate(); res({ ok: false, stage: "runtime", error: { msg: "Je n'ai pas réussi à lancer ton programme. Recharge la page et essaie encore.", line: null, text: "" }, output: [] }); };
    w.postMessage({ spec, code });
  });
}

const drafts = {};
const PYKEYS = [["(", "parenthèse ouvrante"], [")", "parenthèse fermante"], ["[", "crochet ouvrant"], ["]", "crochet fermant"], ["\"", "guillemet"], [":", "deux points"], ["=", "égale"], ["==", "égale égale, pour comparer"], ["!=", "différent de"], ["+", "plus"], ["-", "moins"], ["*", "fois"], ["/", "divisé par"], ["//", "division entière"], ["%", "reste de la division"], ["<", "plus petit que"], [">", "plus grand que"], ["<=", "plus petit ou égal"], [">=", "plus grand ou égal"], [",", "virgule"], ["#", "dièse, pour un commentaire"], [".", "point"]];
const PYSNIPS = [["for", "for i in range(5):\n    ‸", "boucle pour"], ["while", "while ‸:\n    ", "boucle tant que"], ["if", "if ‸:\n    ", "si"], ["elif", "elif ‸:\n    ", "sinon si"], ["else", "else:\n    ‸", "sinon"], ["def", "def nom(‸):\n    ", "définir une fonction"], ["return", "return ‸", "renvoie"], ["and", " and ", "et"], ["or", " or ", "ou"], ["not", "not ", "pas"], ["True", "True", "vrai"], ["False", "False", "faux"]];
const KEYS = [["(", "parenthèse ouvrante"], [")", "parenthèse fermante"], ["{", "accolade ouvrante"], ["}", "accolade fermante"], ['"', "guillemet"], [";", "point-virgule"], ["=", "égale"], ["+", "plus"], ["-", "moins"], ["*", "fois"], ["/", "divisé par"], ["%", "reste de la division"], ["<", "plus petit que"], [">", "plus grand que"], ["!", "pas, point d'exclamation"], ["&&", "et"], ["||", "ou"], [",", "virgule"], [".", "point"]];
const SNIPS = [["let", "let nom = ‸;", "créer une boîte"], ["for", "for (let i = 0; i < 5; i++) {\n  ‸\n}", "boucle for"], ["while", "while (‸) {\n  \n}", "boucle tant que"], ["if", "if (‸) {\n  \n}", "si"], ["else", " else {\n  ‸\n}", "sinon"], ["function", "function nom(‸) {\n  \n}", "fonction"], ["return", "return ‸;", "renvoie"]];

export function mountCode(stage, m0, hooks = {}, startCode) {
  const lang = hooks.lang || S.codeLang || "py", py = lang === "py", m = forLang(m0, lang), IND = py ? "    " : "  ", dkey = m0.id + lang;
  let alive = true, running = false, hintN = 0, runId = 0;
  const kind = m.spec.kind, free = !!m.spec.free;
  const intro = el("div", "intro", m.mission), lesson = m.lesson ? el("div", "lesson", "💡 <b>À savoir :</b> " + m.lesson) : null;
  const ta = el("textarea", "codeed"); ta.value = startCode ?? drafts[dkey] ?? m.starter; ta.rows = Math.min(14, Math.max(8, (ta.value.match(/\n/g) || []).length + 3));
  Object.entries({ spellcheck: "false", autocapitalize: "off", autocorrect: "off", autocomplete: "off", "aria-label": "Éditeur de code" }).forEach(([k, v]) => ta.setAttribute(k, v));
  const status = el("div", "cstat", "Ligne 1"), msg = el("div", "gmsg", "Écris ton programme, puis touche ▶ Lancer."), shown = el("pre", "excode"), out = el("div", "cout"), ctl = el("div", "gctl");
  shown.style.display = "none";
  const sw = el("div", "langsw"); sw.append(el("span", "apl", "Langage :"));
  [["py", "🐍 Python (simple)"], ["js", "🟨 JavaScript"]].forEach(([l, label]) => { const b = el("button", "chip" + (l === lang ? " on" : ""), label); b.setAttribute("aria-label", l === "py" ? "Langage Python" : "Langage JavaScript"); b.onclick = () => { if (l === lang) return; drafts[dkey] = ta.value; hooks.onLang && hooks.onLang(l); }; sw.append(b); });
  const tapOk = !m0.noTap && !startCode && !!m.solution && tapEligible(m.solution, m0.id);
  const modeRow = el("div", "langsw"), modeChips = {};
  if (tapOk) { modeRow.append(el("span", "apl", "Écrire :")); [["tap", "🧩 En touchant des mots"], ["type", "⌨️ En tapant"]].forEach(([k, label]) => { const b = el("button", "chip", label); b.onclick = () => { S.codeInput = k; save(); setMode(k); }; modeChips[k] = b; modeRow.append(b); }); }
  stage.append(sw, ...(tapOk ? [modeRow] : []), intro); if (lesson) stage.append(lesson);
  if (m.example) {
    const ex = el("div", "exwrap"), pre = el("pre", "excode", esc(m.example)); pre.dataset.say = "Exemple. " + speakCode(m.example, lang);
    const cp = el("button", "gb", "⬇ Copier l'exemple dans l'éditeur"); cp.onclick = () => { ta.value = m.example + "\n"; ta.focus(); upd(); say("Exemple copié. Change-le pour l'adapter à ta mission !"); };
    ex.append(el("div", "exl", "Un exemple"), pre, cp); stage.append(ex);
  }
  // commandes disponibles
  const ap = el("div", "apis"); ap.append(el("span", "apl", "Commandes :"));
  (py ? API_PY : API)[kind].forEach(n => { const doc = (py ? DOC_PY : DOC)[n] || "", b = el("button", "api", n + "()"); b.dataset.say = `${wordName(n)}. ${doc}`; b.onclick = () => { insert(n + "(‸)" + (py || !/^(afficher|avancer|tournerGauche|tournerDroite|ramasser|lampe|roues|hautParleur)$/.test(n) ? "" : ";")); say(esc(doc || n)); }; ap.append(b); });
  stage.append(ap);
  // éditeur + touches
  const keys = el("div", "ckeys");
  (py ? PYKEYS : KEYS).forEach(([k, name]) => { const b = el("button", "ckey", esc(k)); b.setAttribute("aria-label", name); b.onclick = () => insert(k); keys.append(b); });
  const sn = el("div", "ckeys snip"); (py ? PYSNIPS : SNIPS).forEach(([k, code, name]) => { const b = el("button", "ckey wide", k); b.setAttribute("aria-label", name); b.onclick = () => insert(code); sn.append(b); });
  const tab = el("button", "ckey wide", "⇥"); tab.setAttribute("aria-label", py ? "décaler de quatre espaces" : "décaler de deux espaces"); tab.onclick = () => insert(IND); const ent = el("button", "ckey wide", "↵"); ent.setAttribute("aria-label", "nouvelle ligne"); ent.onclick = () => enter(); sn.append(tab, ent);
  const tapHost = el("div", "taphost"); let tapView = null;
  stage.append(tapHost, ta, status, keys, sn);
  const mk = (cls, txt, fn) => { const b = el("button", "gb " + cls, txt); b.onclick = fn; ctl.append(b); return b; };
  const bRun = mk("go", "▶ Lancer", () => run());
  mk("", "💡 Indice", () => hint());
  mk("", "🔊 Lire mon code", () => say(esc(speakCode(ta.value, lang)).replace(/\. Ligne/g, ".<br>Ligne")));
  mk("", "🧐 Explique-moi", () => explain());
  mk("", "🧹 Effacer", () => { ta.value = m.starter; drafts[dkey] = ta.value; upd(); out.innerHTML = ""; shown.style.display = "none"; say("Éditeur remis au départ."); });
  if (hooks.onSave) mk("", "💾 Garder", () => hooks.onSave(ta.value));
  const exBox = el("div", "explain"); exBox.style.display = "none";
  stage.append(ctl, msg, exBox, shown, out);
  // la consigne est lue une seule fois, à l'arrivée sur l'écran (voice.js) ; pas de lecture en double ici

  const say = (t, cls) => { msg.className = "gmsg " + (cls || ""); msg.innerHTML = t; };
  function upd() { const before = ta.value.slice(0, ta.selectionStart).split("\n"); status.textContent = `Ligne ${before.length}, colonne ${before[before.length - 1].length + 1}`; }
  const indentOf = () => { const s = ta.selectionStart, ls = ta.value.lastIndexOf("\n", s - 1) + 1; return /^ */.exec(ta.value.slice(ls, s))[0]; };
  function insert(txt) {
    const ind = indentOf(); txt = txt.replace(/\n/g, "\n" + ind); const at = txt.indexOf("‸"), body = txt.replace("‸", ""); const s = ta.selectionStart, e = ta.selectionEnd;
    ta.setRangeText(body, s, e, "end"); const pos = at >= 0 ? s + at : s + body.length; ta.setSelectionRange(pos, pos); ta.focus(); upd();
  }
  function enter() {
    const s = ta.selectionStart, v = ta.value, ind = indentOf(), lineStart = v.lastIndexOf("\n", s - 1) + 1, before = v.slice(lineStart, s).replace(/\s+$/, "");
    const open = py ? before.endsWith(":") : v[s - 1] === "{", close = !py && v[s] === "}";
    const add = "\n" + ind + (open ? IND : ""), tail = open && close ? "\n" + ind : "";
    ta.setRangeText(add + tail, s, ta.selectionEnd, "end"); const p = s + add.length; ta.setSelectionRange(p, p); ta.focus(); upd();
  }
  ta.addEventListener("keydown", e => { if (e.key === "Tab") { e.preventDefault(); insert(IND); } else if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enter(); } });
  ta.addEventListener("keyup", upd); ta.addEventListener("input", () => { drafts[dkey] = ta.value; }); ta.addEventListener("click", upd);
  // la voix accompagne l'écriture : chaque mot ou signe tapé est dit
  ta.addEventListener("input", e => {
    if (!S.voice || voiceMode() !== "complet" || !e.data || e.data.length > 1) return; const c = e.data;
    if (/[\s;(){}\[\]=+\-*/%<>!&|,.":#]/.test(c)) { const before = ta.value.slice(0, ta.selectionStart - 1), w = /[A-Za-zÀ-ÿ_$][\wÀ-ÿ$]*$|\d+$/.exec(before); speak(w ? wordName(w[0]) : symbolName(c) || ""); }
  });

  function explain() {
    const r = explainCode(ta.value, lang); exBox.innerHTML = ""; exBox.style.display = "";
    if (!r.rows.length) { exBox.append(el("div", "exl", "Ton programme est vide : écris quelques lignes, puis demande-moi de les expliquer !")); return say("Écris d'abord quelques lignes, puis touche 🧐.", "warn"); }
    exBox.append(el("div", "exl", "🧐 Ton programme, ligne par ligne"), el("div", "exsum", esc(r.summary)));
    r.rows.forEach(x => { const row = el("div", "exrow", `<span class="exn">${x.n}</span><div><code>${esc(x.code)}</code><div>${esc(x.text)}</div></div>`); row.style.marginLeft = x.depth * 14 + "px"; row.dataset.say = `Ligne ${x.n}. ${x.text}`; exBox.append(row); });
    const rd = el("button", "gb", "🔊 Lire l'explication"); rd.onclick = () => speak(explainSpeech(r), { force: true }); exBox.append(rd);
    say("🧐 Voilà ! Je t'explique chaque ligne de ton programme, juste en dessous.", "ok"); markFlag("explain"); hooks.onExplain && hooks.onExplain();
  }
  function hint() {
    const hs = m.hints || []; if (hintN < hs.length) { say(`💡 Indice ${hintN + 1} sur ${hs.length} : ${esc(hs[hintN])}`, "hint"); hintN++; return; }
    if (!m.solution) return say("Pas d'autre indice ici : essaie, c'est ton atelier ! 🙂", "hint");
    shown.textContent = m.solution; shown.dataset.say = "Solution possible. " + speakCode(m.solution); shown.style.display = "";
    say("Voici une solution possible. Lis-la, essaie de la comprendre, puis écris-la toi-même avec tes mots 🙂", "hint");
  }

  function showErr(r, prefix = "") {
    const e = r.error || {}; let h = `❌ ${prefix}${e.line ? `<b>Ligne ${e.line}</b> : ` : ""}${esc(e.msg || "Erreur")}`;
    if (e.text) h += `<br><code class="errl">${esc(e.text)}</code>`;
    say(h, "warn"); chime("no");
    if (e.line) { const ls = ta.value.split("\n"), a = ls.slice(0, e.line - 1).join("\n").length + (e.line > 1 ? 1 : 0), b = a + (ls[e.line - 1] || "").length; try { ta.setSelectionRange(a, b); } catch (x) {} }
  }
  const win = () => { chime("done"); say("🎉 Bravo ! Ton programme fonctionne" + (kind === "robot" && m.spec.scenarios.length > 1 ? " sur tous les parcours !" : " !"), "ok"); hooks.onWin && hooks.onWin(); };

  async function run() {
    if (running) return; const code = ta.value, my = ++runId;
    if (!code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").trim()) return say("Ton programme est vide. Écris des instructions dans l'éditeur, puis relance 👆", "warn");
    running = true; bRun.disabled = true; out.innerHTML = ""; say("L'ordinateur lit ton programme…");
    try {
      const r = await runRemote(m.spec, code); if (!alive || my !== runId) return;
      if (r.stage === "timeout") { say("⏱️ Ton programme ne s'arrête jamais ! Il tourne en rond : regarde la condition de ta boucle (while ou for). Elle doit devenir fausse un jour.", "warn"); chime("no"); return; }
      if (r.stage === "syntax") return showErr(r, "Faute d'écriture. ");
      if (kind === "robot") return await showRobot(r, my, code);
      if (kind === "brain") return await showBrain(r, my);
      showConsole(r);
    } finally { running = false; bRun.disabled = false; }
  }

  function showConsole(r) {
    const box = el("div", "console"); (r.output || []).forEach(l => box.append(el("div", "cl", esc(l)))); if (!(r.output || []).length) box.append(el("div", "cl dim", "(rien n'est affiché)"));
    out.append(el("div", "exl", "Ce que ton programme affiche :"), box);
    if (r.rows) { const ul = el("ul", "crows"); r.rows.forEach(x => ul.append(el("li", x.ok ? "ok" : "bad", `${x.ok ? "✔" : "✘"} ${esc(x.label)} → ${esc(x.got)}${x.ok ? "" : ` (il fallait ${esc(x.want)})`}`))); out.append(el("div", "exl", "Essais de ta fonction :"), ul); }
    if (r.error) return showErr(r, "Ton programme s'est arrêté. ");
    if (free) return say("✅ Ton programme a fini. Voilà ce qu'il a affiché.", "ok");
    if (r.ok) win(); else { chime("no"); say("❌ " + esc(r.why), "warn"); }
  }

  async function showRobot(r, my, code) {
    const spec = m.spec; let lastRes = null;
    for (let i = 0; i < r.results.length; i++) {
      const sc = parseScenario(spec.scenarios[i]), res = r.results[i]; lastRes = res;
      out.innerHTML = ""; const wrap = el("div", "gridwrap"), gridEl = el("div", "pgrid"), bot = el("div", "bot"); wrap.append(gridEl); out.append(wrap);
      const avail = Math.max(240, Math.min(stage.clientWidth || innerWidth - 32, 560)), cs = Math.max(26, Math.min(62, Math.floor(Math.min(avail / sc.w, innerHeight * 0.3 / sc.h))));
      gridEl.style.cssText = `width:${sc.w * cs}px;height:${sc.h * cs}px;grid-template-columns:repeat(${sc.w},${cs}px);grid-template-rows:repeat(${sc.h},${cs}px);--cs:${cs}px`;
      const cells = []; for (let a = 0; a < sc.h; a++) for (let b = 0; b < sc.w; b++) { const k = a + "," + b, d = el("div", "cell" + ((a + b) % 2 ? " alt" : "")); if (sc.rocks.has(k)) d.innerHTML = "🪨"; else if (sc.stars.has(k)) d.innerHTML = '<span class="star">⭐</span>'; if (sc.flag && sc.flag[0] === a && sc.flag[1] === b) d.innerHTML += '<span class="flag">🏁</span>'; gridEl.append(d); cells.push(d); }
      gridEl.append(bot); bot.style.cssText = `width:${cs}px;height:${cs}px`; bot.innerHTML = `<div class="ring"><i class="arr"></i></div>` + robotSvg();
      const pos = { r: sc.start[0], c: sc.start[1], dir: sc.dir }, cell = (a, b) => cells[a * sc.w + b];
      const place = () => { bot.style.transition = S.calm ? "none" : "transform .25s"; bot.style.transform = `translate(${pos.c * cs}px,${pos.r * cs}px)`; bot.querySelector(".ring").style.transform = `rotate(${pos.dir * 90}deg)`; };
      const foot = () => { const c = cell(pos.r, pos.c); if (c && !c.querySelector(".foot")) c.insertAdjacentHTML("beforeend", '<i class="foot"></i>'); };
      const take = () => { const s = cell(pos.r, pos.c).querySelector(".star"); if (s) { s.classList.add("got"); chime("ok"); } };
      place(); foot(); if (r.results.length > 1) say(`Parcours ${i + 1} sur ${r.results.length}…`); await sleep(window.__turbo ? 2 : 300);
      for (const s of res.limit ? res.log.slice(0, 40) : res.log) {
        if (!alive || my !== runId) return; await sleep(window.__turbo ? 2 : 260);
        if (s.a === "fd") { pos.r = s.r; pos.c = s.c; place(); foot(); if (spec.auto && sc.stars.has(s.r + "," + s.c)) take(); }
        else if (s.a === "tl") { pos.dir = (pos.dir + 3) % 4; place(); } else if (s.a === "tr") { pos.dir = (pos.dir + 1) % 4; place(); }
        else if (s.a === "pick") { if (s.ok) take(); else say("Il n'y a pas d'étoile ici, le robot ne ramasse rien.", "warn"); }
        else if (s.a === "bump") cell(s.r, s.c).insertAdjacentHTML("beforeend", '<span class="oops">❗</span>');
      }
      if ((res.output || []).length) { const box = el("div", "console"); res.output.forEach(l => box.append(el("div", "cl", esc(l)))); out.append(box); }
      await sleep(window.__turbo ? 2 : 250);
      if (!res.ok) break;
      if (i < r.results.length - 1) { say(`✔ Parcours ${i + 1} réussi ! Je teste le suivant…`, "ok"); chime("ok"); await sleep(window.__turbo ? 2 : 800); }
    }
    if (r.ok) return win();
    chime("no");
    if (lastRes && lastRes.error) return showErr({ error: lastRes.error }, "Le robot s'est arrêté. ");
    const bits = [];
    if (lastRes && lastRes.bump) bits.push("Aïe ! Le robot a cogné un obstacle (regarde le ❗). Où faut-il tourner avant ?");
    else if (lastRes && lastRes.limit) bits.push("Ton programme tourne en rond ! Regarde ta boucle : se termine-t-elle un jour ?");
    else if (lastRes) { if (!lastRes.atFlag) bits.push("Le robot a fini ton programme, mais il n'est pas arrivé au drapeau 🏁."); if (lastRes.missing) bits.push(`Il manque ${lastRes.missing} étoile${nl(lastRes.missing)} ⭐.`); }
    if (r.why) bits.push(r.why);
    say("❌ " + bits.join(" ") + " Les petits pas montrent son chemin. Change ton code et relance 🙂", "warn");
  }

  async function showBrain(r, my) {
    if (r.error) return showErr(r, "Ton programme s'est arrêté. ");
    const road = el("div", "road"), rb = el("div", "rb"), obst = el("div", "obst", "🧱"), chips = el("div", "chips2"), ul = el("ul", "crows");
    road.append(rb, obst); out.append(road, chips, ul);
    const paint = (inp, got) => { rb.innerHTML = robotSvg(S.robot, got.led ? "#ffd54a" : "#bbb"); rb.classList.toggle("glow", !!got.led); road.classList.toggle("rolling", !!got.motor); obst.style.left = (84 - inp.dist * 0.5) + "%";
      chips.innerHTML = `<span>📏 obstacle : ${inp.dist} cm</span><span>☀️ lumière : ${inp.light}</span><span>🔘 bouton : ${inp.pressed ? "appuyé" : "relâché"}</span><span>⏱ ${inp.t % 2 === 0 ? "tic" : "pas de tic"}</span><span class="${got.motor ? "on" : ""}">⚙️ roues : ${got.motor ? "en marche" : "arrêtées"}</span><span class="${got.led ? "on" : ""}">💡 lampe : ${got.led ? "allumée" : "éteinte"}</span><span class="${got.speaker ? "on" : ""}">🔊 son : ${got.speaker ? "il sonne" : "silence"}</span>`; };
    for (let i = 0; i < r.rows.length; i++) {
      if (!alive || my !== runId) return; const x = r.rows[i]; say(`Essai ${i + 1} : ${esc(x.label)}…`); paint(x.inp, x.got); if (x.got.speaker) tone(880, 0.15, "square", 0.08);
      await sleep(window.__turbo ? 3 : 800); ul.append(el("li", x.ok ? "ok" : "bad", `${x.ok ? "✔" : "✘"} ${esc(x.label)}`));
    }
    if (r.ok) win(); else { chime("no"); say("❌ " + esc(r.why), "warn"); }
  }

  const typedParts = [ta, status, keys, sn, ctl, ap];
  function setMode(k) {
    const tap = k === "tap" && tapOk;
    typedParts.forEach(x => { x.style.display = tap ? "none" : ""; }); tapHost.style.display = tap ? "" : "none";
    Object.entries(modeChips).forEach(([key, b]) => b.classList.toggle("on", key === (tap ? "tap" : "type")));
    if (tap) { if (tapView) tapView.destroy(); tapHost.innerHTML = ""; out.innerHTML = ""; shown.style.display = "none"; const guide = buildGuide(m.solution, lang, m0.id); tapView = mountTapCode(tapHost, guide, { lang, say, onDone: code => { ta.value = code; drafts[dkey] = code; upd(); setMode("type"); say("🎉 Tu as construit tout le programme ! Je le lance…", "ok"); setTimeout(run, 500); } }); }
    else if (tapView) { tapView.destroy(); tapView = null; }
  }
  setMode(tapOk && (S.codeInput ? S.codeInput === "tap" : S.age === "a") ? "tap" : "type");
  upd();
  return { ta, run, destroy() { alive = false; runId++; }, get running() { return running; } };
}
