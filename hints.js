// Indices qui s'adaptent à ce que l'enfant a déjà fait (au lieu de toujours répéter « commence par… ») :
// 1. où est le but, 2. ce que fait SON programme (cogne, tourne en rond, s'arrête trop tôt), 3. le prochain bloc à changer, 4. une solution.
// Aucun affichage ici : tout se calcule à partir de la carte et des blocs, donc ça marche aussi pour « Dessine ton parcours ».
import { parseScenario, DIRS } from "./scenario.js";
import { runProgram, Limit } from "./blocks.js";

const LABEL = { fd: "avancer", tl: "tourner à gauche", tr: "tourner à droite", pick: "ramasser l'étoile" };
const SIMPLE = new Set(["fd", "tl", "tr", "pick"]);
const key = (r, c) => r + "," + c;
const first = level => { const s = level.scenarios && level.scenarios[0]; return parseScenario(s ? { map: s.map, dir: s.dir ?? 1 } : { map: level.map, dir: level.dir ?? 1 }); };
const blockedAt = (sc, r, c) => r < 0 || c < 0 || r >= sc.h || c >= sc.w || sc.rocks.has(key(r, c));

// le plus court programme (avancer / tourner) qui mène au drapeau en ramassant toutes les étoiles ; null si impossible
export function shortestProgram(sc, auto = true) {
  const stars = [...sc.stars], idx = new Map(stars.map((k, i) => [k, i])), all = (1 << stars.length) - 1;
  const pickAt = (mask, r, c) => { const i = idx.get(key(r, c)); return i === undefined ? mask : mask | (1 << i); };
  const startMask = auto ? pickAt(0, sc.start[0], sc.start[1]) : 0, id = (r, c, d, m) => r + "," + c + "," + d + "," + m;
  const q = [[sc.start[0], sc.start[1], sc.dir, startMask]], prev = new Map([[id(...q[0]), null]]);
  const done = (r, c, m) => m === all && (!sc.flag || (sc.flag[0] === r && sc.flag[1] === c));
  for (let h = 0; h < q.length; h++) {
    const [r, c, d, m] = q[h]; if (done(r, c, m)) { const out = []; let k = id(r, c, d, m); while (prev.get(k)) { out.push(prev.get(k).op); k = prev.get(k).from; } return out.reverse(); }
    const next = [];
    const [dr, dc] = DIRS[d]; if (!blockedAt(sc, r + dr, c + dc)) next.push(["fd", r + dr, c + dc, d, auto ? pickAt(m, r + dr, c + dc) : m]);
    next.push(["tl", r, c, (d + 3) % 4, m], ["tr", r, c, (d + 1) % 4, m]);
    if (!auto && idx.has(key(r, c)) && !(m & (1 << idx.get(key(r, c))))) next.push(["pick", r, c, d, pickAt(m, r, c)]);
    for (const [op, nr, nc, nd, nm] of next) { const k = id(nr, nc, nd, nm); if (!prev.has(k)) { prev.set(k, { op, from: id(r, c, d, m) }); q.push([nr, nc, nd, nm]); } }
  }
  return null;
}

// exécute le programme de l'enfant sans rien afficher
export function simulate(level, lists) {
  const sc = first(level), auto = !!level.auto, picked = new Set();
  const pos = { r: sc.start[0], c: sc.start[1], dir: sc.dir }, res = { bump: false, limit: false, atFlag: true, missing: 0, dist: 0, ok: false };
  const take = () => { const k = key(pos.r, pos.c); if (sc.stars.has(k)) picked.add(k); };
  const blocked = () => { const [dr, dc] = DIRS[pos.dir]; return blockedAt(sc, pos.r + dr, pos.c + dc); };
  const env = { cond: n => n === "obstacle" ? blocked() : n === "libre" ? !blocked() : n === "etoile" ? sc.stars.has(key(pos.r, pos.c)) && !picked.has(key(pos.r, pos.c)) : n === "pasarrive" ? !(sc.flag && sc.flag[0] === pos.r && sc.flag[1] === pos.c) : false };
  if (auto) take();
  try {
    for (const n of runProgram(lists, env)) {
      if (n.t === "fd") { if (blocked()) { res.bump = true; break; } const [dr, dc] = DIRS[pos.dir]; pos.r += dr; pos.c += dc; if (auto) take(); }
      else if (n.t === "tl") pos.dir = (pos.dir + 3) % 4; else if (n.t === "tr") pos.dir = (pos.dir + 1) % 4; else if (n.t === "pick") take();
    }
  } catch (e) { if (e instanceof Limit) res.limit = true; else throw e; }
  res.atFlag = !sc.flag || (sc.flag[0] === pos.r && sc.flag[1] === pos.c); res.missing = sc.stars.size - picked.size;
  res.dist = sc.flag ? Math.abs(sc.flag[0] - pos.r) + Math.abs(sc.flag[1] - pos.c) : 0; res.ok = !res.bump && !res.limit && res.atFlag && res.missing === 0; return res;
}

const plural = (n, w) => `${n} ${w}${n > 1 ? "s" : ""}`;
const dirText = (dr, dc) => { const p = []; if (dr) p.push(`${plural(Math.abs(dr), "case")} vers le ${dr < 0 ? "haut" : "bas"}`); if (dc) p.push(`${plural(Math.abs(dc), "case")} vers la ${dc > 0 ? "droite" : "gauche"}`); return p.join(" et "); };
// « avancer, avancer, avancer » → « avancer 3 fois »
export function describeOps(ops) {
  const out = []; for (let i = 0; i < ops.length;) { let j = i; while (j < ops.length && ops[j] === ops[i]) j++; const n = j - i; out.push(n > 1 ? `${LABEL[ops[i]]} ${n} fois` : LABEL[ops[i]]); i = j; }
  return out.join(", ");
}
// la solution de référence : celle du niveau si elle est faite de blocs simples, sinon le plus court chemin calculé
export function referenceOps(level) {
  const m = level.sol && level.sol.main; if (m && m.length && m.every(n => SIMPLE.has(n.t))) return m.map(n => n.t);
  return shortestProgram(first(level), !!level.auto);
}

// stage : 0 le but, 1 ce que fait mon programme, 2 le prochain bloc, 3 une solution
export function hintStage(lists, presses = 0) { const start = lists.main.length ? 1 : 0; return Math.min(3, start + presses); }
export function hintFor(level, lists, stage) {
  const sc = first(level), ref = referenceOps(level), main = lists.main, simple = main.every(n => SIMPLE.has(n.t));
  if (stage <= 0) {
    if (!sc.flag && !sc.stars.size) return { text: "💡 Touche les blocs pour guider le robot.", say: "Touche les blocs pour guider le robot." };
    const parts = []; if (sc.flag) parts.push(`Le drapeau 🏁 est à ${dirText(sc.flag[0] - sc.start[0], sc.flag[1] - sc.start[1]) || "la case du robot"}.`);
    if (sc.stars.size) parts.push(`Ramasse ${sc.stars.size > 1 ? sc.stars.size + " étoiles" : "l'étoile"} ⭐ en chemin.`);
    const t = parts.join(" "); return { text: "💡 " + t, say: t.replace(/[🏁⭐]/gu, "").replace(/\s+/g, " ").trim() };
  }
  if (stage === 1) {
    if (!main.length) { const o = ref && ref[0] ? `Commence par « ${LABEL[ref[0]]} ».` : "Commence par un bloc."; return { text: "💡 " + o, say: o }; }
    const r = simulate(level, lists); let t;
    if (r.ok) t = "Ton programme marche déjà : appuie sur ▶ Lancer !";
    else if (r.bump) t = "Ton robot cogne un obstacle ou le bord. Il faut tourner avant !";
    else if (r.limit) t = "Ton programme ne s'arrête jamais. Regarde ta boucle.";
    else if (!r.atFlag) t = r.dist ? `Ton robot s'arrête à ${plural(r.dist, "case")} du drapeau.` : "Ton robot est sur le drapeau, mais il manque des étoiles.";
    else t = `Il manque ${plural(r.missing, "étoile")} ⭐.`;
    return { text: "💡 " + t, say: t.replace(/[⭐]/gu, "").trim() };
  }
  if (!ref) return { text: "💡 Essaie un autre chemin : ce parcours est difficile.", say: "Essaie un autre chemin." };
  if (stage === 2) {
    let t;
    if (!simple) t = `Une solution commence par « ${LABEL[ref[0]]} ».`;
    else { let i = 0; while (i < main.length && i < ref.length && main[i].t === ref[i]) i++;
      if (i === main.length && i < ref.length) t = `Après ton bloc ${i || "départ"}, ajoute « ${LABEL[ref[i]]} ».`.replace("bloc départ", "départ").replace("Après ton départ", "Pour commencer");
      else if (i < main.length && i < ref.length) t = `Au bloc ${i + 1}, essaie « ${LABEL[ref[i]]} ».`;
      else t = "Tes blocs sont les bons, mais il y en a trop. Retire-en un."; }
    return { text: "💡 " + t, say: t };
  }
  const t = `Une solution : ${describeOps(ref)}.`; return { text: "💡 " + t, say: t };
}
