import { newState, canConnect, evaluate, BUILD, goalReached, nextHint, wireOf } from "./boardlogic.js";
const lvl = id => BUILD.find(l => l.id === id);
function build(level, placeList, wires) { const st = newState(level.polar, level.prog); for (const [slot, kind] of placeList) st.slots[slot] = kind; for (const [a, b] of wires) { const c = canConnect(st, a, b); if (!c.ok) throw new Error("refus " + a + "-" + b + ": " + c.why); st.wires.push([a, b]); } return st; }
const NP = [["B.pwr", "BR.pwr"]], P = [["B.pp", "BR.pp"], ["B.pm", "BR.pm"]];
const sol = {
  e1: () => build(lvl("e1"), [["B", "battery"]], NP),
  e2: () => build(lvl("e2"), [["B", "battery"], ["A1", "motor"]], [...NP, ["A1.in", "BR.out1"]]),
  e3: () => build(lvl("e3"), [["B", "battery"], ["A2", "led"]], [...NP, ["A2.in", "BR.out2"]]),
  e4: () => build(lvl("e4"), [["B", "battery"], ["A1", "motor"], ["S1", "dist"]], [...NP, ["A1.in", "BR.out1"], ["S1.out", "BR.in1"]]),
  e5: () => build(lvl("e5"), [["B", "battery"], ["A1", "led"], ["S2", "light"]], [...NP, ["A1.in", "BR.out3"], ["S2.out", "BR.in2"]]),
  e6: () => build(lvl("e6"), [["B", "battery"], ["S1", "dist"], ["A1", "speaker"], ["A2", "led"]], [...NP, ["S1.out", "BR.in1"], ["A1.in", "BR.out1"], ["A2.in", "BR.out2"]]),
  e7: () => build(lvl("e7"), [["B", "battery"], ["A1", "led"]], [...P, ["A1.in", "BR.out1"]]),
  e8: () => build(lvl("e8"), [["B", "battery"], ["S1", "dist"], ["A1", "motor"], ["A2", "led"], ["A3", "speaker"]], [...P, ["S1.out", "BR.in1"], ["A1.in", "BR.out1"], ["A2.in", "BR.out2"], ["A3.in", "BR.out3"]])
};
let bad = 0;
for (const [id, f] of Object.entries(sol)) { const ok = goalReached(lvl(id), f()); if (!ok) bad++; console.log(id, lvl(id).title.padEnd(22), ok ? "OK" : "ECHEC"); }
// erreurs typiques
const t = (name, cond) => { console.log(name.padEnd(58), cond ? "ok" : "BUG"); if (!cond) bad++; };
let st = newState(false); st.slots.B = "battery"; st.slots.S1 = "dist";
t("capteur branché sur une sortie : refusé", !canConnect(st, "S1.out", "BR.out1").ok);
t("capteur sur l'énergie : refusé", !canConnect(st, "S1.out", "BR.pwr").ok);
st.slots.A1 = "motor"; t("moteur sur une entrée : refusé", !canConnect(st, "A1.in", "BR.in1").ok);
t("batterie sans fil : pas d'énergie", !evaluate(st).powered);
// double fil sur le même point
const s2 = build(lvl("e2"), [["B", "battery"], ["A1", "motor"]], NP); t("second fil sur un point déjà pris : refusé", !canConnect(s2, "B.pwr", "BR.pwr").ok);
// polarité inversée
let sp = newState(true); sp.slots.B = "battery"; sp.slots.A1 = "led"; for (const w of [["B.pp", "BR.pm"], ["B.pm", "BR.pp"]]) { const c = canConnect(sp, ...w); if (c.ok && c.reversed) sp.wires.push(w); }
t("fils + et − inversés : refusé comme énergie + avertissement", !evaluate(sp).powered && evaluate(sp).reversed);
// niveau e4 sans capteur : les roues ne s'arrêtent pas -> objectif non atteint
const s4 = build(lvl("e4"), [["B", "battery"], ["A1", "motor"]], [...NP, ["A1.in", "BR.out1"]]); t("e4 sans capteur de distance : objectif non atteint", !goalReached(lvl("e4"), s4));
// e5 : capteur placé mais pas relié
const s5 = build(lvl("e5"), [["B", "battery"], ["A1", "led"], ["S2", "light"]], [...NP, ["A1.in", "BR.out3"]]); t("e5 capteur non relié : objectif non atteint", !goalReached(lvl("e5"), s5));
t("indice sans batterie", /batterie/.test(nextHint(lvl("e1"), newState(false))));
t("indice capteur à relier", /ENTRÉE/.test(nextHint(lvl("e4"), s4.slots.S1 ? s4 : (() => { const q = build(lvl("e4"), [["B", "battery"], ["A1", "motor"], ["S1", "dist"]], [...NP, ["A1.in", "BR.out1"]]); return q; })())));
console.log(bad ? "PROBLEMES: " + bad : "LOGIQUE DE LA CARTE OK");
