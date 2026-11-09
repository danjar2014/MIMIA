// Affiche les textes français d'un lot : node i18n/show.mjs <numéro du lot strings> <début> <fin>
import { readFileSync } from "node:fs";
const [set, a, b] = process.argv.slice(2).map(Number); const l = JSON.parse(readFileSync(`i18n/strings${set}.json`, "utf8"));
console.log(l.slice(a, b + 1).map((x, i) => `${a + i}|${x.k}`).join("\n"));
