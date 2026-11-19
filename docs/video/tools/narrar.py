"""Monta a versão narrada do vídeo: corta as falas do áudio do ElevenLabs, coloca cada uma
no segundo da sua cena e abaixa a música enquanto a voz fala.

    python3 docs/video/tools/narrar.py   → docs/video/sangueconecta-apresentacao-narrado.mp4

Entradas: assets/narracao-elevenlabs.mp3 (as 19 falas de narracao-elevenlabs.txt numa só gravação),
assets/trilha.wav (tools/trilha.py) e o vídeo sangueconecta-apresentacao.mp4 (só a imagem é usada).
Precisa de numpy, scipy e ffmpeg.
"""
import subprocess
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.ndimage import maximum_filter1d, uniform_filter1d

VIDEO_DIR = Path(__file__).resolve().parents[1]
VOZ = VIDEO_DIR / "assets" / "narracao-elevenlabs.mp3"
TRILHA = VIDEO_DIR / "assets" / "trilha.wav"
VIDEO = VIDEO_DIR / "sangueconecta-apresentacao.mp4"
SAIDA = VIDEO_DIR / "sangueconecta-apresentacao-narrado.mp4"
SR = 44100

# (início e fim da fala na gravação, segundo do vídeo em que ela entra).
# A gravação também leu em voz alta os horários entre as falas; esses trechos ficam de fora.
# Pontos de corte achados transcrevendo a gravação (Whisper) e ajustados nos silêncios.
CORTES = [
    (0.00, 5.27, 1.9),       # Doar sangue salva vidas…
    (8.88, 15.31, 7.75),     # Muita gente quer doar…
    (18.29, 23.06, 14.2),    # Em 2023, só 1,6%…
    (26.05, 35.92, 19.1),    # O SangueConecta reúne toda a jornada…
    (38.58, 43.36, 29.3),    # São três perfis…
    (46.34, 52.94, 37.0),    # Na página inicial…
    (56.00, 63.77, 46.3),    # Na área do doador…
    (66.80, 74.44, 56.0),    # O doador acompanha o histórico…
    (76.91, 85.69, 65.1),    # Quem volta a doar ganha pontos…
    (88.08, 96.42, 74.6),    # Na área da equipe…
    (98.96, 103.81, 84.6),   # Na administração…
    (106.51, 113.09, 91.0),  # O Banco de Sangue…
    (115.86, 122.06, 98.3),  # E ainda: relatórios…
    (125.03, 132.72, 104.6), # A privacidade vem desde o projeto…
    (135.64, 140.05, 112.5), # E dá para instalar…
    (143.04, 151.84, 119.4), # Por dentro…
    (154.53, 158.92, 130.5), # ODS 3…
    (161.85, 167.34, 136.4), # Trabalho de Conclusão de Semestre…
    (170.30, 175.77, 143.4), # SangueConecta: conectando doadores… Obrigado!
]


def ler(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)


voz_src = ler(VOZ)
sr, musica = wavfile.read(TRILHA)
assert sr == SR
musica = musica.astype(np.float64) / 32768.0          # estéreo (n, 2)
N = len(musica)

voz = np.zeros(N)
fala = np.zeros(N)                                      # 1 onde há voz (para abaixar a música)
for a, b, dst in CORTES:
    clip = voz_src[int(a * SR):int(b * SR)].copy()
    fi, fo = int(0.01 * SR), int(0.05 * SR)
    clip[:fi] *= np.linspace(0, 1, fi)
    clip[-fo:] *= np.linspace(1, 0, fo)
    i = int(dst * SR)
    assert i + len(clip) <= N, "fala passa do fim do vídeo"
    assert not np.any(fala[i:i + len(clip)]), f"falas sobrepostas em {dst}s"
    voz[i:i + len(clip)] += clip
    fala[i:i + len(clip)] = 1

# voz em -17 dBFS RMS nos trechos falados, com limitador suave nos picos
rms = np.sqrt(np.mean(voz[fala > 0] ** 2))
voz *= 10 ** (-17 / 20) / rms
pico = uniform_filter1d(maximum_filter1d(np.abs(voz), size=int(0.01 * SR)), size=int(0.005 * SR))
voz *= np.minimum(1.0, 0.89 / np.maximum(pico, 1e-9))

# música um pouco mais baixa e ~12 dB abaixo da voz durante a fala, com entrada e saída suaves
alvo = 1 - (1 - 10 ** (-12 / 20)) * maximum_filter1d(fala, size=int(0.35 * SR), origin=0)
ganho = uniform_filter1d(alvo, size=int(0.3 * SR))
mix = musica * ganho[:, None] * 0.75 + voz[:, None]
mix /= max(1.0, np.abs(mix).max() / 0.97)

wav = VIDEO_DIR / "assets" / "trilha-narrada.wav"
wavfile.write(wav, SR, (mix * 32767).astype(np.int16))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(VIDEO), "-i", str(wav), "-map", "0:v", "-map", "1:a",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(SAIDA)], check=True)
print(SAIDA)
