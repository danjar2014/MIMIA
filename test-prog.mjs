import { newState, canConnect, evaluate, BUILD, goalReached, checkProg, nextHint, describeOut, progSpeech } from "./boardlogic.js";
const lvl = id => BUILD.find(l => l.id === id);
const NP = [["B.pwr", "BR.pwr"]], P = [["B.pp", "BR.pp"], ["B.pm", "BR.pm"]];
function build(level, placed, wires, prog) { const st = newState(level.polar, level.prog); for (const [s, k] of placed) st.slots[s] = k; for (const [a, b] of wires) { const c = canConnect(st, a, b); if (!c.ok) throw new Error(a + "-" + b + ": " + c.why); st.wires.push([a, b]); } st.prog = { main: prog, fn: [] }; return st; }
const IF = (cond, body, els = []) => ({ t: "if", cond, body, else: els }), A = t => ({ t });
let bad = 0; const t = (n, c) => { console.log(n.padEnd(64), c ? "ok" : "BUG"); if (!c) bad++; };
const hw = { p1: [[["B", "battery"], ["S1", "button"], ["A1", "led"]], [...NP, ["S1.out", "BR.in1"], ["A1.in", "BR.out1"]]],
  p2: [[["B", "battery"], ["S1", "dist"], ["A1", "motor"]], [...NP, ["S1.out", "BR.in1"], ["A1.in", "BR.out1"]]],
  p3: [[["B", "battery"], ["A1", "led"]], [...NP, ["A1.in", "BR.out1"]]],
  p4: [[["B", "battery"], ["S1", "dist"], ["S2", "light"], ["A1", "motor"], ["A2", "led"]], [...P, ["S1.out", "BR.in1"], ["S2.out", "BR.in2"], ["A1.in", "BR.out1"], ["A2.in", "BR.out2"]]],
  p5: [[["B", "battery"], ["S1", "dist"], ["A1", "led"], ["A2", "speaker"]], [...P, ["S1.out", "BR.in1"], ["A1.in", "BR.out1"], ["A2.in", "BR.out2"]]] };
const prog = { p1: [IF("pressed", [A("lon")])], p2: [IF("far", [A("mon")])], p3: [IF("tic", [A("lon")])],
  p4: [IF("bright", [IF("far", [A("mon")])]), IF("dark", [A("lon")])], p5: [IF("near", [A("lon"), IF("vnear", [A("son")])])] };
const mk = (id, p = prog[id]) => build(lvl(id), hw[id][0], hw[id][1], p);
for (const id of Object.keys(prog)) t(id + " " + lvl(id).title + " : solution réussie", goalReached(lvl(id), mk(id)));
// autres solutions valables
t("p2 variante : rouler puis arrêter si proche", goalReached(lvl("p2"), mk("p2", [A("mon"), IF("near", [A("moff")])])));
t("p1 variante : avec un « sinon » éteindre", goalReached(lvl("p1"), mk("p1", [IF("pressed", [A("lon")], [A("loff")])])));
t("p3 variante : sinon allumer avec phase inverse", goalReached(lvl("p3"), mk("p3", [IF("tic", [A("loff")], [A("lon")])])));
t("p5 variante : deux « si » séparés", goalReached(lvl("p5"), mk("p5", [IF("near", [A("lon")]), IF("vnear", [A("son")])])));
// erreurs typiques
t("p1 programme vide : échec", !goalReached(lvl("p1"), mk("p1", [])));
t("p1 lampe toujours allumée : échec (cas « pas appuyé »)", !goalReached(lvl("p1"), mk("p1", [A("lon")])));
t("p1 condition inversée : échec", !goalReached(lvl("p1"), mk("p1", [IF("released", [A("lon")])])));
t("p2 roues toujours en marche : échec", !goalReached(lvl("p2"), mk("p2", [A("mon")])));
t("p2 « obstacle proche » → rouler (à l'envers) : échec", !goalReached(lvl("p2"), mk("p2", [IF("near", [A("mon")])])));
t("p3 lampe fixe : échec", !goalReached(lvl("p3"), mk("p3", [A("lon")])));
t("p4 sans le « si il fait clair » : échec", !goalReached(lvl("p4"), mk("p4", [IF("far", [A("mon")]), IF("dark", [A("lon")])])));
t("p5 lampe et haut-parleur au même seuil : échec", !goalReached(lvl("p5"), mk("p5", [IF("near", [A("lon"), A("son")])])));
// câblage
const noWire = build(lvl("p1"), hw.p1[0], [...NP, ["A1.in", "BR.out1"]], prog.p1);
t("p1 bouton non relié : échec + avertissement", !goalReached(lvl("p1"), noWire) && evaluate(noWire).rules.some(r => /Bouton/.test(r) && /pas relié/.test(r)));
const nopow = build(lvl("p1"), hw.p1[0], [["S1.out", "BR.in1"], ["A1.in", "BR.out1"]], prog.p1);
t("p1 sans énergie : le programme ne s'exécute pas", !evaluate(nopow, { pressed: true }).out.led && !goalReached(lvl("p1"), nopow));
const absent = build(lvl("p2"), [["B", "battery"], ["A1", "motor"]], [...NP, ["A1.in", "BR.out1"]], prog.p2);
t("p2 capteur absent de la carte : message « pas posé »", evaluate(absent).rules.some(r => /pas posé/.test(r)));
// comportement en direct
const e = mk("p2"); t("p2 en direct : 50 cm roule, 10 cm arrêté", evaluate(e, { dist: 50 }).out.motor && !evaluate(e, { dist: 10 }).out.motor);
t("blocs lus mis en évidence (trace)", evaluate(mk("p5"), { dist: 5 }).trace.length === 4 && evaluate(mk("p5"), { dist: 50 }).trace.length === 1);
const r = checkProg(lvl("p2"), mk("p2", [A("mon")])).rows.find(x => !x.ok);
t("message d'erreur : premier cas raté décrit", r && /obstacle/.test(r.label) && /arrêtées/.test(describeOut(r.got, r.keys)) === false && /roues/.test(describeOut(r.got, r.keys)));
t("indice sans programme", /si/.test(nextHint(lvl("p1"), mk("p1", []))) && /Tester mon programme/.test(nextHint(lvl("p1"), mk("p1"))));
// compatibilité : les niveaux d'avant marchent toujours
t("e8 explorateur (mode automatique) toujours bon", goalReached(lvl("e8"), (() => { const s = newState(true); Object.assign(s.slots, { B: "battery", S1: "dist", A1: "motor", A2: "led", A3: "speaker" }); s.wires.push(["B.pp", "BR.pp"], ["B.pm", "BR.pm"], ["S1.out", "BR.in1"], ["A1.in", "BR.out1"], ["A2.in", "BR.out2"], ["A3.in", "BR.out3"]); return s; })()));
// ----- mémoire -----
hw.m1 = hw.p1; hw.m2 = [[["B", "battery"], ["S1", "dist"], ["S2", "button"], ["A1", "led"]], [...P, ["S1.out", "BR.in1"], ["S2.out", "BR.in2"], ["A1.in", "BR.out1"]]];
const m1 = [IF("just", [A("mflip")]), IF("memyes", [A("lon")])], m2 = [IF("near", [A("mset1")]), IF("pressed", [A("mset0")]), IF("memyes", [A("lon")])];
t("m1 Un bouton, deux ordres : solution réussie", goalReached(lvl("m1"), mk("m1", m1)));
t("m2 L'alarme qui se souvient : solution réussie", goalReached(lvl("m2"), mk("m2", m2)));
t("m2 variante : effacer d'abord, puis retenir", goalReached(lvl("m2"), mk("m2", [IF("pressed", [A("mset0")]), IF("near", [A("mset1")]), IF("memyes", [A("lon")])])));
t("m1 sans mémoire (lampe suit le bouton) : échec", !goalReached(lvl("m1"), mk("m1", [IF("pressed", [A("lon")])])));
t("m1 « appuyé » au lieu de « vient d'être appuyé » : échec", !goalReached(lvl("m1"), mk("m1", [IF("pressed", [A("mflip")]), IF("memyes", [A("lon")])])));
t("m1 mémoire jamais lue : échec", !goalReached(lvl("m1"), mk("m1", [IF("just", [A("mflip")])])));
t("m2 sans mémoire (lampe suit l'obstacle) : échec", !goalReached(lvl("m2"), mk("m2", [IF("near", [A("lon")])])));
t("m2 sans effacement par le bouton : échec", !goalReached(lvl("m2"), mk("m2", [IF("near", [A("mset1")]), IF("memyes", [A("lon")])])));
t("m1 est une vraie séquence : 2e appui éteint", (() => { const r = checkProg(lvl("m1"), mk("m1", m1)).rows; return r[1].got.led && r[3].got.led && !r[4].got.led; })());
t("mémoire en direct : l'état change d'un tour à l'autre", (() => { const s = mk("m1", m1); const e1 = evaluate(s, { pressed: true, prev: false, mem: false }); const e2 = evaluate(s, { pressed: true, prev: true, mem: e1.nextMem }); return e1.nextMem === true && e2.nextMem === true && e1.out.led; })());
t("lecture du programme à voix haute (phrases)", /Si le bouton vient d'être appuyé, alors changer la mémoire/i.test(progSpeech(mk("m1", m1))) && /vide/.test(progSpeech(mk("m1", []))));
console.log(bad ? "PROBLEMES: " + bad : "PROGRAMMATION DU CERVEAU OK");
