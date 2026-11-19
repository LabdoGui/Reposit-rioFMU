"""Trilha sonora original do vídeo do SangueConecta, sintetizada do zero.

Música (pad, arpejo, baixo e batida suave a 96 BPM) e efeitos sincronizados com as
animações de index.html: impacto da gota, batimentos, transições, toques e conquistas.

    python3 docs/video/tools/trilha.py            → docs/video/assets/trilha.wav

Precisa de numpy e scipy.
"""
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100
DUR = 150.5
N = int(SR * (DUR + 0.5))
RNG = np.random.default_rng(2026)
OUT = Path(__file__).resolve().parents[1] / "assets" / "trilha.wav"

BPM = 96
BEAT = 60 / BPM          # 0,625 s
BAR = 4 * BEAT           # 2,5 s
GRID0 = 7.6              # a música "entra" junto com a segunda cena


def t_axis(n):
    return np.arange(n) / SR


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lowpass(x, hz, order=2):
    return sosfilt(butter(order, hz, "low", fs=SR, output="sos"), x)


def highpass(x, hz, order=2):
    return sosfilt(butter(order, hz, "high", fs=SR, output="sos"), x)


def bandpass(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def add(buf, start, sig, gain=1.0, pan=0.0):
    """Mistura `sig` (mono) no buffer estéreo a partir de `start` segundos."""
    i = int(start * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    left = np.cos((pan + 1) * np.pi / 4)
    right = np.sin((pan + 1) * np.pi / 4)
    buf[0, i : i + len(sig)] += sig * gain * left * np.sqrt(2)
    buf[1, i : i + len(sig)] += sig * gain * right * np.sqrt(2)


def adsr(n, a=0.01, r=0.3):
    env = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na:
        env[:na] = np.linspace(0, 1, na)
    if nr:
        env[-nr:] *= np.linspace(1, 0, nr)
    return env


# ------------------------------------------------------------------ instrumentos
def pad_note(f, dur, bright=1.0):
    n = int(dur * SR)
    t = t_axis(n)
    out = np.zeros(n)
    for det in (-0.07, 0.0, 0.07):           # três vozes levemente desafinadas (coro)
        ff = f * 2 ** (det / 12)
        ph = RNG.random() * 2 * np.pi
        for h in range(1, 9):
            out += np.sin(2 * np.pi * ff * h * t + ph * h) / (h ** (1.6 - 0.4 * bright))
    vib = 1 + 0.04 * np.sin(2 * np.pi * 0.25 * t + RNG.random() * 6)
    return out * vib / 9


def pluck(f, dur=1.2, tau=0.28):
    n = int(dur * SR)
    t = t_axis(n)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    env = np.exp(-t / tau) * np.minimum(1, t / 0.004)
    return s * env


def bass_note(f, dur=0.55):
    n = int(dur * SR)
    t = t_axis(n)
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    return s * np.exp(-t / 0.35) * np.minimum(1, t / 0.006)


def kick(dur=0.45, f0=120, f1=44):
    n = int(dur * SR)
    t = t_axis(n)
    f = f1 + (f0 - f1) * np.exp(-t / 0.045)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / 0.16) * np.minimum(1, t / 0.002)


def hat(dur=0.07):
    n = int(dur * SR)
    t = t_axis(n)
    return highpass(RNG.standard_normal(n), 7000) * np.exp(-t / 0.018)


def heartbeat(gain=1.0):
    """'Tum-tum' grave, como um coração."""
    a = kick(0.5, 90, 38) * 1.0
    b = kick(0.5, 80, 36) * 0.7
    out = np.zeros(int(0.9 * SR))
    out[: len(a)] += a
    j = int(0.29 * SR)
    out[j : j + len(b)] += b
    return lowpass(out, 400) * gain


def boom():
    """Impacto da gota: grave descendo + estalo filtrado."""
    n = int(2.6 * SR)
    t = t_axis(n)
    f = 30 + 90 * np.exp(-t / 0.12)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.7)
    s += lowpass(RNG.standard_normal(n), 900) * np.exp(-t / 0.12) * 0.5
    return s


def splash():
    n = int(0.8 * SR)
    t = t_axis(n)
    return bandpass(RNG.standard_normal(n), 1500, 7000) * np.exp(-t / 0.09) * 0.6


def whoosh(dur=0.9, up=True):
    n = int(dur * SR)
    t = t_axis(n)
    noise = RNG.standard_normal(n)
    out = np.zeros(n)
    bands = 24
    for k in range(bands):                     # varredura de filtro passa-faixa
        seg = slice(k * n // bands, (k + 1) * n // bands)
        frac = k / (bands - 1)
        fc = 300 * (25 ** (frac if up else 1 - frac))
        out[seg] = bandpass(noise, fc * 0.7, min(fc * 1.4, 18000))[seg]
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return out * env


def riser(dur=2.0):
    n = int(dur * SR)
    t = t_axis(n)
    s = highpass(RNG.standard_normal(n), 2500) * (t / dur) ** 2.2
    return s * np.minimum(1, (dur - t) / 0.05)


def click():
    n = int(0.06 * SR)
    t = t_axis(n)
    return (np.sin(2 * np.pi * 1800 * t) * 0.6 + bandpass(RNG.standard_normal(n), 2000, 6000) * 0.4) * np.exp(-t / 0.012)


def chime(root=81, dur=2.2):
    """Brilho de conquista: notas agudas em arpejo rápido."""
    out = np.zeros(int(dur * SR))
    for k, m in enumerate((root, root + 4, root + 7, root + 12)):
        p = pluck(midi(m), dur - k * 0.06, 0.5) * (0.9 - 0.12 * k)
        j = int(k * 0.06 * SR)
        out[j : j + len(p)] += p
    return out


# ------------------------------------------------------------------ arranjo
music = np.zeros((2, N))   # vai para o reverb
dry = np.zeros((2, N))     # batida e efeitos secos
kick_env = np.zeros(N)

# progressão Am – F – C – G (dois compassos cada)
CHORDS = [
    (45, [57, 60, 64, 71]),   # Am(add9)
    (41, [57, 60, 64, 65]),   # Fmaj7
    (48, [55, 60, 64, 74]),   # C(add9)
    (43, [55, 59, 62, 69]),   # G(add9)
]


def chord_at(t):
    k = int(np.floor((t - GRID0) / (2 * BAR))) % len(CHORDS)
    return CHORDS[k]


def intensity(t):
    """0: só pad · 1: pad + arpejo · 2: + baixo · 3: completo (com batida)."""
    if t < GRID0:
        return 0
    if t < 18.6:
        return 2        # o problema: clima contido, sem batida
    if 104.1 <= t < 112.1:
        return 2        # privacidade: mais sóbrio
    if t >= 142.7:
        return 0        # encerramento
    if 136.1 <= t < 142.7:
        return 2        # créditos
    return 3


# pad de abertura (escuro) e pads da música
intro = pad_note(midi(45), 8.2, 0.3) + pad_note(midi(52), 8.2, 0.3) * 0.7
intro = lowpass(intro * adsr(len(intro), 1.5, 1.2), 700)
add(music, 0.0, intro, 0.22)

t = GRID0
while t < 142.7 + 0.01:
    _, notes = chord_at(t + 0.01)
    seg = 2 * BAR + 1.2
    for i, m in enumerate(notes):
        p = pad_note(midi(m), seg, 0.8) * adsr(int(seg * SR), 0.9, 1.4)
        add(music, t - 0.2, lowpass(p, 2600), 0.06, pan=(-0.5 + i / 3))
    t += 2 * BAR

# acorde final (C → Am sus) segurado até o fim
for i, m in enumerate((48, 55, 60, 64, 67, 74)):
    p = pad_note(midi(m), 8.6, 0.6) * adsr(int(8.6 * SR), 1.2, 3.0)
    add(music, 142.4, lowpass(p, 2200), 0.07, pan=(-0.6 + i * 0.24))

# arpejo, baixo, bumbo e chimbal na grade de colcheias
ARP = [0, 1, 2, 3, 2, 1, 2, 3]
step = BEAT / 2
k = 0
t = GRID0
while t < 142.7:
    lvl = intensity(t)
    root, notes = chord_at(t + 0.001)
    pos = k % 8                      # posição no compasso (colcheias)
    if lvl >= 1:
        m = notes[ARP[k % len(ARP)]] + 12
        vel = 0.9 if pos in (0, 4) else 0.65
        add(music, t, pluck(midi(m), 1.0, 0.22 if lvl < 3 else 0.26), 0.11 * vel * (1.5 if lvl < 3 else 1), pan=0.35 * np.sin(k * 0.9))
    if lvl >= 2 and pos in (0, 3, 6):
        add(dry, t, lowpass(bass_note(midi(root), 0.6), 900), 0.28)
    if lvl >= 3:
        if pos in (0, 4):
            kk = kick()
            add(dry, t, kk, 0.42)
            i0 = int(t * SR)
            env = np.exp(-t_axis(int(0.35 * SR)) / 0.12)
            kick_env[i0 : i0 + len(env)] = np.maximum(kick_env[i0 : i0 + len(env)], env[: N - i0])
        if pos in (1, 3, 5, 7):
            add(dry, t, hat(), 0.05 if pos % 4 == 3 else 0.03, pan=0.3)
        if pos in (2, 6) and (k // 8) % 2 == 1:
            add(dry, t, hat(0.12), 0.025, pan=-0.3)
    t += step
    k += 1

# ------------------------------------------------------------------ efeitos sincronizados
add(dry, 0.1, riser(0.9) * 0.6, 0.1)
add(dry, 1.0, boom(), 0.55)
add(dry, 1.0, splash(), 0.25)
add(dry, 1.85, whoosh(1.1, True), 0.12)            # abertura em círculo
add(music, 2.5, chime(76, 2.6), 0.08)               # logotipo
for hb in (4.6, 5.7):
    add(dry, hb + 0.08, heartbeat(), 0.5)

# transições de cena (suaves) e faixas das áreas (mais fortes)
for s in (7.6, 18.6, 28.6, 36.6, 55.6, 64.6, 104.1, 112.1, 119.1, 130.1, 136.1):
    add(dry, s - 0.25, whoosh(0.8, True), 0.06, pan=-0.2)
add(dry, 13.6, whoosh(0.7, False), 0.06)
for b in (45.6, 74.1, 84.1):
    add(dry, b - 0.05, whoosh(0.8, True), 0.13, pan=-0.4)
    add(dry, b + 1.35, whoosh(0.8, False), 0.09, pan=0.4)
    add(music, b + 0.45, chime(81, 1.8), 0.05)
for s in (90.7, 97.9):                              # fases da administração
    add(dry, s, whoosh(0.7, True), 0.07)

# toques e cliques na interface
for c in (50.0, 51.0, 52.0, 78.15, 114.2, 115.8):
    add(dry, c, click(), 0.16)

# números contando e conquistas
add(music, 14.3, chime(69, 1.6), 0.05)              # 1,6%
for m in (66.4, 67.8, 69.2, 69.45):                 # medalhas
    add(music, m, chime(84, 1.8), 0.07)
add(music, 69.26, chime(88, 2.4), 0.08)             # subiu de nível
add(music, 61.9 + 1.2, chime(79, 1.6), 0.05)        # declaração autêntica

# encerramento: impacto, batimentos e brilho final
add(dry, 141.0, riser(1.9), 0.09)
add(dry, 143.0, boom() * 0.8, 0.45)
add(music, 143.4, chime(72, 3.0), 0.09)
for hb in (145.7, 146.9, 148.1):
    add(dry, hb + 0.08, heartbeat(), 0.45)

# ------------------------------------------------------------------ mixagem
duck = 1 - 0.32 * kick_env                          # pad "respira" com o bumbo
music *= duck

ir_n = int(2.4 * SR)
ir_t = t_axis(ir_n)
ir = RNG.standard_normal((2, ir_n)) * np.exp(-ir_t / 0.55)
ir[:, : int(0.012 * SR)] = 0
ir = lowpass(ir, 6000)
ir /= np.abs(ir).sum(axis=1, keepdims=True) ** 0.5 * 18
wet = np.stack([fftconvolve(music[c], ir[c])[:N] for c in range(2)])

mix = music * 0.85 + wet * 0.6 + dry
mix = highpass(mix, 28)
fade_in = np.minimum(1, t_axis(N) / 0.05)
fade_out = np.clip((DUR + 0.3 - t_axis(N)) / 2.2, 0, 1)
mix *= fade_in * fade_out
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix /= np.abs(mix).max() / 0.89
wavfile.write(OUT, SR, (mix.T * 32767).astype(np.int16))
print(f"{OUT} · {N / SR:.1f}s")
