// Les pièces d'un robot : 30 composants dessinés, noms et rôles justes, utilisés dans les activités des petits et dans « Les pièces du robot ».
const store = {}; globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
import { readFileSync } from "node:fs";
let bad = 0; const t = (n, c, x) => { console.log(n.padEnd(86), c ? "ok" : "BUG " + (x || "")); if (!c) bad++; };
const { PARTS, partById } = await import("./parts.js"), P = await import("./petits.js");
const src = f => readFileSync("./" + f, "utf8"), app = src("app.js"), sw = src("sw.js");
const rnd = n => Math.floor(Math.random() * n);

t("au moins 30 pièces de robot", PARTS.length >= 30, String(PARTS.length));
const need = ["roue", "moteur", "haut-parleur", "microphone", "camera", "antenne", "wifi", "bluetooth", "controleur", "capteur-distance", "capteur-lumiere", "capteur-temperature", "laser", "bras", "pince", "chenille", "helice", "satellite", "ecran", "pile", "lampe", "bouton", "fil"];
t("les pièces demandées sont là : roue, haut-parleur, capteurs, lumière, laser, contrôleur, wifi, caméra…", need.every(id => partById(id)), need.filter(id => !partById(id)).join());
t("chaque pièce : un identifiant, un nom avec article, un rôle en une phrase, un dessin", PARTS.every(p => p.id && /^(le|la|l'|les) ?/.test(p.name) && p.name.endsWith(p.word) && /\.$/.test(p.role) && /^<svg viewBox="0 0 48 48"/.test(p.svg)));
t("aucun doublon : identifiants, noms, rôles et dessins tous différents", ["id", "name", "role", "svg"].every(k => new Set(PARTS.map(p => p[k])).size === PARTS.length));
const lets = PARTS.filter(p => p.letter); t("les lettres sont toutes différentes, et la lettre est bien l'initiale du mot", new Set(lets.map(p => p.letter)).size === lets.length && lets.every(p => p.word[0].toUpperCase() === p.letter) && lets.length >= 12, lets.map(p => p.letter).join(""));
t("pluriel correct pour compter (« de roues », « d'antennes »)", PARTS.filter(p => p.plural).every(p => /^d(e |')/.test(p.plural)) && PARTS.filter(p => p.plural).length >= 25);
t("le wifi et le bluetooth ne se comptent pas", partById("wifi").plural === null && partById("bluetooth").plural === null);

// les activités utilisent bien ces pièces
let ok = true, why = ""; const chk = (c, m) => { if (!c && ok) { ok = false; why = m; } };
for (let k = 0; k < 200; k++) {
  for (const r of P.ROUNDS.pieces(rnd)) { const p = partById(r.part); chk(r.say === `Touche ${p.name}.`, "consigne"); chk(r.options.filter(o => o.ok).length === 1 && r.options.find(o => o.ok).label === p.word && r.options.find(o => o.ok).html.includes(p.svg.slice(0, 60)), "bonne pièce"); chk(new Set(r.options.map(o => o.label)).size === 3, "3 pièces différentes"); }
  const used = P.ROUNDS.pieces(rnd).map(r => r.part); chk(new Set(used).size === 5, "5 pièces différentes");
  for (const r of P.ROUNDS.roles(rnd)) { const p = partById(r.part); chk(r.say === `À quoi sert ${p.name} ?`, "consigne rôle"); chk(r.options.find(o => o.ok).label === p.role && new Set(r.options.map(o => o.label)).size === 3, "bon rôle"); }
}
t("« Pièces » et « Les pièces du robot » : une seule bonne réponse, la bonne pièce / le bon rôle", ok, why);
t("compter : on compte des vraies pièces (roues, piles, capteurs…)", P.COUNT_OBJ.length >= 25 && P.COUNT_OBJ.every(([svg, what]) => svg.startsWith("<svg") && /^d(e |')/.test(what)));
t("relier : chaque objet à son ombre, avec des pièces dessinées", P.MATCH_OBJ.length >= 12 && P.MATCH_OBJ.every(x => x.startsWith("<svg")));
const phr = new Set(P.petitsPhrases()); let cover = true, miss = "";
for (let k = 0; k < 300; k++) for (const id of Object.keys(P.ROUNDS)) for (const r of P.ROUNDS[id](rnd)) { if (!phr.has(r.say)) { cover = false; miss = r.say; } if (r.type === "quiz" && id === "roles") for (const o of r.options) if (!phr.has(o.label)) { cover = false; miss = o.label; } }
t("toutes les consignes et tous les rôles sont dans la liste des phrases à enregistrer", cover, miss);
t("Découvrir : « Les pièces du robot » (pour tous les âges), connu du service worker", /id: "d5", icon: "🔧", title: "Les pièces du robot"[^\n]*bands: "abc"/.test(app) && /function playRoles/.test(app) && /parts\.js/.test(sw));
t("les petits : une activité « Pièces » de plus (8)", P.PETITS.length === 8 && P.PETITS.some(p => p[0] === "pieces" && p[2] === "Pièces"));
console.log(bad ? "PROBLEMES: " + bad : "LES PIECES DE ROBOT FONCTIONNENT");
