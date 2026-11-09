// Langue de l'appli : français (par défaut) ou anglais, choisie au tout début (stockée sur l'appareil).
// L'anglais passe par un dictionnaire « texte français -> texte anglais » (i18n/en.json) appliqué à tout ce qui s'affiche
// (textes, aria-label, bulles, etc.) et à tout ce que la voix lit. Les gabarits {1}, {2}… couvrent les phrases avec des valeurs.
const LKEY = "robotique-junior-lang";
let stored = null; try { stored = localStorage.getItem(LKEY); } catch (e) {}
// l'arabe est prêt (i18n/ar.json) mais désactivé pour le moment : pour le remettre, ajouter "ar" ici et les boutons dans app.js
const LANGS = ["fr", "en"];
export const LANG = LANGS.includes(stored) ? stored : "fr";
export const langChosen = () => LANGS.includes(stored);
export const setLang = l => { try { localStorage.setItem(LKEY, LANGS.includes(l) ? l : "fr"); } catch (e) {} };
export const SPEECH_LANG = { fr: "fr-FR", en: "en-US", ar: "ar-SA" }[LANG];
export const RTL = LANG === "ar";   // l'arabe s'écrit de droite à gauche
try { document.documentElement.lang = LANG; document.documentElement.dir = RTL ? "rtl" : "ltr"; } catch (e) {}

const norm = s => String(s).replace(/[  ]/g, " ").replace(/\s+/g, " ").replace(/\s+([:;!?])/g, "$1");   // « Bravo !» et « Bravo! » sont le même texte
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
let dict = Object.create(null), tpls = [], ready = LANG === "fr";
if (LANG !== "fr") {
  try {
    const r = await fetch("i18n/" + LANG + ".json"); const j = await r.json();
    for (const k of Object.keys(j)) {
      const key = norm(k).trim(), val = j[k];
      if (/\{\d+\}/.test(key)) {
        // deux valeurs séparées par une seule espace (« {1} {2} bonne… ») : la première prend le plus possible, la seconde le mot qui précède
        const parts = key.split(/\{\d+\}/); let src = "^";
        parts.forEach((p, i) => { src += esc(p); if (i < parts.length - 1) src += i + 1 < parts.length - 1 && parts[i + 1] === " " ? "(.*)" : "(.*?)"; });
        const re = new RegExp(src + "$", "s");
        tpls.push({ re, en: val, weight: parts.join("").length });
      } else dict[key] = val;
    }
    tpls.sort((a, b) => b.weight - a.weight); ready = true;
  } catch (e) { ready = false; }
}
const cache = new Map();
const SENT = /[.!?…]\s+\p{L}/u;   // une coupure de phrase
// gabarits {1}… : les valeurs captées sont traduites à leur tour ; un gabarit « faible » (peu de texte fixe) ne doit pas avaler plusieurs phrases
function tplTry(core, depth, strong) {
  for (const t of tpls) {
    if ((t.weight >= 14) !== strong) continue; const m = t.re.exec(core); if (!m) continue;
    let ok = true; for (let i = 1; i < m.length; i++) if (m[i] && SENT.test(m[i])) { ok = false; break; } if (!ok) continue;
    return t.en.replace(/\{(\d+)\}/g, (_, i) => { const g = m[+i] == null ? "" : m[+i], lead = /^\s*/.exec(g)[0], trail = /\s*$/.exec(g)[0]; return depth < 4 ? lead + trCore(g.trim(), depth + 1) + trail : g; });
  }
  return null;
}
// « Super.» pour « Super ! » : on essaie les autres ponctuations
function punct(c) {
  const m = /^(.*?)\s*([.!?…]+)$/su.exec(c); if (!m) return null; const base = m[1];
  for (const v of [base, base + "!", base + "?", base + ".", base + "…"]) if (v in dict) { const h = dict[v]; return /[.!?…]$/.test(h) ? h : h + m[2]; }
  return null;
}
// morceaux : « A · B », « A : B », « Texte (0/8) », « 🎉 Texte » ; renvoie null si rien n'a changé
function trPieces(c, depth) {
  if (depth > 4) return null;
  for (const sep of [" · ", ": "]) if (c.includes(sep)) { const parts = c.split(sep), outp = parts.map(p => trCore(p.trim(), depth + 1)); if (outp.some((o, i) => o !== parts[i].trim())) return outp.join(sep); }
  const cnt = /^(.*?)\s*(\(\d+(?:\/\d+)?\))$/su.exec(c); if (cnt && cnt[1]) { const h = trCore(cnt[1], depth + 1); if (h !== cnt[1]) return h + " " + cnt[2]; }
  const em = /^([^\p{L}\p{N}{]+)(.+)$/su.exec(c); if (em) { const h = trCore(em[2], depth + 1); if (h !== em[2]) return em[1] + h; }
  // listes « mot, mot, mot » (le code lu à voix haute) : les plus longs groupes connus
  if (c.includes(", ")) {
    const toks = c.split(", "); let i = 0, any = false; const out = [];
    while (i < toks.length) { let done = false; for (let j = toks.length; j > i; j--) { const h = trSentence(toks.slice(i, j).join(", "), depth + 1); if (h != null) { out.push(h); any = true; i = j; done = true; break; } } if (!done) { out.push(toks[i]); i++; } }
    if (any) return out.join(", ");
  }
  return null;
}
function trSentence(c, depth) {
  if (c in dict) return dict[c];
  let h = tplTry(c, depth, true); if (h != null) return h;
  h = punct(c); if (h != null) return h;
  h = trPieces(c, depth); if (h != null) return h;
  return tplTry(c, depth, false);
}
function trCore(core, depth = 0) {
  if (!core) return core;
  const hit = trSentence(core, depth); if (hit != null) return hit;
  // plusieurs phrases : on cherche les plus longs groupes de phrases connus (un texte du dictionnaire peut contenir plusieurs phrases)
  const sents = core.match(/[^.!?…]+(?:[.!?…]+\s*|$)/g);
  if (sents && sents.length > 1) {
    let any = false, i = 0, out = "";
    while (i < sents.length) {
      let done = false;
      for (let j = sents.length; j > i; j--) {
        const span = sents.slice(i, j).join(""), c = span.trim(); if (!c) continue;
        const h = trSentence(c, depth); if (h != null) { const lead = /^\s*/.exec(span)[0], trail = /\s*$/.exec(span)[0]; out += lead + h + trail; any = true; i = j; done = true; break; }
      }
      if (!done) { out += sents[i]; i++; }
    }
    if (any) return out;
  }
  return core;
}
export function tr(s) {
  if (LANG === "fr" || !ready || s == null || s === "") return s;
  const str = String(s); if (cache.has(str)) return cache.get(str);
  const lead = /^\s*/.exec(str)[0], trail = /\s*$/.exec(str)[0], core = norm(str.trim()); let out = trCore(core);
  out = out === core ? str : lead + out + trail; if (cache.size > 6000) cache.clear(); cache.set(str, out); return out;
}

// ----- traduction de l'affichage -----
const ATTRS = ["aria-label", "title", "placeholder", "alt", "data-say"], SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE"]), made = new Set();
const skipEl = el => !el || SKIP.has(el.tagName) || (el.closest && el.closest("[data-notr]"));
function doText(n) {
  const v = n.nodeValue; if (!v || made.has(v) || !/\p{L}/u.test(v) || skipEl(n.parentElement)) return;
  const o = tr(v); if (o !== v) { made.add(o); n.nodeValue = o; }
}
function doAttrs(el) { for (const a of ATTRS) { const v = el.getAttribute && el.getAttribute(a); if (v && !made.has(v)) { const o = tr(v); if (o !== v) { made.add(o); el.setAttribute(a, o); } } } }
function doTree(root) {
  if (!root) return;
  if (root.nodeType === 3) return doText(root);
  if (root.nodeType !== 1 || SKIP.has(root.tagName)) return;
  doAttrs(root); const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else if (!SKIP.has(n.tagName)) doAttrs(n); }
}
if (LANG !== "fr" && ready && typeof MutationObserver !== "undefined") {
  const start = () => {
    new MutationObserver(ms => { for (const m of ms) { if (m.type === "childList") m.addedNodes.forEach(doTree); else if (m.type === "characterData") doText(m.target); else if (m.type === "attributes") doAttrs(m.target); } })
      .observe(document.documentElement, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ATTRS });
    doTree(document.body); document.title = tr(document.title);
  };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
  const na = window.alert.bind(window), nc = window.confirm.bind(window); window.alert = m => na(tr(m)); window.confirm = m => nc(tr(m));
}
