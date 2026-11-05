// La voix, sans bavardage. Mode « guidé » (par défaut) : à chaque nouvel écran, le titre et la consigne ; ensuite seulement les résultats
// (bravo, erreur, indice). Rien d'autre ne se lit tout seul. Le bouton 🔊 relit la consigne et les choix. Le mode « complet » lit aussi tout ce qu'on touche.
// (ancien texte : chaque page, chaque touche, chaque message et chaque texte peut être entendu.)
//  - à chaque nouvel écran, la voix lit le titre et la consigne ;
//  - quand on touche un bouton, une carte, un bloc, un point de la carte…, la voix dit ce que c'est ;
//  - quand on touche un texte, la voix le lit ;
//  - les messages du robot (bravo, erreurs, indices) sont lus tout seuls ;
//  - 🔊 en bas à droite : « lire la page » ; 🔈/🔇 : voix oui ou non.
import { S, save, speak, el, voiceMode, toast, brief } from "./util.js";
import { stopClips } from "./voiceclips.js";
import { hello } from "./praise.js";

const SYMBOLS = { "▲": "monter", "▼": "descendre", "✕": "supprimer", "↶": "tourner à gauche", "↷": "tourner à droite", "−": "moins", "+": "plus", "▶": "lancer", "⬅": "retour", "↺": "recommencer", "✔": "validé", "❌": "erreur" };
export function clean(t) {
  t = String(t || "").replace(/<[^>]+>/g, " ").trim(); if (SYMBOLS[t]) return SYMBOLS[t];
  return t.replace(/[\p{Extended_Pictographic}️‍]/gu, " ").replace(/\s*→\s*/g, ", ").replace(/\s*↔\s*/g, " et ").replace(/[▶⬅]/g, " ").replace(/\s+/g, " ").trim();
}
// texte lisible d'un élément (listes déroulantes = choix actuel, dessins ignorés)
export function textOf(node) {
  const out = [];
  (function walk(n) {
    if (n.nodeType === 3) { out.push(n.nodeValue); return; }
    if (n.nodeType !== 1 || n.getAttribute("aria-hidden") === "true" || n.hidden || (n.dataset && n.dataset.silent !== undefined)) return;
    const tag = n.tagName.toLowerCase();
    if (tag === "svg" || tag === "script" || tag === "style") { if (n.dataset && n.dataset.say) out.push(" " + n.dataset.say + " "); return; }
    if (tag === "select") { const o = n.options[n.selectedIndex]; if (o) out.push(" " + o.textContent + " "); return; }
    if (tag === "input") return;
    if (n.style && n.style.display === "none") return;
    out.push(" "); n.childNodes.forEach(walk); out.push(" ");
  })(node);
  return clean(out.join(" "));
}
const isBlock = e => { const d = getComputedStyle(e).display; return d !== "inline" && d !== "contents"; };
// que dire quand on touche cet élément ?
export function labelOf(t) {
  if (!t || !t.closest || t.closest("[data-silent]")) return "";
  const say = t.closest("[data-say]"); if (say) return clean(say.dataset.say);
  if (t.closest("select,input,textarea")) return "";
  const b = t.closest("button,[role=button],a,summary,.card,.tcard");
  if (b) return clean(b.getAttribute("aria-label")) || textOf(b);
  let e = t; while (e && e.id !== "app" && e.id !== "overlay" && e !== document.body) {
    if (isBlock(e)) { const tx = textOf(e); if (tx.length >= 2 && tx.length <= 420) return tx; if (tx.length > 420) break; }
    e = e.parentElement;
  }
  return textOf(t).slice(0, 300);
}
// tout lire sur la page
export function pageText() {
  const ov = document.getElementById("overlay"), root = ov && ov.style.display && ov.style.display !== "none" && ov.children.length ? ov : document.getElementById("app");
  const parts = []; const add = sel => root.querySelectorAll(sel).forEach(n => { const x = textOf(n); if (x && !parts.includes(x)) parts.push(x); });
  add(".ttl, h1, h2"); add(".sub"); add(".intro"); add(".lesson"); add(".gmsg");
  if (root.querySelector(".grid") && !root.querySelector(".astage")) { parts.push("Touche une carte pour choisir ce que tu veux faire."); return parts.join(". "); }
  if (root.querySelector(".levels")) parts.push("Choisis une activité.");
  const stage = root.querySelector(".astage"); if (stage) { add(".rules li"); add(".chips2 span"); }
  if (!parts.length || (!root.querySelector(".intro") && !root.querySelector(".levels"))) { const all = textOf(root); if (all) parts.push(all); }
  return parts.join(". ").slice(0, 1400);
}

const joinSay = parts => parts.filter(Boolean).map(p => p.replace(/[\s.!?…]+$/, "")).filter(Boolean).join(". ");
const modeOf = () => voiceMode();
// les plus petits ne lisent pas encore les réponses : la voix les énumère après la consigne (seulement pour les 6-8 ans, seulement en mode guidé)
const choiceTail = () => { if (S.age !== "a" || modeOf() !== "guide") return ""; const ch = [...document.querySelectorAll(".lchoice, .dchoice")].map(b => textOf(b)).filter(Boolean); return ch.length ? ". Les réponses : " + ch.join(" ; ") : ""; };
const overlayShown = () => { const ov = document.getElementById("overlay"); return ov && ov.style.display && ov.style.display !== "none" && ov.children.length ? ov : null; };
// l'essentiel de l'écran qui vient d'apparaître : le titre et la consigne, pas le reste
export function pageBrief() {
  const ov = overlayShown(); if (ov) { if (ov.querySelector("[data-silent]")) return ""; const b = ov.querySelector(".obbubbles");   // les écrans des parents ne sont jamais lus
     if (b) return textOf(b); const h = ov.querySelector("h1"), p = ov.querySelector(".sub"); return joinSay([h && textOf(h), p && textOf(p)]); }
  const app = document.getElementById("app"), home = app.querySelector(".homebody");
  if (app.querySelector(".ptbody")) return "";   // les activités des petits disent elles-mêmes leur consigne
  if (home) { const g = app.querySelector(".greet"), hero = app.querySelector(".herotile b"); return joinSay([g ? textOf(g) : hello(), hero && "Ta prochaine étape : " + textOf(hero)]); }   // « Bonjour Léa ! » avec le prénom
  const ttl = app.querySelector(".ttl"), t = ttl ? textOf(ttl) : "";
  if (app.querySelector(".levels") || app.querySelector(".badgegrid")) return t;
  const lt = app.querySelector(".lbox .lt"), intro = app.querySelector(".astage .intro");
  return joinSay([t, lt ? textOf(lt) : intro ? textOf(intro) : ""]) + (lt ? choiceTail() : "");
}
// ce que lit le bouton 🔊 : la consigne, les réponses possibles et le dernier résultat
export function consigne() {
  const ov = overlayShown(), root = ov || document.getElementById("app"), parts = [];
  const lt = root.querySelector(".lbox .lt, .obbubbles"), intro = root.querySelector(".astage .intro"), ttl = root.querySelector(".ttl, h1");
  if (ttl) parts.push(textOf(ttl)); if (intro) parts.push(textOf(intro)); if (lt) parts.push(textOf(lt));
  const les = root.querySelector(".lesson"); if (les && !lt) parts.push(textOf(les));
  const ch = [...root.querySelectorAll(".lchoice, .dchoice, .obchoice")].map(b => textOf(b)).filter(Boolean); if (ch.length) parts.push("Les réponses possibles : " + ch.join(" ; "));
  const fb = [...root.querySelectorAll(".gmsg.ok, .gmsg.warn, .gmsg.hint")].map(n => textOf(n)).filter(Boolean).pop(); if (fb && fb !== (lt && textOf(lt))) parts.push(fb);
  if (!parts.length) { const g = root.querySelector(".greet"); if (g) parts.push(textOf(g)); }
  return [...new Set(parts)].join(". ").slice(0, 900);
}

export function initVoice() {
  const app = document.getElementById("app"), overlay = document.getElementById("overlay");
  let pageAt = 0, pageT = 0, msgT = 0, rangeT = 0; const seen = new WeakMap();

  // 1. toucher = entendre
  document.addEventListener("click", e => { if (!S.voice || modeOf() !== "complet" || e.target.closest("#voicebar")) return; const x = labelOf(e.target); if (x) speak(x); }, true);
  document.addEventListener("change", e => { if (!S.voice || modeOf() !== "complet") return; const t = e.target; if (t.tagName === "SELECT") { const o = t.options[t.selectedIndex]; if (o) speak(clean(o.textContent)); } }, true);
  document.addEventListener("input", e => { if (!S.voice || modeOf() !== "complet") return; const t = e.target; if (t.type !== "range") return; clearTimeout(rangeT); rangeT = setTimeout(() => { const l = t.closest("label"); speak(l ? textOf(l) : t.value); }, 350); }, true);

  // 2. les messages : en mode guidé, seulement les CONSIGNES (texte principal d'une leçon, d'une question) et les RÉSULTATS (bravo, erreur, indice)
  const feedbackOf = n => /\s(ok|warn|hint)\s/.test(" " + n.className + " ");
  const instrOf = n => n.matches(".lt, .obbubbles") || !!n.closest(".obbubbles");
  const say = () => {
    const items = [...document.querySelectorAll(".gmsg, .toast")].filter(n => n.textContent.trim() && !n.closest("#overlay .pinpanel")); if (!items.length) return;
    if (modeOf() === "complet") { const last = items.pop(), tx = textOf(last); if (tx && seen.get(last) !== tx) { seen.set(last, tx); speak(tx, { prio: 2 }); } return; }
    // guidé / à la demande : on regarde les messages qui ont changé, on lit le dernier qui compte
    const changed = items.filter(n => n.classList.contains("gmsg") && seen.get(n) !== textOf(n)); changed.forEach(n => seen.set(n, textOf(n)));
    const last = changed.reverse().find(n => feedbackOf(n) || instrOf(n)); if (last) { const fb = feedbackOf(last); speak(fb ? textOf(last) : brief(textOf(last)) + choiceTail(), { prio: fb ? 2 : 1, interrupt: true, full: !fb }); }
  };
  new MutationObserver(ms => {
    if (ms.some(m => m.target === app || m.target === overlay)) pageAt = Date.now();
    if (!S.voice || Date.now() - pageAt < 900) return;
    if (!ms.some(m => { const n = m.target.nodeType === 3 ? m.target.parentElement : m.target; if (n && n.closest && n.closest(".gmsg, .toast")) return true; return [...m.addedNodes].some(a => a.nodeType === 1 && (a.matches(".gmsg, .toast") || a.querySelector(".gmsg, .toast"))); })) return;
    clearTimeout(msgT); msgT = setTimeout(say, 90);
  }).observe(document.body, { childList: true, characterData: true, subtree: true });

  // 3. chaque nouvel écran : le titre et la consigne (jamais toute la page)
  const pageChanged = () => {
    pageAt = Date.now(); clearTimeout(pageT);
    pageT = setTimeout(() => { if (!S.voice) return; document.querySelectorAll(".gmsg").forEach(n => seen.set(n, textOf(n))); const t = modeOf() === "complet" && S.age !== "z" ? pageText() : pageBrief(); if (t) speak(t, { prio: 1, interrupt: true }); /* les petits : seulement l'essentiel */ if (modeOf() === "demande" && !S.voiceHintShown && S.voice && app.querySelector(".astage")) { S.voiceHintShown = true; save(); toast("🔊 Touche le haut-parleur pour écouter la consigne.", 4500); } }, 550);
  };
  new MutationObserver(pageChanged).observe(app, { childList: true });
  new MutationObserver(() => { if (overlay.style.display !== "none" && overlay.children.length) pageChanged(); }).observe(overlay, { childList: true, attributes: true, attributeFilter: ["style"] });

  // 4. boutons toujours visibles : relire la consigne, voix oui / non
  const bar = el("div", "");
  bar.id = "voicebar";
  const read = el("button", "vb", "🔊"), mute = el("button", "vb", ""); read.setAttribute("aria-label", "Lire la consigne"); mute.setAttribute("aria-label", "Voix oui ou non");
  const paint = () => { mute.textContent = S.voice ? "🔈" : "🔇"; mute.classList.toggle("off", !S.voice); };
  read.onclick = () => { if (!S.voice) { S.voice = true; save(); paint(); } speak(modeOf() === "complet" ? pageText() : consigne(), { force: true }); };
  mute.onclick = () => { S.voice = !S.voice; save(); paint(); stopClips(); try { speechSynthesis.cancel(); } catch (x) {} if (S.voice) speak("La voix est activée.", { force: true }); };
  paint(); bar.append(read, mute); document.body.append(bar);
  setInterval(paint, 1500);
}
