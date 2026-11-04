// Rang « Poussin » : pour quelqu'un qui ne sait rien. On montre de quoi il s'agit : « ceci est… », « cela veut dire… »,
// puis on essaie pas à pas. Une idée par page, la voix lit tout, aucune erreur n'est grave.
import { el, S, sleep, chime, speak } from "./util.js";
import { robotSvg } from "./robot.js";
import { parseScenario, DIRS } from "./scenario.js";

const ORD = { fd: { icon: "⬆️", name: "avance", say: "Cet ordre veut dire : avance d'un pas." }, tl: { icon: "↶", name: "tourne à gauche", say: "Cet ordre veut dire : tourne à gauche, sur place." }, tr: { icon: "↷", name: "tourne à droite", say: "Cet ordre veut dire : tourne à droite, sur place." } };
const T = (art, label, ok, why) => ({ art, label, ok, why });
const ROBOT = T("🤖", "Ceci est un robot.", true), FLAG = T("🏁", "Ceci est un drapeau.", false, "Ceci est un drapeau, pas le robot. Cherche la petite machine avec des yeux !"), STAR = T("⭐", "Ceci est une étoile.", false, "Ceci est une étoile. Elle est jolie, mais ce n'est pas ce qu'on cherche."), ROCK = T("🪨", "Ceci est un caillou.", false, "Ceci est un caillou. Le robot ne peut pas le traverser !");

export const LESSONS = [
  { id: "l1", icon: "🤖", title: "C'est quoi un robot ?", pages: [
    { type: "info", art: "🤖", text: "Ceci est un robot. Un robot est une machine qui peut bouger et faire des choses." },
    { type: "info", art: "🏁", text: "Cela est un drapeau. Dans nos jeux, le robot doit aller jusqu'au drapeau." },
    { type: "tap", text: "Touche le robot.", items: [FLAG, ROBOT, STAR, ROCK] },
    { type: "tap", text: "Maintenant, touche le drapeau.", items: [ROBOT, STAR, T("🏁", "Ceci est un drapeau.", true), ROCK] },
    { type: "info", art: "👦 ➜ 🤖", text: "Un robot ne pense pas tout seul. Il fait ce qu'on lui demande : on dit qu'il obéit à des ordres." },
    { type: "tap", text: "Qui donne les ordres au robot ?", items: [T("🤖", "Le robot lui-même", false, "Un robot tout seul ne décide de rien. Il attend des ordres."), T("👦", "Toi, ou la personne qui écrit le programme", true), T("☁️", "Un nuage", false, "Non, les nuages ne parlent pas aux robots !")] }
  ] },
  { id: "l2", icon: "📣", title: "C'est quoi un ordre ?", pages: [
    { type: "info", art: "⬆️", text: "Ceci est un ordre. Il veut dire : avance d'un pas." },
    { type: "info", art: "↷ &nbsp; ↶", text: "Ceci, ↷, veut dire : tourne à droite. Cela, ↶, veut dire : tourne à gauche. Le robot tourne sur place, il n'avance pas." },
    { type: "mini", mode: "now", text: "Touche l'ordre ⬆️. Le robot obéit tout de suite !", map: ["R..F"], dir: 1, orders: ["fd"], win: "Bravo ! Tu as donné trois ordres « avance »." },
    { type: "mini", mode: "now", text: "Cette fois, il faut tourner. Essaie les ordres !", map: ["R.", ".F"], dir: 1, orders: ["fd", "tl", "tr"], sol: ["fd", "tr", "fd"], win: "Bravo ! Avance, tourne, avance." },
    { type: "tap", text: "Quel ordre fait tourner le robot à droite ?", items: [T("⬆️", "Cet ordre fait avancer.", false, "Cet ordre fait avancer le robot, pas tourner."), T("↷", "Cet ordre tourne à droite.", true), T("↶", "Cet ordre tourne à gauche.", false, "Celui-ci tourne à gauche. Regarde bien le sens de la flèche.")] }
  ] },
  { id: "l3", icon: "📜", title: "C'est quoi un programme ?", pages: [
    { type: "info", art: "📜", text: "Un programme, c'est une liste d'ordres, les uns après les autres. Le robot lit la liste de haut en bas, comme tu lis un livre." },
    { type: "mini", mode: "queue", text: "Ajoute 4 fois l'ordre ⬆️ dans la liste, puis touche ▶ pour lancer ton programme.", map: ["R...F"], dir: 1, orders: ["fd"], guide: ["fd", "fd", "fd", "fd"], win: "Ton premier programme a marché !" },
    { type: "mini", mode: "queue", text: "Un programme avec un virage. Je te montre où toucher 👆", map: ["R..", "..F"], dir: 1, orders: ["fd", "tl", "tr"], guide: ["fd", "fd", "tr", "fd"], win: "Bravo ! Quatre ordres, un seul programme." },
    { type: "tap", text: "Dans quel sens le robot lit-il le programme ?", items: [T("⬆️", "De bas en haut", false, "Non, il commence par le premier ordre, en haut de la liste."), T("⬇️", "De haut en bas", true), T("🔀", "Dans le désordre", false, "Non ! Un robot suit exactement la liste, jamais dans le désordre.")] }
  ] },
  { id: "l4", icon: "🔀", title: "L'ordre compte !", pages: [
    { type: "info", art: "↷⬆️ ≠ ⬆️↷", text: "Attention ! « Tourne puis avance » n'est pas pareil que « avance puis tourne ». Le robot fait les ordres exactement dans l'ordre de la liste." },
    { type: "mini", mode: "queue", fixed: ["fd", "fd", "tr"], text: "Le robot regarde vers la droite, mais le drapeau est en bas. Utilise ces 3 ordres, dans le bon ordre !", map: ["R", ".", "F"], dir: 1, orders: ["fd", "tr"], sol: ["tr", "fd", "fd"], bumpMsg: "Aïe ! Le robot a foncé dans le mur. Il fallait peut-être tourner AVANT d'avancer ?", win: "Oui ! D'abord tourner, ensuite avancer." },
    { type: "mini", mode: "queue", fixed: ["fd", "tr", "fd", "fd"], text: "Encore un ! Remets les 4 ordres dans le bon ordre.", map: ["R.", "..", ".F"], dir: 1, orders: ["fd", "tr"], sol: ["fd", "tr", "fd", "fd"], bumpMsg: "Aïe ! Le robot ne peut pas aller par là. Change l'ordre et recommence.", win: "Bravo ! Tu sais ranger les ordres." },
    { type: "tap", text: "Ces deux programmes sont-ils pareils ?  « ⬆️ ↷ »  et  « ↷ ⬆️ »", items: [T("✅", "Oui, ils sont pareils", false, "Non ! Le robot ne finit pas au même endroit. L'ordre change tout."), T("❌", "Non, ils sont différents", true)] }
  ] },
  { id: "l5", icon: "📱", title: "C'est quoi cet écran ?", pages: [
    { type: "info", art: "📱", text: "Un écran, c'est comme le tableau de bord d'une voiture. Chaque bouton a un rôle. Touche chaque chose pour savoir à quoi elle sert." },
    { type: "tour", text: "Touche chaque élément de l'écran.", spots: [
      { key: "back", art: "⬅️", say: "Ceci te ramène en arrière.", label: "retour" }, { key: "pause", art: "⏸️", say: "Ceci met le jeu en pause. Tu peux respirer tranquillement.", label: "pause" },
      { key: "field", art: "🗺️", say: "Ceci est le terrain : c'est là que le robot se déplace.", label: "le terrain" }, { key: "blocks", art: "🧩", say: "Ceci, ce sont les blocs. Chaque bloc est un ordre pour le robot.", label: "les blocs" },
      { key: "run", art: "▶ Lancer", say: "Cela lance ton programme : le robot lit ta liste d'ordres.", label: "lancer" }, { key: "hint", art: "💡", say: "Cela te donne un indice quand tu es bloqué.", label: "indice" }, { key: "voice", art: "🔊", say: "Cela lit à voix haute ce qui est écrit à l'écran.", label: "voix" }] },
    { type: "tap", text: "Quel bouton lance ton programme ?", items: [T("⏸️", "Ceci fait une pause.", false, "Ceci met en pause. Pour lancer, cherche le bouton avec le triangle."), T("▶", "Ceci lance le programme.", true), T("💡", "Cela donne un indice.", false, "Cela aide quand on est bloqué, mais ça ne lance rien.")] }
  ] },
  { id: "l6", icon: "🌟", title: "Mon tout premier programme", pages: [
    { type: "info", art: "🌟", text: "Tu sais ce qu'est un robot, un ordre et un programme. Maintenant, on écrit ton premier vrai programme ensemble !" },
    { type: "mini", mode: "queue", text: "Je te montre où toucher 👆 Fais arriver le robot au drapeau.", map: ["R..", "...", "..F"], dir: 1, orders: ["fd", "tl", "tr"], guide: ["fd", "fd", "tr", "fd", "fd"], win: "Bravo !" },
    { type: "mini", mode: "queue", text: "À toi, sans aide ! Si tu es bloqué, touche 💡.", map: ["R...", "....", "...F"], dir: 1, orders: ["fd", "tl", "tr"], sol: ["fd", "fd", "fd", "tr", "fd", "fd"], win: "Tout seul ! Tu es prêt." },
    { type: "info", art: "🎉", text: "Bravo, tu as programmé un robot ! Tu vas maintenant découvrir les parties du robot, puis écrire des programmes de plus en plus malins." }
  ] }
];

function miniGrid(page) {
  const sc = parseScenario({ map: page.map, dir: page.dir ?? 1 }), cs = Math.max(34, Math.min(60, Math.floor(300 / sc.w)));
  const box = el("div", "gridwrap"), g = el("div", "pgrid"), bot = el("div", "bot"); box.append(g);
  g.style.cssText = `width:${sc.w * cs}px;height:${sc.h * cs}px;grid-template-columns:repeat(${sc.w},${cs}px);grid-template-rows:repeat(${sc.h},${cs}px);--cs:${cs}px`;
  const cells = [];
  for (let r = 0; r < sc.h; r++) for (let c = 0; c < sc.w; c++) { const d = el("div", "cell" + ((r + c) % 2 ? " alt" : "")); if (sc.flag && sc.flag[0] === r && sc.flag[1] === c) d.innerHTML = '<span class="flag">🏁</span>'; g.append(d); cells.push(d); }
  g.append(bot); bot.style.cssText = `width:${cs}px;height:${cs}px`; bot.innerHTML = `<div class="ring"><i class="arr"></i></div>` + robotSvg();
  const pos = { r: 0, c: 0, dir: 1 }, put = () => { bot.style.transition = S.calm ? "none" : "transform .3s"; bot.style.transform = `translate(${pos.c * cs}px,${pos.r * cs}px)`; bot.querySelector(".ring").style.transform = `rotate(${pos.dir * 90}deg)`; };
  const reset = () => { cells.forEach(c => c.querySelectorAll(".foot,.oops").forEach(x => x.remove())); pos.r = sc.start[0]; pos.c = sc.start[1]; pos.dir = sc.dir; put(); foot(); };
  const foot = () => cells[pos.r * sc.w + pos.c].insertAdjacentHTML("beforeend", '<i class="foot"></i>');
  const blocked = () => { const [dr, dc] = DIRS[pos.dir], r = pos.r + dr, c = pos.c + dc; return r < 0 || c < 0 || r >= sc.h || c >= sc.w || sc.rocks.has(r + "," + c); };
  async function exec(o) {
    await sleep(window.__turbo ? 2 : 380);
    if (o === "fd") { if (blocked()) { cells[pos.r * sc.w + pos.c].insertAdjacentHTML("beforeend", '<span class="oops">❗</span>'); return false; } const [dr, dc] = DIRS[pos.dir]; pos.r += dr; pos.c += dc; put(); foot(); }
    else if (o === "tl") { pos.dir = (pos.dir + 3) % 4; put(); } else if (o === "tr") { pos.dir = (pos.dir + 1) % 4; put(); }
    return true;
  }
  const atFlag = () => sc.flag && sc.flag[0] === pos.r && sc.flag[1] === pos.c;
  reset(); return { el: box, reset, exec, atFlag };
}

export function mountLearn(stage, id, hooks = {}) {
  const lesson = LESSONS.find(l => l.id === id); let alive = true, pi = 0, locked = false;
  const dots = el("div", "ldots"), text = el("div", "gmsg lt"), art = el("div", "artbig"), area = el("div", "larea"), nav = el("div", "gctl");
  const prev = el("button", "gb", "◀ Avant"), next = el("button", "gb go", "Suivant ▶"); nav.append(prev, next);
  stage.append(dots, el("div", "lbox", ""), nav); const box = stage.querySelector(".lbox"); box.append(art, text, area);
  prev.onclick = () => { if (pi > 0 && !locked) { pi--; show(); } };
  next.onclick = () => { if (locked) return; if (pi < lesson.pages.length - 1) { pi++; show(); } else { chime("done"); hooks.onWin && hooks.onWin(); } };
  const setNext = on => { locked = !on; next.disabled = !on; next.classList.toggle("dim", !on); };
  const say = (t, cls) => { text.className = "gmsg lt " + (cls || ""); text.innerHTML = t; };

  function show() {
    const p = lesson.pages[pi]; area.innerHTML = ""; art.innerHTML = p.art || ""; art.style.display = p.art ? "" : "none"; prev.style.visibility = pi ? "" : "hidden";
    dots.innerHTML = lesson.pages.map((_, i) => `<i class="${i < pi ? "d" : i === pi ? "c" : ""}"></i>`).join(""); next.textContent = pi === lesson.pages.length - 1 ? "✔ Terminer" : "Suivant ▶";
    say(p.text); setNext(p.type === "info");
    if (p.type === "tap") tap(p); else if (p.type === "mini") mini(p); else if (p.type === "tour") tour(p);
  }
  function tap(p) {
    const row = el("div", "lchoices"); let done = false;
    p.items.slice().sort(() => Math.random() - 0.5).forEach(it => { const b = el("button", "lchoice", `<span class="ca">${it.art}</span>${it.label && !/^Ceci est|^Cela/.test(it.label) ? `<small>${it.label}</small>` : ""}`); b.dataset.say = it.label;
      b.onclick = () => { if (done) return; if (it.ok) { done = true; b.classList.add("good"); chime("ok"); say("✅ " + (it.why || "Oui ! " + it.label), "ok"); setNext(true); } else { b.classList.add("bad"); chime("no"); say("🙂 " + it.why + " Essaie encore !", "warn"); } };
      row.append(b); });
    area.append(row);
  }
  function tour(p) {
    const seen = new Set(), grid = el("div", "ltour"), count = el("div", "lcount");
    const upd = () => { count.textContent = seen.size === p.spots.length ? "✅ Tu as tout découvert !" : `Encore ${p.spots.length - seen.size} à découvrir.`; setNext(seen.size === p.spots.length); };
    p.spots.forEach(s => { const b = el("button", "lspot", `<span>${s.art}</span><small>${s.label}</small>`); b.dataset.say = s.say; b.onclick = () => { seen.add(s.key); b.classList.add("seen"); say("👉 " + s.say); upd(); }; grid.append(b); });
    area.append(grid, count); upd();
  }
  function mini(p) {
    const g = miniGrid(p), queue = [], bar = el("div", "lqueue"), btns = el("div", "lorders"), ok = [];
    const avail = p.fixed ? p.fixed.slice().sort((a, b) => (a === b ? 0 : a < b ? -1 : 1)).sort(() => Math.random() - 0.5) : null; let used = [];
    let busy = false, won = false;
    const target = () => { const s = p.guide || p.sol; return s || null; };
    const nextHint = () => { const s = target(); if (!s) return null; let i = 0; while (i < queue.length && i < s.length && queue[i] === s[i]) i++; return i < queue.length ? "clear" : i < s.length ? s[i] : "run"; };
    const paint = () => {
      bar.innerHTML = queue.length ? queue.map(o => `<span class="qi">${ORD[o].icon}</span>`).join("") : `<span class="qe">${p.mode === "queue" ? "La liste d'ordres est vide." : ""}</span>`;
      const h = p.guide ? nextHint() : null;
      btns.querySelectorAll("[data-o]").forEach(b => { b.classList.toggle("point", h === b.dataset.o); if (avail) { const n = avail.filter(x => x === b.dataset.o).length, u = used.filter(x => x === b.dataset.o).length; b.disabled = u >= n; } });
      const run = btns.querySelector(".lrun"), clr = btns.querySelector(".lclr"); if (run) run.classList.toggle("point", h === "run"); if (clr) clr.classList.toggle("point", h === "clear");
    };
    (avail ? [...new Set(avail)] : p.orders).forEach(o => { const b = el("button", "lorder", `<span>${ORD[o].icon}</span><small>${ORD[o].name}</small>`); b.dataset.o = o; b.dataset.say = ORD[o].say; b.onclick = () => add(o); btns.append(b); });
    if (p.mode === "queue") { const run = el("button", "lorder lrun", "<span>▶</span><small>lancer</small>"), clr = el("button", "lorder lclr", "<span>🧹</span><small>vider</small>"); run.dataset.say = "Lance ton programme."; clr.dataset.say = "Efface la liste d'ordres."; run.onclick = () => runQueue(); clr.onclick = () => { if (busy) return; queue.length = 0; used = []; g.reset(); paint(); say(p.text); }; btns.append(run, clr); }
    if (p.sol || p.guide) { const hb = el("button", "lorder", "<span>💡</span><small>indice</small>"); hb.dataset.say = "Un indice pour t'aider."; hb.onclick = () => { const s = target(), h = nextHint(); say(h === "run" ? "👉 Ton programme est prêt : touche ▶." : h === "clear" ? "👉 Il y a une erreur dans la liste. Touche 🧹 pour recommencer." : `👉 Essaie l'ordre « ${ORD[h].name} » (${ORD[h].icon}).`); }; btns.append(hb); }
    area.append(g.el, bar, btns); paint();
    async function add(o) {
      if (busy || won) return; chime("step");
      if (p.mode === "now") { busy = true; const good = await g.exec(o); busy = false; if (!good) { say("🙂 " + (p.bumpMsg || "Aïe ! Le robot ne peut pas aller par là. Essaie un autre ordre."), "warn"); chime("no"); return; } if (g.atFlag()) win(); return; }
      queue.push(o); used.push(o); paint();
    }
    async function runQueue() {
      if (busy || won) return; if (!queue.length) return say("🙂 La liste est vide. Touche d'abord des ordres !", "warn");
      busy = true; g.reset(); say("Le robot lit ton programme, du haut vers le bas…"); let bumped = false;
      for (const o of queue) { const good = await g.exec(o); if (!good) { bumped = true; break; } }
      busy = false;
      if (!bumped && g.atFlag()) return win();
      chime("no"); say("🙂 " + (bumped ? (p.bumpMsg || "Aïe ! Le robot a cogné quelque chose.") : "Le robot a fini la liste, mais il n'est pas arrivé au drapeau 🏁.") + " Touche 🧹 pour changer ta liste et réessaie.", "warn");
    }
    function win() { won = true; chime("done"); say("🎉 " + (p.win || "Bravo !"), "ok"); setNext(true); }
  }
  show();
  return { destroy() { alive = false; } };
}
