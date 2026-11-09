// Compliments et salutations avec le prénom du joueur, selon son âge et fille / garçon (réglés par les parents).
// Un modèle s'écrit avec {n} (le prénom) et [forme féminine|forme masculine] : « {n}, tu es [une championne|un champion] ! ».
// Les voix enregistrées lisent les morceaux (« Bravo », le prénom, « tu es une championne ») : voice/extract.mjs les liste grâce à fragments().
import { S, DEVICE, LANG } from "./util.js";

export const BANK = {
  win: {
    a: ["Bravo {n} !", "C'est super, {n} !", "Génial {n} !", "Youpi, c'est réussi, {n} !", "Bien joué {n} !", "{n}, tu es [une championne|un champion] !", "{n}, tu es [très intelligente|très intelligent] !", "Tu es formidable, {n} !", "{n}, tu es [forte|fort] !"],
    b: ["Excellent travail, {n} !", "Bravo {n}, tu as bien réfléchi !", "{n}, tu es vraiment [douée|doué] !", "Quelle belle réussite, {n} !", "Tu progresses vite, {n} !", "{n}, tu es [une vraie programmeuse|un vrai programmeur] !", "Impressionnant, {n} !", "{n}, tu es [courageuse|courageux] et [persévérante|persévérant] !"],
    c: ["Très joli code, {n} !", "{n}, quelle logique !", "Bien raisonné, {n} !", "Tu maîtrises, {n} !", "{n}, tu es [une vraie roboticienne|un vrai roboticien] !", "Beau travail, {n} ! Tu es vraiment [brillante|brillant].", "Chapeau bas, {n} !", "Excellent, {n} ! Tu as tout compris."]
  },
  retry: {
    a: ["Courage {n}, essaie encore !", "Tu y es presque, {n} !", "On réessaie ensemble, {n} ?"],
    b: ["Ne lâche rien, {n} !", "Tu as presque trouvé, {n} !", "Réfléchis encore un peu, {n}."],
    c: ["Presque, {n} ! Regarde bien.", "Courage {n}, tu vas y arriver !", "Cherche l'erreur, {n}."]
  }
};
// salutations : lues par la voix de l'appareil (pas de clip : le prénom change, et on n'entend pas de cassure de voix) ; elles dépendent de l'heure
export const HELLO = { morning: ["Bonjour {n} !", "Salut {n} !", "Ça fait plaisir de te revoir, {n} !"], day: ["Bonjour {n} !", "Salut {n} !", "Ça fait plaisir de te revoir, {n} !"], evening: ["Bonsoir {n} !", "Salut {n} !", "Ça fait plaisir de te revoir, {n} !"] };
// version anglaise (voix de l'appareil, pas d'accord fille / garçon)
const BANK_EN = {
  win: {
    a: ["Well done, {n}!", "That's great, {n}!", "Awesome, {n}!", "Yay, you did it, {n}!", "Nice job, {n}!", "{n}, you are a champion!", "{n}, you are so smart!", "You are wonderful, {n}!", "{n}, you are strong!"],
    b: ["Excellent work, {n}!", "Well done {n}, you thought it through!", "{n}, you are really talented!", "What a great success, {n}!", "You are improving fast, {n}!", "{n}, you are a real programmer!", "Impressive, {n}!", "{n}, you are brave and determined!"],
    c: ["Nice code, {n}!", "{n}, what logic!", "Well reasoned, {n}!", "You've got it, {n}!", "{n}, you are a real roboticist!", "Great job, {n}! You are really brilliant.", "Hats off, {n}!", "Excellent, {n}! You understood everything."]
  },
  retry: {
    a: ["Come on {n}, try again!", "You're almost there, {n}!", "Let's try again together, {n}?"],
    b: ["Don't give up, {n}!", "You almost found it, {n}!", "Think a little more, {n}."],
    c: ["Almost, {n}! Look closely.", "Come on {n}, you can do it!", "Find the mistake, {n}."]
  }
};
for (const kind of [BANK_EN.win, BANK_EN.retry]) kind.z = kind.a.slice();
// version arabe (voix de l'appareil) : accords fille / garçon avec [féminin|masculin]
const BANK_AR = {
  win: {
    a: ["[أحسنتِ|أحسنتَ] يا {n}!", "رائع يا {n}!", "ممتاز يا {n}!", "هيه، لقد نجحت يا {n}!", "عمل جميل يا {n}!", "{n}، أنت [بطلة|بطل]!", "{n}، أنت [ذكية|ذكي] جدًا!", "أنت [رائعة|رائع] يا {n}!", "{n}، أنت [قوية|قوي]!"],
    b: ["عمل ممتاز يا {n}!", "أحسنت يا {n}، [فكّرتِ|فكّرتَ] جيدًا!", "{n}، أنت [موهوبة|موهوب] حقًا!", "يا له من نجاح يا {n}!", "أنت [تتقدمين|تتقدم] بسرعة يا {n}!", "{n}، أنت [مبرمجة حقيقية|مبرمج حقيقي]!", "مدهش يا {n}!", "{n}، أنت [شجاعة|شجاع] و[مثابرة|مثابر]!"],
    c: ["كود جميل يا {n}!", "{n}، يا له من منطق!", "تفكير سليم يا {n}!", "أنت [تتقنين|تتقن] ذلك يا {n}!", "{n}، أنت [خبيرة روبوتات حقيقية|خبير روبوتات حقيقي]!", "عمل جميل يا {n}! أنت [لامعة|لامع] حقًا.", "أرفع لك القبعة يا {n}!", "ممتاز يا {n}! لقد [فهمتِ|فهمتَ] كل شيء."]
  },
  retry: {
    a: ["[تشجّعي|تشجّع] يا {n}، [حاولي|حاول] مرة أخرى!", "أنت [قريبة|قريب] جدًا يا {n}!", "لنحاول معًا يا {n}؟"],
    b: ["لا [تستسلمي|تستسلم] يا {n}!", "[كدتِ تجدينه|كدتَ تجده] يا {n}!", "[فكّري|فكّر] قليلًا يا {n}."],
    c: ["تقريبًا يا {n}! [انظري|انظر] جيدًا.", "[تشجّعي|تشجّع] يا {n}، [ستنجحين|ستنجح]!", "[ابحثي|ابحث] عن الخطأ يا {n}."]
  }
};
for (const kind of [BANK_AR.win, BANK_AR.retry]) kind.z = kind.a.slice();
const HELLO_AR = { morning: ["صباح الخير يا {n}!", "مرحبًا يا {n}!", "يسعدني رؤيتك مجددًا يا {n}!"], day: ["مرحبًا يا {n}!", "أهلًا يا {n}!", "يسعدني رؤيتك مجددًا يا {n}!"], evening: ["مساء الخير يا {n}!", "مرحبًا يا {n}!", "يسعدني رؤيتك مجددًا يا {n}!"] };
const HELLO_EN = { morning: ["Good morning, {n}!", "Hi {n}!", "Nice to see you again, {n}!"], day: ["Hello, {n}!", "Hi {n}!", "Nice to see you again, {n}!"], evening: ["Good evening, {n}!", "Hi {n}!", "Nice to see you again, {n}!"] };
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
const noName = t => t.replace(/^\{n\}[,،]\s*(.)/, (_, c) => c.toUpperCase()).replace(/[,،]?\s*(?:يا\s+)?\{n\}/g, "").replace(/\s{2,}/g, " ").trim();
export function expand(tpl, name = S.name, sex = sexOf()) {
  const t = gendered(tpl, sex === "m" ? "m" : "f"); return name && name.trim() ? t.replace(/\{n\}/g, name.trim()) : noName(t);
}
const ageOf = () => (AGES.includes(S.age) ? S.age : "b");
export function line(kind) {
  const B = LANG === "en" ? BANK_EN : LANG === "ar" ? BANK_AR : BANK, list = (B[kind] || B.win)[ageOf()], ok = sexOf() === "n" ? list.filter(t => !hasGender(t)) : list;
  return expand(pickOf(ok.length ? ok : list));
}
export const praise = () => line("win"), encourage = () => line("retry");
export const hello = (d = new Date()) => DEVICE + expand(pickOf((LANG === "en" ? HELLO_EN : LANG === "ar" ? HELLO_AR : HELLO)[dayPart(d)]));

// morceaux à enregistrer : chaque modèle, pour chaque forme, coupé au prénom puis en phrases (voice/extract.mjs)
export function fragments() {
  const out = new Set(), sent = t => (t.replace(/\s+/g, " ").trim().match(/[^.!?…]+[.!?…]*/g) || []).map(s => s.trim());
  for (const kind of Object.values(BANK)) for (const age of AGES) for (const tpl of kind[age]) for (const sx of hasGender(tpl) ? SEXES : ["f"])
    for (const part of gendered(tpl, sx).split("{n}")) for (const s of sent(part)) if (/[\p{L}\p{N}]{3}/u.test(s)) out.add(s.replace(/^[\s,;:.!?-]+/, ""));
  return [...out].sort();
}

// « Bravo ! » dans un message de réussite devient un compliment avec le prénom (affichage et voix)
const BRAVO = /Bravo\s*!|Well done!|أحسنت!/;
export function initPraise() {
  const fix = n => {
    if (!n.classList || !n.classList.contains("gmsg") || !/(^|\s)ok(\s|$)/.test(n.className)) return;
    const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT); let t;
    // le remplaçant ne doit jamais redevenir « Bravo ! » (sinon on boucle sans fin quand il n'y a pas de prénom)
    while ((t = w.nextNode())) { if (BRAVO.test(t.nodeValue)) { let p = praise(); if (BRAVO.test(p)) p = LANG === "en" ? "Super!" : LANG === "ar" ? "رائع!" : "Super !"; t.nodeValue = t.nodeValue.replace(BRAVO, () => p); return; } }
  };
  new MutationObserver(ms => { for (const m of ms) { const el = m.target.nodeType === 3 ? m.target.parentElement : m.target; const g = el && el.closest && el.closest(".gmsg"); if (g) fix(g); for (const a of m.addedNodes) if (a.nodeType === 1) { if (a.matches && a.matches(".gmsg")) fix(a); a.querySelectorAll && a.querySelectorAll(".gmsg").forEach(fix); } } })
    .observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["class"] });
}
