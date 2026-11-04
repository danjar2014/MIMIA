// Code parent : 4 chiffres pour protéger les réglages et le tableau de bord.
// Le code est stocké sous forme d'empreinte (SHA-256 + sel), jamais en clair. Il protège contre un enfant curieux,
// pas contre un adulte qui sait fouiller dans les données du navigateur (voir README).
import { S, save, el, toast } from "./util.js";

const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789", MAX_FREE = 5;
const rnd = n => { const a = new Uint32Array(n); (globalThis.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => { a[i] = Math.floor(Math.random() * 4294967295); }); return a; };
export async function hash(text, salt) {
  const s = salt + ":" + text;
  if (globalThis.crypto && crypto.subtle) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); }
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return "f" + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}
export const hasPin = () => !!(S.pin && S.pin.hash);
export const validPinFormat = p => /^\d{4}$/.test(p);
// codes qu'un enfant devine en deux essais
const WEAK = new Set(["0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999", "1234", "4321", "0123", "3210", "2580", "1212", "2000", "1010"]);
export const isWeakPin = p => WEAK.has(String(p));
const normRec = c => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
export const newRecoveryCode = () => { const r = rnd(8); const raw = [...r].map(x => ALPHA[x % ALPHA.length]).join(""); return raw.slice(0, 4) + "-" + raw.slice(4); };

export async function setPin(pin) {
  if (!validPinFormat(pin)) throw new Error("format");
  const salt = [...rnd(4)].map(x => x.toString(16)).join(""), rec = newRecoveryCode();
  S.pin = { salt, hash: await hash(pin, salt), rec: await hash(normRec(rec), salt) }; S.pinFail = null; save(); return rec;
}
export const removePin = () => { S.pin = null; S.pinFail = null; save(); };
// temps d'attente après trop d'essais : 30 s, puis 1 min, 2 min… (15 min maximum)
export const lockWait = (now = Date.now()) => { const f = S.pinFail; return f && f.until > now ? Math.ceil((f.until - now) / 1000) : 0; };
function fail(now) { const f = S.pinFail || { n: 0, until: 0, blocks: 0 }; f.n++; if (f.n >= MAX_FREE) { f.blocks++; f.until = now + Math.min(900, 30 * Math.pow(2, f.blocks - 1)) * 1000; f.n = 0; } S.pinFail = f; save(); }
async function verify(kind, value, now) {
  if (!hasPin()) return { ok: true };
  const wait = lockWait(now); if (wait) return { ok: false, wait };
  const good = kind === "pin" ? (await hash(value, S.pin.salt)) === S.pin.hash : (await hash(normRec(value), S.pin.salt)) === S.pin.rec;
  if (good) { S.pinFail = null; save(); return { ok: true }; }
  fail(now); const w = lockWait(now); return { ok: false, wait: w, left: w ? 0 : MAX_FREE - S.pinFail.n };
}
export const checkPin = (pin, now = Date.now()) => verify("pin", pin, now);
export const checkRecovery = (code, now = Date.now()) => verify("rec", code, now);

// ---------- écrans ----------
const ov = () => document.getElementById("overlay");
function keypad(onDigit, onBack) {
  const pad = el("div", "keypad"); pad.dataset.silent = "";
  [1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].forEach(k => { const b = el("button", "key" + (k === "" ? " ghost" : ""), String(k)); if (k === "") b.disabled = true; b.onclick = () => (k === "⌫" ? onBack() : onDigit(String(k))); pad.append(b); });
  return pad;
}
function pinEntry({ title, sub, onDone, onCancel, extra }) {
  const o = ov(); o.style.display = "flex"; let code = "", locked = false;
  o.innerHTML = `<div class="panel pinpanel"><h1>${title}</h1><p class="sub">${sub || ""}</p><div class="pindots" data-silent></div><div class="pinmsg gmsg" aria-live="polite"></div></div>`;
  const panel = o.querySelector(".pinpanel"), dots = panel.querySelector(".pindots"), msg = panel.querySelector(".pinmsg");
  const paint = () => { dots.innerHTML = [0, 1, 2, 3].map(i => `<i class="${i < code.length ? "f" : ""}"></i>`).join(""); };
  const say = (t, cls) => { msg.className = "pinmsg gmsg " + (cls || ""); msg.textContent = t || ""; };
  const reset = () => { code = ""; paint(); };
  const push = async d => { if (locked || code.length >= 4) return; code += d; paint(); if (code.length === 4) { locked = true; const r = await onDone(code, say); locked = false; if (r !== "keep") reset(); } };
  const kp = keypad(push, () => { code = code.slice(0, -1); paint(); });
  const row = el("div", "gctl"); if (extra) row.append(...extra);
  if (onCancel) { const c = el("button", "gb", "Annuler"); c.onclick = onCancel; row.append(c); }
  panel.append(kp, row); paint();
  const key = e => { if (!document.body.contains(panel)) return document.removeEventListener("keydown", key); if (/^\d$/.test(e.key)) push(e.key); else if (e.key === "Backspace") { code = code.slice(0, -1); paint(); } };
  document.addEventListener("keydown", key); return { say };
}
const lockMsg = (sayFn, r) => sayFn(r.wait ? `Trop d'essais. Réessaie dans ${r.wait} s.` : `Code incorrect. Il te reste ${r.left} essai${r.left > 1 ? "s" : ""}.`, "warn");
// demande le code ; appelle onOk() s'il est bon
export function askPin({ title = "🔒 Espace parents", sub = "Entre le code à 4 chiffres.", onOk, onCancel }) {
  if (!hasPin()) { onOk(); return; }
  const forgot = el("button", "gb", "Code oublié ?"); forgot.onclick = () => recover({ onOk, onCancel: () => askPin({ title, sub, onOk, onCancel }) });
  const e = pinEntry({ title, sub, onCancel, extra: [forgot], onDone: async (code, say) => { const r = await checkPin(code); if (r.ok) { ov().style.display = "none"; onOk(); return; } lockMsg(say, r); } });
  const w = lockWait(); if (w) e.say(`Trop d'essais. Réessaie dans ${w} s.`, "warn");
}
function recover({ onOk, onCancel }) {
  const o = ov(); o.style.display = "flex";
  o.innerHTML = `<div class="panel"><h1>Code oublié ?</h1><p class="sub">Entre le <b>code de secours</b> noté quand tu as créé ton code parent (8 caractères, par exemple K7MQ-4XRB).</p><input id="rcv" class="pname" autocapitalize="characters" autocomplete="off" maxlength="9" aria-label="Code de secours"><div class="pinmsg gmsg" id="rmsg"></div><div class="agebtns"><button class="big-btn" id="rok">Valider</button><button class="big-btn alt" id="rbk">Retour</button><button class="gb" id="rwipe">Je n'ai pas le code de secours</button></div></div>`;
  o.querySelector("#rbk").onclick = onCancel;
  o.querySelector("#rok").onclick = async () => { const r = await checkRecovery(o.querySelector("#rcv").value), m = o.querySelector("#rmsg"); if (r.ok) { removePin(); toast("Code effacé : choisis-en un nouveau"); createPin({ onDone: onOk, onCancel: () => { o.style.display = "none"; } }); } else { m.className = "pinmsg gmsg warn"; m.textContent = r.wait ? `Trop d'essais. Réessaie dans ${r.wait} s.` : "Ce n'est pas le bon code de secours."; } };
  o.querySelector("#rwipe").onclick = () => {
    const qa = 6 + Math.floor(Math.random() * 4), qb = 6 + Math.floor(Math.random() * 4);
    o.innerHTML = `<div class="panel"><h1>⚠️ Tout effacer ?</h1><p class="sub">Sans code de secours, la seule solution est d'effacer TOUTES les données de l'appli sur cet appareil : progression, créations, réglages et statistiques. Cette action est définitive.</p><p class="sub">Réservé aux adultes : combien font <b>${qa} × ${qb}</b> ?</p><input id="wq" inputmode="numeric" class="pname" autocomplete="off" aria-label="Réponse"><div class="agebtns"><button class="big-btn alt" id="wno">Non, retour</button><button class="big-btn" id="wyes" style="background:#c0392b">Oui, tout effacer</button></div></div>`;
    o.querySelector("#wno").onclick = onCancel;
    o.querySelector("#wyes").onclick = () => { if (+o.querySelector("#wq").value !== qa * qb) return; try { localStorage.clear(); } catch (e) {} location.reload(); };
  };
}
// créer ou changer le code : deux saisies, puis le code de secours
export function createPin({ onDone, onCancel }) {
  let first = null;
  const step1 = () => { first = null; pinEntry({ title: "🔒 Choisis un code parent", sub: "4 chiffres que seuls les adultes connaissent. Évite 0000 ou 1234.", onCancel, onDone: (code, say) => { if (isWeakPin(code)) { say("Ce code est trop facile à deviner. Choisis-en un autre.", "warn"); return; } first = code; step2(); return "keep"; } }); };
  const step2 = () => { pinEntry({ title: "Retape ton code", sub: "Pour être sûr de ne pas s'être trompé.", onCancel: step1, onDone: async (code, say) => { if (code !== first) { say("Les deux codes sont différents. On recommence.", "warn"); setTimeout(step1, 900); return "keep"; } const rec = await setPin(code); done(rec); return "keep"; } }); };
  const done = rec => { const o = ov(); o.innerHTML = `<div class="panel"><h1>✅ Code enregistré</h1><p class="sub">Voici ton <b>code de secours</b>. Note-le sur un papier, dans un endroit sûr : il sert si tu oublies ton code.</p><div class="reccode" id="reccode" data-silent>${rec}</div><p class="sub">Il ne sera plus affiché.</p><div class="agebtns"><button class="big-btn" id="recok">J'ai noté mon code de secours</button></div></div>`; o.querySelector("#recok").onclick = () => { o.style.display = "none"; onDone && onDone(); }; };
  step1();
}
