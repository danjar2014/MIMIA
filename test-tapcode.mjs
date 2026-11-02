import { FLAT } from "./codemissions.js";
import { forLang } from "./codepy.js";
import { runSpec } from "./codeengine.js";
import { tokenizeLine, tapEligible, buildGuide, guideCode, lineMatches } from "./tapcode.js";
let bad = 0; const t = (n, c, x) => { console.log(n.padEnd(76), c ? "ok" : "BUG " + (x || "")); if (!c) bad++; };
// 1. le découpage en mots garde les espaces d'origine
const rebuild = s => tokenizeLine(s).map((x, i) => (i && x.sp ? " " : "") + x.t).join("");
for (const s of ['print("Bonjour")', "for i in range(1, 6):", "for (let i = 0; i < 7; i++) {", "lampe(lumiere() < 35 && tic())", "total += i;", "} else {", 'afficher("Décollage !");', "x = y // 2 ** 3"]) t("découpage : " + s, rebuild(s) === s, rebuild(s));
t("« === » et « != » restent d'un seul mot", tokenizeLine("a === b != c").map(x => x.t).join("|") === "a|===|b|!=|c");
// 2. toutes les missions éligibles, dans les deux langages
const counts = { py: 0, js: 0 };
for (const lang of ["py", "js"]) for (const m0 of FLAT) {
  const m = forLang(m0, lang); if (!m.solution || !tapEligible(m.solution, m0.id)) continue; counts[lang]++;
  const g = buildGuide(m.solution, lang, m0.id);
  t(`${m0.id} (${lang}) : le code reconstruit est identique à la solution`, guideCode(g, lang) === m.solution, guideCode(g, lang));
  const r = runSpec(m.spec, guideCode(g, lang)); t(`${m0.id} (${lang}) : le programme construit réussit la mission`, r.ok, r.why || JSON.stringify(r.error));
  const L = g.filter(x => !x.auto);
  t(`${m0.id} (${lang}) : chaque ligne a au moins 1 faux mot, jamais identique à un vrai mot de la ligne`, L.every(x => { const have = new Set(x.tokens.map(k => k.t)), dec = x.pool.filter(c => !c.ok); return dec.length >= 1 && dec.every(c => !have.has(c.t)) && x.pool.length === x.tokens.length + dec.length; }));
  t(`${m0.id} (${lang}) : dans le désordre ou incomplète, une ligne est refusée ; dans l'ordre, acceptée`, L.every(x => { const exp = x.tokens.map(k => k.t), rev = exp.slice().reverse(), pal = exp.join("") === rev.join(""); return lineMatches(exp, exp.slice()) && (pal || !lineMatches(exp, rev)) && !lineMatches(exp, exp.slice(0, -1)) && !lineMatches(exp, [...exp, "x"]); }));
}
t(`missions à toucher : ${counts.py} en Python, ${counts.js} en JavaScript`, counts.py >= 10 && counts.js >= 10, JSON.stringify(counts));
// 3. les missions trop longues ou d'expert restent à taper
t("les défis d'expert et le grand projet ne sont jamais « à toucher »", FLAT.filter(m => /^x/.test(m.id)).every(m => !tapEligible(m.solution, m.id)) && !tapEligible("a = 1", "pj-gardien"));
t("une solution de plus de 8 lignes est refusée", !tapEligible(Array.from({ length: 9 }, (_, i) => "a" + i + " = " + i).join("\n"), "k99"));
t("la première mission (k1) est éligible", tapEligible('print("Bonjour")', "k1"));
// 4. les faux mots sont stables d'un chargement à l'autre (même mission = mêmes pièges)
const a = buildGuide('print("Bonjour")', "py", "k1"), b = buildGuide('print("Bonjour")', "py", "k1");
t("mêmes faux mots à chaque fois", JSON.stringify(a) === JSON.stringify(b));
console.log(bad ? "PROBLEMES: " + bad : "LES MOTS A TOUCHER FONCTIONNENT");
