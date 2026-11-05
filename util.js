// Outils communs : DOM, état sauvegardé, voix, sons, messages
export const $ = s => document.querySelector(s);
export const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
export const rnd = n => Math.floor(Math.random() * n);
export const pick = a => a[rnd(a.length)];
export const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const sleep = ms => new Promise(r => setTimeout(r, ms));

const KEY = "robotique-junior-v1";
const DEFAULTS = { name: "", age: "", voice: true, sound: true, mascot: true, scene: true, voiceMode: "auto", calm: false, big: false, reminder: 15, progress: {}, creations: [],
  robot: { name: "Bolt", color: "#3f7fd6", head: "round", eyes: "dots", antenna: true } };
export const S = (() => { try { const o = JSON.parse(localStorage.getItem(KEY) || "{}"); return Object.assign({}, DEFAULTS, o, { robot: Object.assign({}, DEFAULTS.robot, o.robot || {}) }); } catch (e) { return JSON.parse(JSON.stringify(DEFAULTS)); } })();
// un réglage « guidé » enregistré avant le choix selon l'âge n'était pas un vrai choix des parents : on le remet en automatique
if (S.voiceMode === "guide" && !S.voiceModeSet) S.voiceMode = "auto";
// la voix selon l'âge : les 6-8 ans lisent encore mal (consigne, réponses et résultat à voix haute) ;
// les 8-10 ans lisent la consigne et le résultat ; les 10-12 ans lisent seuls (la voix ne parle que sur demande, bouton 🔊)
export const VOICE_BY_AGE = { a: "guide", b: "guide", c: "demande" };
export const voiceMode = () => { const m = S.voiceMode || "auto"; return m === "auto" ? (VOICE_BY_AGE[S.age] || "guide") : m; };
export const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
export const isDone = (sec, id) => !!(S.progress[sec] && S.progress[sec][id]);
// le suivi pour les parents (stats.js) s'accroche ici, sans que util.js le connaisse
export const hooks = { fail: null, done: null };
export const markDone = (sec, id) => { (S.progress[sec] = S.progress[sec] || {})[id] = true; save(); if (hooks.done) { try { hooks.done(sec, id); } catch (e) {} } };

let actx;
const ctx = () => (actx = actx || new (window.AudioContext || window.webkitAudioContext)());
export function tone(freq, dur = 0.35, type = "sine", gain = 0.18, delay = 0) {
  if (!S.sound) return;
  try { const c = ctx(), o = c.createOscillator(), g = c.createGain(), t = c.currentTime + delay; o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05); } catch (e) {}
}
export const chime = kind => { if (kind === "no" && hooks.fail) { try { hooks.fail(); } catch (e) {} } const n = kind === "ok" ? [[523, 0], [784, 0.13]] : kind === "done" ? [[523, 0], [659, 0.14], [784, 0.28], [1047, 0.42]] : kind === "step" ? [[660, 0]] : [[300, 0]]; n.forEach(([f, d]) => tone(f, 0.5, "sine", kind === "no" ? 0.06 : 0.13, d)); };
// ----- la voix : UNE règle pour toute l'appli -----
// Modes (réglage des parents) :  « guide » (par défaut) lit la consigne et le résultat, rien d'autre ;
// « demande » ne lit que quand on touche 🔊 ; « complet » lit tout ce qu'on touche (ancien comportement).
// Priorités : 0 ambiance (seulement en complet) · 1 consigne · 2 résultat (bravo, erreur, indice) · 3 demandé par l'enfant (bouton 🔊).
// Une phrase plus importante n'est jamais coupée par une moins importante ; la même phrase n'est jamais redite dans les 15 s.
let lastSaid = "", lastAt = 0, lastPrio = -1, speakingUntil = 0;
const normT = t => String(t).replace(/<[^>]+>/g, " ").replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
const similar = (a, b) => { if (!a || !b) return false; if (a === b) return true; const n = Math.min(a.length, b.length); if (n < 14) return false; let i = 0; while (i < n && a[i] === b[i]) i++; return i >= Math.min(24, n); };
// pas de roman : on garde les premières phrases (240 caractères au plus) sauf si l'enfant demande tout
export function brief(text, max = 240) {
  const t = String(text).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); if (t.length <= max) return t;
  const parts = t.match(/[^.!?…]+[.!?…]*\s*/g) || [t]; let out = ""; for (const p of parts) { if ((out + p).length > max && out) break; out += p; } return (out || t.slice(0, max)).trim();
}
let stopHook = () => {}, playHook = () => false;
export const setClipHooks = (stop, play) => { stopHook = stop; playHook = play; };
export function speak(text, opts = {}) {
  if (!S.voice || !text) return;
  const mode = voiceMode(), force = !!opts.force, prio = opts.prio ?? (force ? 3 : 1);
  if (!force && (mode === "demande" || (prio === 0 && mode !== "complet"))) return;
  const raw = String(text).replace(/<[^>]+>/g, " "), spoken = force || opts.full ? raw : brief(raw), k = normT(spoken), now = Date.now();
  if (k === lastSaid && now - lastAt < (force ? 800 : 15000)) return;
  if (!force && similar(k, lastSaid) && now - lastAt < 4000) return;
  if (!force && !opts.interrupt && now < speakingUntil && lastPrio > prio) return;
  lastSaid = k; lastAt = now; lastPrio = prio; speakingUntil = now + Math.min(12000, 700 + spoken.length * 65);
  try { stopHook(); speechSynthesis.cancel(); if (playHook(spoken, () => { speakingUntil = 0; })) return; const u = new SpeechSynthesisUtterance(spoken); u.lang = "fr-FR"; u.rate = S.age === "a" ? 0.82 : 0.92; u.onend = u.onerror = () => { speakingUntil = 0; };
    const v = speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith("fr")); if (v) u.voice = v; speechSynthesis.speak(u); } catch (e) {}
}
let toastT;
export function toast(msg, ms = 2400) { document.querySelectorAll(".toast").forEach(x => x.remove()); const e = el("div", "toast", msg); document.body.append(e); clearTimeout(toastT); toastT = setTimeout(() => e.remove(), ms); }
