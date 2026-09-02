#!/usr/bin/env python3
"""
gen-thock.py — gera WAVs thock sintéticos cálidos para Tríade (S8.6, UX-DR-29)
Uso:
  python3 tools/gen-thock.py merge        # gera triade/assets/sfx/merge.wav
  python3 tools/gen-thock.py spawn
  python3 tools/gen-thock.py gameover
  python3 tools/gen-thock.py --all        # gera os 3

Timbre: seno sweep 180→80Hz com exp decay 70ms + ataque 2ms, mono 44.1kHz 16-bit PCM.
Cada preset ajusta duração e sweep para identidade minimalista cálida/orgânica, substituível por mastering real depois.
Offline, sem dependências externas, sem CDN (NFR-6).
"""
import argparse
import math
import os
import struct
import sys

SR = 44100  # Hz
BITS = 16
CHANNELS = 1

PRESETS = {
    "merge": {
        "duration": 0.12,
        "f_start": 180.0,
        "f_end": 90.0,
        "amp": 0.78,
        "delay": False,
        "path": "triade/assets/sfx/merge.wav",
    },
    "spawn": {
        "duration": 0.08,
        "f_start": 220.0,
        "f_end": 120.0,
        "amp": 0.55,  # mais suave — playback também usa volume 0.35 fixo em sfx.ts
        "delay": False,
        "path": "triade/assets/sfx/spawn.wav",
    },
    "gameover": {
        "duration": 0.28,
        "f_start": 120.0,
        "f_end": 60.0,
        "amp": 0.85,
        "delay": True,  # leve reverb 40ms
        "path": "triade/assets/sfx/gameover.wav",
    },
    # alias
    "gameOver": {
        "duration": 0.28,
        "f_start": 120.0,
        "f_end": 60.0,
        "amp": 0.85,
        "delay": True,
        "path": "triade/assets/sfx/gameover.wav",
    },
}

def gen_samples(duration, f_start, f_end, amp, add_delay):
    n = int(SR * duration)
    samples = []
    for i in range(n):
        t = i / SR
        # envelope exp decay 70ms + ataque 2ms
        env = math.exp(-t / 0.07)
        if t < 0.002:
            env *= t / 0.002
        # sweep linear
        # evita divisão por zero se duration==0
        frac = t / duration if duration > 0 else 1.0
        f = f_start + (f_end - f_start) * frac
        # seno principal
        sample = math.sin(2 * math.pi * f * t) * env * amp
        # reverb leve 40ms para gameover
        if add_delay and t > 0.04:
            t2 = t - 0.04
            env2 = math.exp(-t2 / 0.07) * 0.32
            if t2 < 0.002:
                env2 *= t2 / 0.002
            frac2 = t2 / duration if duration > 0 else 1.0
            f2 = f_start + (f_end - f_start) * frac2
            sample += math.sin(2 * math.pi * f2 * t2) * env2 * amp * 0.38
        # soft limit para evitar clip
        if sample > 1.0:
            sample = 1.0
        elif sample < -1.0:
            sample = -1.0
        # scale para 16-bit com headroom 0.92
        val = int(sample * 32767 * 0.92)
        # clamp
        if val > 32767:
            val = 32767
        elif val < -32768:
            val = -32768
        samples.append(val)
    return samples

def write_wav(path, samples):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    n = len(samples)
    byte_rate = SR * CHANNELS * (BITS // 8)
    block_align = CHANNELS * (BITS // 8)
    data_size = n * (BITS // 8)
    # RIFF header
    with open(path, "wb") as f:
        f.write(b"RIFF")
        f.write(struct.pack("<I", 36 + data_size))
        f.write(b"WAVE")
        f.write(b"fmt ")
        f.write(struct.pack("<I", 16))  # PCM chunk size
        f.write(struct.pack("<H", 1))  # audio format PCM
        f.write(struct.pack("<H", CHANNELS))
        f.write(struct.pack("<I", SR))
        f.write(struct.pack("<I", byte_rate))
        f.write(struct.pack("<H", block_align))
        f.write(struct.pack("<H", BITS))
        f.write(b"data")
        f.write(struct.pack("<I", data_size))
        for s in samples:
            f.write(struct.pack("<h", s))

def generate(kind):
    key = kind if kind in PRESETS else kind.lower()
    if key not in PRESETS:
        print(f"preset desconhecido: {kind} — use merge/spawn/gameover", file=sys.stderr)
        sys.exit(1)
    cfg = PRESETS[key]
    samples = gen_samples(cfg["duration"], cfg["f_start"], cfg["f_end"], cfg["amp"], cfg["delay"])
    write_wav(cfg["path"], samples)
    size = os.path.getsize(cfg["path"])
    print(f"gerado {cfg['path']} — {cfg['duration']}s sweep {cfg['f_start']}→{cfg['f_end']}Hz amp {cfg['amp']} delay={cfg['delay']} — {size} bytes ({len(samples)} samples)")

def main():
    p = argparse.ArgumentParser(description="Gera WAV thock sintético cálido para Tríade")
    p.add_argument("kind", nargs="?", choices=["merge", "spawn", "gameover", "gameOver"], help="qual wav gerar")
    p.add_argument("--all", action="store_true", help="gera os 3 wavs")
    args = p.parse_args()
    if args.all:
        for k in ["merge", "spawn", "gameover"]:
            generate(k)
    elif args.kind:
        generate(args.kind)
    else:
        p.print_help()
        sys.exit(1)

if __name__ == "__main__":
    main()
