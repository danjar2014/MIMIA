import { explainCode, describeExpr, explainSpeech } from "./explain.js";
import { FLAT } from "./codemissions.js";
import { forLang } from "./codepy.js";
import { PROJECTS } from "./projectdata.js";
import { LEVELS } from "./levels.js";
import { gridToCode, brainToCode } from "./blockcode.js";
let bad = 0; const t = (n, c, x) => { console.log(n.padEnd(72), c ? "ok" : "BUG " + (x || "")); if (!c) bad++; };
// 1. toutes les solutions de l'appli sont expliquées, ligne par ligne, sans « je ne sais pas »
let lines = 0, fb = [];
const check = (name, code, lang) => { const r = explainCode(code, lang); lines += r.rows.length; if (r.fallbacks) fb.push(name + " (" + lang + ") : " + r.rows.filter(x => /ne sais pas encore/.test(x.text)).map(x => x.code).join(" / ")); return r; };
for (const m of FLAT) { if (m.solution) check(m.id, m.solution, "js"); const p = forLang(m, "py"); if (p.solution) check(m.id, p.solution, "py"); }
for (const p of PROJECTS) { check(p.id, p.js.solution, "js"); check(p.id, p.py.solution, "py"); }
for (const [b, list] of Object.entries(LEVELS)) if (b !== "t") list.forEach((lv, i) => ["py", "js"].forEach(l => check(b + (i + 1), gridToCode(JSON.parse(JSON.stringify(lv.sol)), l), l)));
const IF = (cond, body, els = []) => ({ t: "if", cond, body, else: els }), A = x => ({ t: x });
["py", "js"].forEach(l => check("cerveau", brainToCode({ main: [IF("just", [A("mflip")]), IF("memyes", [A("lon")], [A("loff")]), IF("near", [A("son"), A("mset1")]), IF("dark", [A("mon")])] }, l), l));
t(`${lines} lignes de solutions expliquées, aucune ligne inconnue`, fb.length === 0, fb.slice(0, 5).join(" ## "));
// 2. exemples précis
const ex = (code, lang, i) => explainCode(code, lang).rows[i].text;
t("print en Python", ex('print("Bonjour")', "py", 0) === "Écrit à l'écran : « Bonjour ».");
t("for range(1, 6)", /part de 1|va jusqu'à 6 \(6 n'est jamais atteint\)/.test(ex("for i in range(1, 6):\n    print(i)", "py", 0)));
t("for range(7) = 7 fois", /^Répète 7 fois/.test(ex("for i in range(7):\n    avancer()", "py", 0)));
t("for JavaScript décrit départ, fin et pas", /« i » part de 0, jusqu'à 7 \(7 n'est pas atteint\), de 1 en 1/.test(ex("for (let i = 0; i < 7; i++) {\n  avancer();\n}", "js", 0)), ex("for (let i = 0; i < 7; i++) {\n  avancer();\n}", "js", 0));
t("condition robot en français", /^Tant qu'il n'y a pas d'obstacle devant/.test(ex("while not obstacle_devant():\n    avancer()", "py", 0)));
t("même explication en JavaScript (!obstacleDevant)", ex("while (!obstacleDevant()) {\n  avancer();\n}", "js", 0) === ex("while not obstacle_devant():\n    avancer()", "py", 0));
t("capteur : distance() < 20", describeExpr("distance() < 20", "py") === "la distance est de moins de 20 cm");
t("ET et OU", describeExpr("lumiere() >= 35 and distance() >= 20", "py") === "la lumière est forte (35 ou plus) ET la distance est de 20 cm ou plus" && /OU/.test(describeExpr("a || b", "js")));
t("reste de la division", describeExpr("i % 2 == 0", "py") === "le reste de i divisé par 2 est égal à 0");
t("lampe(True) / lampe(tic())", ex("lampe(True)", "py", 0) === "Allume la lampe." && /selon cette condition : c'est un tic/.test(ex("lampe(tic())", "py", 0)));
t("variable : crée puis change", (() => { const r = explainCode("total = 0\ntotal = total + 1", "py").rows; return /^Crée la boîte « total »/.test(r[0].text) && /^Change la boîte « total »/.test(r[1].text); })());
t("global expliqué", /changer, dans cette commande/.test(ex("def f():\n    global a\n    a = 1", "py", 1)));
t("la profondeur suit le décalage (Python) et les accolades (JS)", explainCode("if x:\n    if y:\n        pass", "py").rows.map(r => r.depth).join() === "0,1,2" && explainCode("if (x) {\n  if (y) {\n    avancer();\n  }\n}", "js").rows.map(r => r.depth).join() === "0,1,2");
t("résumé : compte boucles, choix et commandes", /1 boucle/.test(explainCode("for i in range(3):\n    if i == 1:\n        avancer()", "py").summary) && /1 choix/.test(explainCode("for i in range(3):\n    if i == 1:\n        avancer()", "py").summary));
t("ligne inconnue signalée honnêtement", explainCode("bizarre truc", "py").fallbacks === 1);
t("programme vide", /vide/.test(explainCode("   \n", "py").summary));
t("texte lisible à voix haute", /Ligne 1 : /.test(explainSpeech(explainCode("avancer()", "py"))));
console.log(bad ? "PROBLEMES: " + bad : "L'EXPLICATION DU CODE FONCTIONNE");
