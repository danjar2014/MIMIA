// Voix de l'appareil dans l'appli Android.
// Le composant web d'Android (WebView) n'a pas la synthèse vocale du navigateur : sans ce pont, seules les phrases enregistrées
// se font entendre (et rien du tout en anglais). Ici, on fournit la même interface (speechSynthesis / SpeechSynthesisUtterance),
// branchée sur la synthèse vocale native par le canal « tts » (flutter_inappwebview). Dans un navigateur, ce fichier ne fait rien.
(function () {
  var inApp = /; wv\)/.test(navigator.userAgent) || !!window.flutter_inappwebview;
  if (!inApp && window.speechSynthesis && window.SpeechSynthesisUtterance) return;
  var cur = null, seq = 0;
  var bridge = function () { var f = window.flutter_inappwebview; return f && f.callHandler ? f : null; };
  var fire = function (u, err) { try { if (err) { if (u.onerror) u.onerror({ error: err }); } else if (u.onend) u.onend({}); } catch (e) {} };
  function Utterance(text) { this.text = text == null ? "" : String(text); this.lang = ""; this.rate = 1; this.pitch = 1; this.volume = 1; this.voice = null; this.onend = null; this.onerror = null; this.onstart = null; }
  // le code natif prévient quand la phrase est finie
  window.__ttsEnd = function (id, err) { if (cur && cur.id === id) { var u = cur.u; cur = null; fire(u, err || null); } };
  window.SpeechSynthesisUtterance = Utterance;
  var synth = {
    pending: false, paused: false,
    getVoices: function () { return []; },
    speak: function (u) {
      if (cur) { var p = cur.u; cur = null; fire(p, "interrupted"); }
      var id = ++seq; cur = { u: u, id: id };
      var send = function (f) { try { Promise.resolve(f.callHandler("tts", "speak", id, u.text, u.lang || "", u.rate || 1)).catch(function () { window.__ttsEnd(id, "synthesis-failed"); }); } catch (e) { window.__ttsEnd(id, "synthesis-failed"); } };
      var f = bridge(); if (f) { send(f); return; }
      // le pont natif arrive un instant après le chargement de la page : la phrase attend (le bonjour du début n'est plus perdu) ;
      // s'il n'arrive pas (4 s), la phrase est « finie » pour que l'appli ne reste pas bloquée
      var t0 = Date.now(), wait = function () { if (!cur || cur.id !== id) return; var g = bridge(); if (g) return send(g); if (Date.now() - t0 > 4000) return window.__ttsEnd(id, null); setTimeout(wait, 120); };
      wait();
    },
    cancel: function () {
      if (cur) { var p = cur.u; cur = null; fire(p, "canceled"); }
      var f = bridge(); if (f) { try { f.callHandler("tts", "stop"); } catch (e) {} }
    },
    pause: function () {}, resume: function () {}, addEventListener: function () {}, removeEventListener: function () {}
  };
  Object.defineProperty(synth, "speaking", { get: function () { return !!cur; } });
  try { Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true, writable: true }); } catch (e) { window.speechSynthesis = synth; }
})();
