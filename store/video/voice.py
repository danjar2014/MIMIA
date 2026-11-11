import sys, os, json, subprocess, wave, contextlib
ROOT = r"C:\Users\BelhassenM'BARKI\Documents\Codex\2026-10-30\files-pasted-by-the-user-tu\outputs\Robotique-Junior"
sys.path.insert(0, os.path.join(ROOT, "voice"))
import gen, urllib.request
OUT = r"C:\gtmp\ad\vo"; os.makedirs(OUT, exist_ok=True)
LINES = {
 "fr": ["RobotKids. Les robots, le code et les jeux, pour les enfants de trois à douze ans.",
        "Dès trois ans, des jeux de style Montessori. Tout est dit à voix haute.",
        "À six ans, votre enfant guide un robot avec des blocs.",
        "Puis il assemble des circuits, et écrit du vrai code.",
        "Sans publicité. Sans collecte de données. Et ça marche sans Internet.",
        "RobotKids. Essayez gratuitement pendant sept jours, sur Google Play."],
 "en": ["RobotKids. Robots, coding and games, for children aged three to twelve.",
        "From age three, Montessori-style games. Everything is spoken aloud.",
        "At six, your child guides a robot with blocks.",
        "Then they build circuits, and write real code.",
        "No ads. No data collected. And it works without Internet.",
        "RobotKids. Try it free for seven days, on Google Play."],
}
REF = open(os.path.join(ROOT, "voice", "tools", "ref_F5.wav"), "rb").read()
def synth(text, language):
    body, ct = gen.multipart({"text": text, "language": language, "engine": "cosyvoice", "ref_text": gen.REF_TEXT}, {"ref_audio": ("ref_F5.wav", REF)})
    return urllib.request.urlopen(urllib.request.Request(gen.URL, body, {"Content-Type": ct}), timeout=900).read()
only = sys.argv[1:] or ["fr", "en"]
res = {}
for lang in only:
    for i, t in enumerate(LINES[lang]):
        raw = os.path.join(OUT, f"{lang}{i}_raw.wav"); w = os.path.join(OUT, f"{lang}{i}.wav")
        if not os.path.exists(w):
            open(raw, "wb").write(synth(t, "French" if lang == "fr" else "English"))
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-16:TP=-1.5", "-ar", "48000", "-ac", "1", w], check=True)
        with contextlib.closing(wave.open(w)) as f: d = f.getnframes() / f.getframerate()
        res[f"{lang}{i}"] = round(d, 2); print(lang, i, round(d, 2), flush=True)
json.dump(res, open(os.path.join(OUT, f"dur-{'-'.join(only)}.json"), "w"))
