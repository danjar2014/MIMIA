// Achat unique RobotKids, 4,99 € (Google Play Billing sur Android, App Store sur iPhone / iPad).
// Dans l'appli mobile (Flutter), la page web parle au code natif par le canal « billing » (flutter_inappwebview).
// Sur le web / en PWA, il n'y a pas de paiement : aucun verrou (billingEnabled() reste faux).
// Pour tester dans un navigateur : localStorage["rk-billing-mock"] = "locked" ou "active" (+ ["rk-billing-store"] = "apple" pour les écrans iPhone).
const GRACE_MS = 90 * 24 * 3600 * 1000;   // hors ligne : un achat unique ne s'efface pas, on garde l'accès 90 jours après le dernier achat vu actif
const LAST_KEY = "rk-sub-last", MOCK_KEY = "rk-billing-mock";
export const PLAN_FULL = "robotkids_unlock";

let enabled = false, mock = null;
try { mock = localStorage.getItem(MOCK_KEY); } catch (e) {}
const state = { store: "google", checked: false, available: false, active: false, pending: false, error: null, plans: {}, debug: "" };
const listeners = new Set();
const handler = () => { const fi = window.flutter_inappwebview; return fi && fi.callHandler ? fi : null; };

const MOCK_PLANS = { [PLAN_FULL]: { price: "4,99 €", trial: false } };

function apply(r) {
  if (!r) return;
  state.store = r.store === "apple" ? "apple" : "google"; state.checked = !!r.checked; state.available = !!r.available; state.pending = !!r.pending; state.error = r.error || null; state.plans = r.plans || {}; state.debug = r.debug || "";
  let active = !!r.active;
  try {
    if (active) localStorage.setItem(LAST_KEY, String(Date.now()));
    else if (state.error) { const last = +localStorage.getItem(LAST_KEY) || 0; if (Date.now() - last < GRACE_MS) active = true; }   // pas de réseau : délai de grâce
    else localStorage.removeItem(LAST_KEY);   // la boutique confirme : plus d'achat (remboursement)
  } catch (e) {}
  state.active = active;
  listeners.forEach(f => { try { f(); } catch (e) {} });
}

async function call(action, id) {
  const fi = handler();
  if (mock) {
    if (action === "buy") { mock = "active"; try { localStorage.setItem(MOCK_KEY, "active"); } catch (e) {} }
    let store = "google"; try { store = localStorage.getItem("rk-billing-store") || "google"; } catch (e) {}   // test des écrans iPhone : "apple"
    return { store, checked: true, available: true, active: mock === "active", pending: false, error: null, plans: MOCK_PLANS };
  }
  if (!fi) return null;
  try { return await fi.callHandler("billing", action, id); } catch (e) { return null; }
}

export const billingEnabled = () => enabled;
export const isApple = () => state.store === "apple";
// Liens des boutiques : seulement dans l'espace parents, ouverts dans le navigateur par l'appli
// (les adresses permises sont aussi vérifiées côté Flutter : kExternalOk dans main.dart).
export const LINKS = {
  privacy: "https://robotkids.robotkids.workers.dev/privacy",
  terms: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
  manage: { apple: "https://apps.apple.com/account/subscriptions", google: "https://play.google.com/store/account/subscriptions" },
};
export function openLink(url) { const fi = handler(); if (fi) fi.callHandler("open", url).catch(() => {}); }
export function legalHtml() {
  return `<div class="agebtns legal"><button class="big-btn alt" data-link="terms">📄 Conditions d'utilisation</button><button class="big-btn alt" data-link="privacy">🛡️ Politique de confidentialité</button></div>`;
}
export function wireLegal(root) {
  root.querySelectorAll("[data-link]").forEach(b => b.onclick = () => { const k = b.dataset.link; openLink(k === "manage" ? LINKS.manage[state.store] : LINKS[k]); });
}
export const billingState = () => state;
export const isLocked = () => enabled && state.checked && !state.active;
export const onBilling = f => { listeners.add(f); };
export async function refreshBilling() { apply(await call("refresh")); }
export async function buyPlan(id) { apply(await call("buy", id)); }

export function initBilling() {
  window.__billingPush = async () => apply(await call("status"));
  const start = async () => { enabled = true; apply(await call("status")); if (!state.checked) setTimeout(refreshBilling, 2500); };
  if (mock || handler()) return start();
  // le pont Flutter peut arriver un peu après le chargement de la page ; sur le web il n'arrive jamais
  window.addEventListener("flutterInAppWebViewPlatformReady", () => { if (handler()) start(); }, { once: true });
}
