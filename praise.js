// Compliments et salutations avec le prénom du joueur, selon son âge et fille / garçon (réglés par les parents).
// Un modèle s'écrit avec {n} (le prénom) et [forme féminine|forme masculine] : « {n}, tu es [une championne|un champion] ! ».
// Les voix enregistrées lisent les morceaux (« Bravo », le prénom, « tu es une championne ») : voice/extract.mjs les liste grâce à fragments().
import { S, DEVICE } from "./util.js";

export const BANK = {
  win: {
    a: ["Bravo {n} !", "Super {n} !", "Génial {n} !", "Youpi {n}, tu as réussi !", "Bien joué {n} !", "{n}, tu es [une championne|un champion] !", "{n}, tu es [très intelligente|très intelligent] !", "Tu es formidable, {n} !", "{n}, tu es [forte|fort] !"],
    b: ["Excellent travail, {n} !", "Bravo {n}, tu as bien réfléchi !", "{n}, tu es vraiment [douée|doué] !", "Quelle belle réussite, {n} !", "Tu progresses vite, {n} !", "{n}, tu es [une vraie programmeuse|un vrai programmeur] !", "Impressionnant, {n} !", "{n}, tu es [courageuse|courageux] et [persévérante|persévérant] !"],
    c: ["Très joli code, {n} !", "{n}, quelle logique !", "Bien raisonné, {n} !", "Tu maîtrises, {n} !", "{n}, tu es [une vraie roboticienne|un vrai roboticien] !", "Beau travail, {n} ! Tu es vraiment [brillante|brillant].", "Chapeau, {n} !", "Excellent, {n} ! Tu as tout compris."]
  },
  retry: {
    a: ["Courage {n}, essaie encore !", "Tu y es presque, {n} !", "On réessaie ensemble, {n} ?"],
    b: ["Ne lâche rien, {n} !", "Tu as presque trouvé, {n} !", "Réfléchis encore un peu, {n}."],
    c: ["Presque, {n} ! Regarde bien.", "Courage {n}, tu vas y arriver !", "Cherche l'erreur, {n}."]
  }
};
// salutations : lues par la voix de l'appareil (pas de clip : le prénom change, et on n'entend pas de cassure de voix) ; elles dépendent de l'heure
export const HELLO = { morning: ["Bonjour {n} !", "Salut {n} !", "Content de te revoir, {n} !"], day: ["Bonjour {n} !", "Salut {n} !", "Content de te revoir, {n} !"], evening: ["Bonsoir {n} !", "Salut {n} !", "Content de te revoir, {n} !"] };
export const dayPart = (d = new Date()) => { const h = d.getHours(); return h >= 18 || h < 5 ? "evening" : h < 12 ? "morning" : "day"; };
const AGES = ["z", "a", "b", "c"], SEXES = ["f", "m"];
// les petits (3-6 ans) ont les mêmes compliments simples que les 6-8 ans
BANDS_Z();
function BANDS_Z() { for (const kind of [BANK.win, BANK.retry]) kind.z = kind.a.slice(); }
const pickOf = a => a[Math.floor(Math.random() * a.length)];
const hasGender = t => /\[[^\]|]+\|[^\]]+\]/.test(t);
// forme féminine / masculine ; sans choix (n), on ne garde que les modèles sans accord
export const gendered = (t, sex) => t.replace(/\[([^\]|]+)\|([^\]]+)\]/g, (_, f, m) => (sex === "m" ? m : f));
const sexOf = () => (S.sex === "m" || S.sex === "f" ? S.sex : "n");
// sans prénom : « Bravo {n} ! » → « Bravo ! » ; « {n}, tu es… » → « Tu es… »
const noName = t => t.replace(/^\{n\},\s*(.)/, (_, c) => c.toUpperCase()).replace(/,?\s*\{n\}/g, "").replace(/\s{2,}/g, " ").trim();
export function expand(tpl, name = S.name, sex = sexOf()) {
  const t = gendered(tpl, sex === "m" ? "m" : "f"); return name && name.trim() ? t.replace(/\{n\}/g, name.trim()) : noName(t);
}
const ageOf = () => (AGES.includes(S.age) ? S.age : "b");
export function line(kind) {
  const list = (BANK[kind] || BANK.win)[ageOf()], ok = sexOf() === "n" ? list.filter(t => !hasGender(t)) : list;
  return expand(pickOf(ok.length ? ok : list));
}
export const praise = () => line("win"), encourage = () => line("retry");
export const hello = (d = new Date()) => DEVICE + expand(pickOf(HELLO[dayPart(d)]));

// morceaux à enregistrer : chaque modèle, pour chaque forme, coupé au prénom puis en phrases (voice/extract.mjs)
export function fragments() {
  const out = new Set(), sent = t => (t.replace(/\s+/g, " ").trim().match(/[^.!?…]+[.!?…]*/g) || []).map(s => s.trim());
  for (const kind of Object.values(BANK)) for (const age of AGES) for (const tpl of kind[age]) for (const sx of hasGender(tpl) ? SEXES : ["f"])
    for (const part of gendered(tpl, sx).split("{n}")) for (const s of sent(part)) if (/[\p{L}\p{N}]{3}/u.test(s)) out.add(s.replace(/^[\s,;:.!?-]+/, ""));
  return [...out].sort();
}

// « Bravo ! » dans un message de réussite devient un compliment avec le prénom (affichage et voix)
export function initPraise() {
  const fix = n => {
    if (!n.classList || !n.classList.contains("gmsg") || !/(^|\s)ok(\s|$)/.test(n.className)) return;
    const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT); let t;
    // le remplaçant ne doit jamais redevenir « Bravo ! » (sinon on boucle sans fin quand il n'y a pas de prénom)
    while ((t = w.nextNode())) { if (/Bravo\s*!/.test(t.nodeValue)) { let p = praise(); if (/Bravo\s*!/.test(p)) p = "Super !"; t.nodeValue = t.nodeValue.replace(/Bravo\s*!/, () => p); return; } }
  };
  new MutationObserver(ms => { for (const m of ms) { const el = m.target.nodeType === 3 ? m.target.parentElement : m.target; const g = el && el.closest && el.closest(".gmsg"); if (g) fix(g); for (const a of m.addedNodes) if (a.nodeType === 1) { if (a.matches && a.matches(".gmsg")) fix(a); a.querySelectorAll && a.querySelectorAll(".gmsg").forEach(fix); } } })
    .observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["class"] });
}
