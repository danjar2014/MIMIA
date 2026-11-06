// Puzzle du robot : le dessin d'un robot est coupé en morceaux mélangés ; on touche deux morceaux pour les échanger.
// 2 × 2 morceaux (6-8 ans), 3 × 3 (8-10 ans), 4 × 4 (10-12 ans). Le dessin à retrouver reste visible en petit.
import { el, S, chime, tone, sfx, rnd } from "./util.js";
import { robotSvg } from "./robot.js";

export const SIZES = { z: 2, a: 2, b: 3, c: 4 };
export const PUZZLES = [
  { id: "1", robot: { color: "#3f7fd6", head: "round", eyes: "dots", antenna: true }, bg: ["#ffe9a8", "#ffc6a8"], deco: "#e24b4b" },
  { id: "2", robot: { color: "#e24b8a", head: "square", eyes: "visor", antenna: true }, bg: ["#c9f0ff", "#d9e8ff"], deco: "#3f7fd6" },
  { id: "3", robot: { color: "#4caf6a", head: "round", eyes: "visor", antenna: false }, bg: ["#fff3c4", "#dff5c4"], deco: "#f4a400" },
  { id: "4", robot: { color: "#f4a400", head: "square", eyes: "dots", antenna: true }, bg: ["#e6dcff", "#ffd9ec"], deco: "#7a4fd6" },
  { id: "5", robot: { color: "#7a4fd6", head: "round", eyes: "dots", antenna: false }, bg: ["#d8f5d0", "#c9eefa"], deco: "#e24b4b" },
  { id: "6", robot: { color: "#e24b4b", head: "square", eyes: "visor", antenna: false }, bg: ["#fff0d6", "#ffe0e0"], deco: "#38a169" }
];
const DOTS = [[12, 14], [86, 12], [10, 80], [88, 76], [50, 6], [22, 50], [80, 48], [30, 30], [70, 24], [60, 86]];
// le dessin entier (carré) : un fond coloré avec des points, le sol, et le robot
export function pictureSvg(p) {
  const robot = robotSvg(p.robot, "#ffd54a").replace("<svg ", '<svg x="8" y="4" width="84" height="84" ');
  const dots = DOTS.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${2.5 + (i % 3)}" fill="${p.deco}" opacity=".7"/>`).join("");
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs><linearGradient id="pzg${p.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.bg[0]}"/><stop offset="1" stop-color="${p.bg[1]}"/></linearGradient></defs><rect width="100" height="100" fill="url(#pzg${p.id})"/>${dots}<rect y="90" width="100" height="10" fill="${p.deco}" opacity=".35"/>${robot}</svg>`;
}
// un mélange jamais déjà résolu (et, dès 3 × 3, avec moins de la moitié des morceaux déjà bien placés)
export function shuffled(n, rand = rnd) {
  const total = n * n; let a, tries = 0;
  do { a = Array.from({ length: total }, (_, i) => i); for (let i = total - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } tries++; }
  while (tries < 50 && (a.every((v, i) => v === i) || (total > 4 && a.filter((v, i) => v === i).length > total / 2)));
  if (a.every((v, i) => v === i)) [a[0], a[1]] = [a[1], a[0]];
  return a;
}
export const solved = order => order.every((v, i) => v === i);
export const placed = order => order.filter((v, i) => v === i).length;

export function mountPuzzle(stage, band, idx = 0, hooks = {}) {
  const n = SIZES[band] || 2, p = PUZZLES[((idx % PUZZLES.length) + PUZZLES.length) % PUZZLES.length];
  let order = shuffled(n), sel = -1, done = false, alive = true;
  const intro = el("div", "intro", "Touche deux morceaux pour les échanger."), prev = el("div", "pzprev"), board = el("div", "pzboard"), msg = el("div", "gmsg", "&nbsp;");
  prev.innerHTML = pictureSvg(p); prev.setAttribute("role", "img"); prev.setAttribute("aria-label", "Le dessin à retrouver"); prev.dataset.silent = "";   /* toucher ne lit rien : seuls les bips parlent */
  board.style.setProperty("--n", n);
  const paint = () => {
    board.innerHTML = "";
    order.forEach((piece, pos) => {
      const r = Math.floor(piece / n), c = piece % n, b = el("button", "pzp" + (sel === pos ? " sel" : "") + (piece === pos ? " ok" : "")), inner = el("div", "pzin");
      b.dataset.silent = ""; b.setAttribute("aria-label", `Morceau ${pos + 1}` + (piece === pos ? ", bien placé" : "")); inner.style.cssText = `width:${n * 100}%;height:${n * 100}%;left:${-c * 100}%;top:${-r * 100}%`; inner.innerHTML = pictureSvg(p);
      b.append(inner); b.onclick = () => pick(pos); board.append(b);
    });
  };
  function pick(pos) {
    if (!alive || done) return;
    if (sel < 0) { sel = pos; sfx("beep"); paint(); return; }
    if (sel === pos) { sel = -1; paint(); return; }
    const before = placed(order); [order[sel], order[pos]] = [order[pos], order[sel]]; sel = -1; sfx("move"); paint();
    if (solved(order)) { done = true; chime("done"); msg.className = "gmsg ok"; msg.innerHTML = "🎉 Bravo ! Le puzzle est terminé."; hooks.onWin && hooks.onWin(); }
    else if (placed(order) > before) tone(784, 0.12, "sine", 0.14);
  }
  paint(); stage.append(intro, prev, board, msg);
  return { destroy() { alive = false; }, pick, get order() { return order; }, get done() { return done; }, n };
}
