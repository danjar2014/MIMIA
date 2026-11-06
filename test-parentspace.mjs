// « Qui joue ? », confirmations ✖/✔ et espace parents en blocs d'icônes (vérifications sur le code source).
import { readFileSync } from "node:fs";
let bad = 0; const t = (n, c, x) => { console.log(n.padEnd(84), c ? "ok" : "BUG " + (x || "")); if (!c) bad++; };
const src = f => readFileSync("./" + f, "utf8"), app = src("app.js"), pin = src("pin.js"), dash = src("dashboard.js"), cfm = src("confirm.js"), sw = src("sw.js"), css = src("style.css");

const block = app.slice(app.indexOf("const PARENT_BLOCKS"), app.indexOf("const optList"));
const tiles = [...block.matchAll(/\["(\w+)", "[^"]+", "([^"]+)", "#[0-9a-f]{6}"\]/g)].map(m => m[1]);
const screens = [...app.slice(app.indexOf("const PARENT_SCREENS")).matchAll(/^  (\w+): \(\) => \(\{ title/gm)].map(m => m[1]);
t("espace parents : 2 blocs (Mon enfant, Compte) et 9 icônes", /title: "Mon enfant"/.test(block) && /title: "Compte"/.test(block) && tiles.length === 9, tiles.join());
t("chaque icône (sauf « Suivi » (tableau de bord) et « Quitter » (sort du plein écran)) a son écran de réglages", tiles.filter(i => i !== "suivi" && i !== "quitter").every(i => screens.includes(i)), screens.join());
t("les noms des icônes sont courts (un mot)", [...block.matchAll(/\["\w+", "[^"]+", "([^"]+)"/g)].every(m => !/\s/.test(m[1])));
t("tous les anciens réglages restent accessibles", ["#pn", "#px", "#pa", "#pg", "#sv", "#ss", "#sr", "#sl", "#sdt", "#rs", "#pc"].every(k => app.includes('id="' + k.slice(1) + '"')) && ["voice", "sound", "scene", "mascot", "calm", "big", "unlockAll"].every(k => app.includes(`, "${k}", `)), "un réglage a disparu");
t("les réglages ne s'enregistrent qu'avec les champs présents (pas d'erreur sur un autre écran)", /const v = id => \{ const e = overlay\.querySelector\(id\); return e \? e\.value : null; \}/.test(app));
t("un objectif vide n'est jamais enregistré", /\+g > 0\) S\.dailyGoalXP/.test(app));
t("le niveau de départ ne « place » l'enfant que si on le choisit (pas de test sauté)", /if \(ss !== null\) \{ S\.startRank = \+ss; S\.placed = true; \}/.test(app));

t("« Qui joue ? » : s'affiche à l'ouverture si tout est réglé, sinon la configuration parent", /function startApp\(\) \{/.test(app) && /function enterApp\(\) \{\n  if \(!needsParentSetup\(\) && S\.age && S\.placed\) welcome\(\); else home\(\);/.test(app) && /\nstartApp\(\);\n?$/.test(app));
t("« Qui joue ? » : le robot, le prénom, et le cadenas des parents", /wchild/.test(app) && /wname/.test(app) && /wlock/.test(app) && /parentLock\(\)/.test(app.slice(app.indexOf("function welcome"), app.indexOf("function startApp"))) && /function parentLock\(\)[^\n]*openSettings\(\)/.test(app));
t("accueil : plus d'ancien bouton ⚙️ (appui long), le même cadenas que « Qui joue ? », et le prénom ramène à « Qui joue ? »", !/Maintiens appuyé pour ouvrir les réglages/.test(app) && (app.match(/parentLock\(\)/g) || []).length >= 3 && /title: "Changer de joueur \?"/.test(app));
t("fermer les réglages revient à « Qui joue ? » quand on en vient", /onWelcome \? welcome\(\) : home\(\)/.test(app));
t("l'accès aux réglages reste derrière le code parent", /function openSettings\(\) \{ if \(needsParentSetup\(\)\) return startSetup\(\); askPin\(/.test(app));

t("confirmation ✖ / ✔ : deux boutons nommés « Non » et « Oui », « Non » sélectionné d'office", /✖/.test(cfm) && /✔/.test(cfm) && /aria-label="Non"/.test(cfm) && /aria-label="Oui"/.test(cfm) && /cfmno"\)\.focus\(\)/.test(cfm));
t("confirmation : Échap = non", /Escape/.test(cfm));
t("effacer la progression passe par la confirmation ✖ / ✔", /askConfirm\(overlay, \{ title: "Effacer la progression/.test(app));
t("effacer les statistiques passe par la confirmation ✖ / ✔ (plus de « touche encore »)", /askConfirm\(ov, \{ title: "Effacer les statistiques/.test(dash) && !/Sûr \? Touche encore/.test(dash));
t("effacement total (code oublié) : boutons ✖ / ✔, la question d'adulte reste", /id="wno" aria-label="Non, retour">✖/.test(pin) && /id="wyes" aria-label="Oui, tout effacer">✔/.test(pin) && /#wq/.test(pin));
t("service worker : confirm.js et parentsetup.js sont connus", /confirm\.js/.test(sw) && /parentsetup\.js/.test(sw));
t("styles : boutons ronds d'au moins 44 px", /\.cfmno,\.cfmyes\{width:88px;height:88px/.test(css) && /\.ghi\{flex:none;min-width:44px/.test(css));
console.log(bad ? "PROBLEMES: " + bad : "L'ESPACE PARENTS ET LE QUI JOUE FONCTIONNENT");
