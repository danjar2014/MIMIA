// « Mots à toucher » : on construit le programme ligne par ligne en touchant des mots (sans taper), avec de faux mots pièges.
// Chaque ligne réussie est expliquée en français. À la fin, le programme complet est lancé comme s'il avait été tapé.
import { el, chime } from "./util.js";
import { wordName, symbolName } from "./codeengine.js";
import { explainCode } from "./explain.js";
import { API, } from "./codemissions.js";
import { API_PY } from "./codepy.js";

const RE = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\d+(?:\.\d+)?|[A-Za-zÀ-ÿ_$][\wÀ-ÿ$]*|===|!==|==|!=|<=|>=|&&|\|\||\+\+|--|\+=|-=|\*=|\/=|\/\/|\*\*|=>|\S/g;
export function tokenizeLine(text) {
  const toks = []; let last = 0;
  text.replace(RE, (m, off) => { toks.push({ t: m, sp: toks.length > 0 && off > last }); last = off + m.length; return m; });
  return toks;
}
const rng = seed => { let h = 2166136261; for (const c of String(seed)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const shuffle = (a, r) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const APIS = [...new Set([...API.console, ...API.robot, ...API.brain, ...API_PY.robot, ...API_PY.brain, ...API_PY.console])].filter(n => n !== "print" && n !== "afficher");
const SWAP = { True: "False", False: "True", true: "false", false: "true", "==": "=", "=": "==", "<": ">", ">": "<", "<=": "<", ">=": ">", "+": "-", "-": "+", "*": "+", "===": "==", ":": ";", "(": "[", ")": "]", "{": "(", "}": ")", for: "while", while: "for", if: "while", else: "elif", elif: "else", def: "function", function: "def", return: "print", and: "or", or: "and", not: "!", "&&": "||", "||": "&&", in: "of", "%": "/", "/": "*", "!": "not", print: "Print", afficher: "Afficher", range: "rang", let: "lat" };
function decoyOf(tok, r, apiPick) {
  const t = tok.t;
  if (APIS.includes(t)) return apiPick(t);
  if (SWAP[t] !== undefined) return SWAP[t];
  if (/^\d+$/.test(t)) return String(+t > 0 && r() < 0.5 ? +t - 1 : +t + 1);
  if (/^["']/.test(t)) { const q = t[0], s = t.slice(1, -1); return q + (s.length > 3 ? s[1] + s[0] + s.slice(2) : s + "s") + q; }
  if (/^[A-Za-zÀ-ÿ_$]/.test(t)) return t.length > 1 ? t + "2" : t + t;
  return null;
}
// garde-fou : les missions trop longues restent à taper (sinon on recopie presque la solution entière)
export function tapEligible(solution, id = "") {
  if (!solution || /^(x|pj-)/.test(id)) return false;
  const lines = solution.split("\n").map(l => l.trim()).filter(l => l && !/^([#]|\/\/)/.test(l) && !/^[}\])]+;?$/.test(l));
  return lines.length >= 1 && lines.length <= 8 && lines.reduce((a, l) => a + tokenizeLine(l).length, 0) <= 70;
}
export function buildGuide(solution, lang, seed = "g") {
  const unit = lang === "py" ? 4 : 2, r = rng(seed + solution.length), explain = explainCode(solution, lang).rows, byLine = {}; explain.forEach(x => { byLine[x.n] = x.text; });
  return solution.split("\n").map((raw, k) => {
    const trimmed = raw.trim(), ind = Math.round((raw.length - raw.trimStart().length) / unit), base = { indent: ind, text: trimmed, why: byLine[k + 1] || "" };
    if (!trimmed) return { ...base, auto: true, blank: true, tokens: [], pool: [] };
    if (/^(#|\/\/)/.test(trimmed)) return { ...base, auto: true, comment: true, tokens: [], pool: [] };
    if (/^[}\])]+;?$/.test(trimmed)) return { ...base, auto: true, closing: true, tokens: [], pool: [] };
    const tokens = tokenizeLine(trimmed), have = new Set(tokens.map(x => x.t)), apiPick = t => { const o = APIS.filter(a => a !== t && !have.has(a)); return o.length ? o[Math.floor(r() * o.length)] : null; };
    const cand = shuffle(tokens.filter(x => /^[A-Za-zÀ-ÿ_$"'\d]/.test(x.t) || SWAP[x.t] !== undefined), r), decoys = [];
    for (const c of cand) { const d = decoyOf(c, r, apiPick); if (d && !have.has(d) && !decoys.includes(d)) decoys.push(d); if (decoys.length === 2) break; }
    const pool = shuffle([...tokens.map((x, i) => ({ t: x.t, sp: x.sp, ok: true, id: k + "." + i })), ...decoys.map((d, i) => ({ t: d, sp: false, ok: false, id: k + ".d" + i }))], r);
    return { ...base, auto: false, tokens, pool };
  });
}
export const lineMatches = (exp, got) => exp.length === got.length && exp.every((t, i) => t === got[i]);
const lineText = (L, toks) => " ".repeat(0) + toks.map((x, i) => (i && x.sp ? " " : "") + x.t).join("");
export function guideCode(guide, lang) { const unit = lang === "py" ? 4 : 2; return guide.map(L => (L.blank ? "" : " ".repeat(L.indent * unit) + (L.auto ? L.text : lineText(L, L.tokens)))).join("\n"); }

// ---------- affichage ----------
export function mountTapCode(host, guide, { lang, say, onDone, speakIt }) {
  let li = guide.findIndex(L => !L.auto), asm = [], bad = -1, tries = 0; const sayIt = say || (() => {});
  const view = el("div", "tapcode"), box = el("div", "tcbox"), tray = el("div", "tctray"), btns = el("div", "gctl"); view.append(box, tray, btns); host.append(view);
  const bCheck = el("button", "gb go", "✔ Vérifier"), bBack = el("button", "gb", "↩ Enlever le dernier"), bHint = el("button", "gb", "💡 Indice"), bReset = el("button", "gb", "🧹 Recommencer la ligne"); btns.append(bCheck, bBack, bHint, bReset);
  const say1 = (t, cls) => sayIt(t, cls);
  const nextLine = from => { let k = from; while (k < guide.length && guide[k].auto) k++; return k; };
  const nice = x => (/^["']/.test(x.t) ? x.t : x.t);
  function render() {
    box.innerHTML = "";
    guide.forEach((L, k) => {
      const row = el("div", "tcl" + (k < li ? " tdone" : k === li ? " tcur" : " ttodo")); row.style.marginLeft = L.indent * 22 + "px";
      const n = el("span", "tcn", String(k + 1)); row.append(n);
      if (L.blank) { row.classList.add("blank"); row.append(el("code", "", "&nbsp;")); }
      else if (k < li || (L.auto && k < (li < guide.length ? li : guide.length))) { row.append(el("code", "", ""), ...(L.why && !L.closing ? [el("small", "tcw", L.why.replace(/&/g, "&amp;").replace(/</g, "&lt;"))] : [])); row.querySelector("code").textContent = L.text; }
      else if (k === li) { const c = el("code", "tcasm"); asm.forEach((x, i) => { const s = el("span", "tcw1" + (i === bad ? " bad" : ""), ""); s.textContent = x.t; s.dataset.say = (symbolName(x.t) && x.t.length === 1 ? symbolName(x.t) : wordName(x.t)) + ". Touche pour enlever."; s.onclick = () => { asm.splice(i, 1); bad = -1; render(); }; if (x.sp && i) c.append(document.createTextNode(" ")); c.append(s); }); if (!asm.length) c.append(el("span", "tcph1", "Touche les mots ci-dessous, dans l'ordre")); row.append(c); }
      else { row.append(el("code", "tcph", L.auto ? (L.closing ? "" : "") : L.tokens.map(() => "▢").join(" "))); if (L.closing) row.classList.add("dim"); }
      box.append(row);
    });
    // mots disponibles pour la ligne en cours
    tray.innerHTML = ""; if (li >= guide.length) return;
    const used = new Set(asm.map(x => x.id)); guide[li].pool.filter(c => !used.has(c.id)).forEach(c => { const b = el("button", "tcchip", ""); b.textContent = c.t; b.dataset.say = (c.t.length === 1 || /^[^\wÀ-ÿ"']+$/.test(c.t) ? symbolName(c.t) : wordName(c.t.replace(/^"|"$/g, ""))); b.dataset.id = c.id; b.onclick = () => { bad = -1; asm.push(c); render(); }; tray.append(b); });
    bCheck.disabled = !asm.length; bBack.disabled = !asm.length;
  }
  function check() {
    const L = guide[li], exp = L.tokens.map(x => x.t), got = asm.map(x => x.t);
    if (lineMatches(exp, got)) {
      chime("ok"); tries = 0; const why = L.why; li = nextLine(li + 1); asm = []; bad = -1; render();
      if (li >= guide.length) { say1("🎉 Tu as construit tout le programme !" + (why ? " " + why : ""), "ok"); setTimeout(() => onDone(guideCode(guide, lang)), 500); }
      else say1("✅ Bien joué ! " + (why || ""), "ok"); return;
    }
    tries++; chime("step"); let idx = 0; while (idx < got.length && idx < exp.length && got[idx] === exp[idx]) idx++;
    if (idx === got.length && got.length < exp.length) { say1(`🙂 Bien parti ! Il manque encore ${exp.length - got.length} mot${exp.length - got.length > 1 ? "s" : ""}. Continue.`, "warn"); return; }
    bad = idx; render();
    const prev = idx ? got[idx - 1] : null;
    say1(`🙂 Pas tout à fait : le mot n°${idx + 1} n'est pas le bon. ${prev ? `Regarde ce qui vient après « ${prev} ».` : "Regarde comment la ligne commence."} Touche-le pour l'enlever, ou « Vérifier » pour réessayer.`, "warn");
  }
  bCheck.onclick = () => { if (bad >= 0) { asm = asm.slice(0, bad); bad = -1; render(); return say1("🙂 J'ai enlevé les mots qui n'allaient pas. À toi !", ""); } check(); };
  bBack.onclick = () => { asm.pop(); bad = -1; render(); };
  bReset.onclick = () => { asm = []; bad = -1; render(); };
  bHint.onclick = () => {
    const L = guide[li], exp = L.tokens.map(x => x.t); let idx = 0; while (idx < asm.length && asm[idx].t === exp[idx]) idx++;
    if (idx < asm.length) return say1("💡 Il y a une erreur dans ta ligne : touche « ↩ Enlever le dernier » ou touche le mot rouge.", "hint");
    const want = L.pool.find(c => c.ok && !asm.some(a => a.id === c.id) && c.t === exp[asm.length]); tray.querySelectorAll(".tcchip").forEach(b => b.classList.toggle("point", want && b.dataset.id === want.id)); say1(`💡 Le prochain mot est entouré en jaune.`, "hint");
  };
  if (li < 0) { onDone(guideCode(guide, lang)); } else { render(); say1(`🧩 Construis ton programme ligne par ligne : touche les mots dans le bon ordre, puis « Vérifier ». Attention, certains mots sont des pièges !`); }
  return { destroy() { view.remove(); }, get line() { return li; } };
}
