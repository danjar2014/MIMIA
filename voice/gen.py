"""Génère les clips audio des phrases de l'appli avec VoiceStudio (http://127.0.0.1:3900).
  python voice/gen.py f5   -> voix FEMME  : CosyVoice 3, timbre cloné depuis voice/tools/ref_F5.wav (Supertonic F5)
  python voice/gen.py m4   -> voix HOMME  : Supertonic-3, préréglage M4, pauses resserrées (tighten.py)
Reprenable : les clips déjà présents sont ignorés. Écrit voice/clips/<voix>/<clé>.mp3 et voice/manifest.json."""
import sys, os, json, re, io, wave, subprocess, tempfile, time, unicodedata, urllib.request, uuid, glob, shutil
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "tools"))
from tighten import tighten  # noqa
URL = "http://127.0.0.1:3900/generate"
REF_TEXT = "Bravo ! Tu as donné le bon ordre au robot. Il avance de trois cases."

def key(s):  # identique à voiceKey() dans voiceclips.js
    n = "".join(c for c in unicodedata.normalize("NFC", s).lower() if c.isalnum())
    h = 2166136261
    b = n.encode("utf-16-le")
    for i in range(0, len(b), 2):
        h ^= b[i] | (b[i + 1] << 8); h = (h * 16777619) & 0xFFFFFFFF
    return "%08x" % h

def speakable(s):  # ce qu'on envoie au moteur : sans emojis ni symboles
    s = re.sub(r"[\U0001F000-\U0001FFFF←-⯿☀-➿️‍]", " ", s)
    s = s.replace("«", "").replace("»", "").replace("→", ", ").replace("↔", " et ").replace("…", "...")
    return re.sub(r"\s+", " ", s).strip()

def multipart(fields, files):
    bd = uuid.uuid4().hex; out = io.BytesIO()
    for k, v in fields.items(): out.write(f'--{bd}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    for k, (fn, data) in files.items(): out.write(f'--{bd}\r\nContent-Disposition: form-data; name="{k}"; filename="{fn}"\r\nContent-Type: audio/wav\r\n\r\n'.encode() + data + b"\r\n")
    out.write(f"--{bd}--\r\n".encode()); return out.getvalue(), f"multipart/form-data; boundary={bd}"

def synth(voice, text):
    if voice == "m4": f, fl = {"text": text, "language": "French", "engine": "supertonic3", "preset_voice": "M4"}, {}
    else: f, fl = {"text": text, "language": "French", "engine": "cosyvoice", "ref_text": REF_TEXT}, {"ref_audio": ("ref_F5.wav", open(os.path.join(HERE, "tools", "ref_F5.wav"), "rb").read())}
    body, ct = multipart(f, fl)
    return urllib.request.urlopen(urllib.request.Request(URL, body, {"Content-Type": ct}), timeout=600).read()

def ffmpeg():
    p = shutil.which("ffmpeg") or glob.glob(os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Packages\*\*\bin\ffmpeg.exe")) and glob.glob(os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Packages\*\*\bin\ffmpeg.exe"))[0]
    return p or os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Links\ffmpeg.exe")

def manifest():
    m = {v: sorted(os.path.splitext(f)[0] for f in os.listdir(os.path.join(HERE, "clips", v))) for v in ("f5", "m4")}
    json.dump(m, open(os.path.join(HERE, "manifest.json"), "w")); return m

def main(voice):
    phrases = json.load(open(os.path.join(HERE, "phrases.json"), encoding="utf-8"))
    extra = os.path.join(HERE, "phrases_extra.json")
    if os.path.exists(extra): phrases += json.load(open(extra, encoding="utf-8"))
    seen, todo = set(), []
    for p in phrases:
        k = key(p)
        if k in seen: continue
        seen.add(k)
        if not os.path.exists(os.path.join(HERE, "clips", voice, k + ".mp3")): todo.append((k, p))
    print(f"{voice}: {len(todo)} clips à générer sur {len(seen)}", flush=True); ff = ffmpeg(); t0 = time.time(); tmp = tempfile.mkdtemp(prefix="vgen", dir=os.environ.get("TEMP"))
    for i, (k, p) in enumerate(todo, 1):
        for attempt in (1, 2, 3):
            try:
                raw = synth(voice, speakable(p)); w = os.path.join(tmp, k + ".wav"); open(w, "wb").write(raw)
                if voice == "m4": w2 = w + ".t.wav"; tighten(w, w2); w = w2
                subprocess.run([ff, "-y", "-loglevel", "error", "-i", w, "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "40k", os.path.join(HERE, "clips", voice, k + ".mp3")], check=True)
                break
            except Exception as e:
                print("  erreur", k, attempt, str(e)[:120], flush=True); time.sleep(5)
        if i % 20 == 0 or i == len(todo): manifest(); print(f"{voice}: {i}/{len(todo)}  {int(time.time()-t0)} s", flush=True)
    manifest(); print(voice, "terminé", flush=True)

if __name__ == "__main__": main(sys.argv[1])
