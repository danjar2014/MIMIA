import { runSpec, lint, explain, NAMES } from "./codeengine.js";
import { FLAT, FREE } from "./codemissions.js";
let bad = 0; const t = (n, c, extra) => { console.log(n.padEnd(70), c ? "ok" : "BUG " + (extra || "")); if (!c) bad++; };
for (const m of FLAT) { const r = runSpec(m.spec, m.solution); t(`${m.id} ${m.title}: solution réussie`, r.ok, JSON.stringify(r).slice(0, 300)); t(`${m.id} programme du départ seul : échec`, !runSpec(m.spec, m.starter).ok); }
const run = (id, code) => runSpec(FLAT.find(m => m.id === id).spec, code);
// erreurs d'écriture
t("guillemet oublié détecté avec sa ligne", (() => { const r = run("k1", 'afficher("Bonjour);'); return r.stage === "syntax" && r.error.line === 1 && /guillemet/.test(r.error.msg); })());
t("parenthèse jamais fermée", (() => { const r = run("k1", '// x\nafficher("Bonjour";'); return r.stage === "syntax" && r.error.line === 2; })());
t("accolade en trop", run("k5", "for (let i = 1; i <= 5; i++) {\n afficher(i);\n}\n}").stage === "syntax");
t("for avec des virgules", (() => { const r = run("k5", "for (let i = 1, i <= 5, i++) {\n afficher(i);\n}"); return r.stage === "syntax" && /point-virgule/.test(r.error.msg); })());
t("guillemets courbes détectés", /ne marche pas/.test(run("k1", "afficher(“Bonjour”);").error.msg));
t("faute de syntaxe JS traduite", (() => { const r = run("k3", "let nombre 5;\nafficher(nombre * 2);"); return r.stage === "syntax" && /faute d'écriture/.test(r.error.msg); })());
// erreurs d'exécution
t("majuscule : suggestion", (() => { const r = run("r1", "Avancer(4);"); return r.results[0].error && /Tu voulais écrire « avancer »/.test(r.results[0].error.msg); })());
t("faute de frappe : suggestion", (() => { const r = run("r1", "avancr(4);"); return /avancer/.test(r.results[0].error.msg); })());
t("numéro de ligne exact", (() => { const r = run("r1", "avancer();\navancer();\nvolerr();"); return r.results[0].error.line === 3 && /volerr/.test(r.results[0].error.text); })());
t("variable inconnue", /boîte/.test(run("k3", "afficher(nombre * 2);").error.msg));
t("const modifiée", /const/.test(run("k9", "const total = 0;\ntotal = 3;").error.msg));
t("nom déjà pris (commande du robot)", /existe déjà/.test(run("c1", "let lampe = 3;\nfunction boucle(){}").error.msg));
// boucle infinie avec commandes : arrêtée
t("while(true) avancer : limite", (() => { const r = run("r5", "while (true) { tournerDroite(); }"); return r.results[0].limit === true && !r.ok; })());
t("boucle infinie d'affichage arrêtée", run("k5", "while (true) { afficher(1); }").stage === "runtime");
// diagnostics
t("k5 sans boucle : le résultat est juste mais le but non atteint", (() => { const r = run("k5", "afficher(1);afficher(2);afficher(3);afficher(4);afficher(5);"); return !r.ok && /boucle/.test(r.why) && /juste/.test(r.why); })());
t("k1 mauvaise ligne : message précis", /ligne 1/.test(run("k1", 'afficher("Salut");').why));
t("k10 sans return", /return/.test(run("k10", "function doubler(n) { n * 2; }").why));
t("k10 mauvaise formule", /doubler\(2\) devrait donner 4/.test(run("k10", "function doubler(n) { return n + 2; }").why) || /devrait donner/.test(run("k10", "function doubler(n) { return n + 3; }").why));
t("k10 fonction absente", /Je ne trouve pas la fonction/.test(run("k10", "afficher(1);").why));
t("k7 sans décollage", !run("k7", "for (let i = 5; i >= 1; i--) { afficher(i); }").ok);
t("accents ignorés (decollage)", run("k7", 'for (let i = 5; i >= 1; i--) { afficher(i); }\nafficher("decollage");').ok);
t("robot : cogne un caillou", (() => { const r = run("r2", "avancer(5);"); return !r.ok && r.results[0].bump; })());
t("robot : pas arrivé", (() => { const r = run("r1", "avancer(2);"); return !r.ok && !r.results[0].atFlag; })());
t("robot r5 : un seul couloir réussi ne suffit pas (trois parcours)", (() => { const r = run("r5", "avancer(4);"); return !r.ok; })());
t("robot r5 : solution réussit les 3 couloirs", run("r5", FLAT.find(m => m.id === "r5").solution).results.length === 3);
t("robot r7 : sans ramasser, échec (étoiles manquantes)", (() => { const r = run("r7", "for (let i = 0; i < 6; i++) { avancer(); }"); return !r.ok && r.results[0].missing > 0; })());
t("cerveau c1 : if sans else = lampe qui reste allumée", (() => { const r = run("c1", "function boucle() { if (boutonAppuye()) { lampe(true); } }"); return !r.ok && /reste allumée|else/.test(r.why); })());
t("cerveau c1 : sans fonction boucle", /boucle/.test(run("c1", "lampe(true);").why));
t("cerveau c3 clignote", run("c3", "function boucle() { lampe(tic()); }").ok && !run("c3", "function boucle() { lampe(true); }").ok);
t("cerveau c6 : sans mémoire de l'appui, échec", !run("c6", "let memoire=false; function boucle(){ if(boutonAppuye()){memoire=!memoire;} lampe(memoire);}").ok);
t("cerveau c7 : variante valable", run("c7", "let m=false; function boucle(){ if(boutonAppuye()){m=false;} else if(distance()<20){m=true;} lampe(m); }").ok);
t("cerveau c2 : syntaxe de capteur mal écrite", /Je ne connais pas|distance/.test(run("c2", "function boucle(){ if (Distance() < 20) { roues(false);} else {roues(true);} }").why || run("c2", "function boucle(){ if (Distance() < 20) { roues(false);} else {roues(true);} }").error.msg));
t("atelier libre : affiche", (() => { const r = runSpec(FREE.spec, 'let n="Bolt"; afficher("Salut " + n);'); return r.ok && r.output[0] === "Salut Bolt"; })());
console.log(bad ? "PROBLEMES: " + bad : "LE VRAI CODE FONCTIONNE");
