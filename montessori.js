// Le coin Montessori des petits (3-6 ans) : 16 catégories de jeux, rangées sur des étagères comme chez iwawa.
// Quand un jeu s'y prête, il utilise des pièces de robot (engrenages, piles, moteurs, capteurs, sons du robot) ; sinon il est repris tel quel (formes, couleurs, horloge, poids…).
// Chaque jeu = 3 à 5 petites manches, jouées par le moteur de petits.js (choisir, ordonner, relier, mémoire, écouter).
import { rnd } from "./util.js";
import { partById } from "./parts.js";
import { shuffle, three, NUMS, COLORS, ROUNDS } from "./petits.js";

const pick = (a, r) => a[r(a.length)];
const lab = n => (n >= 0 && n <= 10 ? NUMS[n] : String(n));
const big = h => `<span class="ptbig">${h}</span>`;
const Q = (say, options, show = "", extra = {}) => ({ type: "quiz", say, show, options, ...extra });
const O = (html, label) => ({ html, label });
const times = (n, f, r) => Array.from({ length: n }, () => f(r));
// réponse numérique juste + deux autres nombres
const numOpts = (ans, r, lo = 0, hi = 10) => { const pool = []; for (let k = lo; k <= hi; k++) if (k !== ans) pool.push(k); return three(O(String(ans), lab(ans)), shuffle(pool, r).slice(0, 2).map(k => O(String(k), lab(k))), r); };
const seq = (items, say, r) => ({ type: "seq", say, items: shuffle(items.map((x, order) => ({ ...x, order })), r) });
const mem = (items, r) => ({ type: "memory", say: "Retrouve les paires.", cards: shuffle([...items, ...items].map(x => ({ k: x.k, html: x.html, label: x.label, sound: x.sound })), r) });
const matchOf = (items, say, r, plain = false) => ({ type: "match", say, plain, left: items.map((o, k) => ({ html: o.l, k })), right: shuffle(items.map((o, k) => ({ html: o.rt || o.l, k })), r) });
const svg48 = body => `<svg viewBox="0 0 48 48" class="ico" aria-hidden="true" focusable="false">${body}</svg>`;
const ST = 'stroke="#38362f" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';

// ----- les dessins : formes, couleurs, pièces, pizzas, horloges, barres… -----
export const SHAPES = [
  ["cercle", "le cercle", c => `<circle cx="24" cy="24" r="18" fill="${c}"/>`], ["carré", "le carré", c => `<rect x="7" y="7" width="34" height="34" rx="2" fill="${c}"/>`],
  ["triangle", "le triangle", c => `<path d="M24 6L43 41H5z" fill="${c}"/>`], ["rectangle", "le rectangle", c => `<rect x="4" y="13" width="40" height="22" rx="2" fill="${c}"/>`],
  ["étoile", "l'étoile", c => `<path d="M24 5l5.5 12 13 1.5-9.7 8.8 2.7 12.8L24 33l-11.5 7.1 2.7-12.8L5.5 18.5l13-1.5z" fill="${c}"/>`], ["losange", "le losange", c => `<path d="M24 4L43 24 24 44 5 24z" fill="${c}"/>`],
  ["hexagone", "l'hexagone", c => `<path d="M14 7h20l10 17-10 17H14L4 24z" fill="${c}"/>`], ["ovale", "l'ovale", c => `<ellipse cx="24" cy="24" rx="20" ry="12" fill="${c}"/>`]
];
const shape = (i, c = "#3f7fd6") => svg48(`<g ${ST}>${SHAPES[i][2](c)}</g>`);
const swatch = hex => `<span class="ptsw" style="background:${hex}"></span>`;
const balloon = c => svg48(`<ellipse cx="24" cy="19" rx="14" ry="17" fill="${c}" ${ST}/><path d="M24 36l-3 5h6z" fill="${c}" ${ST}/><path d="M24 41q-5 3 0 6" fill="none" ${ST}/>`);
const fish = c => svg48(`<ellipse cx="21" cy="24" rx="15" ry="10" fill="${c}" ${ST}/><path d="M34 24l10-9v18z" fill="${c}" ${ST}/><circle cx="13" cy="21" r="2.2" fill="#fff"/>`);
const coin = v => svg48(`<circle cx="24" cy="24" r="19" fill="#ffd54a" ${ST}/><circle cx="24" cy="24" r="13" fill="none" stroke="#e0a800" stroke-width="2"/><text x="24" y="30" text-anchor="middle" font-size="17" font-weight="800" fill="#38362f" font-family="sans-serif">${v}</text>`);
const bead = (n, c) => `<span class="ptcount">${Array.from({ length: n }, () => `<i><svg viewBox="0 0 20 20" width="22" height="22"><circle cx="10" cy="10" r="8" fill="${c}" stroke="#38362f" stroke-width="2"/></svg></i>`).join("")}</span>`;
const items = (n, ico) => `<span class="ptcount">${Array.from({ length: n }, () => `<i>${ico}</i>`).join("")}</span>`;
const scaled = (svg, s) => `<span class="ptscale" style="--s:${s}">${svg}</span>`;
const bar = (n, c = "#e24b4b") => `<span class="ptbars"><span class="ptbar1" style="width:${n * 22}px;background:${c}"></span></span>`;
const rod = n => `<span class="ptbars"><span class="ptbar1 rod" style="width:${n * 22}px;background:repeating-linear-gradient(90deg,#e24b4b 0 22px,#3f7fd6 22px 44px)"></span></span>`;
// une pizza / un disque partagé en k parts ; « eq » = parts égales, sinon des parts inégales
const pie = (k, eq = true, missing = 0, c = "#f4a400") => {
  const UNEQ = { 3: [0, 60, 150, 360], 4: [0, 50, 130, 200, 360] }, cuts = eq ? Array.from({ length: k + 1 }, (_, i) => (i * 360) / k) : (UNEQ[k] || UNEQ[4]);
  const pt = a => `${24 + 19 * Math.sin((a * Math.PI) / 180)} ${24 - 19 * Math.cos((a * Math.PI) / 180)}`;
  let d = ""; for (let i = 0; i < cuts.length - 1; i++) { if (i < missing) continue; const a = cuts[i], b = cuts[i + 1]; d += `<path d="M24 24L${pt(a)}A19 19 0 ${b - a > 180 ? 1 : 0} 1 ${pt(b)}z" fill="${i % 2 ? "#ffd54a" : c}" ${ST}/>`; }
  return svg48(d);
};
const clock = (h, m) => svg48(`<circle cx="24" cy="24" r="21" fill="#fff" ${ST}/>${Array.from({ length: 12 }, (_, i) => `<line x1="24" y1="6" x2="24" y2="${i % 3 === 0 ? 10 : 8.5}" stroke="#38362f" stroke-width="2" transform="rotate(${i * 30} 24 24)"/>`).join("")}<line x1="24" y1="24" x2="24" y2="13.5" stroke="#38362f" stroke-width="3.6" stroke-linecap="round" transform="rotate(${((h % 12) + m / 60) * 30} 24 24)"/><line x1="24" y1="24" x2="24" y2="8.5" stroke="#e24b4b" stroke-width="2.6" stroke-linecap="round" transform="rotate(${m * 6} 24 24)"/><circle cx="24" cy="24" r="2" fill="#38362f"/>`);
const HW = ["une", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze"];
export const hourLabel = (h, half) => `${HW[h - 1]} heure${h > 1 ? "s" : ""}${half ? " et demie" : ""}`;
const GEAR = () => partById("engrenage").svg;

// ----- les mélanges de couleurs -----
const mixHex = (hex, t) => { const n = parseInt(hex.slice(1), 16), ch = s => Math.round(((n >> s) & 255) * (1 - t) + 255 * t); return `#${[16, 8, 0].map(s => ch(s).toString(16).padStart(2, "0")).join("")}`; };
// ----- poids des pièces (du plus léger au plus lourd) -----
const WEIGHTS = [["puce", 1], ["fil", 2], ["lampe", 3], ["camera", 5], ["pile", 6], ["roue", 7], ["moteur", 9]];
// ----- sons de robot (synthétisés) -----
export const SOUNDS = {
  moteur: { notes: [[90, 0.18, "sawtooth", 0], [90, 0.18, "sawtooth", 0.22], [90, 0.18, "sawtooth", 0.44]] },
  horloge: { notes: [[1200, 0.05, "square", 0], [1200, 0.05, "square", 0.4], [1200, 0.05, "square", 0.8], [1200, 0.05, "square", 1.2]] },
  "haut-parleur": { notes: [[523, 0.25, "sine", 0], [659, 0.25, "sine", 0.3], [784, 0.35, "sine", 0.6]] },
  "capteur-distance": { notes: [[880, 0.08, "square", 0], [880, 0.08, "square", 0.5], [880, 0.08, "square", 0.9], [880, 0.08, "square", 1.2], [880, 0.08, "square", 1.4]] },
  bouton: { notes: [[400, 0.06, "square", 0], [200, 0.1, "square", 0.07]] }
};
const NOTES = [["do", 262], ["ré", 294], ["mi", 330], ["fa", 349], ["sol", 392]];

// ----- les générateurs de manches (une manche = une question) -----
const ids = (n, r) => shuffle(SHAPES.map((_, i) => i), r).slice(0, n);
export const G = {
  // formes
  shapePick: r => { const [t, ...o] = ids(3, r), c = pick(COLORS, r)[1]; return Q(`Touche ${SHAPES[t][1]}.`, three(O(big(shape(t, c)), SHAPES[t][0]), o.map(i => O(big(shape(i, c)), SHAPES[i][0])), r)); },
  shapeName: r => { const [t, ...o] = ids(3, r), c = pick(COLORS, r)[1]; return Q("Quelle est cette forme ?", three(O(`<span class="ptword">${SHAPES[t][0]}</span>`, SHAPES[t][0]), o.map(i => O(`<span class="ptword">${SHAPES[i][0]}</span>`, SHAPES[i][0])), r), big(shape(t, c))); },
  inset: r => { const [t, ...o] = ids(3, r), c = pick(COLORS, r)[1]; return Q("Touche la forme qui entre.", three(O(big(shape(t, c)), SHAPES[t][0]), o.map(i => O(big(shape(i, c)), SHAPES[i][0])), r), big(shape(t, "#38362f"))); },
  oddShape: r => { const [a, b] = ids(2, r), c = pick(COLORS, r)[1], odd = r(4); return Q("Touche la forme différente.", shuffle(Array.from({ length: 4 }, (_, i) => ({ ...O(big(shape(i === odd ? b : a, c)), SHAPES[i === odd ? b : a][0]), ok: i === odd })), r), "", { odd: true }); },
  shapeMatch: (r, n) => matchOf(ids(n, r).map(i => ({ l: big(shape(i)) })), "Relie chaque forme à son ombre.", r),
  shapeMemory: (r, n) => mem(ids(n, r).map(i => ({ k: i, html: shape(i, pick(COLORS, r)[1]), label: SHAPES[i][0] })), r),
  shapeCount: r => { const [t, o] = ids(2, r), n = 1 + r(5), m = 1 + r(4), c = pick(COLORS, r)[1]; const mixed = shuffle([...Array(n).fill(t), ...Array(m).fill(o)], r); return Q(`Combien ${/^[aeiouyéèêh]/i.test(SHAPES[t][0]) ? "d'" : "de "}${SHAPES[t][0]}s ?`, numOpts(n, r, 1, 7), `<span class="ptcount">${mixed.map(i => `<i>${shape(i, c)}</i>`).join("")}</span>`); },
  // tailles (engrenages)
  sizeOrder: (r, n) => seq(Array.from({ length: n }, (_, i) => ({ html: scaled(GEAR(), 0.45 + (i * 0.55) / (n - 1)), label: "engrenage" })), "Touche du plus petit au plus grand.", r),
  sizeBig: (r, k) => { const s = shuffle([0.5, 0.65, 0.8, 1, 0.9].slice(0, k), r), mx = Math.max(...s); return Q("Touche le plus grand.", s.map(v => ({ ...O(scaled(GEAR(), v), "engrenage"), ok: v === mx }))); },
  sizeSmall: r => { const s = shuffle([0.45, 0.7, 1], r), mn = Math.min(...s); return Q("Touche le plus petit.", s.map(v => ({ ...O(scaled(GEAR(), v), "engrenage"), ok: v === mn }))); },
  sizeSame: r => { const v = pick([0.5, 0.7, 0.9, 1], r), o = shuffle([0.5, 0.7, 0.9, 1].filter(x => x !== v), r).slice(0, 2); return Q("Touche le même.", three(O(scaled(GEAR(), v), "engrenage"), o.map(x => O(scaled(GEAR(), x), "engrenage")), r), scaled(GEAR(), v)); },
  sizeNext: r => { const a = [0.45, 0.6, 0.75, 0.9, 1.05], st = r(2), seqv = a.slice(st, st + 3), nx = a[st + 3], wrong = shuffle(a.filter(x => x !== nx), r).slice(0, 2); return Q("Quel est le bloc suivant ?", three(O(scaled(GEAR(), nx), "engrenage"), wrong.map(x => O(scaled(GEAR(), x), "engrenage")), r), seqv.map(v => scaled(GEAR(), v)).join("")); },
  bigSmall: r => { const w = r(2); const a = shuffle([0.5, 1], r); return Q(w ? "Touche le grand." : "Touche le petit.", a.map(v => ({ ...O(scaled(GEAR(), v), "engrenage"), ok: w ? v === 1 : v === 0.5 }))); },
  // couleurs
  colorPick: r => { const [t, ...o] = shuffle(COLORS, r).slice(0, 3); return Q(`Touche le ${t[0]}.`, three(O(swatch(t[1]), t[0]), o.map(c => O(swatch(c[1]), c[0])), r)); },
  shadeOrder: (r) => { const c = pick(COLORS, r)[1]; return seq([0.8, 0.6, 0.4, 0.2, 0].map(t => ({ html: swatch(mixHex(c, t)), label: "couleur" })), "Touche du plus clair au plus foncé.", r); },
  colorMatch: (r, n) => matchOf(shuffle(COLORS, r).slice(0, n).map(c => ({ l: swatch(c[1]) })), "Relie les mêmes couleurs.", r, true),
  oddColor: r => { const [a] = shuffle(COLORS, r), odd = r(4); return Q("Touche la couleur différente.", shuffle(Array.from({ length: 4 }, (_, i) => ({ ...O(swatch(i === odd ? mixHex(a[1], 0.45) : a[1]), "couleur"), ok: i === odd })), r), "", { odd: true }); },
  sameColor: r => { const [t, ...o] = shuffle(COLORS, r).slice(0, 3); return Q("Touche la même couleur.", three(O(swatch(t[1]), t[0]), o.map(c => O(swatch(c[1]), c[0])), r), swatch(t[1])); },
  balloonPick: r => { const [t, ...o] = shuffle(COLORS, r).slice(0, 3); return Q(`Touche le ballon ${t[0]}.`, three(O(big(balloon(t[1])), "ballon " + t[0]), o.map(c => O(big(balloon(c[1])), "ballon " + c[0])), r)); },
  colorMemory: (r, n) => mem(shuffle(COLORS, r).slice(0, n).map(c => ({ k: c[0], html: swatch(c[1]), label: c[0] })), r),
  // triangles
  triPick: r => { const o = shuffle([1, 3, 4, 5, 6, 7].filter(i => i !== 2), r).slice(0, 2), c = pick(COLORS, r)[1]; return Q("Touche le triangle.", three(O(big(shape(2, c)), "triangle"), o.map(i => O(big(shape(i, c)), SHAPES[i][0])), r)); },
  triMatch: (r, n) => matchOf(shuffle(COLORS, r).slice(0, n).map(c => ({ l: big(shape(2, c[1])) })), "Relie les triangles pareils.", r, true),
  triMemory: (r, n) => mem(shuffle(COLORS, r).slice(0, n).map(c => ({ k: c[0], html: shape(2, c[1]), label: "triangle " + c[0] })), r),
  triCount: r => { const n = 1 + r(6), c = pick(COLORS, r)[1]; return Q("Combien de triangles ?", numOpts(n, r, 1, 7), `<span class="ptcount">${Array.from({ length: n }, () => `<i>${shape(2, c)}</i>`).join("")}</span>`); },
  pattern: r => { const [a, b] = ids(2, r), c = pick(COLORS, r)[1], A = big(shape(a, c)), B = big(shape(b, c)); return Q("Trouve la suite.", three(O(A, SHAPES[a][0]), [O(B, SHAPES[b][0]), O(big(shape(ids(3, r).find(i => i !== a && i !== b), c)), "autre forme")], r), `<span class="ptcount"><i>${shape(a, c)}</i><i>${shape(b, c)}</i><i>${shape(a, c)}</i><i>${shape(b, c)}</i></span>`); },
  // poids
  heavy: (r, k) => { const s = shuffle(WEIGHTS, r).slice(0, k), mx = Math.max(...s.map(x => x[1])); return Q("Touche le plus lourd.", s.map(([id, w]) => ({ ...O(big(partById(id).svg), partById(id).word), ok: w === mx }))); },
  light: r => { const s = shuffle(WEIGHTS, r).slice(0, 3), mn = Math.min(...s.map(x => x[1])); return Q("Touche le plus léger.", s.map(([id, w]) => ({ ...O(big(partById(id).svg), partById(id).word), ok: w === mn }))); },
  weightOrder: (r, n) => seq(shuffle(WEIGHTS, r).slice(0, n).sort((a, b) => a[1] - b[1]).map(([id]) => ({ html: big(partById(id).svg), label: partById(id).word })), "Touche du plus léger au plus lourd.", r),
  fruitCount: r => { const n = 1 + r(8), f = pick(["🍎", "🍓", "🍊", "🍇"], r); return Q("Combien de fruits ?", numOpts(n, r, 1, 9), items(n, f)); },
  // sons
  pitch: r => { const hi = r(2), f = hi ? 880 : 220; return Q("Le son est grave ou aigu ?", [{ ...O("⬇️ grave", "grave"), ok: !hi }, { ...O("⬆️ aigu", "aigu"), ok: !!hi }], "", { sound: { notes: [[f, 0.6, "sine", 0]] } }); },
  loud: r => { const lo = r(2); return Q("Le son est fort ou faible ?", [{ ...O("🔈 faible", "faible"), ok: !!lo }, { ...O("🔊 fort", "fort"), ok: !lo }], "", { sound: { notes: [[440, 0.7, "sine", 0, lo ? 0.04 : 0.35]] } }); },
  whoSound: r => { const ks = shuffle(Object.keys(SOUNDS), r).slice(0, 3), t = ks[0]; return Q("Quelle pièce fait ce bruit ?", three(O(big(partById(t).svg), partById(t).word), ks.slice(1).map(k => O(big(partById(k).svg), partById(k).word)), r), "", { sound: SOUNDS[t] }); },
  soundMemory: (r, n) => mem(shuffle(Object.keys(SOUNDS), r).slice(0, n).map(k => ({ k, html: partById(k).svg, label: partById(k).word, sound: SOUNDS[k] })), r),
  musicNote: r => { const [n, f] = pick(NOTES.slice(0, 3), r); return Q("Écoute et touche la note.", shuffle(NOTES.slice(0, 3).map(([name, hz]) => ({ ...O(`<span class="ptword">${name}</span>`, name), ok: name === n })), r), "", { sound: { notes: [[f, 0.8, "sine", 0]] } }); },
  animal: r => { const A = [["🐱", "le chat"], ["🐶", "le chien"], ["🐮", "la vache"], ["🐦", "l'oiseau"], ["🐸", "la grenouille"], ["🐑", "le mouton"]], [t, ...o] = shuffle(A, r).slice(0, 3); return Q(`Touche ${t[1]}.`, three(O(big(t[0]), t[1].replace(/^(le|la|l') ?/, "")), o.map(a => O(big(a[0]), a[1].replace(/^(le|la|l') ?/, ""))), r)); },
  // chiffres
  count: r => ROUNDS.chiffres(r)[r(5)],
  share: r => { const n = 2 * (1 + r(5)); return Q("On partage en deux : combien chacun ?", numOpts(n / 2, r, 1, 6), items(n, "🍬")); },
  fishCount: r => { const n = 1 + r(8); return Q("Combien de poissons ?", numOpts(n, r, 1, 9), items(n, "🐟")); },
  floors: r => { const n = 1 + r(7); return Q("Combien d'étages ?", numOpts(n, r, 1, 8), `<span class="ptbars" style="gap:4px">${Array.from({ length: n }, () => `<span class="ptbar1" style="width:88px;background:#3f7fd6"></span>`).join("")}</span>`); },
  moreLess: r => { const a = 1 + r(6); let b = 1 + r(6); if (b === a) b = a === 6 ? 5 : a + 1; const ic = "⚙️"; return Q("Touche le groupe qui en a le plus.", shuffle([a, b], r).map(n => ({ ...O(items(n, ic), "groupe"), ok: n === Math.max(a, b) }))); },
  // fractions
  pieCount: r => { const k = pick([2, 3, 4, 6], r); return Q("Combien de parts ?", numOpts(k, r, 2, 8), big(pie(k))); },
  pieEqual: r => { const k = pick([3, 4], r), eq = r(2); return Q("Touche les parts égales.", shuffle([{ ...O(big(pie(k, true)), "parts égales"), ok: true }, O(big(pie(k, false)), "parts inégales")].map((o, i) => ({ ...o, ok: !!o.ok })), r)); },
  pieHalf: r => { const k = pick([2, 4], r); return Q("Touche la moitié.", shuffle([{ ...O(big(pie(2, true, 1)), "la moitié"), ok: true }, { ...O(big(pie(4, true, 1)), "les trois quarts"), ok: false }, { ...O(big(pie(4, true, 3)), "le quart"), ok: false }].slice(0, 3), r)); },
  nextNumber: (r, lo, hi) => { const n = lo + r(hi - lo); return Q(`Quel nombre vient après ${lab(n)} ?`, numOpts(n + 1, r, Math.max(0, n - 2), n + 3).filter(Boolean), `<span class="ptword">${n}</span>`); },
  // longueurs
  barPick: r => { const s = shuffle([2, 4, 6], r), mx = 6; return Q("Quelle est la plus longue ?", s.map(n => ({ ...O(bar(n), "barre"), ok: n === mx }))); },
  barOrder: (r, n) => seq(Array.from({ length: n }, (_, i) => ({ html: bar(i + 2), label: "barre" })), "Touche de la plus courte à la plus longue.", r),
  barSame: r => { const n = 2 + r(5); const o = shuffle([2, 3, 4, 5, 6, 7].filter(x => x !== n), r).slice(0, 2); return Q("Touche la même longueur.", three(O(bar(n), "barre"), o.map(x => O(bar(x), "barre")), r), bar(n)); },
  barHalf: r => { const n = 2 * (1 + r(3)); const o = shuffle([1, 2, 3, 4, 5, 6].filter(x => x !== n / 2), r).slice(0, 2); return Q("Touche la moitié de la barre.", three(O(bar(n / 2), "barre"), o.map(x => O(bar(x), "barre")), r), bar(n)); },
  barParts: r => { const n = 1 + r(8); return Q("Combien de morceaux ?", numOpts(n, r, 1, 9), rod(n)); },
  // nombres (tableau des cent, dizaines)
  missing: (r, step, hi) => { const a = step * (1 + r(Math.floor(hi / step) - 3)), seqn = [a, a + step, a + 2 * step, a + 3 * step], k = 1 + r(2), ans = seqn[k]; return Q("Quel nombre manque ?", numOpts(ans, r, Math.max(0, ans - 3 * step), ans + 3 * step).filter(Boolean), `<span class="ptword">${seqn.map((v, i) => (i === k ? "?" : v)).join(" , ")}</span>`); },
  numOrder: (r, n) => { const set = new Set(); while (set.size < n) set.add(1 + r(99)); return seq([...set].sort((a, b) => a - b).map(v => ({ html: `<span class="ptword">${v}</span>`, label: String(v) })), "Touche les nombres du plus petit au plus grand.", r); },
  before: r => { const n = 2 + r(9); return Q(`Quel nombre vient avant ${lab(n)} ?`, numOpts(n - 1, r, Math.max(0, n - 3), n + 2).filter(Boolean), `<span class="ptword">${n}</span>`); },
  beadCount: r => { const n = 1 + r(20); return Q("Combien de perles ?", numOpts(n, r, 1, 20).filter(Boolean), bead(n, "#e24b8a")); },
  teen: r => { const n = 11 + r(9); return Q(`Touche le nombre ${TEEN[n - 11]}.`, numOpts(n, r, 11, 19).filter(Boolean)); },
  teenBeads: r => { const n = 11 + r(9); return Q("Combien de perles ?", numOpts(n, r, 11, 19).filter(Boolean), `${bead(10, "#ffd54a")}${bead(n - 10, "#e24b8a")}`); },
  tensCount: r => { const n = 1 + r(8); return Q("Combien de dizaines ?", numOpts(n, r, 1, 9), `<span class="ptbars" style="gap:4px">${Array.from({ length: n }, () => `<span class="ptbar1" style="width:120px;background:#ffd54a"></span>`).join("")}</span>`); },
  compose: r => { const t = 1 + r(5), u = 1 + r(8), n = t * 10 + u, o = shuffle([n + 10, n - 10, n + 1, n - 1].filter(x => x > 0), r).slice(0, 2); return Q("Quel est ce nombre ?", three(O(String(n), String(n)), o.map(x => O(String(x), String(x))), r), `${bead(t, "#ffd54a").replace(/22/g, "30")}${bead(u, "#e24b8a")}`); },
  coinSum: r => { const vals = [pick([1, 2, 5], r), pick([1, 2, 5], r), pick([1, 2, 5], r)], n = vals.reduce((a, b) => a + b, 0); return Q("Combien d'argent ?", numOpts(n, r, 2, 16).filter(Boolean), `<span class="ptcount">${vals.map(v => `<i>${coin(v)}</i>`).join("")}</span>`); },
  coinCount: r => { const n = 1 + r(8); return Q("Combien de pièces ?", numOpts(n, r, 1, 9), `<span class="ptcount">${Array.from({ length: n }, () => `<i>${coin(1)}</i>`).join("")}</span>`); },
  teenAdd: r => { const b = 1 + r(8); return Q(`Dix plus ${lab(b)} font combien ?`, numOpts(10 + b, r, 11, 19).filter(Boolean), `<span class="ptword">10 + ${b}</span>`); },
  numberMatch: (r, n) => { const ks = shuffle([11, 12, 13, 14, 15, 16, 17, 18, 19], r).slice(0, n); return { type: "match", say: "Relie chaque nombre à ses perles.", plain: true, left: ks.map((v, k) => ({ html: `<span class="ptword">${v}</span>`, k })), right: shuffle(ks.map((v, k) => ({ html: bead(v - 10, "#e24b8a"), k })), r) }; },
  rodCount: r => { const n = 1 + r(9); return Q("Combien de carrés ?", numOpts(n, r, 1, 10), rod(n)); },
  rodPick: r => { const n = 2 + r(7), o = shuffle([2, 3, 4, 5, 6, 7, 8, 9].filter(x => x !== n), r).slice(0, 2); return Q(`Touche la barre ${lab(n)}.`, three(O(rod(n), "barre"), o.map(x => O(rod(x), "barre")), r)); },
  rodComplete: r => { const tot = 5 + r(5), shown = 2 + r(tot - 3), need = tot - shown, o = shuffle([1, 2, 3, 4, 5].filter(x => x !== need), r).slice(0, 2); return Q("Quelle barre complète ?", three(O(rod(need), "barre"), o.map(x => O(rod(x), "barre")), r), `${rod(shown)}<span class="ptword">? = ${tot}</span>`); },
  rodOrder: (r, n) => seq(Array.from({ length: n }, (_, i) => ({ html: rod(i + 2), label: "barre" })), "Touche de la plus courte à la plus longue.", r),
  // calculs
  add: r => { const a = 1 + r(8), b = 1 + r(9 - a); return Q(`Combien font ${lab(a)} plus ${lab(b)} ?`, numOpts(a + b, r, 1, 10), `<span class="ptword">${a} + ${b} = ?</span>`); },
  sub: r => { const a = 2 + r(8), b = 1 + r(a - 1); return Q(`Combien font ${lab(a)} moins ${lab(b)} ?`, numOpts(a - b, r, 0, 9), `<span class="ptword">${a} − ${b} = ?</span>`); },
  addFish: r => { const a = 1 + r(5), b = 1 + r(5); return Q("Combien en tout ?", numOpts(a + b, r, 2, 10), `<span class="ptcount">${Array.from({ length: a }, () => `<i>${fish("#e24b4b")}</i>`).join("")}${Array.from({ length: b }, () => `<i>${fish("#3f7fd6")}</i>`).join("")}</span>`); },
  addParts: r => { const a = 1 + r(5), b = 1 + r(5), p = pick(["engrenage", "pile", "lampe", "roue", "moteur"], r); return Q("Combien en tout ?", numOpts(a + b, r, 2, 10), `<span class="ptcount">${Array.from({ length: a + b }, () => `<i>${partById(p).svg}</i>`).join("")}</span>`); },
  addMissing: r => { const a = 1 + r(6), c = a + 1 + r(9 - a); return Q(`${lab(a)} plus combien font ${lab(c)} ?`, numOpts(c - a, r, 1, 9), `<span class="ptword">${a} + ? = ${c}</span>`); },
  subMissing: r => { const a = 3 + r(7), c = r(a - 1); return Q(`${lab(a)} moins combien font ${lab(c)} ?`, numOpts(a - c, r, 1, 9), `<span class="ptword">${a} − ? = ${c}</span>`); },
  trueFalse: r => { const a = 1 + r(8), b = 1 + r(9 - a), ok = r(2), shown = ok ? a + b : a + b + (r(2) ? 1 : -1); return Q("Est-ce juste ?", [{ ...O("✔ oui", "oui"), ok: !!ok }, { ...O("✖ non", "non"), ok: !ok }], `<span class="ptword">${a} + ${b} = ${Math.max(0, shown)}</span>`); },
  calcMatch: (r, n) => { const ps = shuffle(Array.from({ length: 9 }, (_, i) => i + 2), r).slice(0, n).map(s => { const a = 1 + r(s - 1); return { a, b: s - a, s }; }); return { type: "match", say: "Relie chaque calcul à son résultat.", plain: true, left: ps.map((p, k) => ({ html: `<span class="ptword">${p.a} + ${p.b}</span>`, k })), right: shuffle(ps.map((p, k) => ({ html: `<span class="ptword">${p.s}</span>`, k })), r) }; },
  subMatch: (r, n) => { let ps; do { ps = shuffle(Array.from({ length: 8 }, (_, i) => i + 3), r).slice(0, n).map(a => { const b = 1 + r(a - 1); return { a, b, s: a - b }; }); } while (new Set(ps.map(p => p.s)).size < n); return { type: "match", say: "Relie chaque calcul à son résultat.", plain: true, left: ps.map((p, k) => ({ html: `<span class="ptword">${p.a} − ${p.b}</span>`, k })), right: shuffle(ps.map((p, k) => ({ html: `<span class="ptword">${p.s}</span>`, k })), r) }; },
  leftFish: r => { const a = 3 + r(6), b = 1 + r(a - 1); return Q("Combien reste-t-il ?", numOpts(a - b, r, 0, 9), `<span class="ptcount">${Array.from({ length: a }, (_, i) => `<i style="opacity:${i < b ? 0.25 : 1}">${fish("#3f7fd6")}</i>`).join("")}</span>`); },
  upDown: r => { const a = 2 + r(7), up = r(2), b = up ? a + 1 + r(2) : Math.max(0, a - 1 - r(2)); return Q("Le nombre augmente ou diminue ?", [{ ...O("⬆️ augmente", "augmente"), ok: !!up }, { ...O("⬇️ diminue", "diminue"), ok: !up }], `<span class="ptword">${a} → ${b}</span>`); },
  mixAddSub: r => (r(2) ? G.add(r) : G.sub(r)),
  // horloge
  clockRead: r => { const h = 1 + r(12), half = r(2), lbl = hourLabel(h, half), o = [[(h % 12) + 1, half], [h, 1 - half]].map(([hh, hf]) => hourLabel(hh, hf)); return Q("Quelle heure est-il ?", three(O(`<span class="ptword">${lbl}</span>`, lbl), o.map(l => O(`<span class="ptword">${l}</span>`, l)), r), `<span class="ptclock">${clock(h, half ? 30 : 0)}</span>`); },
  clockSet: (r, halfOnly) => { const h = 1 + r(12), half = halfOnly ? 1 : r(2), lbl = hourLabel(h, half), o = [[(h % 12) + 1, half], [h, 1 - half]]; return Q(`Touche l'horloge qui montre ${lbl}.`, three(O(`<span class="ptclock">${clock(h, half ? 30 : 0)}</span>`, lbl), o.map(([hh, hf]) => O(`<span class="ptclock">${clock(hh, hf ? 30 : 0)}</span>`, hourLabel(hh, hf))), r)); },
  clockHalf: r => { const h = 1 + r(12), half = r(2); return Q("Heure pile ou demie ?", [{ ...O("🕐 pile", "pile"), ok: !half }, { ...O("🕜 et demie", "et demie"), ok: !!half }], `<span class="ptclock">${clock(h, half ? 30 : 0)}</span>`); },
  clockMatch: (r, n) => { const hs = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], r).slice(0, n); return { type: "match", say: "Relie chaque horloge à son heure.", plain: true, left: hs.map((h, k) => ({ html: `<span class="ptclock">${clock(h, 0)}</span>`, k })), right: shuffle(hs.map((h, k) => ({ html: `<span class="ptword">${h} h</span>`, k })), r) }; },
  clockOrder: (r, n) => { const s = 1 + r(9); return seq(Array.from({ length: n }, (_, i) => ({ html: `<span class="ptclock">${clock(s + i, 0)}</span>`, label: hourLabel(s + i, 0) })), "Touche les heures dans l'ordre.", r); }
};
const TEEN = ["onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];

// ----- le catalogue : 16 catégories, comme sur iwawa -----
// jeu = [identifiant, titre, icône, manches (r => [manches]) ] ; « puzzle » ouvre le puzzle du robot
const R = (f, n, ...a) => r => Array.from({ length: n }, () => f(r, ...a));
export const CATEGORIES = [
  { id: "geometrie", icon: "🗄️", title: "Cabinet géométrique", games: [
    ["formes-calines", "Formes câlines", "🔵", R(G.shapePick, 5)], ["encastrements", "Encastrements", "🧩", R(G.inset, 5)], ["formes-jumelles", "Formes jumelles", "👯", r => [G.shapeMatch(r, 3), G.shapeMatch(r, 3), G.shapeMatch(r, 4)]],
    ["memoire-formes", "Mémoire des formes", "🃏", r => [G.shapeMemory(r, 3), G.shapeMemory(r, 4)]], ["une-autre-partie", "Une autre partie", "🔍", R(G.oddShape, 5)], ["formes-connues", "Formes que je connais", "⭐", R(G.shapeName, 5)]] },
  { id: "tour-rose", icon: "🧱", title: "Tour rose", games: [
    ["construire-tour", "Construire une tour", "🗼", r => [G.sizeOrder(r, 3), G.sizeOrder(r, 4), G.sizeOrder(r, 5)]], ["pas-a-pas", "Pas à pas", "👣", R(G.sizeNext, 5)], ["bloc-suivant", "Le bloc suivant", "➡️", R(G.sizeSmall, 5)],
    ["bonne-taille", "La bonne taille", "📐", R(G.sizeSame, 5)], ["grand-petit", "Grand et petit", "🐘", R(G.bigSmall, 5)], ["le-plus-grand", "Le plus grand", "🏔️", R(G.sizeBig, 5, 4)]] },
  { id: "couleurs", icon: "🎨", title: "Tablettes de couleurs", games: [
    ["couleurs-calines", "Couleurs câlines", "🍅", R(G.colorPick, 5)], ["degrade", "Dégradé de couleurs", "🌈", r => [G.shadeOrder(r), G.shadeOrder(r), G.shadeOrder(r)]], ["associer-couleurs", "Associer les couleurs", "🔗", r => [G.colorMatch(r, 3), G.colorMatch(r, 3), G.colorMatch(r, 4)]],
    ["couleur-differente", "Couleur différente", "🧐", R(G.oddColor, 5)], ["trouve-pareil", "Trouve le pareil", "🎯", R(G.sameColor, 5)], ["tir-ballons", "Tir aux ballons", "🎈", R(G.balloonPick, 5)]] },
  { id: "triangles", icon: "🔺", title: "Triangles constructeurs", games: [
    ["trier-triangles", "Trier les triangles", "🔺", R(G.triPick, 5)], ["triangle-triangle", "Triangle et triangle", "👯", r => [G.triMatch(r, 3), G.triMatch(r, 3), G.triMatch(r, 4)]], ["puzzle-triangles", "Puzzle de triangles", "🧩", "puzzle"],
    ["aplatir", "Aplatir ensemble", "🃏", r => [G.triMemory(r, 3), G.triMemory(r, 4)]], ["trouve-regle", "Trouve la règle", "🔁", R(G.pattern, 5)], ["la-chute", "La chute", "⬇️", R(G.triCount, 5)]] },
  { id: "poids", icon: "⚖️", title: "Tablettes de poids", games: [
    ["sentir-poids", "Sentir le poids", "✋", R(G.heavy, 5, 3)], ["balance", "Balance", "⚖️", R(G.heavy, 5, 2)], ["qui-lourd", "Qui est le plus lourd ?", "🏋️", R(G.light, 5)],
    ["transporter", "Transporter les pièces", "🚚", r => [G.weightOrder(r, 3), G.weightOrder(r, 4), G.weightOrder(r, 5)]], ["magasin", "Magasin de fruits", "🍎", R(G.fruitCount, 5)], ["trier-poids", "Trier par poids", "📦", r => [G.weightOrder(r, 4), G.weightOrder(r, 5)]]] },
  { id: "sons", icon: "🔔", title: "Cylindres sonores", games: [
    ["associer-sons", "Grave ou aigu", "🎵", R(G.pitch, 5)], ["trier-volume", "Fort ou faible", "🔊", R(G.loud, 5)], ["devine-qui", "Devine qui je suis", "🤖", R(G.whoSound, 5)],
    ["memoire-sons", "Mémoire des sons", "🃏", r => [G.soundMemory(r, 3), G.soundMemory(r, 4)]], ["cris-animaux", "Les animaux", "🐮", R(G.animal, 5)], ["boite-musique", "Boîte à musique", "🎶", R(G.musicNote, 5)]] },
  { id: "chiffres", icon: "🔢", title: "Chiffres et jetons", games: [
    ["compter", "Compter", "1️⃣", r => ROUNDS.chiffres(r)], ["partager", "Partager les bonbons", "🍬", R(G.share, 5)], ["poissons", "Poissons à compter", "🐟", R(G.fishCount, 5)],
    ["compter-formes", "Compter les formes", "🔷", R(G.shapeCount, 5)], ["immeuble", "Construire un grand immeuble", "🏢", R(G.floors, 5)], ["plus-moins", "Plus et moins", "➕", R(G.moreLess, 5)]] },
  { id: "fractions", icon: "🍕", title: "Quilles des fractions", games: [
    ["parts-egales", "Parts égales", "🍕", R(G.pieCount, 5)], ["egal-inegal", "Égal et inégal", "⚖️", R(G.pieEqual, 5)], ["refaire-tout", "Refaire un tout", "🧩", "puzzle"],
    ["puzzle-egal", "Puzzle égal", "🍉", "puzzle"], ["voisin", "Voisin", "🏘️", r => times(5, rr => G.nextNumber(rr, 1, 9), r)], ["separe", "Sépare-le", "✂️", R(G.pieHalf, 5)]] },
  { id: "barres", icon: "📏", title: "Barres rouges", games: [
    ["plus-longue", "Quelle est la plus longue ?", "📏", R(G.barPick, 5)], ["trier-longueur", "Trier par longueur", "📶", r => [G.barOrder(r, 3), G.barOrder(r, 4), G.barOrder(r, 5)]], ["tuyau", "Tuyau à relier", "🔧", R(G.barSame, 5)],
    ["couper-pain", "Couper le pain", "🥖", R(G.barHalf, 5)], ["gratte-ciels", "Gratte-ciels", "🏙️", r => [G.barOrder(r, 4), G.barOrder(r, 5), G.barOrder(r, 6)]], ["tige", "Tige télescopique", "🔭", R(G.barParts, 5)]] },
  { id: "cent", icon: "💯", title: "Tableau des cent", games: [
    ["remplir", "Remplir les nombres", "🔲", r => times(5, rr => G.missing(rr, 1, 20), r)], ["de-1-a-100", "De 1 à 100", "💯", r => [G.numOrder(r, 3), G.numOrder(r, 4), G.numOrder(r, 5)]], ["trier-nombres", "Trier les nombres", "🔀", r => [G.numOrder(r, 4), G.numOrder(r, 5)]],
    ["train", "Train des nombres", "🚂", r => times(5, rr => G.missing(rr, 10, 90), r)], ["compte-rebours", "Avant le nombre", "⏪", R(G.before, 5)], ["perles", "Perles des nombres", "📿", R(G.beadCount, 5)]] },
  { id: "decimal", icon: "🪙", title: "Système décimal", games: [
    ["un-dix-cent", "Dizaines", "🔟", R(G.tensCount, 5)], ["decomposer", "Décomposer les nombres", "🧮", R(G.compose, 5)], ["payer", "Payer au supermarché", "🛒", R(G.coinSum, 5)],
    ["boulier", "Boulier décimal", "🧮", R(G.compose, 4)], ["pieces-or", "Compter les pièces d'or", "🪙", R(G.coinCount, 5)], ["test-final", "Test final", "🏆", r => [G.tensCount(r), G.compose(r), G.coinSum(r), G.coinCount(r), G.compose(r)]]] },
  { id: "dizaines", icon: "🔟", title: "Tableau des dizaines", games: [
    ["nombres-teen", "De onze à dix-neuf", "1️⃣1️⃣", R(G.teen, 5)], ["dizaines-unites", "Dizaines et unités", "📿", R(G.teenBeads, 5)], ["compter-vite", "Compter vite", "⚡", R(G.teenAdd, 5)],
    ["associer-dizaines", "Associer les nombres", "🔗", r => [G.numberMatch(r, 3), G.numberMatch(r, 3), G.numberMatch(r, 4)]]] },
  { id: "barres-num", icon: "🟦", title: "Barres numériques", games: [
    ["compter-barres", "Compter avec les barres", "🟥", R(G.rodCount, 5)], ["casse-oeuf", "Casse l'œuf", "🥚", R(G.rodPick, 5)], ["pont", "Construire le pont", "🌉", R(G.rodComplete, 5)],
    ["trier-barres", "Trier les barres", "📶", r => [G.rodOrder(r, 3), G.rodOrder(r, 4), G.rodOrder(r, 5)]], ["fruits", "Attraper les fruits", "🍓", R(G.fruitCount, 5)], ["gare", "La gare", "🚉", r => times(5, rr => G.nextNumber(rr, 1, 9), r)]] },
  { id: "addition", icon: "➕", title: "Bandes d'addition", games: [
    ["addition-operation", "Opération d'addition", "➕", R(G.add, 5)], ["associer-nombres", "Associer les nombres", "🔗", r => [G.calcMatch(r, 3), G.calcMatch(r, 3), G.calcMatch(r, 4)]], ["poisson-rouge-bleu", "Poisson rouge, poisson bleu", "🐠", R(G.addFish, 5)],
    ["probleme-addition", "Problème d'addition", "⚙️", R(G.addParts, 5)], ["oui-non", "Oui ou non", "✅", R(G.trueFalse, 5)], ["completer", "Compléter", "✏️", R(G.addMissing, 5)]] },
  { id: "soustraction", icon: "➖", title: "Bandes de soustraction", games: [
    ["soustraction", "Soustraction", "➖", R(G.sub, 5)], ["relier-calculs", "Relier les calculs", "🔗", r => [G.subMatch(r, 3), G.subMatch(r, 3), G.subMatch(r, 4)]], ["addition-soustraction", "Addition et soustraction", "➕", R(G.mixAddSub, 5)],
    ["combien-poissons", "Combien de poissons", "🐟", R(G.leftFish, 5)], ["soustraction-completer", "Soustraction à compléter", "✏️", R(G.subMissing, 5)], ["augmenter-diminuer", "Augmenter ou diminuer", "↕️", R(G.upDown, 5)]] },
  { id: "horloge", icon: "🕐", title: "Horloge à aiguilles", games: [
    ["puzzle-horloge", "Les heures dans l'ordre", "🧩", r => [G.clockOrder(r, 3), G.clockOrder(r, 3), G.clockOrder(r, 4)]], ["quelle-heure", "Quelle heure est-il ?", "🕑", R(G.clockRead, 5)], ["regle-horloge", "Règle l'horloge", "⏰", R(G.clockSet, 5)],
    ["associer-heures", "Associer les heures", "🔗", r => [G.clockMatch(r, 3), G.clockMatch(r, 3), G.clockMatch(r, 4)]], ["tic-tac", "Tic-tac", "🐸", R(G.clockHalf, 5)], ["fabrique-horloge", "Fabrique ton horloge", "🕧", R(G.clockSet, 5, true)]] }
];
export const GAMES = CATEGORIES.flatMap(c => c.games.map(([id, title, icon, rounds]) => ({ id, title, icon, rounds, cat: c.id })));
export const gameById = id => GAMES.find(g => g.id === id);

// toutes les consignes possibles (pour enregistrer les clips : voice/extract.mjs)
export function montessoriPhrases() {
  const out = new Set(["Retrouve les paires.", "Quelle est cette forme ?", "Touche la forme qui entre.", "Touche la forme différente.", "Relie chaque forme à son ombre.", "Combien de cercles ?", "Combien de carrés ?", "Combien de triangles ?", "Combien de rectangles ?", "Combien d'étoiles ?", "Combien de losanges ?", "Combien d'hexagones ?", "Combien d'ovales ?",
    "Touche du plus petit au plus grand.", "Touche le plus grand.", "Touche le plus petit.", "Touche le même.", "Quel est le bloc suivant ?", "Touche le grand.", "Touche le petit.", "Touche du plus clair au plus foncé.", "Relie les mêmes couleurs.", "Touche la couleur différente.", "Touche la même couleur.",
    "Touche le triangle.", "Relie les triangles pareils.", "Combien de triangles ?", "Trouve la suite.", "Touche le plus lourd.", "Touche le plus léger.", "Touche du plus léger au plus lourd.", "Combien de fruits ?", "Le son est grave ou aigu ?", "Le son est fort ou faible ?", "Quelle pièce fait ce bruit ?", "Écoute et touche la note.",
    "On partage en deux : combien chacun ?", "Combien de poissons ?", "Combien d'étages ?", "Touche le groupe qui en a le plus.", "Combien de parts ?", "Touche les parts égales.", "Touche la moitié.", "Quelle est la plus longue ?", "Touche de la plus courte à la plus longue.", "Touche la même longueur.", "Touche la moitié de la barre.", "Combien de morceaux ?",
    "Quel nombre manque ?", "Touche les nombres du plus petit au plus grand.", "Combien de perles ?", "Combien de dizaines ?", "Quel est ce nombre ?", "Combien d'argent ?", "Combien de pièces ?", "Relie chaque nombre à ses perles.", "Combien de carrés ?", "Quelle barre complète ?", "Relie chaque calcul à son résultat.",
    "Combien en tout ?", "Est-ce juste ?", "Combien reste-t-il ?", "Le nombre augmente ou diminue ?", "Quelle heure est-il ?", "Heure pile ou demie ?", "Relie chaque horloge à son heure.", "Touche les heures dans l'ordre."]);
  SHAPES.forEach(([, art]) => out.add(`Touche ${art}.`)); COLORS.forEach(([n]) => { out.add(`Touche le ${n}.`); out.add(`Touche le ballon ${n}.`); });
  ["le chat", "le chien", "la vache", "l'oiseau", "la grenouille", "le mouton"].forEach(a => out.add(`Touche ${a}.`));
  for (let n = 1; n <= 8; n++) out.add(`Quel nombre vient après ${lab(n)} ?`);
  for (let n = 2; n <= 10; n++) out.add(`Quel nombre vient avant ${lab(n)} ?`);
  TEEN.forEach(t => out.add(`Touche le nombre ${t}.`)); for (let n = 2; n <= 9; n++) out.add(`Touche la barre ${lab(n)}.`);
  for (let b = 1; b <= 9; b++) out.add(`Dix plus ${lab(b)} font combien ?`);
  for (let a = 1; a <= 8; a++) for (let b = 1; b <= 9 - a; b++) out.add(`Combien font ${lab(a)} plus ${lab(b)} ?`);
  for (let a = 2; a <= 9; a++) for (let b = 1; b < a; b++) out.add(`Combien font ${lab(a)} moins ${lab(b)} ?`);
  for (let a = 1; a <= 6; a++) for (let c = a + 1; c <= 9; c++) out.add(`${lab(a)} plus combien font ${lab(c)} ?`);
  for (let a = 3; a <= 9; a++) for (let c = 0; c <= a - 2; c++) out.add(`${lab(a)} moins combien font ${lab(c)} ?`);
  for (let h = 1; h <= 12; h++) { out.add(`Touche l'horloge qui montre ${hourLabel(h, 0)}.`); out.add(`Touche l'horloge qui montre ${hourLabel(h, 1)}.`); }
  return [...out].filter(s => s.split(/\s+/).length >= 2);
}
