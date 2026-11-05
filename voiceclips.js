// Voix enregistrées : une femme (F5) ou un homme (M4), au choix de l'enfant (S.voiceG = "f" ou "m").
// Chaque phrase de l'appli a un petit clip mp3 (voice/clips/<voix>/<clé>.mp3, créé par voice/gen.py).
// La phrase est retrouvée par sa « clé » (même calcul que voice/gen.py) ; une phrase sans clip est lue par la voix de l'appareil.
import { S, setClipHooks } from "./util.js";

// clé d'une phrase : lettres et chiffres seulement, en minuscules, puis empreinte FNV-1a 32 bits (identique à gen.py)
export function voiceKey(s) {
  const n = [...String(s).normalize("NFC").toLowerCase()].filter(c => /[\p{L}\p{N}]/u.test(c)).join("");
  let h = 2166136261; for (let i = 0; i < n.length; i++) { h ^= n.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16).padStart(8, "0");
}
export const splitSentences = t => (String(t).replace(/\s+/g, " ").trim().match(/[^.!?…]+[.!?…]*/g) || []).map(s => s.trim()).filter(s => /[\p{L}\p{N}]/u.test(s));
export const VOICE_DIR = { f: "f5", m: "m4" };

let man = null, loading = null;
export const ready = () => loading || (loading = fetch("voice/manifest.json", { cache: "no-cache" }).then(r => r.json()).then(m => { man = { f5: new Set(m.f5 || []), m4: new Set(m.m4 || []) }; }).catch(() => { man = { f5: new Set(), m4: new Set() }; }));
export const hasClip = (text, g = S.voiceG) => !!(man && VOICE_DIR[g] && splitSentences(text).some(p => man[VOICE_DIR[g]].has(voiceKey(p))));

let token = 0, audio = null;
export function stopClips() { token++; if (audio) { try { audio.pause(); } catch (e) {} audio = null; } }
function tts(text, done) { try { const u = new SpeechSynthesisUtterance(text); u.lang = "fr-FR"; u.rate = S.age === "a" ? 0.82 : 0.92; u.onend = u.onerror = done; speechSynthesis.speak(u); } catch (e) { done(); } }

// lit le texte avec les clips ; renvoie false s'il n'y a rien d'enregistré (l'appli utilise alors la voix de l'appareil)
export function playClips(text, onEnd) {
  const dir = VOICE_DIR[S.voiceG]; if (!dir) return false;
  if (!man) { ready(); return false; }
  const parts = splitSentences(text).map(p => [p, voiceKey(p)]);
  if (!parts.some(([, k]) => man[dir].has(k))) return false;
  const my = ++token; let i = 0;
  const next = () => {
    if (my !== token) return;
    if (i >= parts.length) { audio = null; onEnd && onEnd(); return; }
    const [p, k] = parts[i++];
    if (!man[dir].has(k)) { tts(p, next); return; }
    const a = audio = new Audio(`voice/clips/${dir}/${k}.mp3`); a.playbackRate = S.age === "a" ? 0.92 : 1;
    a.onended = next; a.onerror = () => tts(p, next); const pr = a.play(); if (pr && pr.catch) pr.catch(() => tts(p, next));
  };
  next(); return true;
}
setClipHooks(stopClips, playClips);
if (S.voiceG) ready();
