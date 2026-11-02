// Éditeur de blocs tactile (on touche un bloc pour l'ajouter) + interpréteur
import { el } from "./util.js";

export class Limit extends Error {}

// définitions de blocs réutilisables
export const D = {
  fd: { t: "fd", label: "avancer", icon: "⬆️", cls: "mv" },
  tl: { t: "tl", label: "tourner à gauche", icon: "↶", cls: "turn" },
  tr: { t: "tr", label: "tourner à droite", icon: "↷", cls: "turn" },
  pick: { t: "pick", label: "ramasser l'étoile", icon: "⭐", cls: "act" },
  rep: { t: "rep", label: "répéter", icon: "🔁", cls: "loop", n: { v: 2, min: 2, max: 12, step: 1, unit: "fois" }, container: "body" },
  while: { t: "while", label: "tant que", icon: "🔄", cls: "loop", cond: true, container: "body" },
  if: { t: "if", label: "si", icon: "❓", cls: "cond", cond: true, container: "ifelse" },
  call: { t: "call", label: "Mon bloc", icon: "🧩", cls: "fn" },
  // le robot est un « nœud » abonné au sujet /cmd : ces blocs publient des messages
  pfd: { t: "fd", label: "publier « avance » sur /cmd", icon: "📤", cls: "mv" },
  ptl: { t: "tl", label: "publier « gauche » sur /cmd", icon: "📤", cls: "turn" },
  ptr: { t: "tr", label: "publier « droite » sur /cmd", icon: "📤", cls: "turn" }
};

export function createEditor({ palette, conds = [], fn = false, onChange = () => {} }) {
  const root = el("div", "ed"), defs = Object.fromEntries(palette.map(d => [d.t, d]));
  const lists = { main: [], fn: [] }; let active = "main", sel = lists.main; const nodeEl = new WeakMap();
  const tabs = el("div", "edtabs"), pal = el("div", "edpal"), area = el("div", "edarea");
  root.append(pal, tabs, area);
  if (!fn) tabs.style.display = "none";
  const tabBtn = (id, txt) => { const b = el("button", "edtab", txt); b.onclick = () => { active = id; sel = lists[id]; render(); }; b.dataset.id = id; tabs.append(b); };
  tabBtn("main", "▶ Programme"); tabBtn("fn", "🧩 Mon bloc");

  palette.forEach(d => { const b = el("button", "pb " + d.cls, `<span>${d.icon}</span><span>${d.label}</span>`); b.onclick = () => add(d); pal.append(b); });

  function mk(d) { const n = { t: d.t }; if (d.n) n.n = d.n.v; if (d.opts) n.v = d.opts[0].v; if (d.cond) n.cond = conds[0].v; if (d.container) { n.body = []; if (d.container === "ifelse") n.else = []; } return n; }
  function add(d) { if (d.t === "call" && active === "fn") return; const n = mk(d); sel.push(n); if (d.container) sel = n.body; render(); onChange(); area.scrollTop = area.scrollHeight; }
  function contains(arr, target) { return arr === target || arr.some(n => n.body && (contains(n.body, target) || (n.else && contains(n.else, target)))); }

  function slot(arr, label) {
    const s = el("div", "slot" + (arr === sel ? " sel" : "")); if (label) s.append(el("div", "slotl", label));
    if (!arr.length) s.append(el("div", "ph", arr === sel ? "Touche un bloc ci-dessus pour l'ajouter ici" : "(vide) touche ici pour choisir cet endroit"));
    arr.forEach((n, i) => s.append(blockEl(n, arr, i)));
    s.addEventListener("click", e => { if (e.target === s || e.target.classList.contains("ph") || e.target.classList.contains("slotl")) { sel = arr; render(); } });
    return s;
  }
  function blockEl(n, arr, i) {
    const d = defs[n.t] || D[n.t], b = el("div", "blk " + d.cls), h = el("div", "bh"); nodeEl.set(n, b);
    h.innerHTML = `<span class="bi">${d.icon}</span><span class="bl">${d.label}</span>`;
    if (d.n) { const m = el("button", "mini", "−"), p = el("button", "mini", "+"), v = el("span", "bn", `${n.n}${d.n.unit ? " " + d.n.unit : ""}`);
      m.onclick = () => { n.n = Math.max(d.n.min, n.n - d.n.step); render(); onChange(); }; p.onclick = () => { n.n = Math.min(d.n.max, n.n + d.n.step); render(); onChange(); }; h.append(m, v, p); }
    if (d.cond) { const s = el("select", "csel"); conds.forEach(c => { const o = el("option", "", c.label); o.value = c.v; if (c.v === n.cond) o.selected = true; s.append(o); }); s.onchange = () => { n.cond = s.value; onChange(); }; h.append(s); }
    if (d.opts) { const s = el("select", "csel"); d.opts.forEach(c => { const o = el("option", "", c.label); o.value = c.v; if (c.v === n.v) o.selected = true; s.append(o); }); s.onchange = () => { n.v = s.value; onChange(); }; h.append(s); }
    const up = el("button", "mini ctl", "▲"), dn = el("button", "mini ctl", "▼"), x = el("button", "mini ctl", "✕");
    up.onclick = () => { if (i > 0) { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; render(); onChange(); } };
    dn.onclick = () => { if (i < arr.length - 1) { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; render(); onChange(); } };
    x.onclick = () => { arr.splice(i, 1); if (!contains(lists[active], sel)) sel = lists[active]; render(); onChange(); };
    h.append(up, dn, x); b.append(h);
    if (n.body) b.append(slot(n.body, n.t === "if" ? "alors" : "dans la boucle"));
    if (n.else) b.append(slot(n.else, "sinon"));
    return b;
  }
  function render() {
    area.innerHTML = ""; area.append(slot(lists[active]));
    tabs.querySelectorAll(".edtab").forEach(b => b.classList.toggle("on", b.dataset.id === active));
    pal.querySelectorAll(".pb").forEach((b, i) => { if (palette[i].t === "call") b.style.display = fn ? "" : "none"; });
  }
  let hl = null, marks = [];
  const api = {
    mark(nodes) { marks.forEach(m => m.classList.remove("run")); marks = (nodes || []).map(n => nodeEl.get(n)).filter(Boolean); marks.forEach(m => m.classList.add("run")); },
    el: root, lists,
    highlight(n) { if (hl) hl.classList.remove("run"); hl = n ? nodeEl.get(n) : null; if (hl) { hl.classList.add("run"); hl.scrollIntoView({ block: "nearest" }); } },
    clear() { lists.main.length = 0; lists.fn.length = 0; active = "main"; sel = lists.main; render(); onChange(); },
    get() { return JSON.parse(JSON.stringify(lists)); },
    set(data) { lists.main.length = 0; lists.fn.length = 0; lists.main.push(...data.main); lists.fn.push(...(data.fn || [])); active = "main"; sel = lists.main; render(); },
    count() { const c = a => a.reduce((s, n) => s + 1 + (n.body ? c(n.body) : 0) + (n.else ? c(n.else) : 0), 0); return c(lists.main) + c(lists.fn); }
  };
  render();
  return api;
}

// interpréteur : produit les actions une par une (le dessinateur/robot les applique)
export function* runProgram(lists, env, limit = 500) {
  let steps = 0;
  function* seq(arr) { for (const n of arr) yield* node(n); }
  function* node(n) {
    if (++steps > limit) throw new Limit();
    if (n.t === "rep") { for (let i = 0; i < n.n; i++) yield* seq(n.body); }
    else if (n.t === "while") { let g = 0; while (env.cond(n.cond)) { if (++g > 300) throw new Limit(); const before = steps; yield* seq(n.body); if (steps === before) throw new Limit(); } }
    else if (n.t === "if") yield* seq(env.cond(n.cond) ? n.body : n.else);
    else if (n.t === "call") yield* seq(lists.fn || []);
    else yield n;
  }
  yield* seq(lists.main);
}
