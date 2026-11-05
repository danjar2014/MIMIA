// Nouveautés : retour du suivi, cadenas parents fixe, plein écran verrouillé, bruitages, prénom lu par la voix de l'appareil, puzzle sur l'accueil.
import { readFileSync, existsSync } from "node:fs";
let bad = 0; const t = (n, c, x) => { console.log(n.padEnd(84), c ? "ok" : "BUG " + (x || "")); if (!c) bad++; };
const src = f => readFileSync("./" + f, "utf8"), app = src("app.js"), css = src("style.css"), util = src("util.js"), grid = src("grid.js"), dance = src("dance.js"), vc = src("voiceclips.js"), voice = src("voice.js"), sw = src("sw.js");
const dart = src("flutter_app/lib/main.dart"), kt = readFileSync("./flutter_app/android/app/src/main/kotlin/com/petitsrobots/petits_robots/MainActivity.kt", "utf8");

t("le suivi (tableau de bord) revient à l'espace parents, comme les autres rubriques", /topbar\("Tableau de bord des parents", settings, false\)/.test(app));
t("le cadenas parents est figé (position fixe) en haut, hors du cadre des cartes", /#app>\.wlock,#app\.home>\.wlock\{position:fixed;right:12px;top:76px/.test(css));
t("plein écran verrouillé : réglage parent dans « Écran », enregistré pour tous les joueurs", /togRow\("Plein écran verrouillé", "kiosk", S\.kiosk\)/.test(app) && /"reminder", "kiosk"\]/.test(util));
t("plein écran : Android (épinglage d'écran) ou plein écran du navigateur", /callHandler\("kiosk"/.test(app) && /requestFullscreen/.test(app));
t("Android : le canal « kiosk » démarre / arrête l'épinglage d'écran", /addJavaScriptHandler\(\s*handlerName: 'kiosk'/.test(dart) && /startLockTask\(\)/.test(kt) && /stopLockTask\(\)/.test(kt));
t("bruitages du robot : avancer, tourner, cogner (grille) ; sauter, tourner sur soi (danse)", /sfx\("move"\)/.test(grid) && /sfx\("turn"\)/.test(grid) && /sfx\("bump"\)/.test(grid) && /sfx\("jump"\)/.test(dance) && /sfx\("spin"\)/.test(dance) && /export function sfx/.test(util));
t("le prénom est lu par la voix de l'appareil (pas de clips de prénoms)", /nm \|\| !man\.has\(k\)/.test(vc) && !existsSync("voice/phrases_names.json"));
t("l'accueil dit « Bonjour » avec le prénom", /hello\(\)/.test(voice) && /\.herotile b/.test(voice));
t("les compliments s'activent au démarrage et le robot dit le prénom", /initVoice\(\); initPraise\(\);/.test(app) && /firstSentence\(praise\(\)\)/.test(src("mascot.js")));
t("fille / garçon obligatoire dans la configuration parent et dans l'édition d'un joueur", /validProfile = p =>[^\n]*SEXES/.test(src("parentsetup.js")) && /Choisissez : fille ou garçon/.test(app));
t("le puzzle est sur l'accueil et connu du service worker", /tile\("puzzle", "Puzzle"/.test(app) && /puzzle\.js/.test(sw) && /praise\.js/.test(sw));
t("le puzzle rapporte un petit nombre fixe de points", /sec === "puzzle" \? 20/.test(app));
console.log(bad ? "PROBLEMES: " + bad : "LES NOUVEAUTES FONCTIONNENT");
