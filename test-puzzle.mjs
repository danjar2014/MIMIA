// Puzzle du robot : mélange jamais résolu, échanges, victoire, tailles selon l'âge.
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
let bad = 0; const t = (n, c, x) => { console.log(n.padEnd(84), c ? "ok" : "BUG " + (x || "")); if (!c) bad++; };
const { SIZES, PUZZLES, shuffled, solved, placed, pictureSvg } = await import("./puzzle.js");
t("2×2 (6-8 ans), 3×3 (8-10), 4×4 (10-12)", SIZES.a === 2 && SIZES.b === 3 && SIZES.c === 4);
t("6 puzzles différents (couleur ou forme)", PUZZLES.length === 6 && new Set(PUZZLES.map(p => JSON.stringify(p.robot))).size === 6);
let ok = true;
for (const n of [2, 3, 4]) for (let k = 0; k < 300; k++) { const a = shuffled(n); if (solved(a) || a.length !== n * n || new Set(a).size !== n * n) ok = false; if (n > 2 && placed(a) > (n * n) / 2) ok = false; }
t("le mélange n'est jamais déjà résolu, contient chaque morceau une fois", ok);
t("le dessin est un SVG avec le robot", /^<svg/.test(pictureSvg(PUZZLES[0])) && /class="robot"/.test(pictureSvg(PUZZLES[0])));
// le jeu avec un faux DOM minimal
const mk = () => ({ children: [], style: { setProperty() {}, cssText: "" }, dataset: {}, classList: { add() {} }, append(...c) { this.children.push(...c); }, setAttribute() {}, set innerHTML(v) { this._h = v; if (v === "") this.children = []; }, get innerHTML() { return this._h || ""; } });
globalThis.document = { createElement: () => mk(), getElementById: () => null, querySelector: () => null };
const { mountPuzzle } = await import("./puzzle.js");
let won = 0; const g = mountPuzzle(mk(), "a", 0, { onWin: () => won++ });
t("le jeu démarre mélangé et non terminé", !g.done && !solved(g.order) && g.n === 2);
for (let i = 0; i < g.order.length && !g.done; i++) { if (g.order[i] !== i) { const j = g.order.indexOf(i); g.pick(i); g.pick(j); } }
t("on gagne en échangeant les morceaux, une seule fois", g.done && won === 1 && solved(g.order));
g.pick(0); g.pick(1); t("après la victoire plus rien ne bouge", solved(g.order) && won === 1);
const g2 = mountPuzzle(mk(), "c", 5, {}); t("4×4 pour les 10-12 ans", g2.n === 4 && g2.order.length === 16);
const g3 = mountPuzzle(mk(), "a", 0, {}), before = g3.order.slice(); g3.pick(0); g3.pick(0); t("toucher deux fois le même morceau annule la sélection", g3.order.join() === before.join());
console.log(bad ? "PROBLEMES: " + bad : "LE PUZZLE FONCTIONNE");
