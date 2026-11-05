// Les indices s'adaptent au programme de l'enfant (et marchent sans solution écrite, comme « Dessine ton parcours »).
import { LEVELS } from "./levels.js";
import { shortestProgram, simulate, hintFor, hintStage, referenceOps, describeOps } from "./hints.js";
import { parseScenario } from "./scenario.js";
let bad = 0; const t = (n, c, x) => { console.log(n.padEnd(82), c ? "ok" : "BUG " + (x || "")); if (!c) bad++; };
const L = ops => ({ main: ops.map(o => ({ t: o })), fn: [] });
const first = lv => { const s = lv.scenarios && lv.scenarios[0]; return s ? { map: s.map, dir: s.dir ?? 1 } : { map: lv.map, dir: lv.dir ?? 1 }; };

// 1. le simulateur sans écran donne le même verdict que les solutions écrites à la main
let solvedByHand = 0, okHand = 0, solvedBfs = 0, totalMaps = 0, okBfs = 0;
for (const b of ["a", "b", "c"]) for (const lv of LEVELS[b]) {
  if (!(lv.map || lv.scenarios)) continue; totalMaps++;
  if (lv.sol && !lv.fn) { solvedByHand++; if (simulate(lv, lv.sol).ok) okHand++; }
  const sc = parseScenario(first(lv)), p = shortestProgram(sc, !!lv.auto);
  if (p) { solvedBfs++; if (!(lv.scenarios && lv.scenarios.length > 1) && simulate(lv, L(p)).ok) okBfs++; }
}
t(`les solutions écrites à la main réussissent dans le simulateur (${okHand}/${solvedByHand})`, solvedByHand > 10 && okHand === solvedByHand);
t(`un chemin est trouvé pour chaque carte (${solvedBfs}/${totalMaps})`, solvedBfs === totalMaps, `${solvedBfs}/${totalMaps}`);
t("ce chemin réussit dans le simulateur (cartes à un seul parcours)", okBfs > 10 && okBfs >= solvedBfs - 6, `${okBfs}/${solvedBfs}`);

// 2. un parcours à soi, sans solution écrite
const own = { map: ["R*..", "....", "...F", "...."], dir: 1, auto: true, allow: ["fd", "tl", "tr"] };
t("sans solution écrite : le plus court chemin est calculé", referenceOps(own).length >= 5 && simulate(own, L(referenceOps(own))).ok);
t("carte impossible (drapeau entouré de cailloux) : pas de chemin", shortestProgram(parseScenario({ map: ["R.#F", "..##", "....", "...."], dir: 1 })) === null);
const ownNoAuto = { map: ["R*.F"], dir: 1, auto: false };
t("sans ramassage automatique : le chemin contient « pick »", referenceOps(ownNoAuto).includes("pick") && simulate(ownNoAuto, L(referenceOps(ownNoAuto))).ok);

// 3. les quatre étages d'indice
const lv = { map: ["R...F", "....."], dir: 1, auto: true, allow: ["fd", "tl", "tr"], sol: { main: [{ t: "fd" }, { t: "fd" }, { t: "fd" }, { t: "fd" }], fn: [] } };
const h0 = hintFor(lv, L([]), 0), h1 = hintFor(lv, L([]), 1);
t("étage 1 : où est le but (distance et direction)", /drapeau/.test(h0.text) && /4 cases vers la droite/.test(h0.text), h0.text);
t("programme vide : on commence par le premier bloc", hintStage(L([]), 0) === 0 && /Commence par « avancer »/.test(h1.text), h1.text);
t("un programme déjà écrit passe directement à l'étage « mon programme »", hintStage(L(["fd"]), 0) === 1);
t("les étages montent à chaque appui, puis s'arrêtent à 3", hintStage(L([]), 1) === 1 && hintStage(L([]), 9) === 3);
t("cogne un caillou : il faut tourner avant", /cogne/.test(hintFor({ map: ["R#.F"], dir: 1, auto: true }, L(["fd"]), 1).text));
t("s'arrête trop tôt : dit combien de cases restent", /2 cases du drapeau/.test(hintFor(lv, L(["fd", "fd"]), 1).text), hintFor(lv, L(["fd", "fd"]), 1).text);
t("programme juste : on dit de lancer", /marche déjà/.test(hintFor(lv, L(["fd", "fd", "fd", "fd"]), 1).text));
t("étoile oubliée : on le dit", /étoile/.test(hintFor({ map: ["R*.F"], dir: 1, auto: false }, L(["fd", "fd", "fd"]), 1).text));
t("étage 3 : le bon début est gardé, on propose la suite", /ajoute « avancer »/.test(hintFor(lv, L(["fd", "fd"]), 2).text), hintFor(lv, L(["fd", "fd"]), 2).text);
t("étage 3 : au premier bloc faux, on dit lequel", /Au bloc 1, essaie « avancer »/.test(hintFor(lv, L(["tr"]), 2).text), hintFor(lv, L(["tr"]), 2).text);
t("étage 3 : trop de blocs", /en a trop|il y en a trop/.test(hintFor(lv, L(["fd", "fd", "fd", "fd", "fd"]), 2).text));
t("étage 4 : la solution complète, regroupée (« avancer 4 fois »)", /avancer 4 fois/.test(hintFor(lv, L([]), 3).text));
t("describeOps regroupe les répétitions", describeOps(["fd", "fd", "tr", "fd"]) === "avancer 2 fois, tourner à droite, avancer");
t("boucle infinie (tant que le chemin est libre, sans rien faire) : on parle de la boucle", /boucle/.test(hintFor({ map: ["R...F"], dir: 1, auto: true }, { main: [{ t: "while", cond: "libre", body: [] }], fn: [] }, 1).text), hintFor({ map: ["R...F"], dir: 1, auto: true }, { main: [{ t: "while", cond: "libre", body: [] }], fn: [] }, 1).text);
t("chaque indice a une version parlée sans emoji", [h0, h1].every(h => !/[🏁⭐💡]/u.test(h.say)), h0.say);
t("jamais d'erreur, sur tous les niveaux, à tous les étages", (() => { try { for (const b of ["a", "b", "c"]) for (const l of LEVELS[b]) if (l.map || l.scenarios) for (let s = 0; s < 4; s++) { hintFor(l, L([]), s); hintFor(l, L(["fd", "tr"]), s); } return true; } catch (e) { console.log(e.stack); return false; } })());
console.log(bad ? "PROBLEMES: " + bad : "LES INDICES S'ADAPTENT");
