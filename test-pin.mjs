import { S } from "./util.js";
import { hasPin, setPin, checkPin, checkRecovery, removePin, lockWait, validPinFormat, newRecoveryCode, hash } from "./pin.js";
let bad = 0; const t = (n, c, x) => { console.log(n.padEnd(72), c ? "ok" : "BUG " + (x || "")); if (!c) bad++; };
const NOW = 1_800_000_000_000;
S.pin = null; S.pinFail = null;
t("pas de code au départ : tout est accessible", !hasPin() && (await checkPin("1234", NOW)).ok);
t("format : exactement 4 chiffres", validPinFormat("0420") && !validPinFormat("123") && !validPinFormat("12345") && !validPinFormat("12a4") && !validPinFormat(""));
let rejected = false; try { await setPin("12"); } catch (e) { rejected = true; } t("un code invalide est refusé", rejected && !hasPin());
const rec = await setPin("4821");
t("code créé, un code de secours est donné (XXXX-XXXX)", hasPin() && /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(rec) && !/[ILO01]/.test(rec.replace("-", "")), rec);
const dump = JSON.stringify(S.pin);
t("le code n'est jamais stocké en clair (ni le code de secours)", !dump.includes("4821") && !dump.includes(rec) && !dump.includes(rec.replace("-", "")));
t("le même code donne une empreinte différente avec un autre sel", (await hash("4821", "aa")) !== (await hash("4821", "bb")));
t("bon code accepté", (await checkPin("4821", NOW)).ok);
let r = await checkPin("1111", NOW); t("mauvais code refusé, 4 essais restants", !r.ok && r.left === 4, JSON.stringify(r));
t("le bon code remet les essais à zéro", (await checkPin("4821", NOW)).ok && S.pinFail === null);
for (let i = 0; i < 4; i++) await checkPin("0000", NOW); r = await checkPin("0000", NOW);
t("5 essais ratés : attente de 30 s", !r.ok && r.wait === 30 && lockWait(NOW) === 30, JSON.stringify(r));
t("pendant l'attente, même le BON code est refusé", (await checkPin("4821", NOW + 10000)).ok === false && lockWait(NOW + 10000) === 20);
t("après l'attente, le bon code marche", (await checkPin("4821", NOW + 31000)).ok);
// l'attente double au deuxième blocage
S.pinFail = null; const T = NOW + 100000; for (let i = 0; i < 5; i++) await checkPin("0000", T); const w1 = lockWait(T);
for (let i = 0; i < 5; i++) await checkPin("0000", T + 31000); const w2 = lockWait(T + 31000);
t("premier blocage = 30 s, deuxième blocage = 60 s", w1 === 30 && w2 === 60, w1 + "/" + w2);
S.pinFail = null; let w = 0; for (let b = 0; b < 3; b++) { for (let i = 0; i < 5; i++) await checkPin("0000", NOW + 1e6 * (b + 1)); w = lockWait(NOW + 1e6 * (b + 1)); }
t("troisième blocage de suite = 2 minutes", w === 120, w);
for (let b = 0; b < 8; b++) { for (let i = 0; i < 5; i++) await checkPin("0000", NOW + 1e8 + b * 1e6); }
t("l'attente ne dépasse jamais 15 minutes", lockWait(NOW + 1e8 + 7 * 1e6) <= 900);
S.pinFail = null;
t("code de secours accepté (majuscules, tiret et espaces ignorés)", (await checkRecovery(" " + rec.toLowerCase().replace("-", " ") + " ", NOW)).ok);
t("mauvais code de secours refusé", !(await checkRecovery("AAAA-AAAA", NOW)).ok);
S.pinFail = null; removePin(); t("retirer le code : plus de protection", !hasPin() && (await checkPin("0000", NOW)).ok);
t("deux codes de secours générés sont différents", newRecoveryCode() !== newRecoveryCode());
const rec2 = await setPin("1357"); t("changer le code remplace l'ancien et le code de secours", !(await checkPin("4821", NOW)).ok && (await checkPin("1357", NOW)).ok && rec2 !== rec);
console.log(bad ? "PROBLEMES: " + bad : "LE CODE PARENT FONCTIONNE");
