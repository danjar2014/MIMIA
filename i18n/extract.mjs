// Extrait tous les textes français affichables de l'appli (littéraux, gabarits, concaténations) -> i18n/strings.json
// Lancer : node i18n/extract.mjs   (les {1}, {2}… remplacent les parties calculées)
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire("file:///C:/design/package.json"); const acorn = require("acorn");
const files = readdirSync(".").filter(f => f.endsWith(".js") && !/^(test-|sw\.js)/.test(f));
const ACC = /[àâäçéèêëîïôöùûüœÿÀÂÇÉÈÊÎÔÛ]/;
const STOP = /(^|[^\p{L}])(le|la|les|un|une|des|du|de|d'|l'|et|est|tu|ton|ta|tes|pour|avec|dans|sur|je|j'|il|elle|que|qui|pas|ce|cette|ça|vous|votre|nous|mon|ma|mes|au|aux|ou|où|si|ne|se|sont|très|bien|ici|encore|plus|moins|ton|toi|moi|fait|faire|va|vas|ont|par|ses|son|sa|leur|mais|donc|alors|comme|quand|tout|tous|toutes|chaque|aussi|déjà)(?=$|[^\p{L}])/iu;
const decode = s => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&hellip;/g, "…").replace(/&[a-z]+;/g, " ");
const out = new Map(), allSegs = new Set();
function addTemplate(t, file) {
  // les attributs écrits dans les balises (aria-label, title, placeholder, alt, data-say) sont aussi des textes affichés ou lus
  const ATT = /(?:aria-label|title|placeholder|alt|data-say)=(?:"([^"]*)"|'([^']*)')/g;
  for (const m of String(t).matchAll(/<[^>]*>/g)) { for (const x of m[0].matchAll(ATT)) { addSeg(x[1] !== undefined ? x[1] : x[2], file); } }
  // t : texte avec {1}… ; on le coupe aux balises HTML
  for (const seg0 of String(t).split(/<[^>]*>/)) addSeg(seg0, file);
}
function addSeg(seg0, file) {
  { let seg = seg0;
    seg = decode(seg).replace(/\s+/g, " ").trim(); if (!seg || !/\p{L}{2}/u.test(seg)) return;
    const bare = seg.replace(/\{\d+\}/g, "").replace(/\s+/g, " ").trim(); if (!/\p{L}{2}/u.test(bare)) return;
    if (/=>|[{}]\s*$|\bfunction\b|https?:|\.(png|svg|js|json|mp3|css|html)\b|^[#.\-\w]+\{|;\s*\}|--[\w-]+:|\bpx\b|\brgba?\(/.test(seg.replace(/\{\d+\}/g, ""))) return;
    allSegs.add(seg);
    const french = ACC.test(bare) || STOP.test(bare) || /^\p{Lu}[\p{L}'’-]{2,}(\s+\S+){1,8}$/u.test(bare);
    if (!french) return;
    const e = out.get(seg) || { n: 0, f: file }; e.n++; out.set(seg, e);
  }
}
const flat = n => (n.type === "BinaryExpression" && n.operator === "+" ? [...flat(n.left), ...flat(n.right)] : [n]);
function walk(node, file, src) {
  if (!node || typeof node.type !== "string") return;
  if (node.type === "BinaryExpression" && node.operator === "+") {
    const parts = flat(node); const isStr = p => (p.type === "Literal" && typeof p.value === "string") || p.type === "TemplateLiteral";
    if (parts.some(isStr) && parts.some(p => !isStr(p))) {
      let k = 0, t = ""; for (const p of parts) { if (p.type === "Literal" && typeof p.value === "string") t += p.value; else if (p.type === "TemplateLiteral") t += tplText(p, () => ++k); else t += `{${++k}}`; }
      addTemplate(t, file); for (const p of parts) if (!isStr(p)) walk(p, file, src); // les littéraux seuls ne sont pas ajoutés (déjà dans le gabarit)
      for (const p of parts) if (p.type === "TemplateLiteral") p.expressions.forEach(x => walk(x, file, src)); return;
    }
  }
  if (node.type === "Literal" && typeof node.value === "string") addTemplate(node.value, file);
  else if (node.type === "TemplateLiteral") { let k = 0; addTemplate(tplText(node, () => ++k), file); node.expressions.forEach(x => walk(x, file, src)); return; }
  for (const key of Object.keys(node)) { const v = node[key]; if (Array.isArray(v)) v.forEach(c => c && walk(c, file, src)); else if (v && typeof v.type === "string") walk(v, file, src); }
}
const tplText = (n, next) => n.quasis.map((q, i) => q.value.cooked + (i < n.expressions.length ? `{${next()}}` : "")).join("");
for (const f of files) { const src = readFileSync(f, "utf8"); try { walk(acorn.parse(src, { ecmaVersion: "latest", sourceType: "module" }), f, src); } catch (e) { console.log("ERR", f, e.message); } }
const list = [...out.entries()].map(([k, v]) => ({ k, n: v.n, f: v.f })).sort((a, b) => a.f.localeCompare(b.f) || a.k.localeCompare(b.k, "fr"));
writeFileSync("i18n/segments.all.json", JSON.stringify([...allSegs]));
writeFileSync("i18n/strings.new.json", JSON.stringify(list, null, 1));
console.log(list.length, "textes,", list.reduce((a, x) => a + x.k.length, 0), "caractères");
const byFile = {}; list.forEach(x => byFile[x.f] = (byFile[x.f] || 0) + 1); console.log(byFile);
