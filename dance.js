// Le robot danse : lumières, notes et mouvements en séquence
import { el, S, sleep, chime, tone, speak } from "./util.js";
import { createEditor, runProgram, Limit, D } from "./blocks.js";
import { robotSvg } from "./robot.js";

const LEDS = [{ v: "#e24b4b", label: "rouge" }, { v: "#4caf6a", label: "vert" }, { v: "#3f7fd6", label: "bleu" }, { v: "#f4c430", label: "jaune" }, { v: "#ffffff", label: "blanc" }];
const NOTES = [{ v: "262", label: "do" }, { v: "294", label: "ré" }, { v: "330", label: "mi" }, { v: "349", label: "fa" }, { v: "392", label: "sol" }, { v: "440", label: "la" }, { v: "494", label: "si" }, { v: "523", label: "do aigu" }];
const ledD = { t: "led", label: "allumer la lampe", icon: "💡", cls: "act", opts: LEDS }, noteD = { t: "note", label: "jouer la note", icon: "🎵", cls: "mv", opts: NOTES };
const spinD = { t: "spin", label: "tourner sur soi-même", icon: "🌀", cls: "turn" }, jumpD = { t: "jump", label: "sauter", icon: "🦘", cls: "turn" };
const waitD = { t: "wait", label: "attendre", icon: "⏳", cls: "act", n: { v: 1, min: 1, max: 4, step: 1, unit: "temps" } };
const repD = { ...D.rep, n: { v: 2, min: 2, max: 8, step: 1, unit: "fois" } };
export const dancePalette = band => band === "a" ? [ledD, noteD, spinD, jumpD, waitD] : band === "b" ? [ledD, noteD, spinD, jumpD, waitD, repD] : [ledD, noteD, spinD, jumpD, waitD, repD, { ...D.call, label: "Refrain (Mon bloc)" }];

export function mountDance(stage, band, hooks = {}) {
  let alive = true, running = false, runId = 0;
  const editor = createEditor({ palette: dancePalette(band), fn: band === "c" });
  const tips = { a: "Compose une petite danse : une lumière, une note, un saut… Mets les blocs dans l'ordre que tu veux !", b: "Utilise « répéter » pour faire un rythme qui revient. Essaie : lumière, note, saut, et on recommence !", c: "Crée un refrain dans « Mon bloc » et appelle-le plusieurs fois pour faire une vraie chanson." };
  const intro = el("div", "intro", tips[band]), stageEl = el("div", "dancestage"), botBox = el("div", "dbot"), msg = el("div", "gmsg", "&nbsp;");
  stageEl.append(botBox); let led = null; const paint = () => botBox.innerHTML = robotSvg(S.robot, led); paint();
  const ctl = el("div", "gctl"), mkb = (cls, txt, fn) => { const b = el("button", "gb " + cls, txt); b.onclick = fn; ctl.append(b); return b; };
  const bRun = mkb("go", "▶ Danse !", () => run()); mkb("", "🗑 Effacer", () => { editor.clear(); led = null; paint(); }); if (hooks.onSave) mkb("", "💾 Garder", () => hooks.onSave(editor.get(), "Ma danse"));
  stage.append(intro, stageEl, msg, ctl, editor.el);
  const say = (t, cls) => { msg.className = "gmsg " + (cls || ""); msg.innerHTML = t; };
  async function anim(cls, ms) { botBox.classList.add(cls); await sleep(S.calm ? 50 : ms); botBox.classList.remove(cls); }
  async function run() {
    if (running) return; if (!editor.lists.main.length) { say("Ton programme est vide. Touche des blocs 👆", "warn"); return; }
    running = true; bRun.disabled = true; const my = ++runId; say("♪ Le robot danse…");
    try { for (const n of runProgram(editor.lists, { cond: () => false }, 400)) { if (!alive || my !== runId) return; editor.highlight(n);
      if (n.t === "led") { led = n.v; paint(); await sleep(350); }
      else if (n.t === "note") { tone(+n.v, 0.4, "triangle", 0.2); await anim("hop", 380); }
      else if (n.t === "spin") { await anim("spin", 650); } else if (n.t === "jump") { await anim("jump", 450); } else if (n.t === "wait") await sleep(380 * (n.n || 1)); } }
    catch (e) { if (e instanceof Limit) say("La danse ne s'arrête jamais ! Vérifie tes répétitions.", "warn"); else throw e; }
    editor.highlight(null); running = false; bRun.disabled = false; if (alive && my === runId) { say("🎉 Bravo, quelle danse !", "ok"); chime("done"); hooks.onWin && hooks.onWin(); }
  }
  return { editor, destroy() { alive = false; runId++; }, run };
}
