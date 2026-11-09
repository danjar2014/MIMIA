// Mots isolés (nombres, jours, formes…) venus des données : liste ceux que le dictionnaire n'a pas -> i18n/lex.txt
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url"; import { resolve } from "node:path";
const store = {}; globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const en = JSON.parse(readFileSync("i18n/en.json", "utf8")); const found = new Map();
const mods = readdirSync(".").filter(f => f.endsWith(".js") && !/^(test-|sw|pyinterp|codeworker|splash|install|i18n)/.test(f));
function walk(v, mod, d = 0, seen = new Set()) {
  if (d > 6 || v == null || seen.has(v)) return;
  if (typeof v === "string") { const s = v.trim(); if (/^[\p{Ll}\p{Lu}][\p{L}'’-]{1,24}( [\p{L}'’-]{1,20}){0,2}$/u.test(s) && !(s in en) && /[\p{L}]{2}/u.test(s)) found.set(s, mod); return; }
  if (typeof v === "function") return;
  if (typeof v === "object") { seen.add(v); for (const k of Object.keys(v)) walk(v[k], mod, d + 1, seen); }
}
for (const m of mods) { try { const ns = await import(pathToFileURL(resolve(m)).href); for (const k of Object.keys(ns)) walk(ns[k], m); } catch (e) {} }
const list = [...found.entries()].sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0], "fr"));
writeFileSync("i18n/lex.txt", list.map(([s, m], i) => `${i}|${s}|${m}`).join("\n"));
console.log(list.length);
