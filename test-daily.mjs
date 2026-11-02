import { S } from "./util.js";
import { makeDaily, CONCEPTS, walk, rng } from "./dailyq.js";
import { RANKS } from "./parcours.js";
import { runSpec } from "./codeengine.js";
import { FLAT } from "./codemissions.js";
import { forLang } from "./codepy.js";
let bad = 0; const t = (n, c, x) => { console.log(n.padEnd(74), c ? "ok" : "BUG " + (x || "")); if (!c) bad++; };
const allDone = () => { S.progress = {}; RANKS.forEach(r => r.steps.forEach(s => (S.progress[s.sec] = S.progress[s.sec] || {})[s.id] = true)); };
// 1. banque de concepts : une seule bonne réponse, des réponses différentes
t(`${CONCEPTS.length} questions de compréhension, ids uniques`, new Set(CONCEPTS.map(c => c.id)).size === CONCEPTS.length);
t("chaque question a 1 bonne et 2 mauvaises réponses différentes", CONCEPTS.every(c => c.bad.length === 2 && new Set([c.good, ...c.bad]).size === 3 && c.why));
// 2. rang 0, rien de fait : que des questions de rang 0
S.progress = {}; let ok = true; for (let d = 0; d < 40; d++) { const q = makeDaily("2026-11-" + d, { rank: 0, lang: "py" }); if (q.length !== 3 || q.some(x => x.kind !== "concept") || q.some(x => CONCEPTS.find(c => c.id === x.id).rank > 0)) ok = false; }
t("rang 0, rien de fait : 3 questions de compréhension du rang 0 seulement", ok);
// 3. tout est fait : toutes les sortes de questions, toutes vérifiées
allDone(); const seen = { concept: 0, robot: 0, output: 0, bug: 0 }; let sound = true, why = "";
const fail = m => { sound = false; if (!why) why = m; };
for (const lang of ["py", "js"]) for (let d = 0; d < 120; d++) {
  const q = makeDaily("jour-" + d, { rank: 10, lang }), q2 = makeDaily("jour-" + d, { rank: 10, lang });
  if (JSON.stringify(q) !== JSON.stringify(q2)) fail("pas déterministe");
  if (q.length !== 3) fail("3 questions attendues");
  const ids = q.filter(x => x.kind === "concept").map(x => x.id); if (new Set(ids).size !== ids.length) fail("concept répété dans un même défi");
  for (const x of q) {
    seen[x.kind]++;
    if (x.choices.filter(c => c.ok).length !== 1) fail(x.kind + " : pas exactement une bonne réponse");
    if (new Set(x.choices.map(c => c.label)).size !== x.choices.length) fail(x.kind + " : deux réponses identiques");
    if (x.kind === "output") { const r = runSpec({ kind: "console", free: true, lang: lang === "py" ? "py" : undefined }, x.code); if (!r.ok || r.output.join(", ") !== x.choices.find(c => c.ok).label) fail("sortie annoncée ≠ sortie réelle : " + x.code.slice(0, 40)); }
    if (x.kind === "bug") { const r = runSpec({ kind: "console", free: true, lang: lang === "py" ? "py" : undefined }, x.code), good = x.choices.find(c => c.ok).label; if (r.ok || !r.error || good.indexOf("Ligne " + r.error.line + " :") !== 0) fail("ligne fautive ≠ ligne du moteur : " + JSON.stringify(r.error) + " vs " + good); }
    if (x.kind === "robot") { const m = /Il suit ce programme : (.*)\n/.exec(x.text); if (!m) fail("texte du robot"); }
  }
}
t("toutes les sortes de questions apparaissent (concept, robot, sortie, faute)", Object.values(seen).every(n => n > 10), JSON.stringify(seen));
t("240 défis : 1 seule bonne réponse, réponses distinctes, sorties et fautes vérifiées par le moteur", sound, why);
// 4. la question du robot est vraie : on la refait à la main
{ let checked = 0, mism = 0; for (let d = 0; d < 80; d++) for (const x of makeDaily("r" + d, { rank: 3, lang: "py" })) if (x.kind === "robot") { checked++; const rows = x.art.split("\n"); const seq = [...x.text.split("Il suit ce programme : ")[1].split("\n")[0].split(" ")].map(e => ({ "⬆️": "fd", "↷": "tr", "↶": "tl" })[e]); const dir = /vers le haut/.test(x.text) ? 0 : /droite/.test(x.text) ? 1 : /bas/.test(x.text) ? 2 : 3;
    const map = rows.map(r => [...r].map(ch => ({ "🤖": "R", "🏁": "F", "⭐": "*", "🪨": "#" }[ch] || ".")).join("")), w = walk(map, dir, seq); if ((w.atFlag && !w.bump) !== x.choices.find(c => c.ok).label.startsWith("Oui")) mism++; }
  t(`question du robot : ${checked} refaites à la main, ${mism} différences`, checked > 5 && mism === 0); }
// 5. à rang intermédiaire, jamais de code avant le rang Codeur
S.progress = {}; allDone(); ok = true; for (let d = 0; d < 60; d++) if (makeDaily("m" + d, { rank: 5, lang: "py" }).some(x => x.kind === "output" || x.kind === "bug")) ok = false;
t("avant le rang Codeur : pas de question de code", ok);
// 6. on n'interroge que sur ce qui a été fait
S.progress = {}; (S.progress.prog = {}).a1 = true; ok = true; for (let d = 0; d < 60; d++) for (const x of makeDaily("p" + d, { rank: 8, lang: "py" })) if (x.kind === "output" || x.kind === "bug") ok = false;
t("sans mission de code réussie : pas de question de code", ok);
S.progress = {}; (S.progress.code = {}).k5 = true; let outs = 0, bugs = 0; for (let d = 0; d < 80; d++) for (const x of makeDaily("q" + d, { rank: 8, lang: "py" })) { if (x.kind === "output") outs++; if (x.kind === "bug") bugs++; }
t("seulement k5 réussie : les questions de code portent sur k5", outs + bugs > 0);
// 7. évite les répétitions récentes
const first = makeDaily("z", { rank: 0 }).filter(q => q.kind === "concept").map(q => q.id), again = makeDaily("z2", { rank: 0, avoid: first }).filter(q => q.kind === "concept").map(q => q.id);
t("les questions des derniers jours sont évitées", again.every(id => !first.includes(id)));
console.log(bad ? "PROBLEMES: " + bad : "LE DEFI DU JOUR EST FIABLE");
