// Le robot dessine : programmation « tortue » avec un modèle fantôme à suivre
import { el, S, sleep, chime, speak } from "./util.js";
import { createEditor, runProgram, Limit, D } from "./blocks.js";
import { robotSvg } from "./robot.js";

const N = 400, START_H = 0;
export const DCOLORS = [{ v: "#3f7fd6", label: "bleu" }, { v: "#e24b4b", label: "rouge" }, { v: "#4caf6a", label: "vert" }, { v: "#f4c430", label: "jaune" }, { v: "#8e5bc0", label: "violet" }, { v: "#2a2a2e", label: "noir" }];
const fdD = { t: "fd", label: "avancer de", icon: "⬆️", cls: "mv", n: { v: 50, min: 10, max: 200, step: 10, unit: "" } };
const turn = (t, label, fixed) => ({ t, label: fixed ? label + " (90°)" : label, icon: t === "tl" ? "↶" : "↷", cls: "turn", n: fixed ? null : { v: 90, min: 15, max: 180, step: 15, unit: "°" } });
const repD = { ...D.rep, n: { v: 2, min: 2, max: 36, step: 1, unit: "fois" } };
const colD = { t: "col", label: "couleur", icon: "🎨", cls: "act", opts: DCOLORS };
const setD = { t: "set", label: "taille =", icon: "📏", cls: "var", n: { v: 20, min: 5, max: 100, step: 5, unit: "" } };
const addD = { t: "add", label: "taille +", icon: "➕", cls: "var", n: { v: 5, min: 1, max: 30, step: 1, unit: "" } };
const fdvD = { t: "fdv", label: "avancer de « taille »", icon: "⬆️", cls: "mv" };
export const paletteFor = band => band === "a" ? [fdD, turn("tl", "tourner à gauche", true), turn("tr", "tourner à droite", true), colD]
  : band === "b" ? [fdD, turn("tl", "tourner à gauche"), turn("tr", "tourner à droite"), repD, colD]
  : [fdD, turn("tl", "tourner à gauche"), turn("tr", "tourner à droite"), repD, colD, setD, addD, fdvD];

const F = (n) => ({ t: "fd", n }), TR = (n) => ({ t: "tr", n }), TL = (n) => ({ t: "tl", n }), REP = (n, ...b) => ({ t: "rep", n, body: b });
export const DEFIS = {
  a: [
    { title: "Une ligne droite", intro: "Suis la ligne grise : le robot doit avancer assez loin.", sol: { main: [F(100)] } },
    { title: "Le carré", intro: "Un carré a 4 côtés pareils et 4 coins droits. Suis le modèle gris.", sol: { main: [F(80), TR(), F(80), TR(), F(80), TR(), F(80)] } },
    { title: "L'escalier", intro: "Monte l'escalier marche par marche.", sol: { main: [F(50), TR(), F(50), TL(), F(50), TR(), F(50), TL(), F(50), TR(), F(50)] } }
  ],
  b: [
    { title: "Le carré qui se répète", intro: "Au lieu de refaire 4 fois, utilise « répéter ». Quel angle faut-il à chaque coin ?", sol: { main: [REP(4, F(100), TR(90))] } },
    { title: "Le triangle", intro: "Un triangle a 3 côtés pareils. L'angle du robot à chaque coin n'est pas 90° ! Essaie plusieurs angles.", sol: { main: [REP(3, F(100), TR(120))] } },
    { title: "Le rectangle", intro: "Deux côtés longs, deux côtés courts. Répète deux fois la même suite.", sol: { main: [REP(2, F(140), TR(90), F(70), TR(90))] } },
    { title: "L'hexagone", intro: "6 côtés pareils. Calcule : un tour complet fait 360°. 360 ÷ 6 = ?", sol: { main: [REP(6, F(60), TR(60))] } },
    { title: "L'étoile", intro: "Une étoile à 5 branches. Le robot tourne beaucoup à chaque pointe !", sol: { main: [REP(5, F(120), TR(144))] } }
  ],
  c: [
    { title: "La spirale carrée", intro: "Utilise la variable « taille » : elle grandit à chaque tour, comme un petit compteur.", sol: { main: [{ t: "set", n: 10 }, REP(12, { t: "fdv" }, TR(90), { t: "add", n: 10 })] } },
    { title: "La fleur de carrés", intro: "Une répétition dans une répétition : un carré, puis on tourne un peu, et on recommence.", sol: { main: [REP(8, REP(4, F(60), TR(90)), TR(45))] } },
    { title: "L'étoile à 8 branches", intro: "Quel angle faut-il ? Teste : 8 pointes, beaucoup de tours.", sol: { main: [REP(8, F(110), TR(135))] } },
    { title: "La spirale ronde", intro: "Une spirale qui s'ouvre doucement : petits pas, petit virage, et la taille augmente.", sol: { main: [{ t: "set", n: 5 }, REP(30, { t: "fdv" }, TR(30), { t: "add", n: 2 })] } }
  ]
};

// exécute sans animation : renvoie segments, longueur et boîte englobante
export function trace(lists, start = [N / 2, N / 2]) {
  const t = { x: start[0], y: start[1], h: START_H, col: "#3f7fd6", size: 20 }, segs = []; let len = 0;
  const env = { cond: () => false };
  try { for (const n of runProgram(lists, env, 900)) step(t, n, segs); } catch (e) { if (!(e instanceof Limit)) throw e; }
  segs.forEach(s => len += Math.hypot(s.x2 - s.x1, s.y2 - s.y1));
  return { segs, len };
}
function step(t, n, segs) {
  const go = d => { const r = t.h * Math.PI / 180, x2 = t.x + Math.sin(r) * d, y2 = t.y - Math.cos(r) * d; segs.push({ x1: t.x, y1: t.y, x2, y2, col: t.col }); t.x = x2; t.y = y2; };
  if (n.t === "fd") go(n.n ?? 50); else if (n.t === "fdv") go(t.size);
  else if (n.t === "tr") t.h += n.n ?? 90; else if (n.t === "tl") t.h -= n.n ?? 90;
  else if (n.t === "col") t.col = n.v; else if (n.t === "set") t.size = n.n; else if (n.t === "add") t.size += n.n;
}
// la forme de référence est centrée dans le cadre
export function centeredStart(sol) { const a = trace(sol, [0, 0]); if (!a.segs.length) return [N / 2, N / 2]; const xs = a.segs.flatMap(s => [s.x1, s.x2]), ys = a.segs.flatMap(s => [s.y1, s.y2]);
  return [N / 2 - (Math.min(...xs) + Math.max(...xs)) / 2, N / 2 - (Math.min(...ys) + Math.max(...ys)) / 2]; }
export function coverage(mine, ghost) { // part du modèle recouverte par le dessin
  const c = document.createElement("canvas"); c.width = c.height = N; const g = c.getContext("2d"); g.lineWidth = 12; g.lineCap = "round"; mine.forEach(s => { g.beginPath(); g.moveTo(s.x1, s.y1); g.lineTo(s.x2, s.y2); g.stroke(); });
  const d = g.getImageData(0, 0, N, N).data; let tot = 0, hit = 0;
  for (const s of ghost) { const L = Math.hypot(s.x2 - s.x1, s.y2 - s.y1), k = Math.max(1, Math.floor(L / 4)); for (let i = 0; i <= k; i++) { const x = Math.round(s.x1 + (s.x2 - s.x1) * i / k), y = Math.round(s.y1 + (s.y2 - s.y1) * i / k); tot++; if (x >= 0 && y >= 0 && x < N && y < N && d[(y * N + x) * 4 + 3] > 30) hit++; } }
  return tot ? hit / tot : 0;
}

export function mountDraw(stage, band, defi, hooks = {}) {
  let alive = true, running = false, runId = 0;
  const editor = createEditor({ palette: paletteFor(band), onChange: () => hooks.onChange && hooks.onChange() });
  const intro = el("div", "intro", defi ? defi.intro : "Dessine ce que tu veux avec ton robot ! Essaie des formes, des couleurs, des répétitions."), wrap = el("div", "drawwrap"), msg = el("div", "gmsg", "&nbsp;");
  const base = el("canvas"), mine = el("canvas"); base.width = base.height = mine.width = mine.height = N; wrap.append(base, mine);
  const botEl = el("div", "tbot", robotSvg()); wrap.append(botEl);
  const start = defi ? centeredStart(defi.sol) : [N / 2, N / 2 + 40], ghost = defi ? trace(defi.sol, start) : { segs: [], len: 0 };
  const bg = base.getContext("2d"), mg = mine.getContext("2d");
  function drawBase() { bg.clearRect(0, 0, N, N); bg.strokeStyle = "#f0ead9"; bg.lineWidth = 1; for (let i = 0; i <= N; i += 40) { bg.beginPath(); bg.moveTo(i, 0); bg.lineTo(i, N); bg.moveTo(0, i); bg.lineTo(N, i); bg.stroke(); }
    bg.strokeStyle = "#d3ccb8"; bg.lineWidth = 14; bg.lineCap = "round"; bg.setLineDash([2, 18]); ghost.segs.forEach(s => { bg.beginPath(); bg.moveTo(s.x1, s.y1); bg.lineTo(s.x2, s.y2); bg.stroke(); }); bg.setLineDash([]); }
  function placeBot(t) { botEl.style.left = (t.x / N * 100) + "%"; botEl.style.top = (t.y / N * 100) + "%"; botEl.style.transform = `translate(-50%,-70%) rotate(${t.h}deg)`; }
  const ctl = el("div", "gctl"), mkb = (cls, txt, fn) => { const b = el("button", "gb " + cls, txt); b.onclick = fn; ctl.append(b); return b; };
  const bRun = mkb("go", "▶ Dessiner", () => run());
  mkb("", "🧽 Effacer le dessin", () => { runId++; running = false; bRun.disabled = false; mg.clearRect(0, 0, N, N); placeBot({ x: start[0], y: start[1], h: 0 }); say("&nbsp;"); });
  mkb("", "🗑 Effacer le programme", () => editor.clear());
  if (hooks.onSave) mkb("", "💾 Garder", () => hooks.onSave(editor.get(), defi ? defi.title : "Mon dessin"));
  stage.append(intro, wrap, msg, ctl, editor.el);
  const say = (t, cls) => { msg.className = "gmsg " + (cls || ""); msg.innerHTML = t; };
  drawBase(); placeBot({ x: start[0], y: start[1], h: 0 });
  async function run() {
    if (running) return; if (!editor.lists.main.length) { say("Ton programme est vide. Touche des blocs ci-dessus 👆", "warn"); return; }
    running = true; bRun.disabled = true; const my = ++runId; mg.clearRect(0, 0, N, N); mg.lineWidth = 6; mg.lineCap = mg.lineJoin = "round"; say("Le robot dessine…");
    const t = { x: start[0], y: start[1], h: 0, col: "#3f7fd6", size: 20 }, segs = []; let limit = false;
    try { for (const n of runProgram(editor.lists, { cond: () => false }, 900)) { if (!alive || my !== runId) return; editor.highlight(n); const before = segs.length; step(t, n, segs);
      if (segs.length > before) { const s = segs[segs.length - 1]; mg.strokeStyle = s.col; mg.beginPath(); mg.moveTo(s.x1, s.y1); mg.lineTo(s.x2, s.y2); mg.stroke(); } placeBot(t); await sleep(window.__turbo ? 2 : S.calm ? 20 : 110); } }
    catch (e) { if (e instanceof Limit) limit = true; else throw e; }
    editor.highlight(null); running = false; bRun.disabled = false;
    if (limit) { say("Ton programme est trop long ou ne s'arrête pas. Vérifie tes répétitions.", "warn"); return; }
    if (!defi) { say("Beau dessin ! Tu peux le garder avec 💾.", "ok"); return; }
    const cov = coverage(segs, ghost.segs), len = segs.reduce((s, q) => s + Math.hypot(q.x2 - q.x1, q.y2 - q.y1), 0);
    if (cov >= 0.9 && len <= ghost.len * 1.4) { chime("done"); say("🎉 Bravo ! Ton dessin recouvre le modèle.", "ok"); speak("Bravo ! Ton dessin recouvre le modèle."); hooks.onWin && hooks.onWin(); }
    else { chime("no"); say(cov < 0.5 ? "Ton dessin est assez différent du modèle gris. Regarde bien la forme : combien de côtés ? quels angles ?" : len > ghost.len * 1.4 ? "Il y a des traits en plus. Regarde où le robot est allé en trop." : `Presque ! Tu as recouvert ${Math.round(cov * 100)} % du modèle. Regarde où il reste du gris.`, "warn"); }
  }
  return { editor, destroy() { alive = false; runId++; }, run };
}
