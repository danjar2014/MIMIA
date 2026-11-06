// Le coin Montessori (3-6 ans) : 16 catégories, chaque jeu génère des manches valides (une seule bonne réponse, réponses distinctes, ordre / paires cohérents).
const store = {}; globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
import { readFileSync } from "node:fs";
let bad = 0; const t = (n, c, x) => { console.log(n.padEnd(88), c ? "ok" : "BUG " + (x || "")); if (!c) bad++; };
const M = await import("./montessori.js"), P = await import("./petits.js");
const src = f => readFileSync("./" + f, "utf8");
const rnd = n => Math.floor(Math.random() * n);

t("16 catégories comme sur iwawa", M.CATEGORIES.length === 16 && M.CATEGORIES.map(c => c.id).join() === "geometrie,tour-rose,couleurs,triangles,poids,sons,chiffres,fractions,barres,cent,decimal,dizaines,barres-num,addition,soustraction,horloge", M.CATEGORIES.map(c => c.id).join());
t("chaque catégorie a au moins 4 jeux (6 pour la plupart)", M.CATEGORIES.every(c => c.games.length >= 4) && M.CATEGORIES.filter(c => c.games.length === 6).length >= 14, M.CATEGORIES.map(c => c.games.length).join());
const ids = M.GAMES.map(g => g.id); t("tous les jeux ont un identifiant unique, un titre, une icône", new Set(ids).size === ids.length && M.GAMES.every(g => g.title && g.icon) && M.GAMES.length >= 90, String(M.GAMES.length));
t("on retrouve les jeux d'iwawa (formes, tour rose, horloge, soustraction…)", ["formes-calines", "memoire-formes", "construire-tour", "tir-ballons", "devine-qui", "partager", "parts-egales", "plus-longue", "perles", "payer", "casse-oeuf", "poisson-rouge-bleu", "combien-poissons", "quelle-heure", "tic-tac"].every(id => M.gameById(id)));

const phr = new Set(M.montessoriPhrases()), allPhr = new Set([...phr, ...P.petitsPhrases()]);
for (const g of M.GAMES) {
  if (g.rounds === "puzzle") continue;
  let ok = true, why = "", miss = "";
  for (let k = 0; k < 150; k++) {
    const rs = g.rounds(rnd); if (!rs.length) { ok = false; why = "aucune manche"; break; }
    for (const r of rs) {
      if (!allPhr.has(r.say)) { miss = r.say; }
      if (r.type === "quiz") { const okc = r.options.filter(o => o.ok).length; if (okc !== 1) { ok = false; why = "bonnes réponses: " + okc; } if (r.options.length < 2 || r.options.length > 4) { ok = false; why = "nombre d'options " + r.options.length; } if (r.odd) { if (new Set(r.options.map(o => o.html)).size !== 2 || r.options.filter(o => o.html === r.options.find(x => x.ok).html).length !== 1) { ok = false; why = "un seul intrus"; } } else if (new Set(r.options.map(o => o.html)).size !== r.options.length) { ok = false; why = "options identiques"; } if (r.options.some(o => !o.html || !o.label)) { ok = false; why = "option vide"; } }
      else if (r.type === "seq") { if (!r.items.map(i => i.order).sort((a, b) => a - b).every((v, i) => v === i) || new Set(r.items.map(i => i.html)).size !== r.items.length) { ok = false; why = "ordre"; } }
      else if (r.type === "memory") { const ks = r.cards.map(c => c.k); if (r.cards.length % 2 || ks.some(k => ks.filter(x => x === k).length !== 2)) { ok = false; why = "paires"; } }
      else if (r.type === "match") { if (r.left.length !== r.right.length || r.left.some(l => r.right.filter(x => x.k === l.k).length !== 1) || new Set(r.right.map(x => x.html)).size !== r.right.length) { ok = false; why = "paires à relier"; } }
      else { ok = false; why = "type inconnu " + r.type; }
    }
  }
  t(`${g.id.padEnd(24)} manches valides`, ok, why);
  if (miss) { console.log("   consigne absente des phrases :", miss); bad++; }
}
// les jeux sans manche propre ouvrent le puzzle
t("les puzzles (triangles, fractions) ouvrent le puzzle du robot", M.GAMES.filter(g => g.rounds === "puzzle").length >= 3);
// les consignes de chiffres couvrent toutes les possibilités
let cov = true, cm = ""; for (let k = 0; k < 400; k++) for (const g of M.GAMES) if (g.rounds !== "puzzle") for (const r of g.rounds(rnd)) if (!allPhr.has(r.say)) { cov = false; cm = r.say; }
t("toutes les consignes possibles sont dans la liste des phrases à enregistrer", cov, cm);
t("sons de robot : moteur, horloge, haut-parleur, capteur de distance, bouton", ["moteur", "horloge", "haut-parleur", "capteur-distance", "bouton"].every(k => M.SOUNDS[k] && M.SOUNDS[k].notes.length >= 2));
t("horloge : « trois heures et demie »", M.hourLabel(3, 1) === "trois heures et demie" && M.hourLabel(1, 0) === "une heure");
const app = src("app.js"), sw = src("sw.js");
t("service worker : montessori.js connu", /montessori\.js/.test(sw));
t("le moteur gère la mémoire, les sons et le volume", /rd\.type === "memory"/.test(src("petits.js")) && /rd\.sound/.test(src("petits.js")) && /\[f, d, t, delay, g\]/.test(src("petits.js")));
console.log(bad ? "PROBLEMES: " + bad : "LE COIN MONTESSORI FONCTIONNE");
