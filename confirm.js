// Confirmation sans phrase à lire : une question courte et deux grands boutons ronds, ✖ (non) et ✔ (oui) — comme chez iwawa.
// Les boutons gardent un nom pour les lecteurs d'écran et la voix. Échap = non.
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
export function askConfirm(host, { title, sub = "", onYes, onNo }) {
  host.style.display = "flex";
  host.innerHTML = `<div class="panel cfm" role="alertdialog" aria-label="${esc(title)}"><h1>${esc(title)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ""}<div class="cfmbtns"><button class="cfmno" aria-label="Non">✖</button><button class="cfmyes" aria-label="Oui">✔</button></div></div>`;
  const no = () => { document.removeEventListener("keydown", key); onNo && onNo(); }, yes = () => { document.removeEventListener("keydown", key); onYes && onYes(); };
  const key = e => { if (e.key === "Escape") no(); };
  host.querySelector(".cfmno").onclick = no; host.querySelector(".cfmyes").onclick = yes; document.addEventListener("keydown", key);
  host.querySelector(".cfmno").focus();   // le « non » est sélectionné d'office : une touche pressée par erreur n'efface rien
}
