// Simulateur : le robot se déplace sur une grille quand on exécute le programme
import { el, S, sleep, chime, speak, sfx } from "./util.js";
import { createEditor, runProgram, Limit, D } from "./blocks.js";
import { robotSvg } from "./robot.js";
import { CONDS } from "./levels.js";
import { attachCodeView } from "./codeview.js";
import { gridToCode } from "./blockcode.js";
import { hintFor, hintStage } from "./hints.js";

import { parseScenario, DIRS } from "./scenario.js";
export { parseScenario };

export const scenariosOf = level => (level.scenarios || [{ map: level.map, dir: level.dir }]).map(parseScenario);

// moteur sans affichage (sert aussi aux tests) : renvoie { ok, reason, ... }
export function simulate(level, lists, onStep) {
  const results = [];
  for (const sc of scenariosOf(level)) {
    const st = { r: sc.start[0], c: sc.start[1], dir: sc.dir, picked: new Set(), trail: [[sc.start[0], sc.start[1]]], bump: null };
    const blocked = () => { const [dr, dc] = DIRS[st.dir], r = st.r + dr, c = st.c + dc; return r < 0 || c < 0 || r >= sc.h || c >= sc.w || sc.rocks.has(r + "," + c); };
    const env = { cond: n => n === "obstacle" ? blocked() : n === "libre" ? !blocked() : n === "etoile" ? sc.stars.has(st.r + "," + st.c) && !st.picked.has(st.r + "," + st.c) : n === "pasarrive" ? !(sc.flag && sc.flag[0] === st.r && sc.flag[1] === st.c) : false };
    let limit = false, empty = !lists.main.length;
    try {
      for (const n of runProgram(lists, env)) {
        if (n.t === "fd") { if (blocked()) { st.bump = [st.r, st.c]; break; } const [dr, dc] = DIRS[st.dir]; st.r += dr; st.c += dc; st.trail.push([st.r, st.c]); if (level.auto && sc.stars.has(st.r + "," + st.c)) st.picked.add(st.r + "," + st.c); }
        else if (n.t === "tl") st.dir = (st.dir + 3) % 4; else if (n.t === "tr") st.dir = (st.dir + 1) % 4;
        else if (n.t === "pick") { if (sc.stars.has(st.r + "," + st.c)) st.picked.add(st.r + "," + st.c); }
        if (onStep) onStep(n, st, sc);
      }
    } catch (e) { if (e instanceof Limit) limit = true; else throw e; }
    const atFlag = !sc.flag || (sc.flag[0] === st.r && sc.flag[1] === st.c), allStars = st.picked.size === sc.stars.size;
    results.push({ ok: !st.bump && !limit && atFlag && allStars, bump: st.bump, limit, empty, atFlag, missing: sc.stars.size - st.picked.size, st });
  }
  return results;
}

export function mountGrid(stage, level, hooks = {}) {
  let alive = true, running = false, runId = 0, fast = false;
  const scs = scenariosOf(level);
  const palette = level.allow.map(k => ({ ...D[k] })); if (!level.fn) { const i = palette.findIndex(p => p.t === "call"); if (i >= 0) palette.splice(i, 1); }
  let view = null;
  const editor = createEditor({ palette, conds: CONDS, fn: !!level.fn, onChange: () => view && view.update() });
  const intro = el("div", "intro", level.intro), msg = el("div", "gmsg", "&nbsp;"), wrap = el("div", "gridwrap"), gridEl = el("div", "pgrid"), bot = el("div", "bot");
  wrap.append(gridEl); gridEl.append(bot);
  const ctl = el("div", "gctl"), mkb = (cls, txt, fn) => { const b = el("button", "gb " + cls, txt); b.onclick = fn; ctl.append(b); return b; };
  const bRun = mkb("go", "▶ Lancer", () => run()), bReset = mkb("", "⟲ Recommencer", () => resetScene(true)), bSpeed = mkb("", "🐢 Lent", () => { fast = !fast; bSpeed.textContent = fast ? "🐇 Rapide" : "🐢 Lent"; }),
    bClear = mkb("", "🗑 Effacer", () => { presses = 0; editor.clear(); resetScene(true); say("Programme effacé. Touche les blocs pour recommencer."); }), bHint = mkb("", "💡 Indice", () => hint());
  stage.append(intro, wrap, msg, ctl, editor.el);
  view = attachCodeView(stage, { gen: lang => gridToCode(editor.lists, lang), open: !!hooks.codeOpen, onOpen: hooks.onOpenCode ? (code, lang) => hooks.onOpenCode({ kind: "robot", level, code, lang }) : null, note: hooks.codeOpen ? "👀 Regarde : pendant que tu poses des blocs, le code s'écrit tout seul ! Chaque bloc = une ligne." : null });
  // la consigne est lue une seule fois, à l'arrivée sur l'écran (voice.js)

  let sci = 0, sc = scs[0], cs = 48, picked = new Set(), cells = [], pos = { r: 0, c: 0, dir: 1 };
  const say = (t, cls) => { msg.className = "gmsg " + (cls || ""); msg.innerHTML = t; };
  function size() { const avail = Math.max(240, Math.min(stage.clientWidth || innerWidth - 32, 560)); return Math.max(26, Math.min(62, Math.floor(Math.min(avail / sc.w, innerHeight * 0.3 / sc.h)))); }
  function build(i) {
    sci = i; sc = scs[i]; cs = size(); picked = new Set(); gridEl.innerHTML = ""; gridEl.append(bot); cells = [];
    gridEl.style.cssText = `width:${sc.w * cs}px;height:${sc.h * cs}px;grid-template-columns:repeat(${sc.w},${cs}px);grid-template-rows:repeat(${sc.h},${cs}px);--cs:${cs}px`;
    for (let r = 0; r < sc.h; r++) for (let c = 0; c < sc.w; c++) { const k = r + "," + c, d = el("div", "cell" + ((r + c) % 2 ? " alt" : "")); if (sc.rocks.has(k)) d.innerHTML = "🪨"; else if (sc.stars.has(k)) d.innerHTML = '<span class="star">⭐</span>'; if (sc.flag && sc.flag[0] === r && sc.flag[1] === c) d.innerHTML += '<span class="flag">🏁</span>'; d.dataset.k = k; gridEl.append(d); cells.push(d); }
    bot.style.cssText = `width:${cs}px;height:${cs}px`; bot.innerHTML = `<div class="ring"><i class="arr"></i></div>` + robotSvg();
    pos = { r: sc.start[0], c: sc.start[1], dir: sc.dir }; place(false);
  }
  function place(anim = true) { bot.style.transition = anim && !S.calm ? "transform .3s" : "none"; bot.style.transform = `translate(${pos.c * cs}px,${pos.r * cs}px)`; bot.querySelector(".ring").style.transform = `rotate(${pos.dir * 90}deg)`; }
  const cellAt = (r, c) => cells[r * sc.w + c];
  function resetScene(clearMsg) { runId++; running = false; bRun.disabled = false; build(0); editor.highlight(null); if (clearMsg) say("&nbsp;"); }
  // indices progressifs et personnalisés (hints.js) : le but, ce que fait mon programme, le prochain bloc, une solution
  let presses = 0;
  function hint() { const h = hintFor(level, editor.lists, hintStage(editor.lists, presses++)); say(h.text, "hint"); speak(h.say, { force: true }); }

  async function run() {
    if (running) return; if (!editor.lists.main.length) { say("Ton programme est vide. Touche des blocs ci-dessus pour les ajouter 👆", "warn"); return; }
    running = true; bRun.disabled = true; const my = ++runId; say("Le robot exécute ton programme…");
    for (let i = 0; i < scs.length; i++) {
      build(i); if (scs.length > 1) say(`Parcours ${i + 1} sur ${scs.length}…`); await sleep(250);
      const sim = simulateLive(my);
      let r; try { r = await sim; } catch (e) { return; }
      if (!alive || my !== runId) return;
      if (!r.ok) { fail(r); running = false; bRun.disabled = false; return; }
      if (i < scs.length - 1) { say(`✔ Parcours ${i + 1} réussi ! Je teste le suivant…`, "ok"); chime("ok"); await sleep(900); }
    }
    running = false; bRun.disabled = false; editor.highlight(null); presses = 0; chime("done"); say("🎉 Bravo ! Ton programme a marché" + (scs.length > 1 ? " sur tous les parcours !" : " !"), "ok"); speak("Bravo ! Ton programme a marché."); hooks.onWin && hooks.onWin();
  }
  async function simulateLive(my) {
    const lists = editor.lists, res = { ok: false, bump: null, limit: false, atFlag: true, missing: 0 };
    const blocked = () => { const [dr, dc] = DIRS[pos.dir], r = pos.r + dr, c = pos.c + dc; return r < 0 || c < 0 || r >= sc.h || c >= sc.w || sc.rocks.has(r + "," + c); };
    const env = { cond: n => n === "obstacle" ? blocked() : n === "libre" ? !blocked() : n === "etoile" ? sc.stars.has(pos.r + "," + pos.c) && !picked.has(pos.r + "," + pos.c) : n === "pasarrive" ? !(sc.flag && sc.flag[0] === pos.r && sc.flag[1] === pos.c) : false };
    const take = () => { const k = pos.r + "," + pos.c; if (sc.stars.has(k) && !picked.has(k)) { picked.add(k); const s = cellAt(pos.r, pos.c).querySelector(".star"); if (s) s.classList.add("got"); chime("ok"); } };
    const foot = () => { const c = cellAt(pos.r, pos.c); if (c && !c.querySelector(".foot")) c.insertAdjacentHTML("beforeend", '<i class="foot"></i>'); };
    foot();
    try {
      for (const n of runProgram(lists, env)) {
        if (!alive || my !== runId) throw new Error("cancel");
        editor.highlight(n); await sleep(window.__turbo ? 2 : fast ? 130 : 420);
        if (n.t === "fd") { if (blocked()) { res.bump = [pos.r, pos.c]; sfx("bump"); break; } const [dr, dc] = DIRS[pos.dir]; pos.r += dr; pos.c += dc; sfx("move"); place(); foot(); if (level.auto) take(); }
        else if (n.t === "tl") { pos.dir = (pos.dir + 3) % 4; sfx("turn"); place(); } else if (n.t === "tr") { pos.dir = (pos.dir + 1) % 4; sfx("turn"); place(); }
        else if (n.t === "pick") { const before = picked.size; take(); if (picked.size === before) say("Il n'y a pas d'étoile ici, le robot ne ramasse rien.", "warn"); }
      }
    } catch (e) { if (e instanceof Limit) res.limit = true; else throw e; }
    await sleep(250); editor.highlight(null);
    res.atFlag = !sc.flag || (sc.flag[0] === pos.r && sc.flag[1] === pos.c); res.missing = sc.stars.size - picked.size; res.ok = !res.bump && !res.limit && res.atFlag && res.missing === 0; return res;
  }
  function fail(r) {
    chime("no"); const bits = [];
    if (r.bump) { const c = cellAt(r.bump[0], r.bump[1]); c.insertAdjacentHTML("beforeend", '<span class="oops">❗</span>'); bits.push("Aïe ! Le robot a cogné un obstacle (regarde le ❗). Où faut-il tourner avant ?"); }
    else if (r.limit) bits.push("Le robot tourne en rond ! Regarde ta boucle : est-ce qu'elle finit un jour ?");
    else { if (!r.atFlag) bits.push("Le robot s'est arrêté, mais il n'est pas arrivé au drapeau 🏁."); if (r.missing) bits.push(`Il manque ${r.missing} étoile${r.missing > 1 ? "s" : ""} ⭐.`); }
    say(bits.join(" ") + " Les petits pas sur la grille montrent son chemin. Change ton programme et relance 🙂", "warn");
  }
  build(0); say("Touche des blocs pour écrire ton programme, puis ▶ Lancer.");
  return { editor, destroy() { alive = false; runId++; }, resetScene, run, get running() { return running; } };
}
