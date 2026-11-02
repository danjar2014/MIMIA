import { genPoints, predict, accuracy, rlChoose, rlUpdate, pSuccess, checkFlows, NODELABS } from "./advlabs.js";
// --- apprentissage supervisé : stratégie "un exemple central par classe, puis 4 près de la frontière"
let okBest = 0, okRandom = 0, okOne = 0, N = 300;
for (let s = 0; s < N; s++) {
  let pts = genPoints(); const dist = (p, m) => Math.hypot(p.x - m, p.y - m);
  const c1 = pts.filter(p => p.c).sort((a, b) => dist(a, 65) - dist(b, 65))[0], c0 = pts.filter(p => !p.c).sort((a, b) => dist(a, 35) - dist(b, 35))[0]; c1.lab = c0.lab = true;
  const border = pts.filter(p => !p.lab).sort((a, b) => Math.abs(a.x + a.y - 100) - Math.abs(b.x + b.y - 100)).slice(0, 4); border.forEach(p => p.lab = true);
  if (accuracy(pts) >= 0.85) okBest++;
  pts = genPoints(); pts.slice().sort(() => Math.random() - .5).slice(0, 6).forEach(p => p.lab = true); if (accuracy(pts) >= 0.85) okRandom++;
  pts = genPoints(); pts.filter(p => p.c).slice(0, 6).forEach(p => p.lab = true); if (accuracy(pts) >= 0.85) okOne++; // 6 exemples de la même classe
}
console.log(`supervisé : bien choisis ${(okBest / N * 100) | 0}% de réussite | au hasard ${(okRandom / N * 100) | 0}% | une seule classe ${(okOne / N * 100) | 0}%`);
// --- renforcement : nombre d'essais pour 5 réussites d'affilée, puis après changement de pièce
let t1 = [], t2 = [], fail = 0;
for (let r = 0; r < 300; r++) { let best = Math.floor(Math.random() * 7), q = Array(7).fill(.3), tries = 0, streak = 0, n1 = 0;
  while (streak < 5 && tries < 400) { const a = rlChoose(q, tries), ok = Math.random() < pSuccess(a, best); rlUpdate(q, a, ok ? 1 : 0); tries++; streak = ok ? streak + 1 : 0; } n1 = tries; t1.push(n1);
  let nb; do { nb = Math.floor(Math.random() * 7); } while (Math.abs(nb - best) < 2); best = nb; streak = 0; let t = 0;
  while (streak < 5 && t < 400) { const a = rlChoose(q, tries + t), ok = Math.random() < pSuccess(a, best); rlUpdate(q, a, ok ? 1 : 0); t++; streak = ok ? streak + 1 : 0; } t2.push(t); if (t >= 400 || n1 >= 400) fail++; }
const med = a => a.sort((x, y) => x - y)[a.length >> 1], p90 = a => a.sort((x, y) => x - y)[Math.floor(a.length * .9)];
console.log(`renforcement : apprentissage médiane ${med(t1)} essais (90% < ${p90(t1)}) ; adaptation après changement médiane ${med(t2)} (90% < ${p90(t2)}) ; échecs ${fail}/300`);
// --- nœuds : solutions et erreurs
const sel = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { pub: v[0] || "", sub: v[1] || "" }]));
console.log("nœuds n1 solution:", checkFlows(NODELABS[0], sel({ cam: ["/image", ""], plan: ["/commandes", "/image"], mot: ["", "/commandes"] })).ok);
console.log("nœuds n1 planificateur n'écoute pas:", !checkFlows(NODELABS[0], sel({ cam: ["/image", ""], plan: ["/commandes", ""], mot: ["", "/commandes"] })).ok);
console.log("nœuds n2 solution:", checkFlows(NODELABS[1], sel({ dist: ["/distance", ""], plan: ["/commandes", "/distance"], mot: ["", "/commandes"], lamp: ["", "/commandes"] })).ok);
