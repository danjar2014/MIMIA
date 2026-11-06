// Les petits (3-6 ans) : chaque manche a une seule bonne réponse ; les jours, mois, lettres, couleurs sont justes ; les niveaux des plus grands sont cachés.
const store = {}; globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
import { readFileSync } from "node:fs";
let bad = 0; const t = (n, c, x) => { console.log(n.padEnd(86), c ? "ok" : "BUG " + (x || "")); if (!c) bad++; };
const P = await import("./petits.js"), U = await import("./util.js"), { S } = U;
const src = f => readFileSync("./" + f, "utf8"), app = src("app.js"), sw = src("sw.js");
const rnd = n => Math.floor(Math.random() * n);

t("8 activités aux noms d'un seul mot", P.PETITS.length === 8 && P.PETITS.every(p => !/\s/.test(p[2])), P.PETITS.map(p => p[2]).join());
t("les jours (7) et les mois (12) sont dans l'ordre", P.DAYS.length === 7 && P.DAYS[0] === "lundi" && P.DAYS[6] === "dimanche" && P.MONTHS.length === 12 && P.MONTHS[0] === "janvier" && P.MONTHS[11] === "décembre");
// 300 tirages de chaque activité : une seule bonne réponse, jamais deux réponses identiques
let ok = true, why = "";
const chk = (c, m) => { if (!c && ok) { ok = false; why = m; } };
for (let k = 0; k < 300; k++) for (const id of Object.keys(P.ROUNDS)) {
  const rs = P.ROUNDS[id](rnd);
  for (const r of rs) {
    if (r.type === "quiz") { chk(r.options.length === 3 && r.options.filter(o => o.ok).length === 1, id + " : une seule bonne réponse"); chk(new Set(r.options.map(o => o.label)).size === 3, id + " : réponses toutes différentes"); }
    if (r.type === "seq") chk(r.items.map(i => i.order).sort((a, b) => a - b).every((v, i) => v === i), id + " : ordre complet");
    if (r.type === "match") chk(r.left.length === r.right.length && r.left.every(l => r.right.filter(x => x.k === l.k).length === 1), id + " : chaque objet a son ombre");
  }
}
t("manches : une seule bonne réponse, réponses différentes, ordre et paires complets", ok, why);
t("5 manches (chiffres, lettres, couleurs, espace), 4 (jours, mois), 3 (relier)", ["chiffres", "lettres", "couleurs", "espace"].every(i => P.ROUNDS[i](rnd).length === 5) && P.ROUNDS.jours(rnd).length === 4 && P.ROUNDS.mois(rnd).length === 4 && P.ROUNDS.relier(rnd).length === 3);
// chiffres : le nombre d'objets affichés est la bonne réponse
let cOk = true; for (let k = 0; k < 300; k++) { const r = P.countRound(rnd, 9), n = (r.show.match(/<i>/g) || []).length, right = r.options.find(o => o.ok); if (+right.html !== n || right.label !== P.NUMS[n]) cOk = false; }
t("chiffres : la bonne réponse est bien le nombre d'objets", cOk);
// lettres : la lettre correspond au mot
let lOk = true; for (let k = 0; k < 300; k++) { const r = P.letterRound(rnd), w = P.LETTER_OBJ.find(x => x[2] === r.L); if (!w || !r.say.includes(`lettre ${r.L}, comme ${w[1]}`) || r.options.find(o => o.ok).html !== r.L) lOk = false; }
t("lettres : « R comme robot » — la lettre correspond au mot", lOk);
t("lettres : les 5 manches utilisent 5 mots différents", (() => { for (let k = 0; k < 100; k++) { const L = P.ROUNDS.lettres(rnd).map(r => r.L); if (new Set(L).size !== 5) return false; } return true; })());
// jours et mois : le bon jour suit
let dOk = true; for (let k = 0; k < 300; k++) { const r = P.dayRound(rnd), d = P.DAYS.find(x => r.say.includes(" après " + x + " ")), right = r.options.find(o => o.ok).label; if (P.DAYS[P.DAYS.indexOf(d) + 1] !== right || r.options.some(o => o.label === d)) dOk = false; const m = P.monthRound(rnd), mm = P.MONTHS.find(x => m.say.includes(" après " + x + " ")); if (P.MONTHS[P.MONTHS.indexOf(mm) + 1] !== m.options.find(o => o.ok).label) dOk = false; }
t("jours et mois : « après mardi » → mercredi, jamais le jour donné en réponse", dOk);
// couleurs : le robot demandé a la bonne couleur
let cc = true; for (let k = 0; k < 200; k++) { const r = P.colorRound(rnd), name = r.say.replace("Touche le robot ", "").replace(".", ""), hex = P.COLORS.find(c => c[0] === name)[1], right = r.options.find(o => o.ok); if (!right.html.includes(hex) || right.name !== name) cc = false; }
t("couleurs : le robot demandé a bien cette couleur", cc);
let pOk = true; for (let k = 0; k < 200; k++) { const r = P.positionRound(rnd); if (!r.show.includes(r.side) || !r.options.find(o => o.ok).label) pOk = false; }
t("espace : la fusée est vraiment en haut / en bas / à gauche / à droite", pOk);
// les phrases à enregistrer couvrent toutes les consignes possibles
const phr = new Set(P.petitsPhrases()); let cover = true, miss = "";
for (let k = 0; k < 300; k++) for (const id of Object.keys(P.ROUNDS)) for (const r of P.ROUNDS[id](rnd)) if (!phr.has(r.say)) { cover = false; miss = r.say; }
t("toutes les consignes des activités sont dans la liste des phrases à enregistrer", cover, miss);

// intégration : âge 3-6 ans, accueil des petits, voix complète, parents
const ps = src("parentsetup.js");
t("l'âge « 3 – 6 ans » existe pour les parents (profil et joueurs)", /\["z", "3 – 6 ans/.test(ps) && /S\.age === "z"\) \{ S\.placed = true/.test(ps));
t("les petits : accueil de gros mots-icônes, pas de parcours de programmation", /if \(S\.age === "z"\) return littleHome\(body, esc\)/.test(app) && /function littleHome/.test(app));
t("les petits : la voix lit tout ce qu'on touche (ils ne lisent pas encore)", U.VOICE_BY_AGE.z === "complet");
t("les petits : les parents peuvent bloquer chaque activité", /cardNamesFor/.test(app) && /\["Montessori", \.\.\.PETITS\.map\(p => p\[2\]\), "Puzzle", "Mon robot"\]/.test(app));
t("petits.js connu du service worker", /petits\.js/.test(sw));
const pz = await import("./puzzle.js"); t("puzzle des petits : 2×2", pz.SIZES.z === 2);

// les niveaux des plus grands sont cachés
const PC = await import("./parcours.js"); S.age = "a"; const stepsA = PC.RANKS.flatMap(r => r.steps), hasB = stepsA.some(s => PC.bandOfStep(s) !== "a");
t("6-8 ans : le parcours ne montre aucune étape réservée aux plus grands", !hasB && stepsA.length > 10, stepsA.length + " étapes");
S.age = "b"; const stepsB = PC.RANKS.flatMap(r => r.steps); t("8-10 ans : jamais d'étape 10-12 ans, mais plus d'étapes qu'à 6-8 ans", stepsB.every(s => PC.bandOfStep(s) !== "c") && stepsB.length > stepsA.length);
S.age = "c"; const stepsC = PC.RANKS.flatMap(r => r.steps); t("10-12 ans : tout le parcours", stepsC.length > stepsB.length && stepsC.length === PC.RANKS.reduce((n, r) => n + r.allSteps.length, 0));
S.age = ""; t("âge non renseigné : tout est visible", PC.RANKS.flatMap(r => r.steps).length === stepsC.length);
t("menus : les niveaux, le code, la construction et « Plus loin » sont filtrés par âge", (app.match(/okBand\(/g) || []).length >= 8 && /\.\.\.\(age === "a" \? \[\] : \[tile\("rocket", "Plus loin"/.test(app));
console.log(bad ? "PROBLEMES: " + bad : "LES PETITS FONCTIONNENT");
