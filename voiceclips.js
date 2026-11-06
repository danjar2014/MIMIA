// Voix enregistrée : une femme (F5), la seule voix de l'appli. Pas de choix à faire.
// Chaque phrase de l'appli a un petit clip mp3 (voice/clips/f5/<clé>.mp3, créé par voice/gen.py).
// La phrase est retrouvée par sa « clé » (même calcul que voice/gen.py) ; une phrase sans clip est lue par la voix de l'appareil.
import { S, setClipHooks, profileIds, profileData, DEVICE, whenQuiet, ttsStart, ttsEnd } from "./util.js";

// clé d'une phrase : lettres et chiffres seulement, en minuscules, puis empreinte FNV-1a 32 bits (identique à gen.py)
export function voiceKey(s) {
  const n = [...String(s).normalize("NFC").toLowerCase()].filter(c => /[\p{L}\p{N}]/u.test(c)).join("");
  let h = 2166136261; for (let i = 0; i < n.length; i++) { h ^= n.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16).padStart(8, "0");
}
export const splitSentences = t => (String(t).replace(/\s+/g, " ").trim().match(/[^.!?…]+[.!?…]*/g) || []).map(s => s.trim()).filter(s => /[\p{L}\p{N}]/u.test(s));
export const VOICE_DIR = "f5";
// le prénom d'un joueur n'a pas de clip (il peut être n'importe lequel) : on découpe le texte autour des prénoms, et le prénom est lu par la voix de l'appareil
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function segmentsOf(text) {
  const t = String(text).replace(/\s+/g, " ").trim(), names = [...new Set(profileIds().map(id => String(profileData(id).name || "").trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  const re = names.length ? new RegExp("(?<![\\p{L}\\p{N}])(" + names.map(esc).join("|") + ")(?![\\p{L}\\p{N}])", "giu") : null, out = [], has = x => /[\p{L}\p{N}]/u.test(x);
  for (const sent of t.match(/[^.!?…]+[.!?…]*/g) || []) {
    const s = sent.trim(); if (!has(s)) continue;
    if (s[0] === DEVICE) { out.push([s.slice(1).trim(), true]); continue; }   // salutation : voix de l'appareil
    if (!re) { out.push([s, false]); continue; }
    let last = 0, m; re.lastIndex = 0;
    while ((m = re.exec(s))) { const pre = s.slice(last, m.index); if (has(pre)) out.push([pre.trim(), false]); last = m.index + m[0].length; }
    const post = s.slice(last); if (has(post)) out.push([post.trim(), false]);
  }
  return out;
}

let man = null, loading = null;
export const ready = () => loading || (loading = fetch("voice/manifest.json", { cache: "no-cache" }).then(r => r.json()).then(m => { man = new Set(m.f5 || []); }).catch(() => { man = new Set(); }));
export const hasClip = text => !!(man && segmentsOf(text).some(([p, isName]) => !isName && man.has(voiceKey(p))));

let token = 0, audio = null;
export function stopClips() { token++; if (audio) { try { audio.pause(); } catch (e) {} audio = null; } }
// un morceau lu par la voix de l'appareil ; « done » n'est appelé qu'une fois, même si la fin n'est jamais signalée (garde-fou)
function tts(text, done) {
  let fired = false, wd = 0; const fin = () => { if (fired) return; fired = true; clearTimeout(wd); ttsEnd(); done(); };
  try { const u = new SpeechSynthesisUtterance(text); u.lang = "fr-FR"; u.rate = S.age === "a" ? 0.82 : 0.92; u.onend = u.onerror = fin; wd = setTimeout(fin, 1500 + text.length * 110); ttsStart(); speechSynthesis.speak(u); } catch (e) { fin(); }
}

// lit le texte avec les clips ; renvoie false s'il n'y a rien d'enregistré (l'appli utilise alors la voix de l'appareil)
export function playClips(text, onEnd) {
  if (!man) { ready(); return false; }
  const parts = segmentsOf(text).map(([p, isName]) => [p, voiceKey(p), isName]);
  if (!parts.some(([, k, nm]) => !nm && man.has(k))) return false;
  const my = ++token; let i = 0;
  const next = () => {
    if (my !== token) return;
    if (i >= parts.length) { audio = null; onEnd && onEnd(); return; }
    const [p, k, nm] = parts[i++];
    if (nm || !man.has(k)) { tts(p, next); return; }   // le prénom, ou une phrase sans clip : voix de l'appareil
    // un clip : on attend que la voix de l'appareil soit muette ; chaque morceau n'avance qu'une seule fois (fin, erreur ou refus de lecture)
    let moved = false; const go = () => { if (moved) return; moved = true; next(); }, fallback = () => { if (moved) return; moved = true; tts(p, next); };
    whenQuiet(() => {
      if (my !== token) return;
      const a = audio = new Audio(`voice/clips/${VOICE_DIR}/${k}.mp3`); a.playbackRate = S.age === "a" ? 0.92 : 1;
      a.onended = go; a.onerror = fallback; const pr = a.play(); if (pr && pr.catch) pr.catch(fallback);
    });
  };
  next(); return true;
}
setClipHooks(stopClips, playClips);
ready();
