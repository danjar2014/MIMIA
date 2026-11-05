// Extrait les phrases fixes de l'appli (modules de données) -> voice/phrases.json. Lancer : node voice/extract.mjs
import { writeFileSync, readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const mods = ["learn","levels","dailyq","mascot","onboard","codemissions","advlabs","advgames","labs","discover","explain","badges","parcours","tapcode","scenario","projectdata","blocks","codeerrors","hints","practice","dance","draw","build","stats","xp"];
const sentences = new Set();
const clean = t => String(t).replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
export const split = t => (clean(t).match(/[^.!?…]+[.!?…]*/g) || []).map(s => s.trim()).filter(Boolean);
const ok = s => /\p{L}{3}/u.test(s) && /\s/.test(s) && s.length >= 10 && s.length <= 260 && !/[{};=<>\|$‸]|=>|\w\(|\)\w|--|\+\+|^["',)\]]|["'(\[]$|\b(function|const|return|replace|import|assign)\b|^\W*[a-zàéè]+\s?\(/.test(s) && /^[\p{Lu}«"“‘(¿¡0-9✅❌💡⭐🎉👏👍]/u.test(s.replace(/^[^\p{L}\p{N}«"“]+/u, "$&")) && (s.match(/"/g) || []).length % 2 === 0;
function walk(v, d = 0, seen = new Set()) {
  if (d > 7 || v == null || seen.has(v)) return;
  if (typeof v === "string") { for (const s of split(v)) if (ok(s)) sentences.add(s); return; }
  if (typeof v === "function") return;
  if (typeof v === "object") { seen.add(v); for (const k of Object.keys(v)) walk(v[k], d + 1, seen); }
}
const rep = {};
for (const m of mods) {
  try { const ns = await import(pathToFileURL(resolve(m + ".js")).href); const before = sentences.size; for (const k of Object.keys(ns)) walk(ns[k]); rep[m] = sentences.size - before; }
  catch (e) { rep[m] = "ERR " + String(e.message).slice(0, 60); }
}
// 2e passe : les textes écrits dans le code (mascotte, accueil, laboratoires…), sans ${...}
const skip = /^(test-|pyinterp|codeengine|codeworker|codepy|sw\.js|icons|robot\.js|scene|grid|util|voice|app\.js|parentsetup|pin|confirm|dashboard)/;
for (const f of readdirSync(".").filter(f => f.endsWith(".js") && !skip.test(f))) {
  const src = (await import("node:fs")).readFileSync(f, "utf8");
  for (const m of src.matchAll(/"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\$]|\\.)*)`/g)) { const t = (m[1] ?? m[2] ?? "").replace(/\\n/g, " ").replace(/\\(["'`])/g, "$1"); for (const x of split(t)) if (ok(x)) sentences.add(x); }
}
const list = [...sentences].sort();
// compliments avec le prénom : morceaux sans le prénom (le prénom a ses propres clips, voice/phrases_names.json)
{ const { fragments } = await import(pathToFileURL(resolve("praise.js")).href); const fr = fragments(); writeFileSync("voice/phrases_praise.json", JSON.stringify(fr, null, 1)); console.log("compliments:", fr.length); }
writeFileSync("voice/phrases.json", JSON.stringify(list, null, 1));
console.log(rep); console.log("total phrases:", list.length, " caractères:", list.reduce((a, s) => a + s.length, 0));
