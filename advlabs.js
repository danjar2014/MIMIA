// Laboratoires « aller plus loin » : nœuds et sujets, premier nœud, apprentissage par essais, apprentissage avec exemples
import { el, S, chime, speak, sleep, rnd, shuffle, tone } from "./util.js";
import { createEditor, runProgram, Limit, D } from "./blocks.js";
import { robotSvg } from "./robot.js";

// =============== 1. Brancher des nœuds avec des sujets (topics) ===============
export const NODELABS = [
  { id: "n1", title: "La caméra, le cerveau et les roues", intro: "Trois nœuds : la caméra voit, le planificateur calcule la route, les moteurs obéissent. Pour chaque nœud, choisis sur quel sujet il PUBLIE et sur quel sujet il ÉCOUTE (il s'abonne). Le planificateur doit utiliser l'image pour envoyer des commandes aux moteurs.",
    nodes: [{ id: "cam", icon: "📷", nom: "Nœud caméra" }, { id: "plan", icon: "🧭", nom: "Nœud planification" }, { id: "mot", icon: "⚙️", nom: "Nœud moteurs" }], topics: ["/image", "/commandes"],
    flows: [{ from: "cam", to: "plan", topic: "/image" }, { from: "plan", to: "mot", topic: "/commandes" }] },
  { id: "n2", title: "Un robot qui s'arrête et prévient", intro: "Un capteur mesure la distance. Le planificateur décide, puis publie UN seul ordre sur /commandes : les moteurs ET la lampe écoutent ce même sujet. Un sujet peut avoir plusieurs abonnés ! (Le sujet /alarme n'est pas utile ici.)",
    nodes: [{ id: "dist", icon: "📏", nom: "Nœud capteur de distance" }, { id: "plan", icon: "🧭", nom: "Nœud planification" }, { id: "mot", icon: "⚙️", nom: "Nœud moteurs" }, { id: "lamp", icon: "💡", nom: "Nœud lampe" }], topics: ["/distance", "/commandes", "/alarme"],
    flows: [{ from: "dist", to: "plan", topic: "/distance" }, { from: "plan", to: "mot", topic: "/commandes" }, { from: "plan", to: "lamp", topic: "/commandes" }] }
];
export function checkFlows(lab, sel) {
  const nm = id => lab.nodes.find(n => n.id === id), res = lab.flows.map(f => { const pub = sel[f.from]?.pub, sub = sel[f.to]?.sub;
    if (pub === f.topic && sub === f.topic) return { f, ok: true };
    const why = pub !== f.topic ? `${nm(f.from).icon} ${nm(f.from).nom} doit publier sur ${f.topic}.` : `${nm(f.to).icon} ${nm(f.to).nom} doit écouter ${f.topic} (s'abonner).`; return { f, ok: false, why }; });
  return { ok: res.every(r => r.ok), res };
}
export function mountNodes(stage, lab, onWin) {
  const sel = Object.fromEntries(lab.nodes.map(n => [n.id, { pub: "", sub: "" }])); const rows = el("div", "nodes"), bus = el("div", "bus"), msg = el("div", "gmsg", "&nbsp;"), ctl = el("div", "gctl");
  stage.append(el("div", "intro", lab.intro), rows, bus, ctl, msg);
  const opt = (v, cur) => `<option value="${v}" ${v === cur ? "selected" : ""}>${v || "— rien —"}</option>`;
  lab.nodes.forEach(n => { const r = el("div", "node", `<div class="nh"><span>${n.icon}</span><b>${n.nom}</b></div><label>📤 publie sur <select data-n="${n.id}" data-k="pub">${["", ...lab.topics].map(t => opt(t, "")).join("")}</select></label><label>📥 écoute <select data-n="${n.id}" data-k="sub">${["", ...lab.topics].map(t => opt(t, "")).join("")}</select></label>`); rows.append(r); r.dataset.id = n.id; });
  rows.addEventListener("change", e => { const s = e.target; if (s.dataset.n) { sel[s.dataset.n][s.dataset.k] = s.value; drawBus(); chime("step"); } });
  function drawBus() { bus.innerHTML = `<div class="bt">Les sujets (boîtes aux lettres) :</div>` + lab.topics.map(t => { const P = lab.nodes.filter(n => sel[n.id].pub === t).map(n => n.icon).join(" ") || "—", Q = lab.nodes.filter(n => sel[n.id].sub === t).map(n => n.icon).join(" ") || "—"; return `<div class="topic"><b>${t}</b><span>${P} <i>→</i> ${Q}</span></div>`; }).join(""); }
  const go = el("button", "gb go", "🚀 Lancer les nœuds"), hint = el("button", "gb", "💡 Indice"); ctl.append(go, hint);
  hint.onclick = () => { const c = checkFlows(lab, sel), bad = c.res.find(r => !r.ok); msg.className = "gmsg hint"; msg.innerHTML = bad ? "💡 " + bad.why : "Tout est branché ! Lance les nœuds."; };
  go.onclick = async () => { go.disabled = true; const c = checkFlows(lab, sel); msg.className = "gmsg"; msg.innerHTML = "Les nœuds démarrent tous en même temps (comme avec un fichier de lancement)…"; await sleep(window.__turbo ? 5 : 700);
    let html = ""; for (const r of c.res) { const a = lab.nodes.find(n => n.id === r.f.from), b = lab.nodes.find(n => n.id === r.f.to); html += r.ok ? `✔ ${a.icon} → <b>${r.f.topic}</b> → ${b.icon}<br>` : `✖ ${a.icon} … ${b.icon} : ${r.why}<br>`; msg.innerHTML = html; chime(r.ok ? "ok" : "no"); await sleep(window.__turbo ? 5 : 650); }
    go.disabled = false; if (c.ok) { msg.className = "gmsg ok"; msg.innerHTML = html + "<br>🎉 Bravo ! Tous les messages arrivent : ton robot fonctionne."; chime("done"); onWin(); } else { msg.className = "gmsg warn"; msg.innerHTML = html + "<br>Certains messages n'arrivent pas. Corrige les sujets et relance."; } };
  drawBus(); return { destroy() {}, sel };
}

// =============== 2. Mon premier nœud : publier des messages ===============
const MSGS = [{ v: "Bonjour le monde", label: "« Bonjour le monde »" }, { v: "Salut robot", label: "« Salut robot »" }, { v: "Je suis un nœud", label: "« Je suis un nœud »" }];
const pubD = { t: "pub", label: "publier sur /salut", icon: "📤", cls: "mv", opts: MSGS };
const repD = { ...D.rep, n: { v: 2, min: 2, max: 8, step: 1, unit: "fois" } };
export const PUBLABS = [{ id: "p1", title: "Hello World", intro: "Écris ton premier nœud : un publieur ! Il envoie le message « Bonjour le monde » sur le sujet /salut. Un nœud écouteur est déjà abonné à /salut : il affichera ce qu'il reçoit.", goal: log => log.some(m => m === "Bonjour le monde"), palette: [pubD] },
  { id: "p2", title: "Le publieur qui répète", intro: "Fais publier le même message 3 fois ou plus, sans copier le bloc 3 fois. Quel bloc faut-il ?", goal: (log, lists) => log.length >= 3 && lists.main.some(n => n.t === "rep"), palette: [pubD, repD] }];
export function mountPub(stage, lab, onWin) {
  let alive = true, running = false; const editor = createEditor({ palette: lab.palette }), con = el("div", "console", `<div class="ch">🖥️ Console du nœud écouteur (abonné à /salut)</div><div class="cl">En attente de messages…</div>`), msg = el("div", "gmsg", "&nbsp;"), ctl = el("div", "gctl");
  const go = el("button", "gb go", "▶ Lancer mon nœud"), clr = el("button", "gb", "🗑 Effacer"); ctl.append(go, clr); stage.append(el("div", "intro", lab.intro), con, msg, ctl, editor.el);
  clr.onclick = () => { editor.clear(); con.querySelector(".cl").innerHTML = "En attente de messages…"; };
  go.onclick = async () => { if (running) return; if (!editor.lists.main.length) { msg.className = "gmsg warn"; msg.innerHTML = "Ton nœud est vide. Touche un bloc 👆"; return; } running = true; go.disabled = true; const log = [], cl = con.querySelector(".cl"); cl.innerHTML = ""; msg.className = "gmsg"; msg.innerHTML = "Ton nœud publie…";
    try { for (const n of runProgram(editor.lists, { cond: () => false }, 200)) { if (!alive) return; editor.highlight(n); log.push(n.v); cl.innerHTML += `📥 reçu sur <b>/salut</b> : « ${n.v} »<br>`; chime("step"); await sleep(window.__turbo ? 2 : 600); } } catch (e) { if (!(e instanceof Limit)) throw e; }
    editor.highlight(null); running = false; go.disabled = false; if (!alive) return;
    if (lab.goal(log, editor.lists)) { msg.className = "gmsg ok"; msg.innerHTML = "🎉 Bravo ! Ton nœud a publié et l'écouteur a tout reçu."; chime("done"); onWin(); }
    else { msg.className = "gmsg warn"; msg.innerHTML = lab.id === "p1" ? "Le message « Bonjour le monde » n'a pas été publié. Choisis-le dans le bloc." : "Il faut au moins 3 messages avec un bloc « répéter »."; } };
  return { editor, destroy() { alive = false; } };
}

// =============== 3. Le bras qui apprend par essais (renforcement) ===============
const N_ANGLES = 7;
export const pSuccess = (a, best) => a === best ? 0.9 : Math.abs(a - best) === 1 ? 0.3 : 0.04;
export function rlChoose(q, tries, rng = Math.random) { const eps = Math.max(0.1, 0.45 - tries * 0.01); if (rng() < eps) return Math.floor(rng() * N_ANGLES); const m = Math.max(...q); const bests = q.map((v, i) => [v, i]).filter(x => x[0] >= m - 1e-9).map(x => x[1]); return bests[Math.floor(rng() * bests.length)]; }
export function rlUpdate(q, a, r) { q[a] += 0.4 * (r - q[a]); }
export function mountRL(stage, onWin) {
  let best = Math.floor(Math.random() * N_ANGLES), q = Array(N_ANGLES).fill(0.3), tries = 0, streak = 0, phase = 1, last = -1, alive = true, wins = 0; const hist = [];
  const arm = el("div", "armbox"), chart = el("div", "qchart"), logEl = el("div", "rllog"), msg = el("div", "gmsg", "&nbsp;"), ctl = el("div", "gctl"), stat = el("div", "sub");
  stage.append(el("div", "intro", "Un bras robot doit saisir une pièce. Personne ne lui dit quel angle est le bon : il ESSAIE, reçoit une récompense (✔) ou une pénalité (✖), et change sa façon de faire. C'est l'apprentissage par renforcement. Quand il a réussi 5 fois de suite, change la pièce de place !"), arm, chart, stat, logEl, msg, ctl);
  const one = el("button", "gb go", "▶ Un essai"), ten = el("button", "gb", "⏩ 10 essais"), chg = el("button", "gb", "🔄 Changer la pièce de place"), rst = el("button", "gb", "↺ Recommencer"); ctl.append(one, ten, chg, rst); chg.style.display = "none";
  function draw(angle) { const ang = angle < 0 ? 0 : -60 + (angle / (N_ANGLES - 1)) * 120, px = 150 + 105 * Math.sin((-60 + (best / (N_ANGLES - 1)) * 120) * Math.PI / 180);
    arm.innerHTML = `<svg viewBox="0 0 300 150"><rect x="120" y="120" width="60" height="26" rx="6" fill="#555"/><g transform="rotate(${ang} 150 120)"><rect x="143" y="30" width="14" height="92" rx="6" fill="#3f7fd6" stroke="#38362f" stroke-width="3"/><circle cx="150" cy="30" r="10" fill="#ffd54a" stroke="#38362f" stroke-width="3"/></g><text x="${px}" y="30" font-size="30" text-anchor="middle">📦</text></svg>`;
    chart.innerHTML = q.map((v, i) => `<div class="qc${i === angle ? " cur" : ""}"><div class="qbar" style="height:${Math.round(v * 70)}px"></div><small>${i + 1}</small></div>`).join("") + `<div class="qt">Ce que le robot pense de chaque angle (plus c'est haut, plus il croit que ça marche)</div>`;
    logEl.innerHTML = hist.slice(-12).map(h => h ? "✔" : "✖").join(" ") || "Aucun essai pour l'instant"; stat.textContent = `Essais : ${tries} · Réussites d'affilée : ${streak}`; }
  function trial() { const a = rlChoose(q, tries), ok = Math.random() < pSuccess(a, best); rlUpdate(q, a, ok ? 1 : 0); tries++; hist.push(ok); streak = ok ? streak + 1 : 0; last = a; draw(a); chime(ok ? "ok" : "no");
    if (ok) { msg.className = "gmsg ok"; msg.innerHTML = "✔ Réussi ! Il retient que cet angle marche bien."; } else { msg.className = "gmsg warn"; msg.innerHTML = "✖ Raté… Il change un peu sa façon de faire. Personne ne le reprogramme !"; }
    if (streak >= 5) { if (phase === 1) { phase = 2; chg.style.display = ""; msg.className = "gmsg ok"; msg.innerHTML = "🎉 Il a appris ! 5 réussites d'affilée. Maintenant, change la pièce de place : saura-t-il s'adapter ?"; chime("done"); } else if (phase === 2 && changed) { phase = 3; msg.className = "gmsg ok"; msg.innerHTML = "🏆 Incroyable : la pièce a bougé et il s'est adapté tout seul, sans nouvelle instruction !"; chime("done"); onWin(); } } }
  let changed = false;
  one.onclick = () => trial(); ten.onclick = async () => { ten.disabled = true; for (let i = 0; i < 10 && alive; i++) { trial(); await sleep(window.__turbo ? 2 : 280); } ten.disabled = false; };
  chg.onclick = () => { let nb; do { nb = Math.floor(Math.random() * N_ANGLES); } while (Math.abs(nb - best) < 2); best = nb; changed = true; streak = 0; chime("step"); msg.className = "gmsg"; msg.innerHTML = "📦 La pièce est ailleurs ! Regarde le robot se tromper, puis apprendre."; draw(-1); };
  rst.onclick = () => { best = Math.floor(Math.random() * N_ANGLES); q = Array(N_ANGLES).fill(0.3); tries = streak = 0; hist.length = 0; phase = 1; changed = false; chg.style.display = "none"; msg.className = "gmsg"; msg.innerHTML = "&nbsp;"; draw(-1); };
  draw(-1); return { destroy() { alive = false; }, state: () => ({ best, q, tries, streak, phase }), trial };
}

// =============== 4. Apprendre avec des exemples (supervisé) ===============
export function genPoints(rng = Math.random) { const g = () => { let u = 0; for (let i = 0; i < 6; i++) u += rng(); return (u - 3) / 0.7071; }, pts = [];
  for (let i = 0; i < 24; i++) { const c = i < 12 ? 1 : 0, m = c ? 65 : 35, x = Math.max(6, Math.min(94, m + g() * 13)), y = Math.max(6, Math.min(94, m + g() * 13)); pts.push({ x, y, c, lab: false }); } return pts; }
export function predict(pts, p) { let best = null, bd = 1e9; for (const q of pts) if (q.lab) { const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d < bd) { bd = d; best = q; } } return best ? best.c : null; }
export function accuracy(pts) { const un = pts.filter(p => !p.lab); if (!un.length) return 1; return un.filter(p => predict(pts, p) === p.c).length / un.length; }
export function mountSup(stage, onWin) {
  const MAX = 6; let pts = genPoints(), alive = true, won = false; const box = el("div", "scatter"), info = el("div", "sub"), msg = el("div", "gmsg", "&nbsp;"), ctl = el("div", "gctl");
  stage.append(el("div", "intro", "Le robot doit reconnaître si ce que son capteur détecte est un OBSTACLE 🧱 ou une ROUTE LIBRE 🌿. Chaque point est une mesure. Tu es le professeur : touche un point pour lui donner son nom (une étiquette). Tu as seulement 6 exemples ! Les autres points seront devinés par le robot. Vise 85 % de bonnes réponses."), box, info, msg, ctl);
  const rst = el("button", "gb", "↺ Nouveau jeu de mesures"); ctl.append(rst);
  function draw() { const used = pts.filter(p => p.lab).length, acc = accuracy(pts);
    box.innerHTML = `<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/><text x="50" y="98" text-anchor="middle" font-size="3.4" fill="#777">grosseur de ce que le capteur détecte →</text><text x="3" y="50" font-size="3.4" fill="#777" transform="rotate(-90 3 50)" text-anchor="middle">dureté du signal →</text>` + pts.map((p, i) => { const pr = p.lab ? p.c : predict(pts, p), col = pr === null ? "#bbb" : pr ? "#e0675a" : "#4caf6a"; return `<g data-i="${i}" style="cursor:pointer"><circle cx="${p.x}" cy="${100 - p.y}" r="${p.lab ? 4.6 : 3.2}" fill="${col}" fill-opacity="${p.lab ? 1 : 0.45}" stroke="${p.lab ? "#222" : "none"}" stroke-width="1"/><circle cx="${p.x}" cy="${100 - p.y}" r="6" fill="transparent"/>${p.lab ? `<text x="${p.x}" y="${100 - p.y + 1.6}" font-size="4.4" text-anchor="middle">${p.c ? "🧱" : "🌿"}</text>` : ""}</g>`; }).join("") + "</svg>";
    info.innerHTML = `Exemples donnés : <b>${used} / ${MAX}</b> · Le robot devine juste : <b>${Math.round(acc * 100)} %</b>`;
    if (!won && used > 0 && acc >= 0.85) { won = true; msg.className = "gmsg ok"; msg.innerHTML = `🎉 Bravo ! Avec seulement ${used} exemples bien choisis, il devine ${Math.round(acc * 100)} % des cas. Des exemples variés, ça compte !`; chime("done"); onWin(); } }
  box.addEventListener("click", e => { const g = e.target.closest("[data-i]"); if (!g || won) return; const p = pts[+g.dataset.i]; if (p.lab) return; if (pts.filter(x => x.lab).length >= MAX) { chime("no"); msg.className = "gmsg warn"; msg.innerHTML = "Tu as utilisé tes 6 exemples. Regarde si le robot a réussi, ou recommence avec de nouvelles mesures."; return; }
    p.lab = true; chime("ok"); draw(); const L = pts.filter(x => x.lab); if (L.length >= 2 && L.every(x => x.c === L[0].c)) { msg.className = "gmsg warn"; msg.innerHTML = `Tous tes exemples sont des ${L[0].c ? "obstacles 🧱" : "routes libres 🌿"} : le robot ne connaît pas l'autre cas ! Donne des exemples variés.`; } else if (!won) { msg.className = "gmsg"; msg.innerHTML = "Regarde les couleurs : ce sont les devinettes du robot. Où se trompe-t-il ?"; } });
  rst.onclick = () => { pts = genPoints(); won = false; msg.className = "gmsg"; msg.innerHTML = "&nbsp;"; draw(); };
  draw(); return { destroy() { alive = false; }, pts: () => pts, draw };
}
