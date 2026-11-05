// Voix enregistrées (femme F5 / homme M4) : clés identiques à voice/gen.py, lecture phrase par phrase, choix de l'enfant.
import { readFileSync, existsSync, readdirSync } from "node:fs";
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = { querySelector: () => null, getElementById: () => null, addEventListener() {}, body: {} };
let bad = 0; const t = (n, c, x) => { console.log(n.padEnd(84), c ? "ok" : "BUG " + (x || "")); if (!c) bad++; };
const src = f => readFileSync("./" + f, "utf8");
const { voiceKey, splitSentences, VOICE_DIR } = await import("./voiceclips.js");

t("la clé ignore ponctuation, majuscules, emojis et accents composés", voiceKey("Bravo !") === voiceKey("  bravo ✅ ") && voiceKey("Écris") === voiceKey("Écris"));
t("la clé a 8 caractères hexadécimaux", /^[0-9a-f]{8}$/.test(voiceKey("Tu as réussi !")));
t("deux phrases différentes ont deux clés différentes", voiceKey("Tu as réussi !") !== voiceKey("Tu as gagné !"));
t("découpage en phrases comme le générateur", splitSentences("Bravo ! Tu as réussi. Et après ?").length === 3 && splitSentences("✅ ").length === 0);
t("femme = F5, homme = M4", VOICE_DIR.f === "f5" && VOICE_DIR.m === "m4");

// parité avec Python : chaque clip généré porte la clé calculée ici pour sa phrase
const phrases = [...JSON.parse(src("voice/phrases.json")), ...(existsSync("voice/phrases_extra.json") ? JSON.parse(src("voice/phrases_extra.json")) : [])];
const keys = new Set(phrases.map(voiceKey));
const have = [...readdirSync("voice/clips/m4"), ...readdirSync("voice/clips/f5")].map(f => f.replace(/\.mp3$/, ""));
t("toutes les clés des clips existants correspondent à une phrase (parité JS / Python)", have.every(k => keys.has(k)), have.filter(k => !keys.has(k)).slice(0, 3).join());
t("aucune collision : deux phrases différentes n'ont jamais la même clé", (() => { const m = new Map(); for (const p of phrases) { const n = [...p.normalize("NFC").toLowerCase()].filter(c => /[\p{L}\p{N}]/u.test(c)).join(""), k = voiceKey(p); if (m.has(k) && m.get(k) !== n) return false; m.set(k, n); } return true; })());

const util = src("util.js"), vc = src("voiceclips.js"), vp = src("voicepick.js"), app = src("app.js"), sw = src("sw.js"), voice = src("voice.js");
t("speak() passe d'abord par les clips, puis par la voix de l'appareil", /stopHook\(\); speechSynthesis\.cancel\(\); if \(playHook\(spoken/.test(util) && /setClipHooks\(stopClips, playClips\)/.test(vc));
t("une phrase sans clip est lue par la voix de l'appareil (repli)", /tts\(p, next\)/.test(vc) && /return false;/.test(vc));
t("sans choix de voix, rien ne change (voix de l'appareil)", /if \(!dir\) return false/.test(vc));
t("🔇 coupe aussi les clips", /stopClips\(\); try \{ speechSynthesis\.cancel/.test(voice));
t("choix de l'enfant : 👩 et 👨, deux gros boutons, ✔ pour valider", /Voix de femme/.test(vp) && /Voix d'homme/.test(vp) && /vpok/.test(vp) && /disabled/.test(vp));
t("le choix est proposé au premier jeu, pas avant la configuration parent", /function maybePickVoice\(\) \{ if \(voicePickShown \|\| !S\.voice \|\| S\.voiceG \|\| needsParentSetup\(\)/.test(app) && /body\.append\(grid\); maybePickVoice\(\)/.test(app));
t("l'enfant peut changer dans « Mon robot » et les parents dans « Son »", /row\("Sa voix", voiceChoice\(\)\)/.test(app) && /id="svg"/.test(app) && /v\("#svg"\)/.test(app));
t("service worker : voiceclips.js et voicepick.js connus", /voiceclips\.js/.test(sw) && /voicepick\.js/.test(sw));
t("manifeste des clips présent", existsSync("voice/manifest.json"));
console.log(bad ? "PROBLEMES: " + bad : "LES VOIX ENREGISTRÉES FONCTIONNENT");
