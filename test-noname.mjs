// Le prénom n'est lu que dans les salutations (préfixe DEVICE), jamais dans les jeux ; la version s'affiche dans l'animation d'accueil.
const store = {}; globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const { segmentsOf } = await import("./voiceclips.js"), U = await import("./util.js"), { readFileSync } = await import("node:fs");
let bad = 0; const t = (n, c) => { console.log(n.padEnd(80), c ? "ok" : "BUG"); if (!c) bad++; };
U.S.name = "Léa"; U.updateProfile && U.updateProfile(U.activeId(), { name: "Léa" });
const segs = segmentsOf("Bravo Léa, tu as bien réfléchi !");
t("jeux : aucun morceau n'est un prénom", segs.every(([p, nm]) => !nm && !/Léa/.test(p)));
t("salutation (préfixe DEVICE) : lue par la voix de l'appareil", segmentsOf(U.DEVICE + "Bonjour Léa !").every(([, nm]) => nm === true));
t("version affichée dans l'animation d'accueil", /sp-ver/.test(readFileSync("./splash.js", "utf8")) && /^\d+\.\d+$/.test(U.APP_VERSION));
console.log(bad ? "PROBLEMES: " + bad : "OK");
