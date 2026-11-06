// Bouton « Installer » : affiché à chaque ouverture tant que l'appli n'est pas installée (PWA). Absent une fois installée ou dans l'appli Android.
let deferred = null;
export const isInstalled = () => { try { return matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || navigator.standalone === true || !!window.flutter_inappwebview; } catch (e) { return false; } };
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export function initInstall() {
  if (typeof window === "undefined" || isInstalled()) return;
  const bar = document.createElement("div"); bar.className = "installbar";
  bar.innerHTML = `<button class="installbtn" type="button">⬇️ Installer l'appli</button><button class="installx" type="button" aria-label="Fermer">✕</button>`;
  const kill = () => { bar.remove(); document.body.classList.remove("hasinstall"); };
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; });
  window.addEventListener("appinstalled", kill);
  bar.querySelector(".installx").onclick = kill;
  bar.querySelector(".installbtn").onclick = async () => {
    if (deferred) { deferred.prompt(); try { const r = await deferred.userChoice; if (r && r.outcome === "accepted") kill(); } catch (e) {} deferred = null; return; }
    alert(isIos() ? "Pour installer : touche le bouton Partager, puis « Sur l'écran d'accueil »." : "Pour installer : ouvre le menu du navigateur (⋮), puis « Installer l'application » ou « Ajouter à l'écran d'accueil ».");
  };
  document.body.append(bar); document.body.classList.add("hasinstall");
}
