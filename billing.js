// Abonnement RobotKids (Google Play Billing).
// Dans l'appli Android (Flutter), la page web parle au code natif par le canal « billing » (flutter_inappwebview).
// Sur le web / en PWA, il n'y a pas de paiement : aucun verrou (billingEnabled() reste faux).
// Pour tester dans un navigateur : localStorage["rk-billing-mock"] = "locked" ou "active".
const GRACE_MS = 3 * 24 * 3600 * 1000;   // hors ligne : on garde l'accès 3 jours après le dernier abonnement vu actif
const LAST_KEY = "rk-sub-last", MOCK_KEY = "rk-billing-mock";
export const PLAN_MONTHLY = "robotkids_monthly", PLAN_YEARLY = "robotkids_yearly";

let enabled = false, mock = null;
try { mock = localStorage.getItem(MOCK_KEY); } catch (e) {}
const state = { checked: false, available: false, active: false, pending: false, error: null, plans: {}, debug: "" };
const listeners = new Set();
const handler = () => { const fi = window.flutter_inappwebview; return fi && fi.callHandler ? fi : null; };

const MOCK_PLANS = { [PLAN_MONTHLY]: { price: "3,99 €", trial: true }, [PLAN_YEARLY]: { price: "29,99 €", trial: true } };

function apply(r) {
  if (!r) return;
  state.checked = !!r.checked; state.available = !!r.available; state.pending = !!r.pending; state.error = r.error || null; state.plans = r.plans || {}; state.debug = r.debug || "";
  let active = !!r.active;
  try {
    if (active) localStorage.setItem(LAST_KEY, String(Date.now()));
    else if (state.error) { const last = +localStorage.getItem(LAST_KEY) || 0; if (Date.now() - last < GRACE_MS) active = true; }   // pas de réseau : délai de grâce
    else localStorage.removeItem(LAST_KEY);   // Google confirme : plus d'abonnement
  } catch (e) {}
  state.active = active;
  listeners.forEach(f => { try { f(); } catch (e) {} });
}

async function call(action, id) {
  const fi = handler();
  if (mock) {
    if (action === "buy") { mock = "active"; try { localStorage.setItem(MOCK_KEY, "active"); } catch (e) {} }
    return { checked: true, available: true, active: mock === "active", pending: false, error: null, plans: MOCK_PLANS };
  }
  if (!fi) return null;
  try { return await fi.callHandler("billing", action, id); } catch (e) { return null; }
}

export const billingEnabled = () => enabled;
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
