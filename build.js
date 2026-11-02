// La carte du robot : placer les éléments, les brancher, tester
import { el, S, chime, speak, tone, sleep } from "./util.js";
import { robotSvg } from "./robot.js";
import { COMP, SLOTS, PORTS, PORT_COLOR, newState, portVisible, visiblePorts, wireOf, canConnect, evaluate, goalReached, nextHint, sweep, PCOND, PACT, MACT, PROG_CASES, progUsesMem, progSpeech, checkProg, describeOut, progUsesTic, progSize } from "./boardlogic.js";
import { createEditor, D } from "./blocks.js";
import { attachCodeView } from "./codeview.js";
import { brainToCode } from "./blockcode.js";

const NEEDS_TEST = new Set(["stopnear", "night", "alarm", "explorer", ...Object.keys(PROG_CASES)]);

export function mountBuild(stage, level, hooks = {}, preset = null) {
  let alive = true, won = false, selPort = null, selSlot = null, testing = false;
  const st = preset ? JSON.parse(JSON.stringify(preset)) : newState(level.polar, level.prog); if (!st.prog) st.prog = { main: [], fn: [] };
  const inp = { dist: 100, light: 90, pressed: false, t: 0, mem: false, prev: false };
  // un « tour » du cerveau se termine quand une entrée change : la mémoire retient alors ce qu'elle avait décidé
  const advance = () => { if (!st.useProg) return; const e = evaluate(st, inp); inp.mem = e.nextMem; inp.prev = !!inp.pressed; };
  const intro = el("div", "intro", level.mission), wrap = el("div", "boardwrap"), msg = el("div", "gmsg", "Touche un élément du tiroir pour le poser sur la carte."), tray = el("div", "tray"), ctl = el("div", "gctl"), testp = el("div", "testp");
  const mkb = (cls, txt, fn) => { const b = el("button", "gb " + cls, txt); b.onclick = fn; ctl.append(b); return b; };
  const bTest = NEEDS_TEST.has(level.goal) ? mkb("go", level.prog ? "▶ Tester mon programme" : "▶ Tester le robot", () => (level.prog ? runProgTest() : runTest())) : null;
  mkb("", "💡 Indice", () => say(nextHint(level, st), "hint", true));
  mkb("", "✂️ Débrancher les fils", () => { st.wires.length = 0; selPort = null; render(); say("Tous les fils sont débranchés. Touche un point, puis un autre, pour brancher."); });
  mkb("", "🗑 Vider la carte", () => { Object.keys(st.slots).forEach(k => st.slots[k] = null); st.wires.length = 0; selPort = selSlot = null; render(); say("La carte est vide."); });
  if (!level.goal && hooks.onSave) mkb("", "💾 Garder", () => hooks.onSave(JSON.parse(JSON.stringify(st))));
  if (!level.goal) { const m = mkb("", st.polar ? "🔌 Énergie : + et −" : "🔌 Énergie simple", () => { st.polar = !st.polar; st.wires = st.wires.filter(w => !w.some(p => /\.(pwr|pp|pm)$/.test(p))); m.textContent = st.polar ? "🔌 Énergie : + et −" : "🔌 Énergie simple"; render(); say(st.polar ? "Mode avancé : la batterie a un + et un −. Relie + avec +, − avec −." : "Mode simple : un seul fil d'énergie."); }); }
  let modeBtn = null;
  if (!level.goal) modeBtn = mkb("", "", () => { st.useProg = !st.useProg; sync(); render(); say(st.useProg ? "Le cerveau est <b>programmable</b> : écris ses ordres avec les blocs. Sans programme, il ne fait rien." : "Le cerveau est <b>automatique</b> : il suit des règles toutes prêtes."); });
  // ----- le programme du cerveau (éditeur de blocs) -----
  const tk = level.tray, sens = tk.filter(k => COMP[k].cat === "sen"), acts = tk.filter(k => COMP[k].cat === "act");
  const memOk = !!level.mem || !level.goal;
  const conds = Object.entries(PCOND).filter(([, d]) => (!d.need || sens.includes(d.need)) && (!d.mem || memOk)).map(([v, d]) => ({ v, label: d.label }));
  const palette = [D.if, ...Object.entries(PACT).filter(([, a]) => acts.includes(a.k)).map(([t, a]) => ({ t, label: a.label, icon: a.icon, cls: a.cls })), ...(memOk ? Object.entries(MACT).map(([t, a]) => ({ t, label: a.label, icon: a.icon, cls: a.cls })) : [])];
  const progp = el("div", "progp"), ed = createEditor({ palette, conds, fn: false, onChange: () => { refresh(); view && view.update(); } });
  let view = null;
  const bRead = el("button", "gb", "🔊 Lire mon programme"); bRead.onclick = () => { const t = progSpeech(st); say(t.replace(/\. /g, ".<br>")); };
  progp.append(el("div", "pt", "🧠 Le programme du cerveau"), el("div", "pi", "Le cerveau relit ce programme sans arrêt. À chaque tour, <b>tout est éteint</b>, puis il lit les blocs <b>de haut en bas</b>. Si aucun bloc ne donne un ordre, rien ne bouge."), ed.el, bRead);
  if (st.prog.main.length) ed.set(st.prog);
  st.prog = ed.lists;
  view = attachCodeView(progp, { gen: lang => brainToCode(st.prog, lang), onOpen: level.goal && hooks.onOpenCode ? (code, lang) => hooks.onOpenCode({ kind: "brain", goal: level.goal, level, code, lang }) : null });
  function sync() { progp.style.display = st.useProg ? "" : "none"; if (modeBtn) modeBtn.textContent = st.useProg ? "🧠 Cerveau : je le programme" : "🧠 Cerveau : automatique"; }
  stage.append(intro, wrap, msg, tray, ctl, progp, testp);
  sync();
  const say = (t, cls, voice) => { msg.className = "gmsg " + (cls || ""); msg.innerHTML = t; if (voice) speak(t); };

  // ----- dessin de la carte -----
  const wirePath = (a, b) => { const A = PORTS[a], B = PORTS[b], k = 70; return `M${A.x} ${A.y} C${A.x + A.dir[0] * k} ${A.y + A.dir[1] * k},${B.x + B.dir[0] * k} ${B.y + B.dir[1] * k},${B.x} ${B.y}`; };
  const wireColor = w => { const ta = PORTS[w[0]].t, tb = PORTS[w[1]].t; if ((ta === "pp" && tb === "pm") || (ta === "pm" && tb === "pp")) return "#ff9b9b"; return ta === "pm" || tb === "pm" ? "#202024" : ta === "pwr" || ta === "pp" ? "#e24b4b" : ta === "sout" || ta === "in" ? "#4a8fe8" : "#58c07a"; };
  const FAM = { pwr: "point d'énergie rouge", pp: "borne plus, rouge", pm: "borne moins, noire", in: "entrée, point bleu", out: "sortie, point vert", sout: "sortie du capteur, point bleu", ain: "entrée de l'action, point vert" };
  const portSay = p => { const P = PORTS[p], who = P.brain ? "le cerveau" : COMP[st.slots[p.split(".")[0]]] ? COMP[st.slots[p.split(".")[0]]].court : "la batterie"; return `${who} : ${P.nom}, ${FAM[P.t]}${wireOf(st, p) >= 0 ? ", déjà branché" : ""}`; };
  function render() {
    const ev = evaluate(st, inp); let h = `<svg viewBox="0 0 640 380" class="board"><rect width="640" height="380" rx="18" fill="#2d6a4f"/><g stroke="#40916c" stroke-width="3" fill="none" opacity=".7"><path d="M10 120h120v40M10 300h80M150 350h300M600 20v60M480 150h20M30 100h60"/></g>`;
    for (const [k, s] of Object.entries(SLOTS)) {
      const kind = st.slots[k], accept = selSlot && COMP[selSlot].cat === s.cat && !kind;
      if (!kind) h += `<g data-slot="${k}" data-say="Emplacement libre pour ${s.cat === "bat" ? "la batterie" : s.cat === "sen" ? "un capteur" : "une action"}. Choisis un élément dans le tiroir." class="slot${accept ? " accept" : ""}"><rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="12" fill="#ffffff14" stroke="${accept ? "#ffd54a" : "#95d5b2"}" stroke-width="${accept ? 4 : 2}" stroke-dasharray="7 6"/><text x="${s.x + s.w / 2}" y="${s.y + s.h / 2 + 5}" text-anchor="middle" fill="#d8f3dc" font-size="14">${s.cat === "bat" ? "🔋 " : s.cat === "sen" ? "👁️ " : "⚙️ "}${s.label}</text></g>`;
      else { const c = COMP[kind], sel = selComp === k; h += `<g data-comp="${k}" data-say="${c.court}. ${c.role}" class="comp${sel ? " sel" : ""}"><rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="12" fill="#fff" stroke="${sel ? "#ffd54a" : "#1b4332"}" stroke-width="${sel ? 5 : 3}"/><text x="${s.x + s.w / 2}" y="${s.y + 42}" text-anchor="middle" font-size="34">${c.icon}</text><text x="${s.x + s.w / 2}" y="${s.y + s.h - 12}" text-anchor="middle" font-size="12" fill="#1b4332" font-weight="700">${c.court}</text>${sel ? `<g data-remove="${k}" data-say="Retirer ${c.court} de la carte" class="rm"><circle cx="${s.x + s.w - 6}" cy="${s.y + 6}" r="15" fill="#e24b4b" stroke="#fff" stroke-width="3"/><text x="${s.x + s.w - 6}" y="${s.y + 12}" text-anchor="middle" fill="#fff" font-size="18" font-weight="700">✕</text></g>` : ""}</g>`; }
    }
    h += `<rect x="230" y="140" width="180" height="140" rx="16" fill="#1b4332" stroke="#95d5b2" stroke-width="3"/><text x="320" y="205" text-anchor="middle" font-size="42">🧠</text><text x="320" y="238" text-anchor="middle" fill="#d8f3dc" font-size="14" font-weight="700">CERVEAU</text><circle cx="392" cy="156" r="7" fill="${ev.powered ? "#7CFC9A" : "#555"}" stroke="#d8f3dc" stroke-width="2"/>${st.useProg ? `<text x="320" y="262" text-anchor="middle" fill="#ffd54a" font-size="12" font-weight="700">${progSize(st) ? "🧩 programmé" : "sans programme"}</text>` : ""}`;
    st.wires.forEach((w, i) => { const bad = wireColor(w) === "#ff9b9b"; h += `<path d="${wirePath(w[0], w[1])}" stroke="${wireColor(w)}" stroke-width="7" stroke-linecap="round" fill="none" ${bad ? 'stroke-dasharray="3 9"' : ""}/><path d="${wirePath(w[0], w[1])}" data-wire="${i}" data-say="Un fil. Touche-le pour le débrancher." stroke="transparent" stroke-width="22" fill="none" style="cursor:pointer"/>`; });
    for (const p of visiblePorts(st)) { const P = PORTS[p], wired = wireOf(st, p) >= 0, sel = selPort === p; let cls = "port";
      if (selPort && !sel) { const c = canConnect(st, selPort, p); cls += c.ok ? " pulse" : " dim"; }
      h += `<g data-port="${p}" data-say="${portSay(p)}" class="${cls}"><circle cx="${P.x}" cy="${P.y}" r="${sel ? 13 : 10}" fill="${wired ? PORT_COLOR[P.t] : "#fff"}" stroke="${PORT_COLOR[P.t]}" stroke-width="5"/><circle data-port="${p}" cx="${P.x}" cy="${P.y}" r="19" fill="transparent"/></g>`;
      if (P.brain) { const lx = P.dir[0] === -1 ? P.x + 14 : P.dir[0] === 1 ? P.x - 14 : P.x, ly = P.dir[1] === -1 ? P.y + 20 : P.y + 4, anc = P.dir[0] === -1 ? "start" : P.dir[0] === 1 ? "end" : "middle"; h += `<text x="${lx}" y="${ly}" text-anchor="${anc}" fill="#d8f3dc" font-size="11">${P.nom}</text>`; }
    }
    wrap.innerHTML = h + "</svg>";
    renderTray(); refresh();
  }
  let selComp = null;
  function renderTray() {
    tray.innerHTML = ""; const placed = Object.values(st.slots);
    level.tray.forEach(k => { const c = COMP[k], here = placed.includes(k), b = el("button", "tcard" + (here ? " placed" : selSlot === k ? " sel" : ""), `<span>${c.icon}</span><small>${c.court}</small>`); b.onclick = () => { speak(`${c.nom}. ${c.role}`); place(k); }; tray.append(b); });
  }
  function place(k) {
    const c = COMP[k]; if (Object.values(st.slots).includes(k)) { say(`${c.icon} ${c.court} est déjà sur la carte. Touche-le sur la carte pour le retirer.`); return; }
    const slot = Object.keys(SLOTS).find(s => SLOTS[s].cat === c.cat && !st.slots[s]);
    if (!slot) { chime("no"); say(c.cat === "sen" ? "Il n'y a que 2 places pour les capteurs. Retire-en un d'abord." : c.cat === "act" ? "Il n'y a que 3 places pour les actions. Retire-en une d'abord." : "La batterie est déjà placée."); return; }
    st.slots[slot] = k; chime("ok"); selSlot = null; selComp = null; render(); say(`${c.icon} ${c.court} posé. ${c.role}`, "ok");
    if (c.cat === "bat") say(`${c.icon} Batterie posée. Maintenant, relie-la au cerveau : touche un point rouge, puis l'autre point rouge.`, "ok");
  }
  function removeComp(slot) { const k = st.slots[slot]; st.slots[slot] = null; st.wires = st.wires.filter(w => !w.some(p => portSlot(p) === slot)); selComp = null; selPort = null; chime("step"); render(); say(`${COMP[k].icon} ${COMP[k].court} retiré. Ses fils sont débranchés.`); }
  const portSlot = p => p.split(".")[0];
  function tapPort(p) {
    const wi = wireOf(st, p);
    if (!selPort) { if (wi >= 0) { st.wires.splice(wi, 1); chime("step"); render(); say("Fil débranché."); return; } selPort = p; selComp = null; render(); say(`Point « ${PORTS[p].nom} » choisi. Touche maintenant le point à relier (ceux qui clignotent vont bien).`); return; }
    if (selPort === p) { selPort = null; render(); say("Choix annulé."); return; }
    const c = canConnect(st, selPort, p);
    if (!c.ok) { chime("no"); say("❌ " + c.why, "warn", false); selPort = null; render(); return; }
    st.wires.push([selPort, p]); selPort = null; chime("ok"); render();
    if (c.reversed) say("⚠️ Tu as relié + avec −. Dans un vrai robot, ça ne marche pas. Regarde la lampe du cerveau : elle reste éteinte !", "warn");
    else say("✔ Fil branché.", "ok");
  }
  wrap.addEventListener("click", e => {
    if (testing) return; const t = e.target.closest("[data-remove],[data-port],[data-wire],[data-comp],[data-slot]"); if (!t) { selPort = null; selComp = null; return render(); }
    if (t.dataset.remove) return removeComp(t.dataset.remove);
    if (t.dataset.port) return tapPort(t.dataset.port);
    if (t.dataset.wire) { st.wires.splice(+t.dataset.wire, 1); chime("step"); render(); return say("Fil débranché."); }
    if (t.dataset.comp) { selComp = selComp === t.dataset.comp ? null : t.dataset.comp; selPort = null; const c = COMP[st.slots[t.dataset.comp]]; render(); if (selComp) say(`${c.icon} <b>${c.court}</b> : ${c.role} (touche ✕ pour le retirer)`); speak(`${c.nom}. ${c.role}`); return; }
  });

  // ----- zone de test -----
  testp.innerHTML = `<div class="road" id="rd"><div class="rb"></div><div class="obst">🧱</div></div><div class="chips2"></div><div class="ctrls"></div><ul class="rules"></ul>`;
  const rd = testp.querySelector(".road"), rb = testp.querySelector(".rb"), obst = testp.querySelector(".obst"), chips = testp.querySelector(".chips2"), ctrls = testp.querySelector(".ctrls"), rulesEl = testp.querySelector(".rules");
  let beep = setInterval(() => { if (alive && lastOut.speaker) tone(880, 0.14, "square", 0.08); }, 700), lastOut = {};
  function controls() {
    const ev = evaluate(st, inp), have = ev.has; ctrls.innerHTML = "";
    if (have("dist")) { const l = el("label", "ctl", `📏 Obstacle : <b id="dv">${inp.dist}</b> cm`), s = el("input", "rng"); s.type = "range"; s.min = 0; s.max = 100; s.value = inp.dist; s.id = "sd"; s.oninput = () => { advance(); inp.dist = +s.value; refresh(true); }; l.append(s); ctrls.append(l); }
    if (have("light")) { const l = el("label", "ctl", `☀️ Lumière : <b id="lv">${inp.light}</b>`), s = el("input", "rng"); s.type = "range"; s.min = 0; s.max = 100; s.value = inp.light; s.id = "sl"; s.oninput = () => { advance(); inp.light = +s.value; refresh(true); }; l.append(s); ctrls.append(l); }
    if (st.useProg && progUsesMem(st)) { const b = el("button", "gb", "🧽 Effacer la mémoire"); b.onclick = () => { inp.mem = false; inp.prev = false; refresh(true); say("La mémoire est effacée : elle dit NON.", "", true); }; ctrls.append(b); }
    if (have("button")) { const b = el("button", "gb bigbtn", "🔘 Appuie (maintiens)"); const on = v => { if (inp.pressed === v) return; advance(); inp.pressed = v; refresh(true); }; b.onpointerdown = () => on(true); b.onpointerup = b.onpointerleave = () => on(false); ctrls.append(b); }
  }
  let lastKey = "";
  function refresh(sliderOnly) {
    const ev = evaluate(st, inp); lastOut = ev.out;
    const key = JSON.stringify([Object.values(st.slots)]); if (!sliderOnly && key !== lastKey) { lastKey = key; controls(); } else if (!sliderOnly) controls();
    const dv = testp.querySelector("#dv"), lv = testp.querySelector("#lv"); if (dv) dv.textContent = inp.dist; if (lv) lv.textContent = inp.light;
    rb.innerHTML = robotSvg(S.robot, ev.out.led ? "#ffd54a" : "#bbb"); rb.classList.toggle("glow", ev.out.led); rd.classList.toggle("rolling", ev.out.motor); obst.style.left = (84 - inp.dist * 0.5) + "%"; obst.style.display = ev.has("dist") ? "" : "none";
    if (st.useProg) ed.mark(ev.trace);
    chips.innerHTML = (ev.has("button") ? `<span class="${inp.pressed ? "on" : ""}">🔘 Bouton : ${inp.pressed ? "appuyé" : "relâché"}</span>` : "") + (st.useProg && progUsesMem(st) ? `<span class="${ev.nextMem ? "on" : ""}">📝 Mémoire : ${ev.nextMem ? "OUI" : "NON"}</span>` : "") + (st.useProg && progUsesTic(st) ? `<span class="${inp.t % 2 === 0 ? "on" : ""}">⏱ ${inp.t % 2 === 0 ? "tic" : "pas de tic"}</span>` : "") + `<span class="${ev.out.motor ? "on" : ""}">⚙️ Roues : ${ev.out.motor ? "en marche" : "arrêtées"}</span><span class="${ev.out.led ? "on" : ""}">💡 Lampe : ${ev.out.led ? "allumée" : "éteinte"}</span><span class="${ev.out.speaker ? "on" : ""}">🔊 Son : ${ev.out.speaker ? "il sonne" : "silence"}</span>`;
    rulesEl.innerHTML = `<li class="rt">Ce que fait ton robot :</li>` + ev.rules.map(r => `<li>${r}</li>`).join("");
    if (!won && !NEEDS_TEST.has(level.goal) && level.goal && goalReached(level, st)) win();
    else if (!won && NEEDS_TEST.has(level.goal) && bTest) bTest.disabled = testing;
  }
  function win() { if (won) return; won = true; chime("done"); say(level.prog ? "🎉 Bravo ! Ton programme fonctionne dans toutes les situations testées." : "🎉 Bravo ! Ton robot fonctionne : tu as bien relié les éléments.", "ok"); speak(level.prog ? "Bravo ! Ton programme fonctionne." : "Bravo ! Ton robot fonctionne."); hooks.onWin && hooks.onWin(); }
  async function runTest() {
    if (testing || won) return; const ev = evaluate(st, inp), w = ev.wired;
    if (!ev.powered) return say(ev.reversed ? "⚠️ Les fils + et − sont inversés : le robot n'a pas d'énergie." : "Le cerveau n'a pas d'énergie. Relie d'abord la batterie.", "warn");
    const need = { stopnear: ["dist", "motor"], night: ["light", "led"], alarm: ["dist", "led", "speaker"], explorer: ["dist", "motor", "led", "speaker"] }[level.goal];
    for (const k of need) if (!w[k]) return say(`${COMP[k].icon} « ${COMP[k].court} » n'est pas relié au cerveau (ou pas posé sur la carte). ${COMP[k].cat === "sen" ? "Un capteur se relie à une ENTRÉE (point bleu)." : "Une action se relie à une SORTIE (point vert)."}`, "warn");
    testing = true; if (bTest) bTest.disabled = true; say(level.goal === "night" ? "Le soleil se couche…" : "Un obstacle s'approche…");
    const kind = level.goal === "night" ? "light" : "dist", save = { ...inp };
    for (let v = 100; v >= 0 && alive; v -= 10) { if (kind === "dist") inp.dist = v; else inp.light = v; controls(); refresh(true); const s = document.getElementById(kind === "dist" ? "sd" : "sl"); if (s) s.value = v; await sleep(window.__turbo ? 3 : 260); }
    testing = false; if (!alive) return; if (bTest) bTest.disabled = false;
    if (goalReached(level, st)) win();
    else { chime("no"); say(level.goal === "stopnear" ? "Le robot ne s'arrête pas toujours devant l'obstacle. Vérifie que le capteur ET les moteurs sont reliés au cerveau." : level.goal === "night" ? "La lampe ne se comporte pas comme prévu. Vérifie les fils du capteur de lumière." : "Il manque quelque chose : regarde ce que dit « Ce que fait ton robot ». Essaie le bouton 💡 Indice.", "warn"); }
  }
  async function runProgTest() {
    if (testing || won) return; const ev = evaluate(st, inp);
    if (!ev.powered) return say(ev.reversed ? "⚠️ Les fils + et − sont inversés : le robot n'a pas d'énergie." : "Le cerveau n'a pas d'énergie. Relie d'abord la batterie.", "warn");
    for (const k of level.need) if (!ev.wired[k]) return say(`${COMP[k].icon} « ${COMP[k].court} » n'est pas relié au cerveau (ou pas posé sur la carte). ${COMP[k].cat === "sen" ? "Un capteur se relie à une ENTRÉE (point bleu)." : "Une action se relie à une SORTIE (point vert)."}`, "warn");
    if (!progSize(st)) return say("Le cerveau n'a pas encore de programme. Touche le bloc « si » au-dessus pour commencer.", "warn");
    const res = checkProg(level, st); testing = true; if (bTest) bTest.disabled = true;
    let failed = null;
    for (let i = 0; i < res.rows.length && alive; i++) {
      const r = res.rows[i]; Object.assign(inp, r.inp); controls(); refresh(true); say(`Essai ${i + 1} sur ${res.rows.length} : ${r.label}…`);
      await sleep(window.__turbo ? 3 : 750); if (!r.ok) { failed = r; break; }
    }
    testing = false; if (!alive) return; if (bTest) bTest.disabled = false;
    if (!failed) return win();
    chime("no");
    const detail = failed.why ? "Mais " + failed.why + "." : `Il faudrait que : ${describeOut(failed.want, failed.keys)}. Mais en ce moment : ${describeOut(failed.got, failed.keys)}.`;
    say(`❌ Situation : <b>${failed.label}</b>.<br>${detail}<br>Les blocs allumés en jaune sont ceux que le cerveau vient de lire : cherche lequel se trompe.`, "warn");
  }
  const tick = setInterval(() => { if (alive && !testing && st.useProg && progUsesTic(st)) { advance(); inp.t++; refresh(true); } }, 500);
  render(); controls();
  return { state: st, inp, place, tapPort, removeComp, runTest, refresh, render, destroy() { alive = false; clearInterval(beep); clearInterval(tick); } };
}
