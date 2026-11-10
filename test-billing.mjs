// Abonnement : pas de verrou sans l'appli Android ; verrou sans abonnement ; délai de grâce hors ligne ; achat simulé.
const store = {};
globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
globalThis.window = { addEventListener() {} }; globalThis.document = { documentElement: {}, addEventListener() {} };
let bad = 0; const t = (n, c, x) => { console.log(n.padEnd(86), c ? "ok" : "BUG " + (x || "")); if (!c) bad++; };
import { readFileSync } from "node:fs";
const src = f => readFileSync("./" + f, "utf8");

// 1. web / PWA : aucun pont natif -> jamais verrouillé
let B = await import("./billing.js?web"); B.initBilling();
t("web / PWA : pas de verrou", !B.billingEnabled() && !B.isLocked());

// 2. appli Android simulée : abonnement absent -> verrou ; actif -> ouvert
let reply = { checked: true, available: true, active: false, pending: false, error: null, plans: { robotkids_monthly: { price: "3,99 €", trial: true } } };
globalThis.window.flutter_inappwebview = { callHandler: async () => reply };
B = await import("./billing.js?android"); await B.initBilling(); await new Promise(r => setTimeout(r, 20));
t("Android sans abonnement : verrouillé", B.billingEnabled() && B.isLocked());
t("prix et essai reçus de Google Play", B.billingState().plans.robotkids_monthly.trial === true);
reply = { ...reply, active: true }; await window.__billingPush();
t("abonnement actif : ouvert", !B.isLocked());
// 3. hors ligne : erreur de Google Play, abonnement vu actif il y a moins de 3 jours -> reste ouvert
reply = { ...reply, active: false, error: "query" }; await window.__billingPush();
t("hors ligne : délai de grâce de 3 jours", !B.isLocked());
store["rk-sub-last"] = String(Date.now() - 4 * 24 * 3600 * 1000); await window.__billingPush();
t("hors ligne depuis plus de 3 jours : verrouillé", B.isLocked());
// 4. Google confirme la fin de l'abonnement
reply = { ...reply, error: null }; await window.__billingPush();
t("abonnement terminé (confirmé par Google) : verrouillé", B.isLocked() && !("rk-sub-last" in store));
// 5. le code est branché
const app = src("app.js"), dart = src("flutter_app/lib/main.dart"), bill = src("flutter_app/lib/billing.dart");
t("achat protégé par le code parent (écran Abonnement dans l'espace parents)", /\["privacy"/.test(app) && /openSubscription/.test(app) && /askPin\(\{[^}]*onOk: \(\) => parentScreen\("abo"\)/.test(app));
t("côté Android : canal « billing », accusé de réception de l'achat, essai gratuit choisi", /handlerName: 'billing'/.test(dart) && /completePurchase/.test(bill) && /priceAmountMicros == 0/.test(bill) && /robotkids_monthly/.test(bill) && /robotkids_yearly/.test(bill));
t("sw.js connaît billing.js", /billing\.js/.test(src("sw.js")));
console.log(bad ? "PROBLEMES: " + bad : "L'ABONNEMENT FONCTIONNE");
