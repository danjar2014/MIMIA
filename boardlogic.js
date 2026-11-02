// Logique de la carte du robot (sans affichage) : composants, branchements, comportement.
export const COMP = {
  battery: { icon: "🔋", nom: "la batterie", court: "Batterie", role: "Elle donne l'énergie à tout le robot.", cat: "bat" },
  motor: { icon: "⚙️", nom: "les moteurs", court: "Moteurs et roues", role: "Ils font tourner les roues : le robot avance.", cat: "act" },
  led: { icon: "💡", nom: "la lampe", court: "Lampe (LED)", role: "Elle s'allume pour montrer ce que le robot pense.", cat: "act" },
  speaker: { icon: "🔊", nom: "le haut-parleur", court: "Haut-parleur", role: "Il fait des bips et des sons.", cat: "act" },
  dist: { icon: "👁️", nom: "le capteur de distance", court: "Capteur de distance", role: "Il mesure la distance entre le robot et un obstacle.", cat: "sen" },
  light: { icon: "☀️", nom: "le capteur de lumière", court: "Capteur de lumière", role: "Il sent s'il fait clair ou s'il fait sombre.", cat: "sen" },
  button: { icon: "🔘", nom: "le bouton", court: "Bouton", role: "Il prévient le cerveau quand on appuie dessus.", cat: "sen" }
};
export const SLOTS = {
  B: { cat: "bat", x: 14, y: 165, w: 124, h: 90, label: "énergie" },
  S1: { cat: "sen", x: 176, y: 8, w: 128, h: 84, label: "capteur" }, S2: { cat: "sen", x: 336, y: 8, w: 128, h: 84, label: "capteur" },
  A1: { cat: "act", x: 506, y: 102, w: 126, h: 80, label: "action" }, A2: { cat: "act", x: 506, y: 192, w: 126, h: 80, label: "action" }, A3: { cat: "act", x: 506, y: 282, w: 126, h: 80, label: "action" }
};
// points de branchement : t = type ; dir = direction du fil à la sortie du point
export const PORTS = {
  "BR.pwr": { x: 230, y: 210, t: "pwr", dir: [-1, 0], nom: "énergie", brain: true }, "BR.pp": { x: 230, y: 184, t: "pp", dir: [-1, 0], nom: "+", brain: true }, "BR.pm": { x: 230, y: 236, t: "pm", dir: [-1, 0], nom: "−", brain: true },
  "BR.in1": { x: 282, y: 140, t: "in", dir: [0, -1], nom: "entrée 1", brain: true }, "BR.in2": { x: 358, y: 140, t: "in", dir: [0, -1], nom: "entrée 2", brain: true },
  "BR.out1": { x: 410, y: 172, t: "out", dir: [1, 0], nom: "sortie 1", brain: true }, "BR.out2": { x: 410, y: 210, t: "out", dir: [1, 0], nom: "sortie 2", brain: true }, "BR.out3": { x: 410, y: 248, t: "out", dir: [1, 0], nom: "sortie 3", brain: true },
  "B.pwr": { x: 138, y: 210, t: "pwr", dir: [1, 0], nom: "énergie" }, "B.pp": { x: 138, y: 188, t: "pp", dir: [1, 0], nom: "+" }, "B.pm": { x: 138, y: 234, t: "pm", dir: [1, 0], nom: "−" },
  "S1.out": { x: 240, y: 92, t: "sout", dir: [0, 1], nom: "signal" }, "S2.out": { x: 400, y: 92, t: "sout", dir: [0, 1], nom: "signal" },
  "A1.in": { x: 506, y: 142, t: "ain", dir: [-1, 0], nom: "ordre" }, "A2.in": { x: 506, y: 232, t: "ain", dir: [-1, 0], nom: "ordre" }, "A3.in": { x: 506, y: 322, t: "ain", dir: [-1, 0], nom: "ordre" }
};
export const PORT_COLOR = { pwr: "#e24b4b", pp: "#e24b4b", pm: "#3a3a3f", in: "#3f7fd6", sout: "#3f7fd6", out: "#4caf6a", ain: "#4caf6a" };

export const newState = (polar, prog) => ({ slots: { B: null, S1: null, S2: null, A1: null, A2: null, A3: null }, wires: [], polar: !!polar, useProg: !!prog, prog: { main: [], fn: [] } });
export const portSlot = p => p.split(".")[0];
export function portVisible(st, p) {
  const [s, n] = p.split("."); const def = PORTS[p];
  if (s === "BR") return st.polar ? n !== "pwr" : !(n === "pp" || n === "pm");
  if (s === "B") return !!st.slots.B && (st.polar ? n !== "pwr" : n === "pwr");
  return !!st.slots[s];
}
export const visiblePorts = st => Object.keys(PORTS).filter(p => portVisible(st, p));
export const wireOf = (st, p) => st.wires.findIndex(w => w[0] === p || w[1] === p);

// peut-on relier a et b ? renvoie { ok, reversed } ou { ok:false, why }
export function canConnect(st, a, b) {
  if (a === b) return { ok: false, why: "C'est le même point." };
  const ta = PORTS[a].t, tb = PORTS[b].t, pair = (x, y) => (ta === x && tb === y) || (ta === y && tb === x);
  if (wireOf(st, a) >= 0 || wireOf(st, b) >= 0) return { ok: false, why: "Il y a déjà un fil sur ce point. Touche le point pour le débrancher d'abord." };
  const brainSide = PORTS[a].brain ? a : PORTS[b].brain ? b : null, otherSide = brainSide === a ? b : a;
  if (pair("pwr", "pwr") && PORTS[a].brain !== PORTS[b].brain) return { ok: true };
  if (pair("pp", "pp") || pair("pm", "pm")) return PORTS[a].brain !== PORTS[b].brain ? { ok: true } : { ok: false, why: "Il faut relier la batterie au cerveau." };
  if (pair("pp", "pm") && PORTS[a].brain !== PORTS[b].brain) return { ok: true, reversed: true };
  if (pair("sout", "in")) return { ok: true };
  if (pair("out", "ain")) return { ok: true };
  const kinds = [ta, tb];
  if (kinds.includes("sout") && kinds.includes("out")) return { ok: false, why: "Un capteur ENVOIE une information au cerveau : branche-le sur une ENTRÉE (point bleu, en haut), pas sur une sortie." };
  if (kinds.includes("ain") && kinds.includes("in")) return { ok: false, why: "Les moteurs, la lampe et le haut-parleur REÇOIVENT des ordres du cerveau : branche-les sur une SORTIE (point vert, à droite)." };
  if (kinds.some(k => k === "pwr" || k === "pp" || k === "pm")) return { ok: false, why: "L'énergie se branche seulement sur les points rouges de la batterie et du cerveau." };
  return { ok: false, why: "Ces deux points ne vont pas ensemble. Regarde les couleurs : on relie deux points de même famille (rouge avec rouge, bleu avec bleu, vert avec vert)." };
}


// ----- le programme du cerveau : des blocs que le cerveau relit à chaque tour -----
// conditions : need = capteur qui doit être relié au cerveau
export const PCOND = {
  near: { label: "obstacle proche (moins de 20 cm)", need: "dist", f: i => i.dist < 20 },
  far: { label: "chemin libre (20 cm ou plus)", need: "dist", f: i => i.dist >= 20 },
  vnear: { label: "obstacle très proche (moins de 8 cm)", need: "dist", f: i => i.dist < 8 },
  dark: { label: "il fait sombre", need: "light", f: i => i.light < 35 },
  bright: { label: "il fait clair", need: "light", f: i => i.light >= 35 },
  pressed: { label: "le bouton est appuyé", need: "button", f: i => i.pressed },
  released: { label: "le bouton n'est pas appuyé", need: "button", f: i => !i.pressed },
  tic: { label: "c'est un « tic » (toutes les demi-secondes)", need: null, f: i => i.t % 2 === 0 },
  just: { label: "le bouton vient d'être appuyé", need: "button", mem: false, f: i => i.pressed && !i.prev },
  memyes: { label: "la mémoire dit OUI", need: null, mem: true, f: i => i.mem },
  memno: { label: "la mémoire dit NON", need: null, mem: true, f: i => !i.mem }
};
// ordres de mémoire : la mémoire est une petite boîte qui retient OUI ou NON d'un tour à l'autre
export const MACT = {
  mset1: { label: "retenir : OUI", icon: "📝", cls: "fn" },
  mset0: { label: "retenir : NON", icon: "🧽", cls: "fn" },
  mflip: { label: "changer la mémoire (OUI ↔ NON)", icon: "🔁", cls: "fn" }
};
// ordres : k = composant commandé (doit être relié à une sortie)
export const PACT = {
  lon: { k: "led", on: true, label: "allumer la lampe", icon: "💡", cls: "act" },
  loff: { k: "led", on: false, label: "éteindre la lampe", icon: "🌑", cls: "act" },
  mon: { k: "motor", on: true, label: "faire rouler les roues", icon: "⚙️", cls: "mv" },
  moff: { k: "motor", on: false, label: "arrêter les roues", icon: "🛑", cls: "mv" },
  son: { k: "speaker", on: true, label: "faire sonner le haut-parleur", icon: "🔊", cls: "turn" },
  soff: { k: "speaker", on: false, label: "faire silence", icon: "🔇", cls: "turn" }
};
const walkProg = (arr, f) => (arr || []).forEach(n => { f(n); walkProg(n.body, f); walkProg(n.else, f); });
// exécute le programme une fois (un « tour ») : tout est éteint, puis les blocs sont lus de haut en bas
export function runBrain(prog, inp, w) {
  const out = { motor: false, led: false, speaker: false }, trace = [], did = [];
  let mem = !!inp.mem;
  const cond = c => { const d = PCOND[c]; return !!d && (!d.need || !!w[d.need]) && d.f({ ...inp, mem }); };
  const run = arr => { for (const n of arr || []) { trace.push(n); const a = PACT[n.t], m = MACT[n.t];
    if (n.t === "if") run(cond(n.cond) ? n.body : n.else);
    else if (m) { mem = n.t === "mset1" ? true : n.t === "mset0" ? false : !mem; did.push(m.icon + " " + m.label + " → " + (mem ? "OUI" : "NON")); }
    else if (a && w[a.k]) { out[a.k] = a.on; did.push(a.icon + " " + a.label); } } };
  run(prog && prog.main); return { out, trace, did, mem };
}
// problèmes visibles dans le programme (capteur ou action non relié)
export function progIssues(st, wired, has) {
  const msg = [], seen = new Set();
  const bad = (k, sens) => { if (seen.has(k)) return; seen.add(k); const c = COMP[k]; msg.push(!has(k) ? `⚠️ Ton programme utilise « ${c.court} », mais il n'est pas posé sur la carte.` : `⚠️ Ton programme utilise « ${c.court} », mais il n'est pas relié au cerveau (${sens ? "ENTRÉE, point bleu" : "SORTIE, point vert"}).`); };
  walkProg(st.prog && st.prog.main, n => { const d = PCOND[n.cond], a = PACT[n.t]; if (n.t === "if" && d && d.need && !wired[d.need]) bad(d.need, true); if (a && !wired[a.k]) bad(a.k, false); });
  return msg;
}
export const progUsesTic = st => { let u = false; walkProg(st.prog && st.prog.main, n => { if (n.cond === "tic") u = true; }); return u; };
export const progUsesMem = st => { let u = false; walkProg(st.prog && st.prog.main, n => { if (MACT[n.t] || n.cond === "memyes" || n.cond === "memno") u = true; }); return u; };
// le programme dit à voix haute, en phrases
export function progSpeech(st) {
  const seq = arr => (arr || []).map(sentence).join(", puis ");
  const sentence = n => { if (n.t === "if") { const d = PCOND[n.cond], e = (n.else || []).length; return `si ${d ? d.label : "…"}, alors ${seq(n.body) || "rien"}${e ? ", sinon " + seq(n.else) : ""}`; } const a = PACT[n.t] || MACT[n.t]; return a ? a.label : "…"; };
  const m = (st.prog && st.prog.main) || []; return m.length ? "Voici le programme du cerveau. " + m.map((n, i) => (i ? "Ensuite, " : "D'abord, ") + sentence(n) + ".").join(" ") : "Le programme du cerveau est vide pour le moment.";
}
export const progSize = st => { let c = 0; walkProg(st.prog && st.prog.main, () => c++); return c; };

// ce que le robot fait, selon la carte et les entrées { dist (cm), light (0-100), pressed }
export function evaluate(st, inp = { dist: 100, light: 90, pressed: false, t: 0 }) {
  inp = { t: 0, mem: false, prev: false, ...inp };
  const has = k => Object.values(st.slots).includes(k);
  const slotOf = k => Object.keys(st.slots).find(s => st.slots[s] === k);
  const linked = (a, b) => st.wires.some(w => (w[0] === a && w[1] === b) || (w[0] === b && w[1] === a));
  const sensorWired = k => { const s = slotOf(k); return !!s && st.wires.some(w => w.includes(s + ".out")); };
  const actWired = k => { const s = slotOf(k); return !!s && st.wires.some(w => w.includes(s + ".in")); };
  let powered = false, reversed = false;
  if (has("battery")) {
    if (!st.polar) powered = linked("B.pwr", "BR.pwr");
    else { const ok1 = linked("B.pp", "BR.pp"), ok2 = linked("B.pm", "BR.pm"); powered = ok1 && ok2; reversed = linked("B.pp", "BR.pm") || linked("B.pm", "BR.pp"); }
  }
  const w = { dist: sensorWired("dist"), light: sensorWired("light"), button: sensorWired("button"), motor: actWired("motor"), led: actWired("led"), speaker: actWired("speaker") };
  const near = w.dist && inp.dist < 20, dark = w.light && inp.light < 35;
  let motor = false, led = false, speaker = false, trace = [], did = [], nextMem = !!inp.mem;
  if (st.useProg && st.prog) { if (powered) { const r = runBrain(st.prog, inp, w); ({ motor, led, speaker } = r.out); trace = r.trace; did = r.did; nextMem = r.mem; } }
  else if (powered) {
    motor = w.motor && !near && (w.button ? inp.pressed : true);
    led = w.led && (w.light ? dark : w.dist ? near : w.button ? inp.pressed : true);
    speaker = w.speaker && (w.dist ? near : w.button ? inp.pressed : false);
  }
  const rules = [];
  if (!powered) rules.push(reversed ? "⚠️ Les fils + et − sont inversés : le cerveau ne reçoit pas d'énergie." : "Le cerveau n'a pas d'énergie : rien ne marche. Relie la batterie au cerveau.");
  else if (st.useProg) {
    rules.push("✅ Le cerveau a de l'énergie.");
    if (!progSize(st)) rules.push("Le cerveau n'a pas encore de programme : il ne sait rien faire. Ajoute des blocs dans le programme.");
    else {
      rules.push(did.length ? "En ce moment, le cerveau ordonne : " + did.join(" · ") : "En ce moment, le cerveau ne donne aucun ordre : tout reste éteint.");
      if (progUsesMem(st)) rules.push("📝 La mémoire retient : " + (nextMem ? "OUI" : "NON") + ".");
      progIssues(st, w, has).forEach(m => rules.push(m));
    }
  } else {
    rules.push("✅ Le cerveau a de l'énergie.");
    if (w.motor) rules.push(w.dist ? "Les roues tournent, mais s'arrêtent quand un obstacle est à moins de 20 cm." : w.button ? "Les roues tournent seulement quand on appuie sur le bouton." : "Les roues tournent tout le temps (aucun capteur ne les arrête !).");
    if (w.led) rules.push(w.light ? "La lampe s'allume quand il fait sombre." : w.dist ? "La lampe s'allume quand un obstacle est proche." : w.button ? "La lampe s'allume quand on appuie sur le bouton." : "La lampe reste allumée (aucun capteur ne la commande).");
    if (w.speaker) rules.push(w.dist ? "Le haut-parleur sonne quand un obstacle est proche." : w.button ? "Le haut-parleur sonne quand on appuie sur le bouton." : "Le haut-parleur est branché mais ne sait pas quand sonner : il manque un capteur.");
    if ((w.dist || w.light || w.button) && !(w.motor || w.led || w.speaker)) rules.push("Le capteur envoie son information, mais rien n'est branché sur une sortie pour agir.");
    if (!(w.dist || w.light || w.button) && !(w.motor || w.led)) rules.push("Branche un capteur et une sortie pour que le robot sente et agisse.");
  }
  return { powered, reversed, wired: w, out: { motor, led, speaker }, rules, has, trace, did, nextMem };
}

// niveaux de construction
export const BUILD = [
  { id: "e1", band: "a", title: "L'énergie", tray: ["battery"], polar: false, goal: "power", mission: "Un robot a besoin d'énergie ! Place la batterie sur la carte, puis relie-la au cerveau avec un fil." },
  { id: "e2", band: "a", title: "Les roues", tray: ["battery", "motor"], polar: false, goal: "motor", mission: "Fais rouler le robot : donne-lui de l'énergie, puis branche les moteurs sur une sortie du cerveau." },
  { id: "e3", band: "a", title: "La lampe", tray: ["battery", "led"], polar: false, goal: "led", mission: "Allume la lampe du robot." },
  { id: "e4", band: "b", title: "Les yeux du robot", tray: ["battery", "motor", "dist"], polar: false, goal: "stopnear", mission: "Construis un robot qui roule mais s'arrête devant un obstacle. Le capteur envoie l'information au cerveau (entrée), le cerveau donne l'ordre aux roues (sortie)." },
  { id: "e5", band: "b", title: "Veilleur de nuit", tray: ["battery", "light", "led"], polar: false, goal: "night", mission: "Construis une lampe automatique : elle s'allume toute seule quand il fait sombre." },
  { id: "e6", band: "b", title: "Robot alarme", tray: ["battery", "dist", "speaker", "led"], polar: false, goal: "alarm", mission: "Quand quelqu'un s'approche, la lampe s'allume ET le haut-parleur sonne." },
  { id: "e7", band: "c", title: "Plus et moins", tray: ["battery", "led"], polar: true, goal: "led", mission: "Une vraie batterie a deux bornes : + (rouge) et − (noire). Il faut relier + avec + et − avec −. Essaie de les inverser pour voir !" },
  { id: "e8", band: "c", title: "Le robot explorateur", tray: ["battery", "motor", "dist", "led", "speaker"], polar: true, goal: "explorer", mission: "Construis un explorateur complet : il roule, s'arrête devant un obstacle, et alors la lampe s'allume et le haut-parleur sonne." },
  { id: "p1", band: "b", prog: true, need: ["button", "led"], title: "Mon premier programme", tray: ["battery", "button", "led"], polar: false, goal: "pbtn", mission: "Cette fois, TU écris le programme du cerveau ! Branche le bouton (entrée) et la lampe (sortie), puis dis au cerveau : quand on appuie sur le bouton, allume la lampe.", progHint: "Touche le bloc « si », choisis « le bouton est appuyé », puis ajoute « allumer la lampe » dans « alors »." },
  { id: "p2", band: "b", prog: true, need: ["dist", "motor"], title: "Le robot prudent", tray: ["battery", "motor", "dist"], polar: false, goal: "psafe", mission: "Écris le programme d'un robot prudent : les roues tournent, sauf si un obstacle est proche. Rappelle-toi : sans ordre, les roues restent arrêtées.", progHint: "Essaie « si chemin libre » puis « faire rouler les roues ». Ou bien : « faire rouler les roues », puis « si obstacle proche » → « arrêter les roues »." },
  { id: "p3", band: "b", prog: true, need: ["led"], title: "La lampe qui clignote", tray: ["battery", "led"], polar: false, goal: "pblink", mission: "Fais clignoter la lampe ! Le cerveau reçoit un « tic » une fois sur deux, toutes les demi-secondes : un tic, pas de tic, un tic… Utilise-le pour allumer la lampe.", progHint: "Mets « si c'est un tic » puis « allumer la lampe ». Quand ce n'est pas un tic, tout est éteint tout seul." },
  { id: "p4", band: "c", prog: true, need: ["dist", "light", "motor", "led"], title: "Deux capteurs", tray: ["battery", "dist", "light", "motor", "led"], polar: true, goal: "ptwo", mission: "Les roues tournent seulement s'il fait clair ET que le chemin est libre. La lampe s'allume quand il fait sombre. Tu peux mettre un « si » dans un autre « si ».", progHint: "Un « si il fait clair » qui contient un « si chemin libre » → rouler. Puis un autre « si il fait sombre » → allumer la lampe." },
  { id: "p5", band: "c", prog: true, need: ["dist", "led", "speaker"], title: "Alarme à deux niveaux", tray: ["battery", "dist", "led", "speaker"], polar: true, goal: "palarm2", mission: "Obstacle proche (moins de 20 cm) : la lampe s'allume. Obstacle TRÈS proche (moins de 8 cm) : en plus, le haut-parleur sonne.", progHint: "« si obstacle proche » → allumer la lampe, et dedans un autre « si obstacle très proche » → faire sonner." },
  { id: "m1", band: "b", prog: true, mem: true, need: ["button", "led"], title: "Un bouton, deux ordres", tray: ["battery", "button", "led"], polar: false, goal: "pmem1", mission: "Un seul bouton pour allumer ET éteindre ! Il te faut la mémoire 📝 : une petite boîte qui retient OUI ou NON, même quand tu relâches le bouton. Un appui change la mémoire, et la lampe suit la mémoire.", progHint: "« si le bouton vient d'être appuyé » → « changer la mémoire ». Puis un autre « si la mémoire dit OUI » → « allumer la lampe »." },
  { id: "m2", band: "c", prog: true, mem: true, need: ["dist", "button", "led"], title: "L'alarme qui se souvient", tray: ["battery", "dist", "button", "led"], polar: true, goal: "pmem2", mission: "Si un obstacle passe à moins de 20 cm, la lampe s'allume et RESTE allumée, même quand l'obstacle est parti. Le bouton efface la mémoire et éteint la lampe.", progHint: "« si obstacle proche » → « retenir : OUI ». « si le bouton est appuyé » → « retenir : NON ». « si la mémoire dit OUI » → « allumer la lampe »." },
  { id: "e9", band: "abc", title: "Carte libre", tray: ["battery", "motor", "led", "speaker", "dist", "light", "button"], polar: false, goal: null, mission: "Carte libre : assemble ce que tu veux et regarde ce que fait ton robot. Tu peux aussi choisir l'énergie avec + et − (mode avancé)." }
];


// ----- vérification des programmes : plusieurs situations, comme un mini-test -----
const BASE = { dist: 100, light: 90, pressed: false, t: 0 };
const dcase = (v, want) => ({ label: `Un obstacle est à ${v} cm`, inp: { dist: v }, want });
export const PROG_CASES = {
  pbtn: [{ label: "Le bouton n'est pas appuyé", inp: { pressed: false }, want: { led: false } }, { label: "Tu appuies sur le bouton", inp: { pressed: true }, want: { led: true } }, { label: "Tu relâches le bouton", inp: { pressed: false }, want: { led: false } }],
  psafe: [100, 60, 30, 19, 10, 0].map(v => dcase(v, { motor: v >= 20 })),
  ptwo: [],
  pblink: [0, 1, 2, 3, 4, 5].map(t => ({ label: `Tour n°${t + 1} (${t % 2 === 0 ? "tic" : "pas de tic"})`, inp: { t }, toggle: "led" })),
  pmem1: [["Au départ", false, false], ["Tu appuies une fois", true, true], ["Tu gardes le doigt appuyé", true, true], ["Tu relâches le bouton", false, true], ["Tu appuies encore", true, false], ["Tu relâches", false, false], ["Un troisième appui", true, true]].map(([label, p, led]) => ({ label, inp: { pressed: p }, want: { led } })),
  pmem2: [["Rien à l'horizon", 100, false, false], ["Un obstacle passe à 10 cm", 10, false, true], ["L'obstacle est parti : la lampe s'en souvient", 100, false, true], ["Tu appuies sur le bouton pour effacer", 100, true, false], ["Tu relâches le bouton", 100, false, false], ["Un autre obstacle à 15 cm", 15, false, true]].map(([label, d, p, led]) => ({ label, inp: { dist: d, pressed: p }, want: { led } })),
  pexp: [["Il fait grand jour", { light: 90, t: 0 }, { led: false, speaker: false }], ["La nuit tombe : tic", { light: 10, t: 0 }, { led: true, speaker: false }], ["La nuit : pas de tic", { light: 10, t: 1 }, { led: false }], ["La nuit : tic", { light: 10, t: 2 }, { led: true }], ["Le jour revient", { light: 80, t: 2 }, { led: false }], ["Un obstacle très proche en plein jour", { light: 80, t: 3, dist: 5 }, { speaker: true, led: false }], ["L'obstacle s'éloigne", { light: 80, t: 3, dist: 60 }, { speaker: false }], ["Nuit et obstacle très proche : tic", { light: 10, t: 4, dist: 6 }, { led: true, speaker: true }]].map(([label, inp, want]) => ({ label, inp, want })),
  pjexplorateur: [["Plein jour, chemin libre", { light: 90, dist: 100, t: 0 }, { motor: true, led: false, speaker: false }], ["Un obstacle à 15 cm", { dist: 15, t: 0 }, { motor: false, led: true, speaker: false }], ["Un obstacle à 5 cm", { dist: 5, t: 0 }, { motor: false, led: true, speaker: true }], ["L'obstacle disparaît", { dist: 100, t: 0 }, { motor: true, led: false, speaker: false }], ["Il fait sombre : tic", { light: 10, t: 0 }, { motor: false, led: true }], ["Il fait sombre : pas de tic", { light: 10, t: 1 }, { motor: false, led: false, speaker: false }], ["Sombre et obstacle à 15 cm : pas de tic", { light: 10, dist: 15, t: 3 }, { motor: false, led: false, speaker: false }], ["Sombre et obstacle à 5 cm", { light: 10, dist: 5, t: 3 }, { motor: false, speaker: true }], ["Le jour revient", { light: 90, dist: 100, t: 4 }, { motor: true, led: false, speaker: false }]].map(([label, inp, want]) => ({ label, inp, want })),
  pjgardien: [["Il veille : tic", { t: 0 }, { led: true, speaker: false }], ["Il veille : pas de tic", { t: 1 }, { led: false, speaker: false }], ["Il veille : tic", { t: 2 }, { led: true, speaker: false }], ["Un intrus passe à 15 cm", { t: 3, dist: 15 }, { led: true, speaker: true }], ["L'intrus s'enfuit : l'alarme continue", { t: 4, dist: 100 }, { led: true, speaker: true }], ["L'alarme continue, sans tic", { t: 5 }, { led: true, speaker: true }], ["Le propriétaire appuie sur le bouton", { t: 7, pressed: true }, { led: false, speaker: false }], ["Il relâche le bouton : retour à la veille", { t: 8 }, { led: true, speaker: false }], ["Il veille à nouveau : pas de tic", { t: 9 }, { led: false, speaker: false }], ["Un deuxième intrus à 10 cm", { t: 10, dist: 10 }, { led: true, speaker: true }]].map(([label, inp, want]) => ({ label, inp, want })),
  palarm2: [100, 40, 20, 19, 10, 8, 7, 0].map(v => dcase(v, { led: v < 20, speaker: v < 8 }))
};
// deux capteurs : 6 situations (lumière, distance)
PROG_CASES.ptwo = [[90, 50], [90, 10], [10, 50], [10, 10], [36, 50], [34, 50]].map(([l, d]) => ({ label: `${l >= 35 ? "Il fait clair" : "Il fait sombre"}, obstacle à ${d} cm`, inp: { light: l, dist: d }, want: { motor: l >= 35 && d >= 20, led: l < 35 } }));
const OUTWORD = { motor: [" les roues tournent", " les roues sont arrêtées"], led: [" la lampe est allumée", " la lampe est éteinte"], speaker: [" le haut-parleur sonne", " le haut-parleur est silencieux"] };
export const describeOut = (o, keys) => keys.map(k => OUTWORD[k][o[k] ? 0 : 1].trim()).join(", ");
export function checkProg(level, st) {
  const cases = PROG_CASES[level.goal] || [], rows = []; let prev = null, mem = false, pp = false;
  for (const c of cases) {
    const inp = { ...BASE, ...c.inp, mem, prev: pp }, ev = evaluate(st, inp), got = ev.out, row = { label: c.label, inp, want: c.want, got, ok: true, trace: ev.trace };
    mem = ev.nextMem; pp = inp.pressed;
    if (c.toggle) { row.ok = !prev || got[c.toggle] !== prev[c.toggle]; row.why = "la lampe doit changer à chaque tour"; row.keys = [c.toggle]; } else { row.keys = Object.keys(c.want); row.ok = row.keys.every(k => got[k] === c.want[k]); }
    prev = got; rows.push(row);
  }
  const e0 = evaluate(st), ready = e0.powered && (level.need || []).every(k => e0.wired[k]);
  return { ok: ready && rows.every(r => r.ok), ready, rows };
}

// tests automatiques (balayage) pour les objectifs qui demandent de vérifier un comportement
export function sweep(st, kind) {
  const res = []; for (let v = 100; v >= 0; v -= 10) res.push({ v, ...evaluate(st, kind === "dist" ? { dist: v, light: 90, pressed: false } : { dist: 100, light: v, pressed: false }).out });
  return res;
}
export function goalReached(level, st) {
  const ev = evaluate(st);
  switch (level.goal) {
    case "power": return ev.powered;
    case "motor": return ev.out.motor;
    case "led": return ev.out.led;
    case "wired": return ev.powered && (level.need || []).every(k => ev.wired[k]);
    case "stopnear": { if (!ev.powered || !ev.wired.dist || !ev.wired.motor) return false; const s = sweep(st, "dist"); return s.filter(x => x.v >= 30).every(x => x.motor) && s.filter(x => x.v < 20).every(x => !x.motor); }
    case "night": { if (!ev.powered || !ev.wired.light || !ev.wired.led) return false; const s = sweep(st, "light"); return s.filter(x => x.v >= 40).every(x => !x.led) && s.filter(x => x.v < 30).every(x => x.led); }
    case "alarm": { if (!ev.powered || !ev.wired.dist || !ev.wired.led || !ev.wired.speaker) return false; const s = sweep(st, "dist"); return s.filter(x => x.v >= 30).every(x => !x.led && !x.speaker) && s.filter(x => x.v < 20).every(x => x.led && x.speaker); }
    case "explorer": { if (!ev.powered || !ev.wired.dist || !ev.wired.motor || !ev.wired.led || !ev.wired.speaker) return false; const s = sweep(st, "dist"); return s.filter(x => x.v >= 30).every(x => x.motor && !x.led && !x.speaker) && s.filter(x => x.v < 20).every(x => !x.motor && x.led && x.speaker); }
    default: return PROG_CASES[level.goal] ? checkProg(level, st).ok : false;
  }
}
// indice : la prochaine chose à faire
export function nextHint(level, st) {
  const ev = evaluate(st), need = level.tray, placed = k => ev.has(k), linked = (a, b) => st.wires.some(w => (w[0] === a && w[1] === b) || (w[0] === b && w[1] === a));
  if (!placed("battery")) return "Commence par l'énergie : touche la batterie 🔋 dans le tiroir en bas pour la placer sur la carte.";
  if (!ev.powered) return ev.reversed ? "Tes fils + et − sont inversés. Débranche-les (touche un point) et relie + avec +, − avec −." : st.polar ? "Relie les deux points rouge (+) puis noir (−) de la batterie à ceux du cerveau." : "Relie le point rouge de la batterie au point rouge du cerveau : touche l'un, puis l'autre.";
  const missing = need.find(k => k !== "battery" && !placed(k)); if (missing) return `Place ${COMP[missing].nom} ${COMP[missing].icon} sur la carte.`;
  for (const k of need) { if (k === "battery") continue; const c = COMP[k]; const wired = c.cat === "sen" ? ev.wired[k] : ev.wired[k]; if (!wired) return c.cat === "sen" ? `Relie ${c.nom} à une ENTRÉE du cerveau (point bleu) : le capteur envoie l'information au cerveau.` : `Relie ${c.nom} à une SORTIE du cerveau (point vert) : le cerveau lui donne des ordres.`; }
  if (level.prog) return progSize(st) ? "Ton programme est écrit ! Appuie sur « ▶ Tester mon programme » pour vérifier." : level.progHint;
  return "Tout est branché ! Appuie sur « Tester le robot » pour vérifier son comportement.";
}
