// Outils communs : DOM, état sauvegardé, voix, sons, messages
import { LANG, tr, SPEECH_LANG } from "./i18n.js";
export { LANG, tr };
export const $ = s => document.querySelector(s);
export const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
export const rnd = n => Math.floor(Math.random() * n);
export const pick = a => a[rnd(a.length)];
export const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const sleep = ms => new Promise(r => setTimeout(r, ms));

const KEY = "robotique-junior-v1", GKEY = "robotique-junior-global";
const DEFAULTS = { name: "", sex: "", age: "", voice: true, sound: true, mascot: true, scene: true, voiceMode: "auto", calm: false, big: false, reminder: 15, progress: {}, creations: [],
  robot: { name: "Bolt", color: "#3f7fd6", head: "round", eyes: "dots", antenna: true } };
// Plusieurs joueurs : les réglages de l'appareil et des parents (code, voix, écran…) sont communs ; la progression, le prénom, le robot… sont propres à chaque joueur.
const GLOBAL = ["pin", "pinFail", "parentSetup", "voice", "sound", "voiceMode", "voiceModeSet", "mascot", "scene", "calm", "big", "reminder", "kiosk", "lastHello"];
const readJ = k => { try { return JSON.parse(localStorage.getItem(k) || "null") || {}; } catch (e) { return {}; } };
const pkey = id => (id === "p1" ? KEY : KEY + "-" + id);   // le premier joueur garde l'ancienne clé : rien ne se perd à la mise à jour
const G = (() => {
  let g = readJ(GKEY);
  if (!Array.isArray(g.profiles) || !g.profiles.length) { const old = readJ(KEY); g = { profiles: ["p1"], active: "p1" }; for (const k of GLOBAL) if (k in old) g[k] = old[k]; }
  if (!g.profiles.includes(g.active)) g.active = g.profiles[0]; return g;
})();
const fresh = o => Object.assign({}, DEFAULTS, o, { robot: Object.assign({}, DEFAULTS.robot, (o && o.robot) || {}) });
// L'état du joueur actif. On le remplit « sur place » (loadInto) quand on change de joueur : la page n'est pas rechargée, donc la voix et les sons restent autorisés.
export const S = {};
function loadInto() {
  for (const k of Object.keys(S)) delete S[k];
  try { Object.assign(S, fresh(readJ(pkey(G.active)))); } catch (e) { Object.assign(S, JSON.parse(JSON.stringify(DEFAULTS))); }
  for (const k of GLOBAL) if (k in G) S[k] = G[k];
  if (S.voiceMode === "guide" && !S.voiceModeSet) S.voiceMode = "auto";
}
loadInto();
// (un réglage « guidé » enregistré avant le choix selon l'âge n'était pas un vrai choix des parents : loadInto() le remet en automatique)
// la voix selon l'âge : les 6-8 ans lisent encore mal (consigne, réponses et résultat à voix haute) ;
// les 8-10 ans lisent la consigne et le résultat ; les 10-12 ans lisent seuls (la voix ne parle que sur demande, bouton 🔊)
export const VOICE_BY_AGE = { z: "complet", a: "guide", b: "guide", c: "demande" };
export const voiceMode = () => { const m = S.voiceMode || "auto"; return m === "auto" ? (VOICE_BY_AGE[S.age] || "guide") : m; };
const persistG = () => { try { localStorage.setItem(GKEY, JSON.stringify(G)); } catch (e) {} };
export const save = () => {
  try { const mine = {}; for (const k of Object.keys(S)) { if (GLOBAL.includes(k)) G[k] = S[k]; else mine[k] = S[k]; } persistG(); localStorage.setItem(pkey(G.active), JSON.stringify(mine)); } catch (e) {}
};
// ----- les joueurs (profils) -----
export const MAX_PROFILES = 8;
export const profileIds = () => G.profiles.slice();
export const activeId = () => G.active;
export const profileData = id => (id === G.active ? S : fresh(readJ(pkey(id))));
export function addProfile(fields) {
  if (G.profiles.length >= MAX_PROFILES) return null;
  let n = 2; while (G.profiles.includes("p" + n)) n++; const id = "p" + n;
  G.profiles.push(id); persistG(); try { localStorage.setItem(pkey(id), JSON.stringify(Object.assign({ placed: true, startRank: 0 }, fields))); } catch (e) {} return id;
}
export function updateProfile(id, fields) {
  if (id === G.active) { Object.assign(S, fields); save(); return; }
  try { localStorage.setItem(pkey(id), JSON.stringify(Object.assign(readJ(pkey(id)), fields))); } catch (e) {}
}
// retire un joueur (le dernier ne peut pas être retiré) ; si c'était le joueur actif, on passe au premier
export function removeProfile(id) {
  if (G.profiles.length < 2 || !G.profiles.includes(id)) return false;
  const wasActive = id === G.active; G.profiles = G.profiles.filter(x => x !== id); try { localStorage.removeItem(pkey(id)); } catch (e) {}
  if (wasActive) { G.active = G.profiles[0]; persistG(); loadInto(); } else persistG();
  return true;
}
// change de joueur : on enregistre l'actuel puis on charge l'autre dans le même état S (sans recharger la page)
export function switchProfile(id) {
  if (!G.profiles.includes(id) || id === G.active) return false;
  save(); G.active = id; persistG(); loadInto(); return true;
}


export const isDone = (sec, id) => !!(S.progress[sec] && S.progress[sec][id]);
// le suivi pour les parents (stats.js) s'accroche ici, sans que util.js le connaisse
export const hooks = { fail: null, done: null };
export const markDone = (sec, id) => { (S.progress[sec] = S.progress[sec] || {})[id] = true; save(); if (hooks.done) { try { hooks.done(sec, id); } catch (e) {} } };

let actx;
const ctx = () => { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === "suspended") { try { actx.resume(); } catch (e) {} } return actx; };
// un son créé avant le premier toucher reste « suspendu » : on le réveille au premier toucher
if (typeof document !== "undefined" && document.addEventListener) document.addEventListener("pointerdown", () => { try { if (actx && actx.state === "suspended") actx.resume(); } catch (e) {} }, true);
export function tone(freq, dur = 0.35, type = "sine", gain = 0.18, delay = 0) {
  if (!S.sound) return;
  try { const c = ctx(), o = c.createOscillator(), g = c.createGain(), t = c.currentTime + delay; o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05); } catch (e) {}
}
// bruitages du robot : avancer, tourner, sauter, cogner… (pas de fichier : des sons synthétisés)
export function slide(f0, f1, dur = 0.2, type = "sine", gain = 0.16, delay = 0) {
  if (!S.sound) return;
  try { const c = ctx(), o = c.createOscillator(), g = c.createGain(), t = c.currentTime + delay; o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05); } catch (e) {}
}
export function sfx(kind) {
  if (kind === "move") { tone(262, 0.06, "square", 0.07); tone(330, 0.08, "square", 0.07, 0.07); }
  else if (kind === "turn") slide(380, 760, 0.2, "triangle", 0.14);
  else if (kind === "jump") { slide(220, 640, 0.12, "sine", 0.18); slide(640, 260, 0.2, "sine", 0.14, 0.12); }
  else if (kind === "spin") { slide(300, 900, 0.14, "triangle", 0.12); slide(900, 300, 0.14, "triangle", 0.12, 0.14); }
  else if (kind === "bump") tone(110, 0.22, "sawtooth", 0.14);
  else if (kind === "beep") tone(880, 0.08, "square", 0.09);
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
// une phrase qui commence par ce caractère invisible est lue par la voix de l'appareil, jamais par les clips (salutations avec le prénom)
export const DEVICE = "\u2063";
// La voix de l'appareil et les clips ne doivent jamais parler en même temps : avant de démarrer, on attend que la voix de l'appareil soit
// vraiment muette (sur Android, speechSynthesis.cancel() peut tarder ; deux voix se chevauchaient).
let ttsActive = 0, quietGen = 0, quietGap = 160;
export const audioRunning = () => { try { return ctx().state === "running"; } catch (e) { return false; } };
export const setQuietGap = ms => { quietGap = ms; };   // (les tests le mettent à 0)
export const ttsStart = () => { ttsActive++; };
export const ttsEnd = () => { ttsActive = Math.max(0, ttsActive - 1); };
const deviceBusy = () => { try { return !!(speechSynthesis.speaking || speechSynthesis.pending); } catch (e) { return false; } };
export function whenQuiet(fn, gap = 0) {
  const my = ++quietGen, t0 = Date.now();
  const tick = () => { if (my !== quietGen) return; const waited = Date.now() - t0; if ((deviceBusy() || waited < gap) && waited < 700) { setTimeout(tick, 30); return; } fn(); };
  tick();
}
let stopHook = () => {}, playHook = () => false;
export const setClipHooks = (stop, play) => { stopHook = stop; playHook = play; };
// la salutation (Bonjour, Bonsoir, Salut…) n'est dite qu'à la première ouverture de la journée, pas à chaque rechargement
export function greetOnce() { const d = new Date(), day = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; if (S.lastHello === day) return false; S.lastHello = day; save(); return true; }
export const APP_VERSION = "5.2";   // affichée dans l'animation d'accueil
// le prénom n'est lu que dans les salutations de la première page (texte préfixé par DEVICE), jamais dans les jeux
function stripNames(t) {
  const names = [...new Set(profileIds().map(id => String(profileData(id).name || "").trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!names.length) return t;
  const re = new RegExp("(?<![\\p{L}\\p{N}])(" + names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")(?![\\p{L}\\p{N}])", "giu");
  return t.replace(re, " ").replace(/\s+([,.!?،؟])/g, "$1").replace(/([,;:،؛])\s*([.!?؟])/g, "$2").replace(/\s{2,}/g, " ").replace(/^[\s,;:.!?،؛؟-]+/, "").trim().replace(/^./u, c => c.toUpperCase());
}
let pendT = 0;
export function speak(text, opts = {}) {
  if (!S.voice || !text) return;
  const mode = voiceMode(), force = !!opts.force, prio = opts.prio ?? (force ? 3 : 1);
  if (!force && (mode === "demande" || (prio === 0 && mode !== "complet"))) return;
  const raw0 = tr(String(text)).replace(/<[^>]+>/g, " "), raw = raw0.trim()[0] === DEVICE ? raw0 : stripNames(raw0), spoken = force || opts.full ? raw : brief(raw), k = normT(spoken), now = Date.now();
  // « again » : une consigne d'un jeu est toujours dite, même si c'est la même phrase que juste avant (deux fois « Touche le robot rouge »)
  if (!opts.again && k === lastSaid && now - lastAt < (force ? 800 : 15000)) return;
  if (!force && !opts.again && similar(k, lastSaid) && now - lastAt < 4000) return;
  if (!force && !opts.interrupt && !opts.queue && now < speakingUntil && lastPrio > prio) return;
  // un compliment ou une correction en cours n'est jamais coupé par la consigne suivante : elle attend la fin de la phrase (6 s au plus)
  if (force) { clearTimeout(pendT); pendT = 0; }
  else if (!opts._w && now < speakingUntil && (lastPrio >= 2 || opts.queue)) {   // « queue » : la consigne attend la fin du nom du jeu au lieu de le couper
    clearTimeout(pendT); const t0 = now, again = () => { if (Date.now() < speakingUntil && Date.now() - t0 < 6000) { pendT = setTimeout(again, 80); return; } pendT = 0; speak(text, { ...opts, interrupt: true, queue: false, _w: true }); };
    pendT = setTimeout(again, 80); return;
  }
  lastSaid = k; lastAt = now; lastPrio = prio; speakingUntil = now + Math.min(12000, 700 + spoken.length * 65);
  const hadTts = ttsActive > 0; ttsActive = 0;
  try { stopHook(); speechSynthesis.cancel(); } catch (e) {}
  whenQuiet(() => {
    try {
      const fin = () => { speakingUntil = 0; const f = opts.onEnd; opts.onEnd = null; if (f) f(); };
      if (playHook(spoken, fin)) return;
      const u = new SpeechSynthesisUtterance(spoken.replace(/\u2063/g, "")); u.lang = SPEECH_LANG; u.rate = S.age === "a" ? 0.82 : 0.92; u.onend = () => { ttsEnd(); fin(); }; u.onerror = e => { ttsEnd(); if (e && (e.error === "interrupted" || e.error === "canceled")) speakingUntil = 0; else fin(); };
      const v = speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith(LANG)); if (v) u.voice = v; ttsStart(); speechSynthesis.speak(u);
    } catch (e) {}
  }, hadTts ? quietGap : 0);
}
let toastT;
export function toast(msg, ms = 2400) { document.querySelectorAll(".toast").forEach(x => x.remove()); const e = el("div", "toast", msg); document.body.append(e); clearTimeout(toastT); toastT = setTimeout(() => e.remove(), ms); }
