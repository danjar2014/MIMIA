"""Petite musique douce et gaie, synthétisée (libre de droits) : python music.py <durée s> <sortie.wav>"""
import sys, wave, numpy as np
dur, out = float(sys.argv[1]), sys.argv[2]; sr = 48000; n = int(dur * sr); L = np.zeros(n); R = np.zeros(n)
beat = 60 / 104
def f(m): return 440 * 2 ** ((m - 69) / 12)
def note(t0, m, d, amp, pan=0.5, kind="pluck"):
    i0 = int(t0 * sr)
    if i0 >= n: return
    t = np.arange(min(int(d * sr), n - i0)) / sr; w = 2 * np.pi * f(m) * t
    if kind == "pluck": s = (np.sin(w) + 0.35 * np.sin(2 * w) + 0.12 * np.sin(3 * w)) * np.exp(-t * 5.5) * np.minimum(1, t / 0.004)
    else: s = (np.sin(w) + 0.25 * np.sin(2 * w)) * np.minimum(1, t / 0.25) * np.minimum(1, (d - t) / 0.3)
    L[i0:i0 + len(t)] += s * amp * (1 - pan); R[i0:i0 + len(t)] += s * amp * pan
chords = [[60, 64, 67, 72], [55, 59, 62, 67], [57, 60, 64, 69], [53, 57, 60, 65]]   # do, sol, la mineur, fa
pat = [0, 2, 1, 3, 2, 1, 3, 2]
bar = 0; t = 0.0
while t < dur:
    c = chords[bar % 4]
    note(t, c[0] - 24, beat * 4, 0.20, 0.5, "pad"); note(t, c[0] - 12, beat * 4, 0.10, 0.5, "pad"); note(t, c[2] - 12, beat * 4, 0.07, 0.5, "pad")
    for k, p in enumerate(pat):
        note(t + k * beat / 2, c[p] + 12, 0.9, 0.16, 0.3 + 0.4 * (k % 2))
    if bar % 2 == 1: note(t + beat * 3, c[3] + 24, 1.2, 0.07, 0.6)
    t += beat * 4; bar += 1
env = np.minimum(1, np.arange(n) / (0.6 * sr)) * np.minimum(1, (n - np.arange(n)) / (1.6 * sr))
st = np.stack([L, R], 1) * env[:, None]; st = st / np.abs(st).max() * 0.5
w = wave.open(out, "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes((st * 32767).astype("<i2").tobytes()); w.close()
