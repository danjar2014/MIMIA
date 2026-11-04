// Le « Défi du jour » : 3 petites questions de révision, tirées de ce que l'enfant a DÉJÀ appris.
// Les réponses vraies viennent du moteur de l'appli (simulation du robot, exécution du code), pas d'un texte écrit à la main.
import { S, isDone } from "./util.js";
import { RANKS, currentRank } from "./parcours.js";
import { LEVELS } from "./levels.js";
import { parseScenario, DIRS } from "./scenario.js";
import { FLAT } from "./codemissions.js";
import { forLang } from "./codepy.js";
import { runSpec } from "./codeengine.js";

export function rng(seed) { let h = 2166136261; for (const c of String(seed)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const shuffle = (a, r) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const C = (id, rank, text, good, bad, why) => ({ id, rank, text, good, bad, why });

// ----- questions de compréhension, par aventure -----
export const CONCEPTS = [
  C("c1", 0, "Un robot obéit à…", "des ordres", ["la météo", "ses rêves"], "Un robot ne décide de rien tout seul : il fait ce qu'on lui demande."),
  C("c2", 0, "Un programme, c'est…", "une liste d'ordres, les uns après les autres", ["un seul ordre", "un dessin"], "Un programme est une suite d'ordres que le robot lit dans l'ordre."),
  C("c3", 0, "Dans quel sens le robot lit-il son programme ?", "De haut en bas, un ordre après l'autre", ["Au hasard", "De bas en haut"], "Comme un livre : du premier ordre jusqu'au dernier."),
  C("c4", 0, "Quel ordre fait avancer le robot d'un pas ?", "⬆️ avance", ["↷ tourne à droite", "↶ tourne à gauche"], "⬆️ fait avancer ; les flèches qui tournent le font pivoter sur place."),
  C("c5", 0, "Si on change l'ordre des ordres, le résultat…", "peut changer", ["reste toujours le même", "devient toujours faux"], "« Tourne puis avance » n'est pas pareil que « avance puis tourne »."),
  C("c6", 1, "Quelle pièce donne l'énergie au robot ?", "la batterie", ["la lampe", "le haut-parleur"], "La batterie est le réservoir d'énergie du robot."),
  C("c7", 1, "Quelle pièce fait tourner les roues ?", "les moteurs", ["le capteur de lumière", "le bouton"], "Les moteurs font tourner les roues."),
  C("c8", 1, "À quoi sert un capteur ?", "À sentir ce qui se passe autour du robot", ["À faire du bruit", "À donner de l'énergie"], "Les capteurs sont les sens du robot : ils voient la lumière, la distance…"),
  C("c9", 1, "Que fait le cerveau du robot ?", "Il reçoit les informations des capteurs et donne des ordres", ["Il stocke l'énergie", "Il ne sert à rien"], "Capteurs → cerveau → moteurs : le cerveau décide."),
  C("c10", 2, "Une boucle sert à…", "répéter des ordres sans les réécrire", ["arrêter le robot", "changer sa couleur"], "Au lieu d'écrire 7 fois « avance », on répète 7 fois."),
  C("c11", 2, "On répète 3 fois « avance ». Le robot avance de…", "3 pas", ["1 pas", "6 pas"], "3 répétitions × 1 pas = 3 pas."),
  C("c12", 3, "Le capteur de distance mesure…", "la distance entre le robot et un obstacle", ["la lumière", "la vitesse du robot"], "Il dit au cerveau si un mur est proche."),
  C("c13", 3, "Un capteur envoie son information au cerveau par…", "une entrée (point bleu)", ["une sortie (point vert)", "la batterie"], "Capteurs sur les entrées bleues, actions sur les sorties vertes."),
  C("c14", 5, "« Si un obstacle est devant, alors tourne. » C'est…", "une condition (un choix)", ["une boucle", "une variable"], "« Si … alors … » permet au robot de choisir."),
  C("c15", 5, "« Tant que le chemin est libre, avance. » Quand le robot s'arrête-t-il ?", "Quand un obstacle apparaît", ["Jamais", "Tout de suite"], "Une boucle « tant que » continue jusqu'à ce que la condition devienne fausse."),
  C("c16", 5, "À quoi sert « Mon bloc » (une fonction) ?", "À donner un nom à une suite d'ordres pour la réutiliser", ["À arrêter le programme", "À changer la carte"], "On écrit le détour une fois, puis on l'appelle quand on veut."),
  C("c17", 7, "Une variable, c'est…", "une boîte avec un nom qui garde une valeur", ["un ordre pour le robot", "une faute d'écriture"], "nombre = 5 range 5 dans la boîte « nombre »."),
  C("c18", 7, "Que veut dire  x = 5  ?", "Range 5 dans la boîte x", ["Compare x avec 5", "x vaut 6"], "Un seul signe = range une valeur. Pour comparer, on en écrit deux (==)."),
  C("c19", 7, "Dans  for i in range(3):  combien de tours fait la boucle ?", "3", ["2", "4"], "i vaut 0, 1, 2 : trois tours (3 n'est jamais atteint)."),
  C("c20", 7, "Pour comparer deux valeurs, on écrit…", "== (deux signes égal)", ["= (un seul)", ":"], "Un seul = range une valeur, deux == comparent."),
  C("c21", 7, "Combien vaut  7 % 2  ?", "1", ["3", "0"], "% donne le reste de la division : 7 = 3 × 2 + 1."),
  C("c22", 8, "Que fait return dans une fonction ?", "Rend le résultat et arrête la fonction", ["Affiche à l'écran", "Répète la fonction"], "return renvoie la valeur calculée à celui qui a appelé la fonction."),
  C("c23", 8, "Pourquoi écrit-on des fonctions ?", "Pour réutiliser un morceau de programme", ["Pour ralentir l'ordinateur", "Pour faire des fautes"], "On écrit une fois, on utilise cent fois."),
  C("c24", 9, "À quoi sert la mémoire du cerveau (une variable vrai/faux) ?", "À se souvenir d'un événement, même quand il est fini", ["À éteindre le robot", "À mesurer la distance"], "L'alarme qui continue après le départ de l'intrus utilise une mémoire."),
  C("c25", 9, "En vrai code, une lampe allumée avec lampe(True)…", "reste allumée jusqu'à ce qu'on l'éteigne", ["s'éteint toute seule", "clignote"], "Une sortie garde son état : il faut dire quand l'éteindre."),
  C("c26", 9, "En Python, pour changer dans une fonction une variable créée dehors, on écrit d'abord…", "global nom", ["let nom", "var nom"], "global dit à Python qu'on veut changer la variable du dehors.")
];
const choices = (good, bad, r) => shuffle([{ label: good, ok: true }, ...bad.map(b => ({ label: b, ok: false }))], r);

// ----- le robot arrive-t-il au drapeau ? (vérité calculée par simulation) -----
const ICON = { fd: "⬆️", tl: "↶", tr: "↷" };
const flatten = a => a.flatMap(n => n.t === "rep" ? Array.from({ length: n.n }, () => flatten(n.body)).flat() : (ICON[n.t] ? [n.t] : []));
export function walk(map, dir, seq) {
  const sc = parseScenario({ map, dir }); let r = sc.start[0], c = sc.start[1], d = sc.dir, bump = false;
  for (const o of seq) { if (o === "tl") d = (d + 3) % 4; else if (o === "tr") d = (d + 1) % 4; else { const [dr, dc] = DIRS[d], nr = r + dr, nc = c + dc; if (nr < 0 || nc < 0 || nr >= sc.h || nc >= sc.w || sc.rocks.has(nr + "," + nc)) { bump = true; break; } r = nr; c = nc; } }
  return { bump, atFlag: !!sc.flag && sc.flag[0] === r && sc.flag[1] === c, pos: [r, c] };
}
const art = map => map.map(row => [...row].map(ch => ({ R: "🤖", r: "🤖", F: "🏁", "*": "⭐", "#": "🪨" }[ch] || "⬜")).join("")).join("\n");
function robotQuestion(r, done) {
  const cands = []; ["a", "b"].forEach(b => LEVELS[b].forEach((lv, i) => { if (done("prog", b + (i + 1)) && lv.map && lv.sol && !lv.map.join("").includes("r")) { const seq = flatten(lv.sol.main); if (seq.length && !JSON.stringify(lv.sol.main).match(/while|if|call/)) cands.push({ lv, seq }); } }));
  if (!cands.length) return null;
  const { lv, seq } = cands[Math.floor(r() * cands.length)], wantYes = r() < 0.5;
  const muts = [seq, seq.slice(0, -1), (() => { const s = seq.slice(), k = s.findIndex((x, i) => i < s.length - 1 && x !== s[i + 1]); if (k >= 0) [s[k], s[k + 1]] = [s[k + 1], s[k]]; return s; })(), [...seq, "fd"], ["tr", ...seq]];
  const res = muts.map(s => ({ s, w: walk(lv.map, lv.dir ?? 1, s) })), pool = shuffle(res.filter(x => (x.w.atFlag && !x.w.bump) === wantYes), r), pick = pool[0] || shuffle(res, r)[0], yes = pick.w.atFlag && !pick.w.bump;
  const dirName = ["vers le haut ⬆️", "vers la droite ➡️", "vers le bas ⬇️", "vers la gauche ⬅️"][lv.dir ?? 1];
  return { kind: "robot", id: "robot-" + lv.title, text: `Le robot regarde ${dirName}. Il suit ce programme : ${pick.s.map(o => ICON[o]).join(" ")}\nArrive-t-il au drapeau 🏁 ?`, art: art(lv.map), choices: [{ label: "Oui, il arrive au drapeau", ok: yes }, { label: "Non, il n'y arrive pas", ok: !yes }], why: yes ? "Oui : le robot termine exactement sur le drapeau." : pick.w.bump ? "Non : le robot rencontre un obstacle ou le bord de la grille avant d'arriver." : "Non : le robot s'arrête ailleurs, pas sur le drapeau. Suis les ordres un par un sur la grille !" };
}
// ----- que va afficher ce programme ? (le vrai résultat vient de l'exécution) -----
function outputQuestion(r, done, lang, only = null) {
  const cands = FLAT.filter(m => m.group === "mots").filter(m => (!only || only.includes(m.id)) && done("code", m.id) && m.spec.expect && m.solution);
  if (!cands.length) return null;
  const m0 = cands[Math.floor(r() * cands.length)], m = forLang(m0, lang), run = runSpec({ kind: "console", free: true, lang: lang === "py" ? "py" : undefined }, m.solution);
  if (!run.ok || !run.output.length || run.output.length > 8) return null;
  const L = run.output, key = x => x.join(", "), good = key(L), seen = new Set([good]), bad = [];
  const num = L.every(x => /^-?\d+$/.test(x)), alts = [L.slice().reverse(), L.slice(0, -1), num ? L.map(x => String(+x + 1)) : [...L, "…"], L.slice(1), num ? [...L, String(+L[L.length - 1] + 1)] : L.map(x => x.toUpperCase())];
  for (const a of shuffle(alts, r)) { const k = key(a); if (k && !seen.has(k)) { seen.add(k); bad.push(k); } if (bad.length === 2) break; }
  if (bad.length < 2) return null;
  return { kind: "output", id: "out-" + m0.id, text: "Que va afficher ce programme ?", code: m.solution, lang, choices: choices(good, bad, r), why: `Le programme affiche, ligne après ligne : ${good}.` };
}
// ----- à quelle ligne est la faute ? (la vraie ligne vient du moteur) -----
function bugQuestion(r, done, lang) {
  const cands = FLAT.filter(m => done("code", m.id) && m.solution).map(m => forLang(m, lang)).filter(m => m.solution && m.solution.split("\n").length >= 3);
  if (!cands.length) return null;
  for (const m of shuffle(cands, r)) {
    const lines = m.solution.split("\n"), idx = lines.map((l, i) => i).filter(i => lang === "py" ? /^\s*(for|while|if|elif|else|def)\b.*:\s*$/.test(lines[i]) : /\)/.test(lines[i]) && lines[i].trim().length > 5);
    for (const i of shuffle(idx, r)) {
      const mut = lines.slice(); mut[i] = lang === "py" ? lines[i].replace(/:\s*$/, "") : lines[i].replace(/\)([^)]*)$/, "$1");
      const res = runSpec(m.spec, mut.join("\n")), line = res.error && res.error.line;
      if (res.ok || !line || line !== i + 1 && res.stage !== "syntax") continue;
      if (line !== i + 1) continue;
      const others = shuffle(lines.map((l, k) => k).filter(k => k !== i && lines[k].trim()), r).slice(0, 3); if (others.length < 2) continue;
      const opts = shuffle([i, ...others], r).map(k => ({ label: `Ligne ${k + 1} : ${mut[k].trim()}`, ok: k === i }));
      return { kind: "bug", id: "bug-" + m.id, text: "Ce programme a une faute d'écriture. À quelle ligne ?", code: mut.join("\n"), lang, choices: opts, why: `La faute est à la ligne ${i + 1} : ${res.error.msg}` };
    }
  }
  return null;
}

// ----- le défi du jour : 3 questions -----
export function makeDaily(seed, { done = isDone, rank = currentRank(), lang = S.codeLang || "py", avoid = [] } = {}) {
  const r = rng(seed), qs = [], used = new Set(avoid);
  const concept = () => { let pool = CONCEPTS.filter(c => c.rank <= rank && !used.has(c.id)); if (pool.length < 1) pool = CONCEPTS.filter(c => c.rank <= rank); const c = pool[Math.floor(r() * pool.length)]; used.add(c.id); return { kind: "concept", id: c.id, text: c.text, choices: choices(c.good, c.bad, r), why: c.why }; };
  qs.push(concept());
  qs.push((rank >= 1 && robotQuestion(r, done)) || concept());
  qs.push(((rank >= 7 && (r() < 0.5 ? outputQuestion(r, done, lang) || bugQuestion(r, done, lang) : bugQuestion(r, done, lang) || outputQuestion(r, done, lang)))) || (rank >= 1 && robotQuestion(r, done)) || concept());
  return qs;
}

// ----- le test de placement : 5 questions, de la plus facile à la plus difficile -----
// on compte les bonnes réponses d'affilée depuis le début ; la première erreur ou « je ne sais pas » arrête le test.
export const PLACEMENT_START = [0, 1, 3, 5, 7, 9];
export const PLACEMENT_TOPICS = ["ce qu'est un programme et l'ordre des ordres", "suivre les ordres d'un robot sur une grille", "les boucles et les choix (si…)", "lire un vrai programme en Python", "les fonctions et la mémoire du cerveau"];
export const placeFrom = answers => { let passes = 0; for (const a of answers) { if (a === "ok") passes++; else break; } return { passes, rank: PLACEMENT_START[Math.min(passes, 5)] }; };
export function placementQuestions(seed = Math.random()) {
  const r = rng("placement" + seed), pick = ids => { const id = ids[Math.floor(r() * ids.length)]; return CONCEPTS.find(c => c.id === id); };
  const cq = c => ({ kind: "concept", id: c.id, text: c.text, choices: choices(c.good, c.bad, r), why: c.why }), all = () => true;
  const qs = [cq(pick(["c2", "c3", "c5"])), robotQuestion(r, all) || cq(pick(["c8", "c9"])), cq(pick(["c10", "c14", "c15", "c16"])), outputQuestion(r, all, "py", ["k5", "k6", "k7"]) || cq(pick(["c17", "c19", "c21"])), cq(pick(["c22", "c24", "c25", "c26"]))];
  return qs.map((q, i) => ({ ...q, level: i + 1 }));
}
