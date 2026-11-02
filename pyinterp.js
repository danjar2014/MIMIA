// Un petit Python « syntaxe simple » écrit pour l'appli : variables, if/elif/else, while, for…in range, def, return,
// global, listes, textes, f-strings. Ce n'est pas CPython : c'est un sous-ensemble pensé pour les enfants,
// avec des erreurs en français et le numéro de ligne exact. Pas de dépendance à la page.
import { LimitErr } from "./codeerrors.js";

export class PyErr extends Error { constructor(fr, line, kind) { super(fr); this.fr = fr; this.line = line || null; this.kind = kind || "Erreur"; } }
export class PyFloat { constructor(v) { this.v = v; } }
const MAXSTEPS = 400000, MAXRANGE = 100000;
const KW = new Set(["if", "elif", "else", "while", "for", "in", "def", "return", "pass", "break", "continue", "and", "or", "not", "True", "False", "None", "global", "is"]);
const NOPE = new Set(["import", "from", "class", "try", "except", "finally", "lambda", "with", "del", "assert", "yield", "raise", "nonlocal", "async", "await", "as"]);
const OPS = ["**=", "//=", "**", "//", "==", "!=", "<=", ">=", "+=", "-=", "*=", "/=", "%=", "+", "-", "*", "/", "%", "<", ">", "=", "(", ")", "[", "]", ",", ":", ".", ";"];

// ---------- 1. découper en mots ----------
function tokenize(src, baseLine = 1) {
  const toks = [], lines = src.replace(/\r/g, "").split("\n"), stack = [0], br = [];
  const push = (t, v, line, extra) => toks.push({ t, v, line, ...extra });
  let L = 0, contBr = 0;
  for (; L < lines.length; L++) {
    const line = baseLine + L, text = lines[L]; let i = 0;
    if (!br.length) {
      let ind = 0; while (i < text.length && (text[i] === " " || text[i] === "\t")) { ind += text[i] === "\t" ? 4 : 1; i++; }
      if (i >= text.length || text[i] === "#") continue;
      if (ind > stack[stack.length - 1]) { stack.push(ind); push("indent", null, line); }
      else while (ind < stack[stack.length - 1]) { stack.pop(); if (ind > stack[stack.length - 1]) throw new PyErr("Le décalage de cette ligne ne correspond à aucun bloc au-dessus. Aligne-la avec une ligne du dessus.", line, "Indentation"); push("dedent", null, line); }
    }
    while (i < text.length) {
      const c = text[i];
      if (c === " " || c === "\t") { i++; continue; }
      if (c === "#") break;
      let m;
      if ((m = /^\d+(\.\d+)?/.exec(text.slice(i)))) { push("num", m[1] ? new PyFloat(parseFloat(m[0])) : parseInt(m[0], 10), line); i += m[0].length; continue; }
      if ((m = /^[A-Za-zÀ-ÿ_][\wÀ-ÿ]*/.exec(text.slice(i)))) {
        const w = m[0], nx = text[i + w.length];
        if (w === "f" && (nx === '"' || nx === "'")) { i += 1; const s = readStr(text, i, line); push("fstr", s.v, line); i = s.end; continue; }
        if (NOPE.has(w)) throw new PyErr(`Le mot « ${w} » existe en Python, mais il n'est pas disponible dans l'atelier des Petits Robots.`, line, "Syntaxe");
        push(KW.has(w) ? "kw" : "name", w, line); i += w.length; continue;
      }
      if (c === '"' || c === "'") { if (text.startsWith(c.repeat(3), i)) throw new PyErr("Les textes sur plusieurs lignes (trois guillemets) ne sont pas disponibles ici. Utilise un seul guillemet \" par texte.", line, "Syntaxe"); const s = readStr(text, i, line); push("str", s.v, line); i = s.end; continue; }
      if (c === "{" || c === "}") throw new PyErr("Python n'utilise pas d'accolades { }. C'est le décalage de la ligne (4 espaces) qui montre ce qui est « dedans ».", line, "Syntaxe");
      if (/[“”‘’]/.test(c)) throw new PyErr("Ce guillemet « " + c + " » ne marche pas en programmation. Utilise les guillemets droits \" \".", line, "Syntaxe");
      const op = OPS.find(o => text.startsWith(o, i));
      if (!op) throw new PyErr(`Je ne comprends pas le signe « ${c} ».`, line, "Syntaxe");
      if ("([".includes(op)) br.push({ ch: op, line }); if (")]".includes(op)) { const o = br.pop(); if (!o || (op === ")") !== (o.ch === "(")) throw new PyErr(`Cette ${op === ")" ? "parenthèse" : "crochet"} « ${op} » ne ferme rien, ou ne va pas avec celle ouverte avant.`, line, "Syntaxe"); }
      push("op", op, line); i += op.length;
    }
    if (!br.length && toks.length && toks[toks.length - 1].t !== "nl") push("nl", null, line);
  }
  if (br.length) throw new PyErr(`La ${br[br.length - 1].ch === "(" ? "parenthèse « ( »" : "le crochet « [ »"} de la ligne ${br[br.length - 1].line} n'est jamais fermé${br[br.length - 1].ch === "(" ? "e" : ""}.`, br[br.length - 1].line, "Syntaxe");
  while (stack.length > 1) { stack.pop(); push("dedent", null, baseLine + L); }
  push("eof", null, baseLine + L); return toks;
}
function readStr(text, i, line) {
  const q = text[i]; let j = i + 1, s = "", parts = [], cur = "";
  const ESC = { n: "\n", t: "\t", "\\": "\\", '"': '"', "'": "'" };
  while (j < text.length && text[j] !== q) { if (text[j] === "\\" && j + 1 < text.length) { cur += ESC[text[j + 1]] ?? "\\" + text[j + 1]; j += 2; } else { cur += text[j]; j++; } }
  if (j >= text.length) throw new PyErr("Il manque un guillemet pour fermer ce texte : chaque guillemet ouvert doit être refermé sur la même ligne.", line, "Syntaxe");
  return { v: cur, end: j + 1 };
}

// ---------- 2. comprendre la structure ----------
class Parser {
  constructor(toks) { this.t = toks; this.i = 0; }
  get cur() { return this.t[this.i]; }
  next() { return this.t[this.i++]; }
  isOp(v) { return this.cur.t === "op" && this.cur.v === v; }
  isKw(v) { return this.cur.t === "kw" && this.cur.v === v; }
  eatOp(v) { if (this.isOp(v)) { this.i++; return true; } return false; }
  err(msg, line) { throw new PyErr(msg, line || this.cur.line, "Syntaxe"); }
  program() { const b = []; while (this.cur.t !== "eof") { if (this.cur.t === "nl") { this.i++; continue; } b.push(this.stmt()); } return b; }
  block(kw, line) {
    if (!this.eatOp(":")) this.err(`Il manque les deux points « : » à la fin de la ligne du « ${kw} ».`, line);
    if (this.cur.t !== "nl") { const s = this.simple(); return [s]; }
    this.i++; while (this.cur.t === "nl") this.i++;
    if (this.cur.t !== "indent") this.err(`Après « ${kw} … : », la ligne suivante doit être décalée vers la droite (4 espaces) pour montrer ce qui est dedans.`, line);
    this.i++; const b = [];
    while (this.cur.t !== "dedent" && this.cur.t !== "eof") { if (this.cur.t === "nl") { this.i++; continue; } b.push(this.stmt()); }
    if (this.cur.t === "dedent") this.i++; return b;
  }
  stmt() {
    const c = this.cur, line = c.line;
    if (c.t === "indent") this.err("Cette ligne est décalée vers la droite sans raison. Un décalage ne s'utilise qu'après une ligne qui se termine par « : ».", line);
    if (c.t === "kw") switch (c.v) {
      case "if": { this.i++; const cond = this.cond("if"); const body = this.block("if", line); const node = { k: "if", cond, body, orelse: [], line }; let tail = node;
        while (this.cur.t === "kw" && this.cur.v === "elif") { const l2 = this.cur.line; this.i++; const c2 = this.cond("elif"), b2 = this.block("elif", l2), n2 = { k: "if", cond: c2, body: b2, orelse: [], line: l2 }; tail.orelse = [n2]; tail = n2; }
        if (this.isKw("else")) { const l3 = this.cur.line; this.i++; if (this.isKw("if")) this.err("En Python on n'écrit pas « else if » : on écrit « elif ».", l3); tail.orelse = this.block("else", l3); } return node; }
      case "while": { this.i++; const cond = this.cond("while"); return { k: "while", cond, body: this.block("while", line), line }; }
      case "for": { this.i++; const v = this.cur; if (v.t !== "name") this.err("Après « for » il faut un nom de variable, par exemple : for i in range(5):", line); this.i++; if (!this.isKw("in")) this.err("Il manque le mot « in » : for i in range(5):", line); this.i++; const it = this.expr(); return { k: "for", name: v.v, it, body: this.block("for", line), line }; }
      case "def": { this.i++; const n = this.cur; if (n.t !== "name") this.err("Après « def » il faut le nom de la fonction : def doubler(n):", line); this.i++; if (!this.eatOp("(")) this.err("Après le nom de la fonction, il faut des parenthèses : def " + n.v + "():", line);
        const params = [], defs = []; while (!this.isOp(")")) { const p = this.next(); if (p.t !== "name") this.err("Je m'attendais à un nom de valeur dans les parenthèses de la fonction.", p.line); params.push(p.v); if (this.eatOp("=")) defs.push(this.expr()); else if (defs.length) this.err("Les valeurs par défaut doivent venir en dernier.", p.line); if (!this.eatOp(",")) break; }
        if (!this.eatOp(")")) this.err("Il manque la parenthèse fermante « ) » de la fonction.", line); return { k: "def", name: n.v, params, defs, body: this.block("def", line), line }; }
      case "return": case "pass": case "break": case "continue": case "global": return this.simple();
    }
    return this.simple();
  }
  cond(kw) { const e = this.expr(); if (this.isOp("=")) this.err("Pour comparer deux valeurs, écris deux signes égal « == » (un seul « = » sert à ranger une valeur dans une variable).", this.cur.line); return e; }
  end(line) { this.eatOp(";"); if (this.cur.t === "nl") { this.i++; return; } if (this.cur.t === "eof" || this.cur.t === "dedent") return; this.err("Je ne comprends pas la fin de cette ligne. As-tu oublié un signe (+, ,, :) ou une parenthèse ?", line); }
  simple() {
    const c = this.cur, line = c.line;
    if (c.t === "kw") {
      if (c.v === "pass") { this.i++; this.end(line); return { k: "pass", line }; }
      if (c.v === "break" || c.v === "continue") { this.i++; this.end(line); return { k: c.v, line }; }
      if (c.v === "return") { this.i++; let e = null; if (this.cur.t !== "nl" && this.cur.t !== "eof" && !this.isOp(";")) e = this.expr(); this.end(line); return { k: "return", e, line }; }
      if (c.v === "global") { this.i++; const names = []; do { const n = this.next(); if (n.t !== "name") this.err("Après « global » il faut le nom d'une variable.", line); names.push(n.v); } while (this.eatOp(",")); this.end(line); return { k: "global", names, line }; }
      if (["if", "while", "for", "def", "elif", "else"].includes(c.v)) this.err(`Le mot « ${c.v} » est mal placé ici.`, line);
    }
    if (c.t === "name" && /^(print|afficher)$/.test(c.v) && this.t[this.i + 1].t !== "op") this.err(`En Python, ${c.v} s'écrit avec des parenthèses : ${c.v}("Bonjour")`, line);
    const e = this.expr();
    if (this.cur.t === "op" && /^(=|\+=|-=|\*=|\/=|\/\/=|%=|\*\*=)$/.test(this.cur.v)) {
      const op = this.next().v; if (e.k !== "name" && e.k !== "index") this.err("On ne peut ranger une valeur que dans une variable (par exemple : total = 5).", line);
      const val = this.expr(); this.end(line); return { k: "assign", target: e, op, val, line };
    }
    this.end(line); return { k: "expr", e, line };
  }
  // expressions, du plus faible au plus fort
  expr() { return this.orx(); }
  orx() { let l = this.andx(); while (this.isKw("or")) { const line = this.next().line; l = { k: "or", l, r: this.andx(), line }; } return l; }
  andx() { let l = this.notx(); while (this.isKw("and")) { const line = this.next().line; l = { k: "and", l, r: this.notx(), line }; } return l; }
  notx() { if (this.isKw("not")) { const line = this.next().line; return { k: "not", e: this.notx(), line }; } return this.cmp(); }
  cmp() {
    const first = this.arith(), ops = [], rest = []; const line = this.cur.line;
    for (;;) {
      let op = null; const c = this.cur;
      if (c.t === "op" && ["==", "!=", "<", ">", "<=", ">="].includes(c.v)) { op = c.v; this.i++; }
      else if (c.t === "kw" && c.v === "in") { op = "in"; this.i++; }
      else if (c.t === "kw" && c.v === "not" && this.t[this.i + 1].t === "kw" && this.t[this.i + 1].v === "in") { op = "not in"; this.i += 2; }
      else if (c.t === "kw" && c.v === "is") { this.i++; op = "is"; if (this.isKw("not")) { this.i++; op = "is not"; } }
      if (!op) break; ops.push(op); rest.push(this.arith());
    }
    return ops.length ? { k: "cmp", first, ops, rest, line } : first;
  }
  arith() { let l = this.term(); while (this.cur.t === "op" && (this.cur.v === "+" || this.cur.v === "-")) { const t = this.next(); l = { k: "bin", op: t.v, l, r: this.term(), line: t.line }; } return l; }
  term() { let l = this.unary(); while (this.cur.t === "op" && ["*", "/", "//", "%"].includes(this.cur.v)) { const t = this.next(); l = { k: "bin", op: t.v, l, r: this.unary(), line: t.line }; } return l; }
  unary() { if (this.cur.t === "op" && (this.cur.v === "-" || this.cur.v === "+")) { const t = this.next(); return { k: "neg", sign: t.v, e: this.unary(), line: t.line }; } return this.power(); }
  power() { const b = this.postfix(); if (this.isOp("**")) { const t = this.next(); return { k: "bin", op: "**", l: b, r: this.unary(), line: t.line }; } return b; }
  postfix() {
    let e = this.atom();
    for (;;) {
      const c = this.cur;
      if (c.t === "op" && c.v === "(") { this.i++; const args = []; while (!this.isOp(")")) { if (this.cur.t === "name" && this.t[this.i + 1].t === "op" && this.t[this.i + 1].v === "=") this.err("Les options nommées (nom=valeur) ne sont pas disponibles ici : écris seulement les valeurs.", c.line); args.push(this.expr()); if (!this.eatOp(",")) break; } if (!this.eatOp(")")) this.err("Il manque la parenthèse fermante « ) » de cet appel.", c.line); e = { k: "call", f: e, args, line: c.line }; }
      else if (c.t === "op" && c.v === "[") { this.i++; const ix = this.expr(); if (this.isOp(":")) this.err("Les tranches de listes ou de textes (a[1:3]) ne sont pas disponibles ici.", c.line); if (!this.eatOp("]")) this.err("Il manque le crochet fermant « ] ».", c.line); e = { k: "index", o: e, i: ix, line: c.line }; }
      else if (c.t === "op" && c.v === ".") { this.i++; const n = this.next(); if (n.t !== "name") this.err("Après le point, il faut un nom (par exemple liste.append(3)).", c.line); e = { k: "attr", o: e, name: n.v, line: c.line }; }
      else return e;
    }
  }
  atom() {
    const c = this.next(), line = c.line;
    switch (c.t) {
      case "num": return { k: "lit", v: c.v, line };
      case "str": return { k: "lit", v: c.v, line };
      case "fstr": return { k: "fstr", parts: fparts(c.v, line), line };
      case "name": return { k: "name", n: c.v, line };
      case "kw": if (c.v === "True") return { k: "lit", v: true, line }; if (c.v === "False") return { k: "lit", v: false, line }; if (c.v === "None") return { k: "lit", v: null, line }; break;
      case "op": if (c.v === "(") { const e = this.expr(); if (this.isOp(",")) this.err("Les paires de valeurs (a, b) ne sont pas disponibles ici.", line); if (!this.eatOp(")")) this.err("Il manque la parenthèse fermante « ) ».", line); return e; }
        if (c.v === "[") { const items = []; while (!this.isOp("]")) { items.push(this.expr()); if (!this.eatOp(",")) break; } if (!this.eatOp("]")) this.err("Il manque le crochet fermant « ] » de la liste.", line); return { k: "list", items, line }; } break;
    }
    if (c.t === "nl" || c.t === "eof" || c.t === "dedent") this.err("Cette ligne n'est pas finie : il manque quelque chose après le dernier signe.", c.line || line);
    this.err(`Je ne comprends pas ${c.v === null || c.v === undefined ? "cette ligne" : "« " + c.v + " »"} ici. Vérifie l'écriture des mots et des signes.`, line);
  }
}
// {nom} et {nom:.2f} dans un f"…"
function fparts(s, line) {
  const out = []; let i = 0, cur = "";
  while (i < s.length) {
    if (s[i] === "{" && s[i + 1] === "{") { cur += "{"; i += 2; continue; } if (s[i] === "}" && s[i + 1] === "}") { cur += "}"; i += 2; continue; }
    if (s[i] === "{") { const j = s.indexOf("}", i); if (j < 0) throw new PyErr("Dans un texte f\"…\", il manque une accolade fermante « } ».", line, "Syntaxe"); let src = s.slice(i + 1, j), fmtSpec = null; const m = /^(.*):(\.\d+f)$/.exec(src); if (m) { src = m[1]; fmtSpec = m[2]; } if (!src.trim()) throw new PyErr("Il y a des accolades { } vides dans ton texte f\"…\" : mets-y le nom d'une variable.", line, "Syntaxe"); if (cur) out.push(cur); cur = ""; const p = new Parser(tokenize(src, line)); const e = p.expr(); out.push({ e, fmt: fmtSpec }); i = j + 1; continue; }
    cur += s[i++];
  }
  if (cur) out.push(cur); return out;
}
function assigned(body, out) {
  for (const s of body) { if (s.k === "assign" && s.target.k === "name") out.add(s.target.n); else if (s.k === "for") { out.add(s.name); assigned(s.body, out); } else if (s.k === "if") { assigned(s.body, out); assigned(s.orelse, out); } else if (s.k === "while") assigned(s.body, out); else if (s.k === "def") out.add(s.name); }
  return out;
}
function globalsOf(body, out) { for (const s of body) { if (s.k === "global") s.names.forEach(n => out.add(n)); if (s.body) globalsOf(s.body, out); if (s.orelse) globalsOf(s.orelse, out); } return out; }

// ---------- 3. exécuter ----------
const isF = v => v instanceof PyFloat, num = v => (isF(v) ? v.v : v);
const isNum = v => typeof v === "number" || isF(v);
const tname = v => (v === null ? "rien (None)" : typeof v === "string" ? "un texte" : isNum(v) ? "un nombre" : typeof v === "boolean" ? "vrai/faux" : Array.isArray(v) ? "une liste" : "une fonction");
const fstr = v => { const n = v.v; return Number.isInteger(n) && Math.abs(n) < 1e16 ? n.toFixed(1) : String(n); };
export function pyStr(v) { return typeof v === "string" ? v : pyRepr(v); }
function pyRepr(v) { if (v === null) return "None"; if (v === true) return "True"; if (v === false) return "False"; if (isF(v)) return fstr(v); if (typeof v === "string") return "'" + v.replace(/'/g, "\\'") + "'"; if (Array.isArray(v)) return "[" + v.map(pyRepr).join(", ") + "]"; if (v && v.isFn) return "<fonction " + v.name + ">"; return String(v); }
const truth = v => !(v === null || v === false || v === 0 || (isF(v) && v.v === 0) || v === "" || (Array.isArray(v) && !v.length));
function eq(a, b) { if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => eq(x, b[i])); if (isNum(a) && isNum(b)) return num(a) === num(b); if (typeof a === "boolean" || typeof b === "boolean") return a === b; return a === b; }
export const toJS = v => (isF(v) ? v.v : Array.isArray(v) ? v.map(toJS) : v);

export const parsePython = code => new Parser(tokenize(code)).program();
export function makePython(code, api, names = []) {
  let prog; try { prog = new Parser(tokenize(code)).program(); } catch (e) { throw e; }
  let steps = 0; const tick = () => { if (++steps > MAXSTEPS) throw new LimitErr(); };
  const G = new Map(), frames = [];
  const builtin = (n, f) => G.set(n, Object.assign(f, { isBuiltin: true, bname: n }));
  const need = (n, args, k, line) => { if (args.length !== k) throw new PyErr(`« ${n} » attend ${k} valeur${k > 1 ? "s" : ""}, mais tu en as donné ${args.length}.`, line, "Appel"); };
  builtin("print", (...a) => { api.afficher(a.map(pyStr).join(" ")); return null; });
  G.set("afficher", G.get("print"));
  builtin("len", x => { if (typeof x === "string" || Array.isArray(x)) return x.length; throw new PyErr("len() sert à compter les lettres d'un texte ou les éléments d'une liste.", null, "Type"); });
  builtin("range", (...a) => { a = a.map(x => { if (!Number.isInteger(num(x)) || isF(x)) throw new PyErr("range() ne marche qu'avec des nombres entiers (sans virgule).", null, "Type"); return x; }); let s = 0, e, st = 1; if (a.length === 1) e = a[0]; else if (a.length === 2) [s, e] = a; else if (a.length === 3) [s, e, st] = a; else throw new PyErr("range() attend 1, 2 ou 3 nombres.", null, "Appel"); if (st === 0) throw new PyErr("Le pas de range() ne peut pas être zéro.", null, "Valeur"); const out = []; for (let i = s; st > 0 ? i < e : i > e; i += st) { out.push(i); if (out.length > MAXRANGE) throw new LimitErr(); } return out; });
  builtin("int", x => { if (typeof x === "string") { if (!/^\s*-?\d+\s*$/.test(x)) throw new PyErr(`Je ne peux pas transformer « ${x} » en nombre entier.`, null, "Valeur"); return parseInt(x, 10); } return Math.trunc(num(x)); });
  builtin("float", x => new PyFloat(typeof x === "string" ? parseFloat(x) : num(x)));
  builtin("str", x => pyStr(x)); builtin("abs", x => (isF(x) ? new PyFloat(Math.abs(x.v)) : Math.abs(x)));
  const pick = (name, f) => builtin(name, (...a) => { const xs = a.length === 1 && Array.isArray(a[0]) ? a[0] : a; if (!xs.length) throw new PyErr(`${name}() a besoin d'au moins une valeur.`, null, "Valeur"); const r = f(...xs.map(num)); return xs.some(isF) ? new PyFloat(r) : r; });
  pick("min", Math.min); pick("max", Math.max);
  builtin("sum", xs => { const r = xs.reduce((a, b) => a + num(b), 0); return xs.some(isF) ? new PyFloat(r) : r; });
  builtin("round", (x, d) => { const f = Math.pow(10, d || 0), r = Math.round(num(x) * f) / f; return d ? new PyFloat(r) : r; });
  for (const [n, f] of Object.entries(api)) if (n !== "afficher") G.set(n, Object.assign((...a) => f(...a.map(toJS)), { isBuiltin: true, bname: n }));

  const err = (fr, line, kind) => new PyErr(fr, line, kind);
  const fr = () => frames[frames.length - 1];
  function lookup(n, line) {
    const f = fr();
    if (f && f.locals.has(n)) { if (f.vars.has(n)) return f.vars.get(n); throw err(`« ${n} » n'a pas encore de valeur à cet endroit de la fonction. Si c'est une variable créée en dehors de la fonction et que tu veux la changer, écris d'abord : global ${n}`, line, "Nom"); }
    if (G.has(n)) return G.get(n);
    const known = [...G.keys(), ...names]; const w = n.toLowerCase(); let best = null, bd = 99;
    for (const k of known) { const d = lev(w, k.toLowerCase()); if (d < bd) { bd = d; best = k; } }
    throw err(`Je ne connais pas « ${n} ».` + (best && bd <= (n.length >= 5 ? 2 : 1) ? ` Tu voulais écrire « ${best} » ? Fais attention aux majuscules, aux accents et aux « _ ».` : " Si c'est une variable, donne-lui d'abord une valeur : " + n + " = 0"), line, "Nom");
  }
  function setVar(n, v) { const f = fr(); if (f && f.locals.has(n)) f.vars.set(n, v); else G.set(n, v); }
  function arith(op, a, b, line) {
    if (op === "+" && typeof a === "string" && typeof b === "string") return a + b;
    if (op === "+" && Array.isArray(a) && Array.isArray(b)) return a.concat(b);
    if (op === "*" && typeof a === "string" && Number.isInteger(b)) return a.repeat(Math.max(0, b));
    if (op === "*" && Array.isArray(a) && Number.isInteger(b)) { let o = []; for (let i = 0; i < b; i++) o = o.concat(a); return o; }
    if (!isNum(a) || !isNum(b) || typeof a === "boolean" || typeof b === "boolean") {
      if (typeof a === "boolean" && isNum(b) || typeof b === "boolean" && isNum(a)) { /* True+1 : comme en Python */ a = a === true ? 1 : a === false ? 0 : a; b = b === true ? 1 : b === false ? 0 : b; }
      else if (op === "+" && (typeof a === "string" || typeof b === "string")) throw err("On ne peut pas additionner un texte et un nombre. Transforme le nombre en texte avec str(…), ou utilise un f\"…\".", line, "Type");
      else throw err(`Je ne sais pas faire « ${op} » entre ${tname(a)} et ${tname(b)}.`, line, "Type");
    }
    const x = num(a), y = num(b), fl = isF(a) || isF(b); let r;
    switch (op) {
      case "+": r = x + y; break; case "-": r = x - y; break; case "*": r = x * y; break;
      case "/": if (y === 0) throw err("On ne peut pas diviser par zéro.", line, "Division"); return new PyFloat(x / y);
      case "//": if (y === 0) throw err("On ne peut pas diviser par zéro.", line, "Division"); r = Math.floor(x / y); break;
      case "%": if (y === 0) throw err("On ne peut pas diviser par zéro.", line, "Division"); r = x - Math.floor(x / y) * y; break;
      case "**": r = Math.pow(x, y); if (y < 0) return new PyFloat(r); break;
    }
    return fl ? new PyFloat(r) : r;
  }
  function compare(op, a, b, line) {
    switch (op) { case "==": return eq(a, b); case "!=": return !eq(a, b); case "is": return a === b || (a === null && b === null); case "is not": return !(a === b);
      case "in": if (typeof b === "string" && typeof a === "string") return b.includes(a); if (Array.isArray(b)) return b.some(x => eq(x, a)); throw err("« in » sert à chercher dans un texte ou une liste.", line, "Type");
      case "not in": return !compare("in", a, b, line); }
    if (typeof a === "string" && typeof b === "string") return op === "<" ? a < b : op === ">" ? a > b : op === "<=" ? a <= b : a >= b;
    if (!isNum(a) && typeof a !== "boolean" || !isNum(b) && typeof b !== "boolean") throw err(`On ne peut pas comparer ${tname(a)} avec ${tname(b)}.`, line, "Type");
    const x = typeof a === "boolean" ? +a : num(a), y = typeof b === "boolean" ? +b : num(b); return op === "<" ? x < y : op === ">" ? x > y : op === "<=" ? x <= y : x >= y;
  }
  function ev(n) {
    tick();
    switch (n.k) {
      case "lit": return n.v; case "name": return lookup(n.n, n.line);
      case "list": return n.items.map(ev);
      case "fstr": return n.parts.map(p => { if (typeof p === "string") return p; const v = ev(p.e); return p.fmt ? num(v).toFixed(parseInt(p.fmt.slice(1), 10)) : pyStr(v); }).join("");
      case "neg": { const v = ev(n.e); if (!isNum(v)) throw err("Le signe « - » ne marche qu'avec un nombre.", n.line, "Type"); return n.sign === "-" ? (isF(v) ? new PyFloat(-v.v) : -v) : v; }
      case "not": return !truth(ev(n.e));
      case "and": { const l = ev(n.l); return truth(l) ? ev(n.r) : l; } case "or": { const l = ev(n.l); return truth(l) ? l : ev(n.r); }
      case "bin": return arith(n.op, ev(n.l), ev(n.r), n.line);
      case "cmp": { let l = ev(n.first); for (let i = 0; i < n.ops.length; i++) { const r = ev(n.rest[i]); if (!compare(n.ops[i], l, r, n.line)) return false; l = r; } return true; }
      case "index": { const o = ev(n.o), i = num(ev(n.i)); if (!Array.isArray(o) && typeof o !== "string") throw err("On ne peut utiliser [ ] que sur une liste ou un texte.", n.line, "Type"); if (!Number.isInteger(i)) throw err("Le numéro de case doit être un nombre entier.", n.line, "Type"); const k = i < 0 ? o.length + i : i; if (k < 0 || k >= o.length) throw err(`Il n'y a pas de case numéro ${i} (la liste a ${o.length} case${o.length > 1 ? "s" : ""}, numérotées à partir de 0).`, n.line, "Index"); return o[k]; }
      case "attr": throw err("On ne peut pas utiliser « ." + n.name + " » sans parenthèses : écris ." + n.name + "( … ).", n.line, "Syntaxe");
      case "call": return call(n);
    }
    throw err("Je ne sais pas exécuter cette ligne.", n.line);
  }
  function call(n) {
    if (n.f.k === "attr") {
      const o = ev(n.f.o), a = n.args.map(ev), m = n.f.name;
      if (Array.isArray(o)) { if (m === "append") { need("append", a, 1, n.line); o.push(a[0]); return null; } if (m === "pop") { if (!o.length) throw err("On ne peut pas retirer un élément d'une liste vide.", n.line, "Index"); return o.pop(); } }
      if (typeof o === "string") { if (m === "upper") return o.toUpperCase(); if (m === "lower") return o.toLowerCase(); if (m === "strip") return o.trim(); }
      throw err(`« ${m} » n'existe pas pour ${tname(o)}.`, n.line, "Nom");
    }
    const f = ev(n.f), a = n.args.map(ev);
    if (typeof f === "function") { try { return f(...a); } catch (e) { if (e instanceof PyErr && !e.line) e.line = n.line; throw e; } }
    if (f && f.isFn) return callUser(f, a, n.line);
    throw err(`« ${n.f.k === "name" ? n.f.n : "cette valeur"} » n'est pas une fonction : on ne peut pas mettre de parenthèses () après elle.`, n.line, "Type");
  }
  function callUser(f, a, line) {
    const min = f.params.length - f.defs.length;
    if (a.length < min || a.length > f.params.length) throw err(`La fonction « ${f.name} » attend ${f.params.length === min ? min : min + " à " + f.params.length} valeur${f.params.length > 1 ? "s" : ""}, mais tu en as donné ${a.length}.`, line, "Appel");
    if (frames.length > 120) throw new LimitErr();
    const fm = { vars: new Map(), locals: f.locals };
    f.params.forEach((p, i) => fm.vars.set(p, i < a.length ? a[i] : f.defaults[i - min]));
    frames.push(fm); try { const r = exec(f.body); return r && r.sig === "return" ? r.v : null; } finally { frames.pop(); }
  }
  function exec(body) {
    for (const s of body) {
      tick();
      switch (s.k) {
        case "expr": ev(s.e); break; case "pass": case "global": break;
        case "assign": {
          let v = ev(s.val);
          if (s.op !== "=") v = arith(s.op.slice(0, -1), ev(s.target), v, s.line);
          if (s.target.k === "name") setVar(s.target.n, v);
          else { const o = ev(s.target.o), i = num(ev(s.target.i)); if (!Array.isArray(o)) throw err("On ne peut changer une case que dans une liste.", s.line, "Type"); const k = i < 0 ? o.length + i : i; if (k < 0 || k >= o.length) throw err(`Il n'y a pas de case numéro ${i} dans cette liste.`, s.line, "Index"); o[k] = v; }
          break;
        }
        case "if": { const r = exec(truth(ev(s.cond)) ? s.body : s.orelse); if (r) return r; break; }
        case "while": { let g = 0; while (truth(ev(s.cond))) { if (++g > 100000) throw new LimitErr(); const r = exec(s.body); if (r) { if (r.sig === "break") break; if (r.sig === "continue") continue; return r; } } break; }
        case "for": { const it = ev(s.it); if (!Array.isArray(it) && typeof it !== "string") throw err("« for … in » a besoin d'une liste, d'un texte ou de range(…).", s.line, "Type"); for (const x of [...it]) { setVar(s.name, x); const r = exec(s.body); if (r) { if (r.sig === "break") break; if (r.sig === "continue") continue; return r; } } break; }
        case "def": { const loc = assigned(s.body, new Set(s.params)); globalsOf(s.body, new Set()).forEach(g => loc.delete(g)); s.params.forEach(p => loc.add(p)); const fn = { isFn: true, name: s.name, params: s.params, defs: s.defs, defaults: s.defs.map(ev), body: s.body, locals: loc }; setVar(s.name, fn); break; }
        case "return": return { sig: "return", v: s.e ? ev(s.e) : null };
        case "break": return { sig: "break" }; case "continue": return { sig: "continue" };
      }
    }
    return undefined;
  }
  const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
  // le programme principal ; ensuite on peut appeler ses fonctions depuis JavaScript
  const run = () => { exec(prog); };
  const fnExport = name => { const f = G.get(name); if (!f || !f.isFn) return undefined; return (...a) => toJS(callUser(f, a.map(x => (typeof x === "number" && !Number.isInteger(x) ? new PyFloat(x) : x)), null)); };
  return { run, fnExport };
}
