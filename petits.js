// Les Petits (3-6 ans) : chiffres, lettres, couleurs, jours, mois, relier, espace — dans l'univers des robots (méthode Montessori :
// un seul geste, de gros boutons, un seul mot à retenir, la voix dit tout). 5 petites manches par activité, sans texte à lire.
import { el, S, chime, tone, speak, rnd, DEVICE } from "./util.js";
import { robotSvg } from "./robot.js";
import { PARTS } from "./parts.js";

export const NUMS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix"];
export const DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
export const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
// compter, nommer les lettres, relier : on utilise les pièces d'un vrai robot (roue, moteur, capteurs, haut-parleur, laser, wifi, contrôleur…)
export const COUNT_OBJ = PARTS.filter(p => p.plural).map(p => [p.svg, p.plural]);
export const LETTER_OBJ = PARTS.filter(p => p.letter).map(p => [p.svg, p.word, p.letter]);
export const COLORS = [["rouge", "#e24b4b"], ["bleu", "#3f7fd6"], ["vert", "#4caf6a"], ["jaune", "#f4c430"], ["orange", "#f08a24"], ["violet", "#8e5bd6"], ["rose", "#ec6aa5"]];
export const MATCH_OBJ = PARTS.filter(p => ["roue", "moteur", "pile", "lampe", "haut-parleur", "camera", "antenne", "controleur", "bras", "ventilateur", "horloge", "satellite", "capteur-distance", "pince"].includes(p.id)).map(p => p.svg);
export const SPACE_OBJ = [["🌙", "la lune"], ["☀️", "le soleil"], ["🌍", "la Terre"], ["⭐", "l'étoile"], ["🚀", "la fusée"], ["🪐", "la planète"]];
export const POSITIONS = [["⬆️", "en haut", "top"], ["⬇️", "en bas", "bottom"], ["⬅️", "à gauche", "left"], ["➡️", "à droite", "right"]];
// les activités de l'accueil des petits : [id, icône, nom (un seul mot), couleur de fond]
export const PETITS = [["chiffres", "🔢", "Chiffres", "#ffe0ec"], ["lettres", "🔤", "Lettres", "#d6ecff"], ["couleurs", "🎨", "Couleurs", "#fff1b8"], ["pieces", "🔧", "Pièces", "#e3f1f1"], ["jours", "📅", "Jours", "#d9f5d3"],
  ["mois", "🗓️", "Mois", "#eadcff"], ["relier", "🔗", "Relier", "#ffe9c7"], ["espace", "🚀", "Espace", "#d2f1ef"]];

export const shuffle = (a, r = rnd) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = r(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const distinct = (list, n, r, not) => { const pool = shuffle(list.filter(x => x !== not), r); return pool.slice(0, n); };
// trois réponses, une seule juste, mélangées
export const three = (right, others, r) => shuffle([{ ...right, ok: true }, ...others.map(o => ({ ...o, ok: false }))], r);

// ----- les manches -----
export function countRound(r, max) {
  const n = 1 + r(max), [emo, what] = COUNT_OBJ[r(COUNT_OBJ.length)], wrong = distinct(Array.from({ length: Math.min(max + 1, 10) }, (_, i) => i + 1), 2, r, n);
  return { type: "quiz", say: `Combien ${what} ?`, show: `<span class="ptcount">${Array.from({ length: n }, () => `<i>${emo}</i>`).join("")}</span>`, options: three({ html: String(n), label: NUMS[n] }, wrong.map(k => ({ html: String(k), label: NUMS[k] })), r) };
}
export function letterRound(r, used = []) {
  const pool = LETTER_OBJ.filter(x => !used.includes(x[2])), [emo, word, L] = pool[r(pool.length)], wrong = distinct(LETTER_OBJ.map(x => x[2]), 2, r, L);
  return { type: "quiz", L, say: `Touche la lettre ${L}, comme ${word}.`, show: `<span class="ptbig">${emo}</span>`, options: three({ html: L, label: L }, wrong.map(x => ({ html: x, label: x })), r) };
}
export function colorRound(r) {
  const [c3, ...rest] = shuffle(COLORS, r).slice(0, 3), opts = [c3, ...rest].map(([name, hex]) => ({ html: robotSvg({ ...S.robot, color: hex }), label: "robot " + name, name }));
  return { type: "quiz", say: `Touche le robot ${c3[0]}.`, show: "", options: shuffle(opts.map((o, i) => ({ ...o, ok: i === 0 })), r) };
}
// « Quel jour vient après … ? » : la bonne réponse et deux autres jours (jamais le jour donné)
const nextOf = (list, i, r) => { const right = list[i + 1], wrong = shuffle(list.filter(x => x !== list[i] && x !== right), r).slice(0, 2); return three({ html: right, label: right }, wrong.map(w => ({ html: w, label: w })), r); };
export function dayRound(r) { const i = r(6); return { type: "quiz", say: `Quel jour vient après ${DAYS[i]} ?`, show: `<span class="ptword">${DAYS[i]}</span>`, options: nextOf(DAYS, i, r) }; }
export function monthRound(r) { const i = r(11); return { type: "quiz", say: `Quel mois vient après ${MONTHS[i]} ?`, show: `<span class="ptword">${MONTHS[i]}</span>`, options: nextOf(MONTHS, i, r) }; }
export const seqRound = (words, say, r) => ({ type: "seq", say, items: shuffle(words.map((w, order) => ({ html: w, label: w, order })), r) });
export function matchRound(r, count) {
  const objs = shuffle(MATCH_OBJ, r).slice(0, count);
  return { type: "match", say: "Relie chaque objet à son ombre.", left: objs.map((o, k) => ({ html: o, k })), right: shuffle(objs.map((o, k) => ({ html: o, k })), r) };
}
export function spaceRound(r, used = []) {
  const pool = SPACE_OBJ.filter(x => !used.includes(x[1])), [emo, name] = pool[r(pool.length)], wrong = distinct(SPACE_OBJ.filter(x => x[1] !== name), 2, r);
  return { type: "quiz", name, say: `Touche ${name}.`, show: "", options: three({ html: `<span class="ptbig">${emo}</span>`, label: name }, wrong.map(([e, n]) => ({ html: `<span class="ptbig">${e}</span>`, label: n })), r) };
}
export function positionRound(r) {
  const [arrow, label, side] = POSITIONS[r(4)], wrong = distinct(POSITIONS.filter(p => p[2] !== side), 2, r);
  return { type: "quiz", side, say: "Où est la fusée ?", show: `<span class="ptsky ${side}"><i>🚀</i></span>`, options: three({ html: `${arrow} ${label}`, label }, wrong.map(([a, l]) => ({ html: `${a} ${l}`, label: l })), r) };
}
// « Touche la roue. » : reconnaître une pièce parmi trois
export function piecesRound(r, used = []) {
  const pool = PARTS.filter(p => !used.includes(p.id)), p = pool[r(pool.length)], wrong = distinct(PARTS.filter(x => x.id !== p.id), 2, r);
  return { type: "quiz", part: p.id, say: `Touche ${p.name}.`, show: "", options: three({ html: `<span class="ptbig">${p.svg}</span>`, label: p.word }, wrong.map(w => ({ html: `<span class="ptbig">${w.svg}</span>`, label: w.word })), r) };
}
// « À quoi sert la roue ? » : le rôle d'une pièce parmi trois (pour les plus grands)
export function roleRound(r, used = []) {
  const pool = PARTS.filter(p => !used.includes(p.id)), p = pool[r(pool.length)], wrong = distinct(PARTS.filter(x => x.id !== p.id && x.role !== p.role), 2, r);
  return { type: "quiz", part: p.id, say: `À quoi sert ${p.name} ?`, show: `<span class="ptbig">${p.svg}</span>`, options: three({ html: `<span class="ptrole">${p.role}</span>`, label: p.role }, wrong.map(w => ({ html: `<span class="ptrole">${w.role}</span>`, label: w.role })), r) };
}
const distinctRounds = (make, n, r) => { const used = [], out = []; for (let i = 0; i < n; i++) { const x = make(r, used); used.push(x.part); out.push(x); } return out; };
export const ROUNDS = {
  pieces: r => distinctRounds(piecesRound, 5, r),
  roles: r => distinctRounds(roleRound, 5, r),
  chiffres: r => [countRound(r, 4), countRound(r, 5), countRound(r, 6), countRound(r, 9), countRound(r, 9)],
  lettres: r => { const used = [], out = []; for (let i = 0; i < 5; i++) { const x = letterRound(r, used); used.push(x.L); out.push(x); } return out; },
  couleurs: r => Array.from({ length: 5 }, () => colorRound(r)),
  jours: r => [dayRound(r), dayRound(r), dayRound(r), seqRound(DAYS, "Touche les jours dans l'ordre.", r)],
  mois: r => [monthRound(r), monthRound(r), monthRound(r), seqRound(MONTHS, "Touche les mois dans l'ordre.", r)],
  relier: r => [matchRound(r, 3), matchRound(r, 3), matchRound(r, 4)],
  espace: r => { const used = [], out = []; for (let i = 0; i < 5; i++) { if (i === 2 || i === 4) out.push(positionRound(r)); else { const x = spaceRound(r, used); used.push(x.name); out.push(x); } } return out; }
};
// toutes les phrases que la voix peut dire dans les activités (pour enregistrer les clips : voice/extract.mjs)
export function petitsPhrases() {
  const out = new Set(["Essaie encore.", "Compte encore.", "Cherche encore."]);
  COUNT_OBJ.forEach(([, w]) => out.add(`Combien ${w} ?`)); LETTER_OBJ.forEach(([, w, L]) => out.add(`Touche la lettre ${L}, comme ${w}.`)); COLORS.forEach(([n]) => out.add(`Touche le robot ${n}.`));
  DAYS.slice(0, 6).forEach(d => out.add(`Quel jour vient après ${d} ?`)); MONTHS.slice(0, 11).forEach(m => out.add(`Quel mois vient après ${m} ?`));
  PARTS.forEach(p => { out.add(`Touche ${p.name}.`); out.add(`À quoi sert ${p.name} ?`); out.add(p.role); });
  out.add("Touche les jours dans l'ordre."); out.add("Touche les mois dans l'ordre."); out.add("Relie chaque objet à son ombre."); out.add("Où est la fusée ?"); SPACE_OBJ.forEach(([, n]) => out.add(`Touche ${n}.`));
  return [...out];
}

// ----- le jeu : des manches, une à une -----
export function mountPetit(stage, id, hooks = {}, r = rnd) {
  const rounds = Array.isArray(id) ? id : typeof id === "function" ? id(r) : ROUNDS[id](r); let i = 0, alive = true, busy = false, timers = [];
  const later = (fn, ms) => { const t = setTimeout(() => { if (alive) fn(); }, ms); timers.push(t); };
  const dots = el("div", "ptdots"), bar = el("div", "ptbar"), body = el("div", "ptbody"), msg = el("div", "gmsg", "&nbsp;"), rep = el("button", "ptrep", "🔊");
  rep.setAttribute("aria-label", "Écouter encore");
  bar.append(rep, dots); stage.append(bar, body, msg);
  const paintDots = () => { dots.innerHTML = rounds.map((_, k) => `<i class="${k < i ? "ok" : k === i ? "now" : ""}"></i>`).join(""); };
  const say = (t, cls) => { msg.className = "gmsg " + (cls || ""); msg.innerHTML = t; };
  const ask = (text) => { rep.onclick = () => speak(text, { force: true, full: true }); later(() => speak(text, { prio: 1, queue: true, full: true }), 350); };
  let miss = 0, okBtn = null;
  const wrongTap = (b, hint) => { chime("no"); b.classList.add("no"); if (++miss >= 2 && okBtn && !okBtn.disabled) okBtn.classList.add("glow"); later(() => b.classList.remove("no"), 500); say(hint, "warn"); };
  const goodNext = (ms = 1100) => { busy = true; chime("ok"); say("Bravo !", "ok"); later(() => { i++; if (i >= rounds.length) finish(); else show(); }, ms); };
  function finish() { paintDots(); busy = true; chime("done"); say("🎉 Bravo ! Tu as tout réussi.", "ok"); hooks.onWin && hooks.onWin(); }
  function show(host = body, demo = false) {
    const rd = rounds[demo ? 0 : i]; if (!demo) { busy = false; miss = 0; } okBtn = null; host.innerHTML = ""; if (!demo) { say("&nbsp;"); paintDots(); ask(rd.say); }
    // jeux à son : on écoute (bouton 🔊, et une fois tout seul) puis on choisit
    if (rd.sound && !demo) { const bt = el("button", "ptsnd", "🔊"); bt.setAttribute("aria-label", "Écouter le son"); bt.onclick = () => playSound(rd.sound); host.append(bt); later(() => playSound(rd.sound), 1700); }
    if (rd.type === "quiz") {
      if (rd.show) { const s = el("div", "ptshow"); s.innerHTML = rd.show; host.append(s); }
      const opts = el("div", "ptopts n" + rd.options.length); host.append(opts);
      rd.options.forEach(o => { const b = el("button", "ptopt", o.html); b.setAttribute("aria-label", o.label); b.dataset.say = o.label; b.dataset.silent = "";   /* pas de mot lu au toucher : le « Bravo » enregistré suffit, sans chevauchement */ if (o.ok) okBtn = b; b.onclick = () => { if (busy) return; if (o.ok) { b.classList.add("ok"); goodNext(); } else wrongTap(b, rd.type === "quiz" && rd.say.startsWith("Combien") ? "Compte encore." : "Essaie encore."); }; opts.append(b); });
    } else if (rd.type === "seq") {
      let next = 0; const grid = el("div", "ptseq n" + rd.items.length); host.append(grid);
      const seqBtns = []; const markNext = () => { okBtn = seqBtns.find(x => !x.disabled && +x.dataset.o === next) || null; };
      rd.items.forEach(it => { const b = el("button", "ptopt seq", it.html); b.dataset.o = it.order; seqBtns.push(b); b.setAttribute("aria-label", it.label); b.dataset.say = it.label; b.onclick = () => { if (busy || b.disabled) return; if (it.order === next) { b.classList.add("ok"); b.disabled = true; tone(440 + next * 40, 0.12, "sine", 0.14); next++; markNext(); if (next === rd.items.length) goodNext(900); } else wrongTap(b, "Cherche encore."); }; grid.append(b); }); markNext();
    } else if (rd.type === "memory") {
      // mémoire : on retourne deux cartes, si elles sont pareilles elles restent visibles
      const grid = el("div", "ptmem n" + rd.cards.length); host.append(grid); let open = [], found = 0;
      rd.cards.forEach(c => {
        const b = el("button", "ptopt mem", '<span class="mback">?</span><span class="mface"></span>'); b.querySelector(".mface").innerHTML = c.html; b.setAttribute("aria-label", "carte"); b.dataset.silent = "";
        b.onclick = () => {
          if (busy || b.disabled || b.classList.contains("up")) return; b.classList.add("up"); b.setAttribute("aria-label", c.label || "carte"); open.push([b, c]);
          if (open.length < 2) return; const [[b1, c1], [b2, c2]] = open; open = [];
          if (c1.k === c2.k) { b1.classList.add("ok"); b2.classList.add("ok"); b1.disabled = b2.disabled = true; tone(660, 0.12, "sine", 0.14); found++; if (found === rd.cards.length / 2) goodNext(900); }
          else { busy = true; tone(220, 0.15, "sawtooth", 0.1); later(() => { b1.classList.remove("up"); b2.classList.remove("up"); b1.setAttribute("aria-label", "carte"); b2.setAttribute("aria-label", "carte"); busy = false; }, 800); }
        };
        grid.append(b);
      });
    } else if (rd.type === "match") {
      let sel = null, done = 0; const box = el("div", "ptmatch"), L = el("div", "ptcol"), R = el("div", "ptcol"), svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("class", "mline"); box.append(L, R, svg); host.append(box);
      const mk = (it, side) => { const b = el("button", "ptopt m" + (side === "r" && !rd.plain ? " sil" : ""), `<span class="ptbig">${it.html}</span>`); b.dataset.k = it.k; b.dataset.silent = ""; b.setAttribute("aria-label", side === "r" ? "ombre" : "objet"); return b; };
      const lefts = rd.left.map(it => mk(it, "l")), rights = rd.right.map(it => mk(it, "r")); lefts.forEach(b => L.append(b)); rights.forEach(b => R.append(b));
      if (demo) { lefts.forEach((l, k) => { const r2 = rights.find(x => x.dataset.k === l.dataset.k); if (r2) { l.classList.add("ok"); r2.classList.add("ok"); later(() => line(l, r2), 60); } }); }
      const line = (a, b) => { const p = box.getBoundingClientRect(), x = a.getBoundingClientRect(), y = b.getBoundingClientRect(), ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
        ln.setAttribute("x1", x.right - p.left); ln.setAttribute("y1", x.top + x.height / 2 - p.top); ln.setAttribute("x2", y.left - p.left); ln.setAttribute("y2", y.top + y.height / 2 - p.top); svg.append(ln); };
      lefts.forEach(b => b.onclick = () => { if (busy || b.disabled) return; lefts.forEach(x => x.classList.remove("sel")); sel = b; b.classList.add("sel"); sfxBeep(); });
      rights.forEach(b => b.onclick = () => { if (busy || b.disabled || !sel) return; if (sel.dataset.k === b.dataset.k) { line(sel, b); sel.classList.remove("sel"); sel.classList.add("ok"); b.classList.add("ok"); sel.disabled = b.disabled = true; sel = null; tone(660, 0.12, "sine", 0.14); done++; if (done === lefts.length) goodNext(1000); } else wrongTap(b, "Essaie encore."); });
    }
  }
  const showDemo = () => { const box = el("div", "ptdemo"); const cap = el("div", "ptdemo-t", "Exemple"); const holder = el("div", "ptdemoin"); box.append(cap, holder); const keep = busy; show(holder, true); if (okBtn) okBtn.classList.add("glow"); busy = keep; return box; };
  const sfxBeep = () => tone(880, 0.06, "square", 0.08);
  const playSound = snd => (snd.notes || []).forEach(([f, d, t, delay, g]) => tone(f, d, t || "sine", g || 0.2, delay || 0));
  // le petit cours : une phrase, puis chaque mot est dit et éclairé l'un après l'autre
  function lesson(L) {
    body.innerHTML = ""; dots.innerHTML = ""; say("&nbsp;"); busy = true;
    const row = el("div", "ptles"), cells = (L.items || []).map(it => el("div", "ptcell", it.html)), go = el("button", "ptplay", "▶ Jouer"); cells.forEach(c => row.append(c)); body.append(row, showDemo(), go);
    let run = 0, fired = 0;
    const start = () => { if (!alive) return; busy = false; run++; body.innerHTML = ""; show(); };
    go.onclick = () => { run++; start(); };
    const play = () => {
      const my = ++run; cells.forEach(c => c.classList.remove("now"));
      const step = (k) => {
        if (!alive || my !== run) return; if (k >= cells.length) { go.classList.add("pulse"); speak("Regarde l'exemple, puis touche Jouer.", { force: true, full: true }); return; }
        cells.forEach(c => c.classList.remove("now")); cells[k].classList.add("now");
        let done = false; const nx = () => { if (done) return; done = true; later(() => step(k + 1), 250); }; later(nx, 1800 + (L.items[k].label.length) * 110);
        speak(DEVICE + L.items[k].label, { force: true, full: true, onEnd: nx });
      };
      let intro = false; const after = () => { if (intro) return; intro = true; later(() => step(0), 300); };
      later(after, 9000 + L.say.length * 90); speak(L.say, { prio: 1, queue: true, full: true, onEnd: after });
    };
    rep.onclick = play; later(play, 400);
  }
  if (hooks.lesson && hooks.lesson.say) lesson(hooks.lesson); else show();
  return { destroy() { alive = false; timers.forEach(clearTimeout); }, rounds, get index() { return i; }, get busy() { return busy; } };
}
