// L'enfant choisit la voix : une femme 👩 ou un homme 👨. Deux grands boutons, un échantillon qui parle, puis ✔.
import { S, save, speak, el } from "./util.js";
import { ready, stopClips } from "./voiceclips.js";

export const SAMPLE = "Bonjour, je suis ta nouvelle voix, tu me choisis ?";
export const VOICE_CHOICES = [["f", "👩", "Voix de femme"], ["m", "👨", "Voix d'homme"]];

export async function setVoice(g) {
  S.voiceG = g; save(); stopClips(); await ready();
  speak(SAMPLE, { force: true, full: true });
}

// écran du premier choix (au premier jeu) : l'enfant touche 👩 ou 👨, écoute, puis valide avec ✔
export function pickVoice(host, onDone) {
  host.style.display = "flex";
  host.innerHTML = `<div class="panel vpick" role="dialog" aria-label="Choisis ma voix"><h1 aria-hidden="true">🔊</h1><div class="vpbtns">${VOICE_CHOICES.map(([g, ic, nm]) => `<button class="vpb${S.voiceG === g ? " on" : ""}" data-g="${g}" aria-label="${nm}">${ic}</button>`).join("")}</div><button class="cfmyes vpok" aria-label="Valider ma voix"${S.voiceG ? "" : " disabled"}>✔</button></div>`;
  const ok = host.querySelector(".vpok");
  host.querySelectorAll(".vpb").forEach(b => b.onclick = () => { host.querySelectorAll(".vpb").forEach(x => x.classList.toggle("on", x === b)); ok.disabled = false; setVoice(b.dataset.g); });
  ok.onclick = () => { stopClips(); try { speechSynthesis.cancel(); } catch (e) {} host.style.display = "none"; host.innerHTML = ""; onDone && onDone(); };
}

// la même chose en petites pastilles, pour « Mon robot »
export function voiceChoice() {
  const w = el("div", "rch");
  VOICE_CHOICES.forEach(([g, ic, nm]) => { const b = el("button", "chip" + (S.voiceG === g ? " on" : ""), ic); b.setAttribute("aria-label", nm); b.onclick = () => { w.querySelectorAll(".chip").forEach(x => x.classList.toggle("on", x === b)); setVoice(g); }; w.append(b); });
  return w;
}
