// Le moteur du vrai code : exécute le JavaScript de l'enfant (dans un Worker côté navigateur, ou directement dans les tests)
// et dit en français ce qui s'est passé. Aucune dépendance à l'affichage.
import { parseScenario, DIRS } from "./scenario.js";
import { PROG_CASES, describeOut } from "./boardlogic.js";

import { Stop, LimitErr } from "./codeerrors.js";
import { makePython, parsePython, PyErr } from "./pyinterp.js";
export { Stop, LimitErr };
const MAXSTEPS = 2500;

export const NAMES = {
  console: ["afficher"],
  robot: ["afficher", "avancer", "tournerGauche", "tournerDroite", "ramasser", "obstacleDevant", "etoileIci", "arrive"],
  brain: ["afficher", "lampe", "roues", "hautParleur", "distance", "lumiere", "boutonAppuye", "tic"]
};
// noms des commandes en Python (snake_case) ↔ noms JavaScript
const PY2JS = { tourner_gauche: "tournerGauche", tourner_droite: "tournerDroite", obstacle_devant: "obstacleDevant", etoile_ici: "etoileIci", haut_parleur: "hautParleur", bouton_appuye: "boutonAppuye" };
const JS2PY = Object.fromEntries(Object.entries(PY2JS).map(([a, b]) => [b, a]));
export const pyName = n => JS2PY[n] || n;
const fmt = v => (typeof v === "string" ? v : v === undefined ? "undefined" : typeof v === "object" ? JSON.stringify(v) : String(v));
const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const stripComments = c => c.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

// ---------- vérification d'écriture avant de lancer (parenthèses, guillemets, for) ----------
const OPEN = { "(": ")", "{": "}", "[": "]" }, NOM = { "(": "parenthèse", ")": "parenthèse", "{": "accolade", "}": "accolade", "[": "crochet", "]": "crochet" };
export function lint(code) {
  const curly = /[“”‘’«»]/.exec(code);
  if (curly) return { line: code.slice(0, curly.index).split("\n").length, msg: `Ce guillemet « ${curly[0]} » ne marche pas en programmation. Utilise les guillemets droits " " (le bouton « guillemet » sous l'éditeur).` };
  const st = []; let line = 1, i = 0, q = null, qLine = 0;
  while (i < code.length) {
    const ch = code[i], nx = code[i + 1];
    if (q) { if (ch === "\\") { i += 2; continue; } if (ch === q) q = null; else if (ch === "\n" && q !== "`") return { line: qLine, msg: "Il manque un guillemet pour fermer ce texte : chaque \" ouvert doit être refermé sur la même ligne." }; if (ch === "\n") line++; i++; continue; }
    if (ch === "/" && nx === "/") { while (i < code.length && code[i] !== "\n") i++; continue; }
    if (ch === "/" && nx === "*") { const e = code.indexOf("*/", i + 2); const seg = code.slice(i, e < 0 ? code.length : e + 2); line += seg.split("\n").length - 1; i += seg.length; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { q = ch; qLine = line; i++; continue; }
    if (ch === "\n") line++;
    if (OPEN[ch]) st.push({ ch, line });
    else if (ch === ")" || ch === "}" || ch === "]") {
      const top = st.pop();
      if (!top) return { line, msg: `Il y a une ${NOM[ch]} fermante « ${ch} » en trop : elle ne ferme rien.` };
      if (OPEN[top.ch] !== ch) return { line, msg: `Cette ${NOM[ch]} « ${ch} » ne va pas avec la ${NOM[top.ch]} « ${top.ch} » ouverte ligne ${top.line}. Les ( ) { } vont par paires, dans le bon ordre.` };
    }
    i++;
  }
  if (q) return { line: qLine, msg: "Il manque un guillemet pour fermer ce texte." };
  if (st.length) { const t = st[st.length - 1]; return { line: t.line, msg: `La ${NOM[t.ch]} « ${t.ch} » de la ligne ${t.line} n'est jamais fermée : il manque « ${OPEN[t.ch]} ».` }; }
  const lines = stripComments(code).split("\n");
  for (let k = 0; k < lines.length; k++) { const m = /\bfor\s*\((.*)\)\s*\{?\s*$/.exec(lines[k]); if (m && !/\b(of|in)\b/.test(m[1]) && (m[1].match(/;/g) || []).length !== 2) return { line: k + 1, msg: "Dans for ( … ) il faut exactement deux point-virgules ; pour séparer les 3 parties. Exemple : for (let i = 0; i < 5; i++)" }; }
  return null;
}

// ---------- traduire les erreurs ----------
const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
function suggest(word, names, code) {
  const mine = [...stripComments(code).matchAll(/\b(?:let|const|var|function)\s+([A-Za-z_$À-ÿ][\wÀ-ÿ$]*)/g)].map(m => m[1]);
  const all = [...new Set([...names, ...mine])]; const w = word.toLowerCase();
  const same = all.find(n => n.toLowerCase() === w); if (same) return same;
  let best = null, bd = 99; for (const n of all) { const d = lev(w, n.toLowerCase()); if (d < bd) { bd = d; best = n; } }
  return bd <= (word.length >= 5 ? 2 : 1) ? best : null;
}
function lineOf(e) { const m = /<anonymous>:(\d+):\d+/.exec(String((e && e.stack) || "")); return m && +m[1] - 3 >= 1 ? +m[1] - 3 : null; }
export function explain(e, code, names = []) {
  if (e instanceof PyErr) return { msg: e.fr, line: e.line, text: e.line ? (code.split("\n")[e.line - 1] || "").trim() : "", raw: e.fr };
  const raw = String((e && e.message) || e); let m, msg;
  if (e instanceof LimitErr) msg = "Ton programme travaille trop longtemps : il ne s'arrête jamais. Regarde la condition de ta boucle : devient-elle fausse un jour ?";
  else if (e instanceof ReferenceError && (m = /^(.+?) is not defined/.exec(raw))) { const s = suggest(m[1], names, code); msg = `Je ne connais pas « ${m[1]} ».` + (s ? ` Tu voulais écrire « ${s} » ? Fais attention aux majuscules et aux accents.` : " Si c'est une boîte (variable), crée-la d'abord avec let."); }
  else if (e instanceof ReferenceError && (m = /Cannot access '(.+)' before initialization/.exec(raw))) msg = `Tu utilises « ${m[1]} » avant de l'avoir créée avec let. Crée-la plus haut dans ton programme.`;
  else if ((m = /^(.+?) is not a function/.exec(raw))) msg = `« ${m[1].replace(/\(.*$/, "")} » n'est pas une action : on ne peut pas mettre de parenthèses () après elle.`;
  else if (/Assignment to constant variable/.test(raw)) msg = "Une boîte créée avec const ne peut plus changer. Utilise let pour une boîte qui change.";
  else if ((m = /Identifier '(.+)' has already been declared/.exec(raw))) msg = `Le nom « ${m[1]} » existe déjà (c'est peut-être une commande du robot, ou une boîte déjà créée). Choisis un autre nom.`;
  else if (e instanceof SyntaxError) {
    msg = "Je ne comprends pas une phrase de ton code : il y a une faute d'écriture.";
    if ((m = /Unexpected token '(.+)'/.exec(raw))) msg += ` Je ne m'attendais pas à trouver « ${m[1]} » ici.`;
    else if (/Unexpected end of input/.test(raw)) msg += " Il manque quelque chose à la fin (une accolade } ou une parenthèse ) ?).";
    else if (/Unexpected identifier/.test(raw)) msg += " Il manque peut-être un point-virgule ; ou un signe (+, =, …) entre deux mots.";
    else if (/Invalid or unexpected token/.test(raw)) msg += " Un caractère n'est pas permis (des guillemets bizarres ?).";
    msg += " Vérifie les parenthèses, les accolades, les guillemets et les virgules.";
  } else if (e instanceof RangeError) msg = "Un nombre est trop grand pour que je puisse continuer.";
  else msg = "Il y a une erreur dans ton programme : " + raw;
  const line = lineOf(e), text = line ? (code.split("\n")[line - 1] || "").trim() : "";
  return { msg, line, text, raw };
}

// ---------- exécution ----------
function build(code, names, exp, lang) {
  if (lang === "py") {
    parsePython(code);
    return (...vals) => {
      const api = Object.fromEntries(names.map((n, i) => [pyName(n), vals[i]])), py = makePython(code, api, Object.keys(api));
      py.run(); return Object.fromEntries(exp.map(n => [n, py.fnExport(n)]));
    };
  }
  return new Function(...names, '"use strict";\n' + code + "\n;return {" + exp.map(n => `${n}: typeof ${n} === "function" ? ${n} : undefined`).join(",") + "};");
}
const fail = (stage, e, code, names, extra = {}) => ({ ok: false, stage, error: explain(e, code, names), output: [], ...extra });

export function runSpec(spec, code) {
  const l = spec.lang === "py" ? null : lint(code); if (l) return { ok: false, stage: "syntax", error: { msg: l.msg, line: l.line, text: (code.split("\n")[l.line - 1] || "").trim() }, output: [] };
  if (spec.kind === "robot") return runRobot(spec, code);
  if (spec.kind === "brain") return runBrain(spec, code);
  return runConsole(spec, code);
}

function runConsole(spec, code) {
  const names = NAMES.console, out = [];
  const afficher = (...a) => { if (out.length >= 300) throw new LimitErr(); out.push(a.map(fmt).join(" ")); };
  let f; try { f = build(code, names, spec.fn ? [spec.fn] : [], spec.lang); } catch (e) { return fail("syntax", e, code, names); }
  let ex; try { ex = f(afficher); } catch (e) { return fail("runtime", e, code, names, { output: out }); }
  if (spec.free) return { ok: true, stage: "free", output: out };
  const clean = stripComments(code); let rows = null, why = "", ok = true;
  if (spec.fn) {
    const fn = ex[spec.fn];
    if (!fn) return { ok: false, stage: "check", output: out, why: `Je ne trouve pas la fonction « ${spec.fn} ». Écris : ${spec.lang === "py" ? `def ${spec.fn}(${spec.params || "n"}):` : `function ${spec.fn}(${spec.params || "n"}) { … }`}` };
    rows = [];
    for (const t of spec.tests) {
      let got; try { got = fn(...t.args); } catch (e) { return fail("runtime", e, code, names, { output: out, rows }); }
      const good = typeof got === typeof t.want ? got === t.want : fmt(got) === fmt(t.want);
      const none = got === undefined || got === null; rows.push({ label: `${spec.fn}(${t.args.map(fmt).join(", ")})`, want: fmt(t.want), got: none ? "undefined" : fmt(got), ok: good });
    }
    const bad = rows.find(r => !r.ok);
    if (bad) { ok = false; why = bad.got === "undefined" ? `${bad.label} ne renvoie rien. Une fonction rend son résultat avec return.` : `${bad.label} devrait donner ${bad.want}, mais ton programme donne ${bad.got}.`; }
  } else {
    const want = spec.expect;
    if (!out.length) { ok = false; why = "Ton programme n'affiche rien pour le moment. Utilise afficher( … ) pour écrire un message."; }
    else {
      const n = Math.max(want.length, out.length);
      for (let i = 0; i < n; i++) if (norm(out[i] ?? "") !== norm(want[i] ?? "")) {
        ok = false;
        why = i >= out.length ? `Il manque la ligne ${i + 1} : « ${want[i]} ».` : i >= want.length ? `Ton programme affiche ${out.length} lignes, mais il n'en faut que ${want.length}.` : `La ligne ${i + 1} devrait dire « ${want[i]} », mais ton programme affiche « ${out[i]} ».`;
        break;
      }
    }
  }
  if (ok) for (const r of spec.require || []) if (!new RegExp(r.re).test(clean)) { ok = false; why = "Ton résultat est juste ✓ mais le but du niveau n'est pas atteint : " + r.msg; break; }
  return { ok, stage: "check", output: out, rows, why };
}

function runRobot(spec, code) {
  const names = NAMES.robot, results = [];
  for (const raw of spec.scenarios) {
    const sc = parseScenario(raw), st = { r: sc.start[0], c: sc.start[1], dir: sc.dir, picked: new Set(), bump: null }, log = [], out = []; let n = 0;
    const tick = () => { if (++n > MAXSTEPS) throw new LimitErr(); };
    const blocked = () => { const [dr, dc] = DIRS[st.dir], r = st.r + dr, c = st.c + dc; return r < 0 || c < 0 || r >= sc.h || c >= sc.w || sc.rocks.has(r + "," + c); };
    const here = () => st.r + "," + st.c;
    const api = {
      afficher: (...a) => { if (out.length < 100) out.push(a.map(fmt).join(" ")); },
      avancer: (k = 1) => { k = Math.floor(Number(k)); if (!(k >= 0 && k <= 200)) throw new RangeError("pas"); for (let i = 0; i < k; i++) { tick(); if (blocked()) { st.bump = [st.r, st.c]; log.push({ a: "bump", r: st.r, c: st.c }); throw new Stop(); } const [dr, dc] = DIRS[st.dir]; st.r += dr; st.c += dc; if (spec.auto && sc.stars.has(here())) st.picked.add(here()); log.push({ a: "fd", r: st.r, c: st.c }); } },
      tournerGauche: () => { tick(); st.dir = (st.dir + 3) % 4; log.push({ a: "tl" }); },
      tournerDroite: () => { tick(); st.dir = (st.dir + 1) % 4; log.push({ a: "tr" }); },
      ramasser: () => { tick(); const ok = sc.stars.has(here()) && !st.picked.has(here()); if (ok) st.picked.add(here()); log.push({ a: "pick", ok, r: st.r, c: st.c }); },
      obstacleDevant: () => { tick(); return blocked(); },
      etoileIci: () => { tick(); return sc.stars.has(here()) && !st.picked.has(here()); },
      arrive: () => { tick(); return !sc.flag || (sc.flag[0] === st.r && sc.flag[1] === st.c); }
    };
    let f; try { f = build(code, names, [], spec.lang); } catch (e) { return fail("syntax", e, code, names); }
    let error = null, limit = false;
    try { f(...names.map(k => api[k])); } catch (e) { if (e instanceof Stop) { /* le robot s'est arrêté */ } else if (e instanceof LimitErr) limit = true; else error = explain(e, code, names); }
    const atFlag = !sc.flag || (sc.flag[0] === st.r && sc.flag[1] === st.c), missing = sc.stars.size - st.picked.size;
    results.push({ log, output: out, error, limit, bump: st.bump, atFlag, missing, ok: !error && !st.bump && !limit && atFlag && missing === 0 });
    if (!results[results.length - 1].ok) break;
  }
  let ok = results.length === spec.scenarios.length && results.every(r => r.ok), why = "";
  if (ok) for (const r of spec.require || []) if (!new RegExp(r.re).test(stripComments(code))) { ok = false; why = "Ton robot réussit ✓ mais le but du niveau n'est pas atteint : " + r.msg; break; }
  return { ok, stage: "check", results, why, output: [] };
}

function runBrain(spec, code) {
  const names = NAMES.brain, cases = PROG_CASES[spec.goal] || [], out = [], o = { led: false, motor: false, speaker: false };
  const BASE = { dist: 100, light: 90, pressed: false, t: 0 }; let inp = { ...BASE }, n = 0;
  const tick = () => { if (++n > 4000) throw new LimitErr(); };
  const api = {
    afficher: (...a) => { if (out.length < 100) out.push(a.map(fmt).join(" ")); },
    lampe: b => { tick(); o.led = !!b; }, roues: b => { tick(); o.motor = !!b; }, hautParleur: b => { tick(); o.speaker = !!b; },
    distance: () => { tick(); return inp.dist; }, lumiere: () => { tick(); return inp.light; }, boutonAppuye: () => { tick(); return inp.pressed; }, tic: () => { tick(); return inp.t % 2 === 0; }
  };
  let f; try { f = build(code, names, ["setup", "boucle"], spec.lang); } catch (e) { return fail("syntax", e, code, names); }
  let ex; try { ex = f(...names.map(k => api[k])); } catch (e) { return fail("runtime", e, code, names, { output: out }); }
  if (!ex.boucle) return { ok: false, stage: "check", rows: [], output: out, why: `Je ne trouve pas la fonction « boucle ». Le cerveau relit sans cesse cette fonction : écris ${spec.lang === "py" ? "def boucle():" : "function boucle() { … }"}` };
  try { if (ex.setup) ex.setup(); } catch (e) { return fail("runtime", e, code, names, { output: out }); }
  const rows = []; let prev = null;
  for (const c of cases) {
    inp = { ...BASE, ...c.inp };
    try { ex.boucle(); } catch (e) { return fail("runtime", e, code, names, { output: out, rows }); }
    const got = { ...o }, row = { label: c.label, inp: { ...inp }, want: c.want || null, got, ok: true };
    if (c.toggle) { row.keys = [c.toggle]; row.ok = !prev || got[c.toggle] !== prev[c.toggle]; row.why = "la lampe doit changer à chaque tour (allumée, éteinte, allumée…)"; }
    else { row.keys = Object.keys(c.want); row.ok = row.keys.every(k => got[k] === c.want[k]); row.stuck = row.keys.some(k => c.want[k] === false && got[k] === true); }
    prev = got; rows.push(row);
    if (!row.ok) break;
  }
  const ok = rows.length === cases.length && rows.every(r => r.ok);
  let why = ""; const bad = rows.find(r => !r.ok);
  if (bad) why = bad.why ? `Situation « ${bad.label} » : ${bad.why}.` : `Situation « ${bad.label} » : on attend : ${describeOut(bad.want, bad.keys)}. Ton programme donne : ${describeOut(bad.got, bad.keys)}.` + (bad.stuck ? ` 💡 En vrai code, une sortie reste allumée tant qu'on ne l'éteint pas : ajoute un else (sinon), ou écris lampe(${spec.lang === "py" ? "False" : "false"}).` : "");
  return { ok, stage: "check", rows, output: out, why };
}

// ---------- lire le code à voix haute (symboles dits en français) ----------
const SPOKEN_WORDS = { def: "définis la fonction", in: "dans", range: "intervalle", elif: "sinon si", and: "et", or: "ou", not: "pas", True: "vrai", False: "faux", None: "rien", print: "affiche", global: "global, variable du dehors", pass: "ne rien faire", let: "let, crée une boîte", const: "const, une boîte qui ne change pas", var: "var", function: "fonction", return: "renvoie", if: "si", else: "sinon", while: "tant que", for: "pour", true: "vrai", false: "faux", of: "dans" };
const SPOKEN_SYMBOLS = { "(": "ouvre parenthèse", ")": "ferme parenthèse", "{": "ouvre accolade", "}": "ferme accolade", "[": "ouvre crochet", "]": "ferme crochet", ";": "point-virgule", "=": "égale", "==": "égale égale", "===": "égale égale égale", "!=": "différent de", "!==": "différent de", "<": "plus petit que", ">": "plus grand que", "<=": "plus petit ou égal à", ">=": "plus grand ou égal à", "+": "plus", "-": "moins", "*": "fois", "/": "divisé par", "%": "reste de la division par", "!": "pas", "&&": "et", "||": "ou", "++": "plus un", "--": "moins un", "+=": "plus égale", "-=": "moins égale", ",": "virgule", ".": "point", ":": "deux points", "?": "point d'interrogation" };
export function symbolName(s) { return SPOKEN_SYMBOLS[s] || (s === "\n" ? "nouvelle ligne" : s === '"' ? "guillemet" : s === " " ? "" : s); }
export function wordName(w) { return SPOKEN_WORDS[w] || w.replace(/([a-zà-ÿ])([A-Z])/g, "$1 $2").replace(/_/g, " "); }
export function speakCode(code, lang) {
  const lines = code.split("\n").map((l, i) => ({ l, n: i + 1 })).filter(x => x.l.trim());
  if (!lines.length) return "Ton programme est vide.";
  const re = /#.*|"[^"]*"|'[^']*'|\d+(?:\.\d+)?|[A-Za-zÀ-ÿ_$][\wÀ-ÿ$]*|===|!==|&&|\|\||==|!=|<=|>=|\+\+|--|\+=|-=|\/\/.*|\S/g;
  return lines.map(({ l, n }) => `Ligne ${n} : ` + (lang === "py" && /^ +/.test(l) ? "décalée, " : "") + (l.match(re) || []).map(t => t.startsWith("//") ? "commentaire : " + t.slice(2) : t.startsWith("#") ? "commentaire : " + t.slice(1) : /^["']/.test(t) ? `guillemet ${t.slice(1, -1)} guillemet` : /^[A-Za-zÀ-ÿ_$]/.test(t) ? wordName(t) : symbolName(t)).join(", ")).join(". ");
}
