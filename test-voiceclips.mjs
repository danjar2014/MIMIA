// Voix enregistrée (femme F5) : clés identiques à voice/gen.py, lecture phrase par phrase, aucun choix de voix.
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
t("une seule voix : la femme (F5), pas de voix d'homme", VOICE_DIR === "f5" && !existsSync("voice/clips/m4") && !existsSync("voicepick.js"));

// parité avec Python : chaque clip généré porte la clé calculée ici pour sa phrase
const phrases = readdirSync("voice").filter(f => /^phrases.*\.json$/.test(f)).flatMap(f => JSON.parse(src("voice/" + f)));
const keys = new Set(phrases.map(voiceKey));
const have = readdirSync("voice/clips/f5").map(f => f.replace(/\.mp3$/, ""));
t("toutes les clés des clips existants correspondent à une phrase (parité JS / Python)", have.every(k => keys.has(k)), have.filter(k => !keys.has(k)).slice(0, 3).join());
t("aucune collision : deux phrases différentes n'ont jamais la même clé", (() => { const m = new Map(); for (const p of phrases) { const n = [...p.normalize("NFC").toLowerCase()].filter(c => /[\p{L}\p{N}]/u.test(c)).join(""), k = voiceKey(p); if (m.has(k) && m.get(k) !== n) return false; m.set(k, n); } return true; })());

const util = src("util.js"), vc = src("voiceclips.js"), app = src("app.js"), sw = src("sw.js"), voice = src("voice.js"), css = src("style.css");
t("speak() arrête tout, attend que la voix de l'appareil soit muette, puis passe par les clips avant la voix de l'appareil", /stopHook\(\); speechSynthesis\.cancel\(\);/.test(util) && /whenQuiet\(\(\) => \{/.test(util) && /playHook\(spoken/.test(util) && /setClipHooks\(stopClips, playClips\)/.test(vc));
t("une phrase sans clip est lue par la voix de l'appareil (repli)", /tts\(p, next\)/.test(vc) && /return false;/.test(vc));
t("la voix est toujours la femme : aucun réglage ni écran de choix (enfant, Mon robot, parents)", !/voiceG|voicepick|pickVoice|voiceChoice|Qui parle|id=\"svg\"/.test(app + vc + util) && !/vpick|vpb/.test(css));
t("🔇 coupe aussi les clips", /stopClips\(\); try \{ speechSynthesis\.cancel/.test(voice));
t("service worker : voiceclips.js connu, voicepick.js retiré", /voiceclips\.js/.test(sw) && !/voicepick/.test(sw));
t("manifeste des clips présent", existsSync("voice/manifest.json"));
console.log(bad ? "PROBLEMES: " + bad : "LA VOIX ENREGISTRÉE FONCTIONNE");
