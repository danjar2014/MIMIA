// « Explique mon programme » : décrit chaque ligne de Python ou de JavaScript en français simple, avec des règles fixes
// (pas d'IA : toujours la même explication pour le même code). Aucune dépendance à l'affichage.
const CAMEL = { obstacleDevant: "obstacle_devant", etoileIci: "etoile_ici", tournerGauche: "tourner_gauche", tournerDroite: "tourner_droite", hautParleur: "haut_parleur", boutonAppuye: "bouton_appuye" };

// une expression (condition, calcul…) en français
export function describeExpr(src, lang = "py") {
  const lits = []; let s = String(src).trim().replace(/;$/, "").replace(/"([^"]*)"|'([^']*)'/g, (m, x, y) => "" + (lits.push(x ?? y) - 1) + "");
  if (lang === "js") { s = s.replace(/===/g, "==").replace(/!==/g, "!=").replace(/&&/g, " and ").replace(/\|\|/g, " or ").replace(/!(?!=)/g, "not ").replace(/\btrue\b/g, "True").replace(/\bfalse\b/g, "False"); Object.entries(CAMEL).forEach(([a, b]) => { s = s.replace(new RegExp("\\b" + a + "\\b", "g"), b); }); }
  s = s.replace(/\s+/g, " ");
  const R = [
    [/not obstacle_devant\(\)/g, "il n'y a pas d'obstacle devant"], [/obstacle_devant\(\)/g, "il y a un obstacle devant"],
    [/not etoile_ici\(\)/g, "il n'y a pas d'étoile ici"], [/etoile_ici\(\)/g, "il y a une étoile ici"],
    [/not arrive\(\)/g, "le robot n'est pas encore arrivé"], [/arrive\(\)/g, "le robot est arrivé"],
    [/not bouton_appuye\(\)/g, "le bouton n'est pas appuyé"], [/bouton_appuye\(\)/g, "le bouton est appuyé"],
    [/not tic\(\)/g, "ce n'est pas un tic"], [/tic\(\)/g, "c'est un tic"],
    [/distance\(\) < (\d+)/g, "la distance est de moins de $1 cm"], [/distance\(\) <= (\d+)/g, "la distance est de $1 cm au plus"], [/distance\(\) > (\d+)/g, "la distance est de plus de $1 cm"], [/distance\(\) >= (\d+)/g, "la distance est de $1 cm ou plus"],
    [/lumiere\(\) < (\d+)/g, "la lumière est faible (sous $1)"], [/lumiere\(\) >= (\d+)/g, "la lumière est forte ($1 ou plus)"], [/distance\(\)/g, "la distance"], [/lumiere\(\)/g, "la lumière"],
    [/\blen\((\w+)\)/g, "la longueur de $1"], [/(\w+) % (\w+)/g, "le reste de $1 divisé par $2"], [/not (\w+)/g, "PAS $1"],
    [/ == /g, " est égal à "], [/ != /g, " est différent de "], [/ <= /g, " est plus petit ou égal à "], [/ >= /g, " est plus grand ou égal à "], [/ < /g, " est plus petit que "], [/ > /g, " est plus grand que "],
    [/ and /g, " ET "], [/ or /g, " OU "], [/\bTrue\b/g, "vrai"], [/\bFalse\b/g, "faux"], [/ \* /g, " fois "], [/ \+ /g, " plus "], [/ - /g, " moins "], [/ \/\/ /g, " divisé (entier) par "], [/ \/ /g, " divisé par "]
  ];
  R.forEach(([re, to]) => { s = s.replace(re, to); }); return s.replace(/(\d+)/g, (m, i) => "« " + lits[+i] + " »");
}
const NAMEFN = { avancer: n => (n ? `Fait avancer le robot de ${n} pas.` : "Fait avancer le robot d'un pas."), tourner_gauche: () => "Fait tourner le robot à gauche, sur place.", tourner_droite: () => "Fait tourner le robot à droite, sur place.", ramasser: () => "Le robot ramasse l'étoile qui est sous lui." };
const ONOFF = { lampe: ["Allume la lampe.", "Éteint la lampe.", "la lampe"], roues: ["Fait rouler les roues.", "Arrête les roues.", "les roues"], haut_parleur: ["Fait sonner le haut-parleur.", "Fait silence.", "le haut-parleur"] };
const norm = n => CAMEL[n] || n;
function callText(name, args, lang, mine) {
  name = norm(name);
  if (name === "print" || name === "afficher") { const x = args.trim(); return /^[A-Za-z_]\w*$/.test(x) && !/^(True|False|true|false)$/.test(x) ? `Écrit à l'écran la valeur de la boîte « ${x} ».` : `Écrit à l'écran : ${describeExpr(args, lang)}.`; }
  if (NAMEFN[name]) return NAMEFN[name](args.trim() && describeExpr(args, lang));
  if (ONOFF[name]) { const a = args.trim(), [on, off, who] = ONOFF[name]; if (/^(True|true)$/.test(a)) return on; if (/^(False|false)$/.test(a)) return off; return `Allume ou éteint ${who} selon cette condition : ${describeExpr(a, lang)}.`; }
  if (mine.has(name)) return `Lance ta commande « ${name} » (celle que tu as créée plus haut).`;
  if (/^(setup|boucle)$/.test(name)) return `Lance ${name}().`;
  return null;
}
const loopWords = (init, cond, step) => {
  const a = init.trim(), m = /^\w+\s*(<=|<|>=|>)\s*(.+)$/.exec(cond.trim()); let to = "", dir = "";
  if (m) { const b = m[2].trim(), op = m[1]; to = op === "<" ? `jusqu'à ${b} (${b} n'est pas atteint)` : op === "<=" ? `jusqu'à ${b} (compris)` : op === ">" ? `en descendant jusqu'à ${b} (${b} non atteint)` : `en descendant jusqu'à ${b} (compris)`; }
  const st = /\+\+|\+= *1$/.test(step) ? "de 1 en 1" : /--|-= *1$/.test(step) ? "de 1 en 1 en descendant" : (/([+-])= *(\d+)/.exec(step) ? `de ${/([+-])= *(\d+)/.exec(step)[2]} en ${/([+-])= *(\d+)/.exec(step)[2]}` : "");
  return `part de ${a}, ${to}, ${st}`.replace(/, ,/g, ",").replace(/,\s*$/, "");
};

export function explainCode(code, lang = "py") {
  const rows = [], mine = new Set(), declared = new Set(), counts = { boucles: 0, conditions: 0, fonctions: 0, boites: 0, commandes: 0 }; let fallbacks = 0;
  [...code.matchAll(lang === "js" ? /function\s+(\w+)/g : /def\s+(\w+)/g)].forEach(m => mine.add(m[1]));
  const lines = code.split("\n"); let depthJs = 0; const stack = [0];
  lines.forEach((raw, i) => {
    const n = i + 1, t0 = raw.trim(); if (!t0) return;
    let depth;
    if (lang === "py") { const ind = raw.length - raw.trimStart().length; while (stack.length > 1 && ind < stack[stack.length - 1]) stack.pop(); if (ind > stack[stack.length - 1]) stack.push(ind); depth = stack.length - 1; }
    else { if (t0.startsWith("}")) depthJs = Math.max(0, depthJs - 1); depth = depthJs; if (/\{\s*$/.test(t0)) depthJs++; }
    let t = t0, text = null, m;
    if (lang === "js") { if (/^\}\s*$/.test(t)) return; t = t.replace(/;\s*$/, "").replace(/^\}\s*/, "} ").replace(/\s*\{\s*$/, " {"); }
    const cm = lang === "py" ? /^#\s?(.*)$/.exec(t) : /^\/\/\s?(.*)$/.exec(t);
    if (cm) text = `Commentaire : une note pour toi (« ${cm[1]} »). L'ordinateur l'ignore.`;
    else if (lang === "py" && (m = /^def (\w+)\((.*)\):$/.exec(t)) || lang === "js" && (m = /^function (\w+)\((.*)\) \{$/.exec(t))) { counts.fonctions++; text = `Crée une nouvelle commande nommée « ${m[1]} »${m[2].trim() ? `, qui reçoit : ${m[2]}` : ""}. Ce qui est dedans ne s'exécute que quand on l'appelle.`; }
    else if (lang === "py" && (m = /^(if|elif) (.*):$/.exec(t)) || lang === "js" && (m = /^(?:\} )?(else if|if) \((.*)\) \{$/.exec(t))) { const k = m[1].replace(" ", ""); counts.conditions += k === "if" ? 1 : 0; text = `${k === "if" ? "Si" : "Sinon, si"} ${describeExpr(m[2], lang)}, alors ce qui est dedans est exécuté.`; }
    else if ((lang === "py" && /^else:$/.test(t)) || (lang === "js" && /^\} else \{$/.test(t))) text = "Sinon (dans tous les autres cas), ce qui est dedans est exécuté.";
    else if (lang === "py" && (m = /^while (.*):$/.exec(t)) || lang === "js" && (m = /^while \((.*)\) \{$/.exec(t))) { counts.boucles++; text = `Tant que ${describeExpr(m[1], lang)}, on répète ce qui est dedans.`; }
    else if (lang === "py" && (m = /^for (\w+) in range\((.*)\):$/.exec(t))) { counts.boucles++; const a = m[2].split(",").map(x => x.trim()); text = a.length === 1 ? `Répète ${a[0]} fois. « ${m[1]} » vaut 0, puis 1, puis 2… jusqu'à ${a[0]} - 1.` : `Répète : « ${m[1]} » part de ${a[0]} et va jusqu'à ${a[1]} (${a[1]} n'est jamais atteint)${a[2] ? `, de ${a[2]} en ${a[2]}` : ""}.`; }
    else if (lang === "py" && (m = /^for (\w+) in (.*):$/.exec(t))) { counts.boucles++; text = `Pour chaque élément de ${describeExpr(m[2], lang)} : « ${m[1]} » prend chaque valeur, une par une.`; }
    else if (lang === "js" && (m = /^for \(let (\w+) = (.*?); (.*?); (.*?)\) \{$/.exec(t))) { counts.boucles++; text = `Boucle : « ${m[1]} » ${loopWords(m[2], m[3], m[4])}. Ce qui est dedans est répété à chaque tour.`; }
    else if ((m = /^return(?: (.*))?$/.exec(t))) text = m[1] ? `Termine la commande et rend ce résultat : ${describeExpr(m[1], lang)}.` : "Termine la commande tout de suite.";
    else if (lang === "py" && (m = /^global (.*)$/.exec(t))) text = `Dit qu'on va changer, dans cette commande, la ou les boîtes créées en dehors : ${m[1]}.`;
    else if (/^pass$/.test(t)) text = "Ne fait rien (cette ligne sert de place réservée).";
    else if (/^break$/.test(t)) text = "Sort tout de suite de la boucle."; else if (/^continue$/.test(t)) text = "Passe directement au tour suivant de la boucle.";
    else if (lang === "js" && (m = /^(let|const|var) (\w+) = (.*)$/.exec(t)) || lang === "py" && (m = /^(\w+) = (.*)$/.exec(t)) && ((m = [null, "let", m[1], m[2]]))) { const name = m[2]; counts.boites += declared.has(name) ? 0 : 1; text = `${declared.has(name) && lang === "py" ? "Change" : "Crée"} la boîte « ${name} » et y range : ${describeExpr(m[3], lang)}.`; declared.add(name); }
    else if ((m = /^(\w+(?:\[.*\])?) (\+=|-=|\*=|\/=) (.*)$/.exec(t))) { const w = { "+=": "Ajoute", "-=": "Enlève", "*=": "Multiplie la boîte par", "/=": "Divise la boîte par" }[m[2]]; text = m[2] === "+=" || m[2] === "-=" ? `${w} ${describeExpr(m[3], lang)} ${m[2] === "+=" ? "à" : "de"} la boîte « ${m[1]} ».` : `${w} ${describeExpr(m[3], lang)} (boîte « ${m[1]} »).`; }
    else if (lang === "js" && (m = /^(\w+) = (.*)$/.exec(t))) text = `Change la boîte « ${m[1]} » : on y range ${describeExpr(m[2], lang)}.`;
    else if ((m = /^(\w+)\((.*)\)$/.exec(t))) { text = callText(m[1], m[2], lang, mine); if (text) counts.commandes++; }
    if (!text) { fallbacks++; text = `Cette ligne (« ${t0.slice(0, 40)} ») fait quelque chose que je ne sais pas encore expliquer simplement.`; }
    text = text.replace(/Tant que il /g, "Tant qu'il ").replace(/Si il /g, "S'il ").replace(/si il /g, "s'il ");
    rows.push({ n, depth, code: raw.trim(), text });
  });
  const parts = []; const pl = (k, one, many) => k ? parts.push(`${k} ${k > 1 ? many : one}`) : 0;
  pl(counts.fonctions, "commande créée", "commandes créées"); pl(counts.boites, "boîte (variable)", "boîtes (variables)"); pl(counts.boucles, "boucle", "boucles"); pl(counts.conditions, "choix (si)", "choix (si)"); pl(counts.commandes, "ordre au robot ou à l'écran", "ordres au robot ou à l'écran");
  return { rows, fallbacks, counts, summary: rows.length ? `Ton programme a ${rows.length} ligne${rows.length > 1 ? "s" : ""} utile${rows.length > 1 ? "s" : ""}${parts.length ? " : " + parts.join(", ") : ""}. L'ordinateur les lit de haut en bas.` : "Ton programme est vide pour le moment." };
}
export const explainSpeech = r => r.summary + " " + r.rows.map(x => `Ligne ${x.n} : ${x.text}`).join(" ");
