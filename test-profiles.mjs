// Plusieurs joueurs : réglages parents communs, progression propre à chaque enfant ; compliments avec le prénom selon l'âge et fille/garçon.
const store = {};
globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
globalThis.sessionStorage = { getItem: k => store["s:" + k] ?? null, setItem: (k, v) => { store["s:" + k] = v; }, removeItem: k => { delete store["s:" + k]; } };
let reloads = 0; globalThis.location = { reload() { reloads++; } };
let bad = 0; const t = (n, c, x) => { console.log(n.padEnd(84), c ? "ok" : "BUG " + (x || "")); if (!c) bad++; };
// ancien enregistrement d'un seul joueur (avant la mise à jour)
store["robotique-junior-v1"] = JSON.stringify({ name: "Léa", sex: "f", age: "a", pin: { salt: "s", hash: "h" }, parentSetup: { v: 1 }, progress: { learn: { l1: true } }, voice: true });
const U = await import("./util.js"), { S } = U;
t("migration : l'ancien joueur devient « p1 » avec sa progression", U.profileIds().join() === "p1" && S.name === "Léa" && S.progress.learn.l1 === true);
t("migration : le code parent et la configuration restent", S.pin && S.pin.hash === "h" && S.parentSetup.v === 1);
const id2 = U.addProfile({ name: "Julien", sex: "m", age: "c", dailyGoalXP: 150 });
t("on ajoute un joueur : « p2 », sans progression", id2 === "p2" && U.profileIds().join() === "p1,p2" && U.profileData("p2").name === "Julien" && Object.keys(U.profileData("p2").progress).length === 0);
t("le nouveau joueur est prêt à jouer (placé, au début du parcours)", U.profileData("p2").placed === true && U.profileData("p2").startRank === 0);
t("le code parent est commun à tous les joueurs", (() => { const g = JSON.parse(store["robotique-junior-global"]); return g.pin && g.pin.hash === "h"; })());
S.progress.learn.l2 = true; S.sound = false; U.save();
t("la progression de Léa reste à Léa, le son est commun", !("progress" in JSON.parse(store["robotique-junior-global"])) && JSON.parse(store["robotique-junior-v1"]).progress.learn.l2 === true && JSON.parse(store["robotique-junior-global"]).sound === false);
t("le code n'est pas recopié dans le profil de l'enfant", !("pin" in JSON.parse(store["robotique-junior-v1"])));
U.updateProfile("p2", { name: "Jules", age: "b" });
t("on modifie un autre joueur sans toucher au joueur actif", U.profileData("p2").name === "Jules" && U.profileData("p2").age === "b" && S.name === "Léa");
const before = S.name; const sw = U.switchProfile("p2");
t("changer de joueur : l'état est rechargé sur place, la page n'est PAS rechargée (la voix reste autorisée)", sw === true && reloads === 0 && S.name === "Jules" && S.age === "b" && U.activeId() === "p2" && JSON.parse(store["robotique-junior-global"]).active === "p2");
t("le joueur quitté est bien enregistré, le code parent reste visible pour le nouveau", JSON.parse(store["robotique-junior-v1"]).name === before && S.pin && S.pin.hash === "h" && !("progress" in {}) && Object.keys(S.progress).length === 0);
t("changer vers le joueur déjà actif ne fait rien", U.switchProfile("p2") === false);
U.switchProfile("p1");   // on repasse sur p1 pour la suite
t("retour sur le premier joueur : sa progression est revenue", S.name === "Léa" && S.progress.learn.l2 === true);
t("on ne peut pas retirer le dernier joueur", (() => { U.removeProfile("p2"); return U.profileIds().join() === "p1" && !U.removeProfile("p1"); })());
for (let i = 0; i < 12; i++) U.addProfile({ name: "N" + i, sex: "f" });
t("au plus " + U.MAX_PROFILES + " joueurs", U.profileIds().length === U.MAX_PROFILES);

// compliments
const P = await import("./praise.js");
t("modèles : {n} = prénom, [féminin|masculin] selon fille / garçon", P.expand("{n}, tu es [une championne|un champion] !", "Léa", "f") === "Léa, tu es une championne !" && P.expand("{n}, tu es [une championne|un champion] !", "Julien", "m") === "Julien, tu es un champion !");
t("sans prénom la phrase reste correcte", P.expand("Bravo {n} !", "") === "Bravo !" && P.expand("{n}, tu es [forte|fort] !", "", "f") === "Tu es forte !");
S.name = "Léa"; S.sex = "f"; S.age = "a"; const seen = new Set(); for (let i = 0; i < 300; i++) seen.add(P.praise());
t("plusieurs compliments différents (6-8 ans), avec le prénom et au féminin", seen.size >= 6 && [...seen].every(x => x.includes("Léa")) && !/\bchampion\b|intelligent\b|fort\b/.test([...seen].join(" ")), [...seen].join("|"));
S.name = "Julien"; S.sex = "m"; S.age = "c"; const m = new Set(); for (let i = 0; i < 300; i++) m.add(P.praise());
t("10-12 ans, garçon : au masculin, plus « grands »", [...m].every(x => x.includes("Julien")) && [...m].some(x => /roboticien|brillant|logique|code/.test(x)) && ![...m].some(x => /roboticienne|brillante/.test(x)));
S.sex = ""; S.age = "b"; const nx = new Set(); for (let i = 0; i < 200; i++) nx.add(P.praise());
t("sexe non choisi : jamais d'accord faux (phrases neutres)", [...nx].every(x => !/\[|\]|\|/.test(x)) && ![...nx].some(x => /douée|doué|programmeuse|programmeur|courageuse|courageux/.test(x)));
t("compliments et encouragements pour chaque âge (et les petits 3-6 ans)", ["z", "a", "b", "c"].every(a => P.BANK.win[a].length >= 7 && P.BANK.retry[a].length >= 3));
// salutations : selon l'heure, lues par la voix de l'appareil (marqueur invisible), avec le prénom
t("l'heure choisit le salut : matin, après-midi, soir (et nuit)", P.dayPart(new Date("2026-11-05T08:00:00")) === "morning" && P.dayPart(new Date("2026-11-05T14:00:00")) === "day" && P.dayPart(new Date("2026-11-05T20:30:00")) === "evening" && P.dayPart(new Date("2026-11-05T03:00:00")) === "evening");
S.name = "Léa"; S.sex = "f"; S.age = "b"; const hs = new Set(); for (let i = 0; i < 200; i++) hs.add(P.hello(new Date("2026-11-05T20:00:00")));
t("le soir : « Bonsoir Léa ! », « Salut Léa ! », « Ça fait plaisir de te revoir, Léa ! »", [...hs].every(x => x.includes("Léa")) && [...hs].some(x => x.includes("Bonsoir")) && ![...hs].some(x => x.includes("Bonjour")), [...hs].join("|"));
const hm = new Set(); for (let i = 0; i < 200; i++) hm.add(P.hello(new Date("2026-11-05T09:00:00"))); t("le matin : « Bonjour Léa ! » et jamais « Bonsoir »", [...hm].some(x => x.includes("Bonjour")) && ![...hm].some(x => x.includes("Bonsoir")));
t("les salutations sont marquées « voix de l'appareil »", [...hs, ...hm].every(x => x.startsWith(U.DEVICE)) && U.DEVICE === "⁣");
const { segmentsOf } = await import("./voiceclips.js"); const seg = segmentsOf(P.hello(new Date("2026-11-05T09:00:00")) + " Ta prochaine étape : le robot.");
t("une salutation reste en entier lue par l'appareil, la suite par les clips", seg[0][1] === true && /Léa/.test(seg[0][0]) && seg.slice(1).every(x => x[1] === false), JSON.stringify(seg));
const fr = P.fragments(); t("les morceaux à enregistrer n'ont ni prénom ni accolade", fr.length > 40 && fr.every(x => !/[{}\[\]|]/.test(x)));
console.log(bad ? "PROBLEMES: " + bad : "LES JOUEURS ET LES COMPLIMENTS FONCTIONNENT");
