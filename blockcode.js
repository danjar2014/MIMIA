// Des blocs au vrai code : traduit un programme de blocs en Python ou en JavaScript (sans affichage).
// Le code produit est vérifié par les tests : il réussit les mêmes missions que les blocs.
const COND_GRID = {
  py: { obstacle: "obstacle_devant()", libre: "not obstacle_devant()", etoile: "etoile_ici()", pasarrive: "not arrive()" },
  js: { obstacle: "obstacleDevant()", libre: "!obstacleDevant()", etoile: "etoileIci()", pasarrive: "!arrive()" }
};
const ACT_GRID = {
  py: { fd: "avancer()", tl: "tourner_gauche()", tr: "tourner_droite()", pick: "ramasser()" },
  js: { fd: "avancer();", tl: "tournerGauche();", tr: "tournerDroite();", pick: "ramasser();" }
};
const VARS = ["i", "j", "k", "m"];

// robot sur la grille : { main, fn }
export function gridToCode(lists, lang) {
  const py = lang === "py", I = n => (py ? "    " : "  ").repeat(n), C = COND_GRID[lang], A = ACT_GRID[lang], FN = py ? "mon_bloc" : "monBloc";
  const out = [];
  function body(arr, d, depth) { if (!(arr || []).length) { out.push(I(d) + (py ? "pass" : "// (vide)")); return; } arr.forEach(n => stmt(n, d, depth)); }
  function stmt(n, d, depth) {
    if (n.t === "rep") { const v = VARS[depth] || "n" + depth; out.push(py ? `${I(d)}for ${v} in range(${n.n}):` : `${I(d)}for (let ${v} = 0; ${v} < ${n.n}; ${v}++) {`); body(n.body, d + 1, depth + 1); if (!py) out.push(I(d) + "}"); }
    else if (n.t === "while") { out.push(py ? `${I(d)}while ${C[n.cond]}:` : `${I(d)}while (${C[n.cond]}) {`); body(n.body, d + 1, depth); if (!py) out.push(I(d) + "}"); }
    else if (n.t === "if") {
      out.push(py ? `${I(d)}if ${C[n.cond]}:` : `${I(d)}if (${C[n.cond]}) {`); body(n.body, d + 1, depth);
      if ((n.else || []).length) { out.push(py ? `${I(d)}else:` : `${I(d)}} else {`); body(n.else, d + 1, depth); }
      if (!py) out.push(I(d) + "}");
    } else if (n.t === "call") out.push(I(d) + FN + (py ? "()" : "();"));
    else out.push(I(d) + (A[n.t] || "// ?"));
  }
  const main = lists.main || [], fn = lists.fn || [];
  if (!main.length && !fn.length) return py ? "# Ton programme est vide : ajoute des blocs !" : "// Ton programme est vide : ajoute des blocs !";
  if (fn.length) { out.push(py ? `def ${FN}():` : `function ${FN}() {`); body(fn, 1, 0); if (!py) out.push("}"); out.push(""); }
  main.forEach(n => stmt(n, 0, 0));
  return out.join("\n").replace(/\n+$/, "");
}

// cerveau du robot : { main } avec les blocs de la carte (si / retenir / allumer…)
const COND_BRAIN = {
  py: { near: "distance() < 20", far: "distance() >= 20", vnear: "distance() < 8", dark: "lumiere() < 35", bright: "lumiere() >= 35", pressed: "bouton_appuye()", released: "not bouton_appuye()", tic: "tic()", just: "bouton_appuye() and not avant", memyes: "memoire", memno: "not memoire" },
  js: { near: "distance() < 20", far: "distance() >= 20", vnear: "distance() < 8", dark: "lumiere() < 35", bright: "lumiere() >= 35", pressed: "boutonAppuye()", released: "!boutonAppuye()", tic: "tic()", just: "boutonAppuye() && !avant", memyes: "memoire", memno: "!memoire" }
};
const ACT_BRAIN = {
  py: { lon: "lampe(True)", loff: "lampe(False)", mon: "roues(True)", moff: "roues(False)", son: "haut_parleur(True)", soff: "haut_parleur(False)", mset1: "memoire = True", mset0: "memoire = False", mflip: "memoire = not memoire" },
  js: { lon: "lampe(true);", loff: "lampe(false);", mon: "roues(true);", moff: "roues(false);", son: "hautParleur(true);", soff: "hautParleur(false);", mset1: "memoire = true;", mset0: "memoire = false;", mflip: "memoire = !memoire;" }
};
const RESET = { led: { py: "lampe(False)", js: "lampe(false);" }, motor: { py: "roues(False)", js: "roues(false);" }, speaker: { py: "haut_parleur(False)", js: "hautParleur(false);" } };
const OUT_OF = { lon: "led", loff: "led", mon: "motor", moff: "motor", son: "speaker", soff: "speaker" };

export function brainToCode(prog, lang) {
  const py = lang === "py", I = n => (py ? "    " : "  ").repeat(n), C = COND_BRAIN[lang], A = ACT_BRAIN[lang], main = (prog && prog.main) || [];
  if (!main.length) return py ? "# Ton programme est vide : ajoute des blocs !\ndef boucle():\n    pass" : "// Ton programme est vide : ajoute des blocs !\nfunction boucle() {\n}";
  const used = new Set(), flags = { mem: false, just: false }; (function walk(a) { a.forEach(n => { if (OUT_OF[n.t]) used.add(OUT_OF[n.t]); if (/^m(set|flip)/.test(n.t) || n.cond === "memyes" || n.cond === "memno") flags.mem = true; if (n.cond === "just") flags.just = true; walk(n.body || []); walk(n.else || []); }); })(main);
  const lines = [], body = [];
  function stmt(n, d) {
    if (n.t === "if") { body.push(py ? `${I(d)}if ${C[n.cond]}:` : `${I(d)}if (${C[n.cond]}) {`); blk(n.body, d + 1); if ((n.else || []).length) { body.push(py ? `${I(d)}else:` : `${I(d)}} else {`); blk(n.else, d + 1); } if (!py) body.push(I(d) + "}"); }
    else body.push(I(d) + (A[n.t] || "// ?"));
  }
  function blk(a, d) { if (!(a || []).length) body.push(I(d) + (py ? "pass" : "// (vide)")); else a.forEach(n => stmt(n, d)); }
  if (flags.mem) lines.push(py ? "memoire = False" : "let memoire = false;");
  if (flags.just) lines.push(py ? "avant = False" : "let avant = false;");
  if (lines.length) lines.push("");
  lines.push(py ? "def boucle():" : "function boucle() {");
  const globals = [flags.mem && "memoire", flags.just && "avant"].filter(Boolean);
  if (py && globals.length) lines.push(`${I(1)}global ${globals.join(", ")}`);
  if (used.size) { lines.push(`${I(1)}${py ? "#" : "//"} au début de chaque tour, tout est éteint`); ["led", "motor", "speaker"].filter(k => used.has(k)).forEach(k => lines.push(I(1) + RESET[k][lang])); }
  main.forEach(n => stmt(n, 1));
  lines.push(...body);
  if (flags.just) lines.push(`${I(1)}avant = ${py ? "bouton_appuye()" : "boutonAppuye();"}`);
  if (!py) lines.push("}");
  return lines.join("\n");
}
