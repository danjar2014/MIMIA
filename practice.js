// S'entraîner : des parcours de robot tirés au hasard, toujours réalisables, de plus en plus difficiles.
// Chaque parcours est vérifié (le plus court chemin existe) avant d'être proposé ; sa solution sert aux indices (hints.js).
import { parseScenario } from "./scenario.js";
import { shortestProgram } from "./hints.js";

export const A = ["fd", "tl", "tr"], B = ["fd", "tl", "tr", "rep"], C = ["fd", "tl", "tr", "rep", "while", "if", "pick", "call"];
// pour chaque âge : taille de la grille, cailloux, étoiles et longueur du chemin ; le niveau (stage, de 0 à 5) fait monter chaque borne
const BAND = {
  a: { allow: A, auto: true, dirs: [1], size: [4, 5], rocks: [0, 3], stars: [0, 2], ops: [3, 9] },
  b: { allow: B, auto: true, dirs: [1, 2], size: [5, 6], rocks: [2, 6], stars: [1, 3], ops: [6, 14] },
  c: { allow: C, auto: false, dirs: [0, 1, 2, 3], size: [6, 7], rocks: [4, 9], stars: [2, 4], ops: [10, 24] }
};
export const MAX_STAGE = 5;
export const stageOf = n => Math.max(0, Math.min(MAX_STAGE, Math.floor(n / 2)));   // un niveau de plus toutes les 2 réussites
// générateur pseudo-aléatoire à graine (mulberry32) : même graine = même parcours (utile pour les tests)
export function rngFrom(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const between = (rnd, [lo, hi], k = 1) => Math.round(lo + (hi - lo) * Math.min(1, k) * rnd());   // k : part de la plage utilisée

export function paramsFor(band, stage) {
  const p = BAND[band] || BAND.a, k = (stage + 1) / (MAX_STAGE + 1);
  return { ...p, k, minOps: Math.max(p.ops[0], Math.round(p.ops[0] + (p.ops[1] - p.ops[0]) * k * 0.55)), maxOps: Math.round(p.ops[0] + (p.ops[1] - p.ops[0]) * (0.4 + 0.6 * k)) + (stage >= 4 ? 2 : 0) };
}

function draw(h, w, start, flag, rocks, stars) {
  const g = Array.from({ length: h }, () => Array(w).fill("."));
  rocks.forEach(([r, c]) => { g[r][c] = "#"; }); stars.forEach(([r, c]) => { g[r][c] = "*"; }); g[flag[0]][flag[1]] = "F"; g[start[0]][start[1]] = "R";
  return g.map(r => r.join(""));
}
const intro = (lv, band, stars, auto) => `Guide le robot jusqu'au drapeau 🏁.${stars ? (auto ? " Ramasse les étoiles ⭐ au passage." : " Utilise « ramasser l'étoile » sur chaque étoile ⭐.") : ""}`;

// un parcours au hasard : band « a » | « b » | « c », n = numéro de l'essai dans la série (sert à monter la difficulté)
export function makePractice(band = "a", n = 0, rnd = Math.random) {
  const P = paramsFor(band, stageOf(n));
  for (let tries = 0; tries < 400; tries++) {
    const w = between(rnd, P.size, Math.max(P.k, 0.3)), h = Math.max(P.size[0], w - (rnd() < 0.4 ? 1 : 0)), cell = () => [Math.floor(rnd() * h), Math.floor(rnd() * w)];
    const used = new Set(), take = () => { for (let i = 0; i < 60; i++) { const c = cell(), k = c.join(","); if (!used.has(k)) { used.add(k); return c; } } return null; };
    const start = take(), flag = take(); if (!start || !flag || Math.abs(start[0] - flag[0]) + Math.abs(start[1] - flag[1]) < 3) continue;
    const rocks = [], stars = [], nr = between(rnd, P.rocks, P.k), ns = between(rnd, P.stars, P.k);
    for (let i = 0; i < nr; i++) { const c = take(); if (c) rocks.push(c); } for (let i = 0; i < ns; i++) { const c = take(); if (c) stars.push(c); }
    const dir = P.dirs[Math.floor(rnd() * P.dirs.length)], map = draw(h, w, start, flag, rocks, stars);
    const ops = shortestProgram(parseScenario({ map, dir }), P.auto); if (!ops || ops.length < P.minOps || ops.length > P.maxOps) continue;
    if (ops.every(o => o === "fd")) continue;   // au moins un virage : sinon c'est trop facile
    return { title: `Entraînement ${n + 1}`, intro: intro(null, band, stars.length, P.auto), map, dir, allow: P.allow, auto: P.auto, sol: { main: ops.map(t => ({ t })), fn: [] }, practice: true, stage: stageOf(n) };
  }
  // jamais atteint en pratique ; au cas où : un petit parcours sûr
  const map = ["R...", "....", "...F"];
  return { title: `Entraînement ${n + 1}`, intro: intro(null, band, 0, true), map, dir: 1, allow: P.allow, auto: true, sol: { main: ["fd", "fd", "fd", "tr", "fd", "fd"].map(t => ({ t })), fn: [] }, practice: true, stage: 0 };
}

// récompense d'entraînement : 5 XP par réussite, 30 XP au plus par jour (pour ne pas faire monter l'objectif sans apprendre)
export const TRAIN_XP = 5, TRAIN_MAX_PER_DAY = 6;
export function trainReward(S, day) {
  const t = S.train && S.train.day === day ? S.train : { day, n: 0 }; S.train = t;
  if (t.n >= TRAIN_MAX_PER_DAY) return 0; t.n++; return TRAIN_XP;
}
