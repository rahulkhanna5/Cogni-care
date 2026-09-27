"""
Cuts one clean call out of each recorded animal sound, for Sound Forest.

    python3 scripts/cut-recordings.py && node scripts/gen-audio.mjs

Reads the originals in assets/audio/source/originals/ (decoded with macOS
`afconvert`), writes one short mono clip per animal to assets/audio/source/,
which gen-audio.mjs then places left, right and centre like every other voice.

Each clip is:
  - ONE call, under 750ms: the fastest level plays a sound every 900ms.
  - Started a few ms before the call's own onset, with no fade-in beyond 3ms.
    Localisation is computed from the onset; a soft start destroys it.
  - High-passed at 300Hz: below that is wind and handling rumble, and a phone
    speaker cannot reproduce it anyway.
  - Levelled close to the synthesised voices' loudness, without clipping,
    so no animal is the faint one.

Sources (both CC0 1.0, BigSoundBank.com, Joseph Sardin — credit optional):
  duck  #0276 "Ducks"    — the second quack, 0.78-1.11s: the cleanest, 28dB clear of the background
  crow  #0956 "Crows 2"  — the first caw, 0.15-0.57s: the later ones run 0.8-0.9s, too long
"""

import os
import subprocess
import tempfile
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(HERE, '..', 'assets', 'audio', 'source')
RATE = 22050

# animal: (original file, rough start s, rough end s)
CALLS = {
    'duck': ('bigsoundbank-0276-ducks.mp3', 0.74, 1.12),
    'crow': ('bigsoundbank-0956-crows-2.mp3', 0.10, 0.58),
}

PRE_ROLL_S = 0.004  # before the onset
TAIL_S = 0.08       # after the rough end, faded out
FADE_IN_S = 0.003
MAX_S = 0.75
DRIVE = 1.6         # how hard the loudest moments are rounded off (see cut)


def decode(path):
    with tempfile.TemporaryDirectory() as tmp:
        out = os.path.join(tmp, 'x.wav')
        subprocess.run(['afconvert', '-f', 'WAVE', '-d', f'LEI16@{RATE}', '-c', '1', path, out], check=True)
        with wave.open(out) as w:
            return np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float64) / 32768


def high_pass(x, cutoff=300.0):
    """Second-order Butterworth high-pass (RBJ biquad)."""
    w0 = 2 * np.pi * cutoff / RATE
    alpha = np.sin(w0) / (2 * np.sqrt(0.5))
    cos = np.cos(w0)
    b = np.array([(1 + cos) / 2, -(1 + cos), (1 + cos) / 2])
    a = np.array([1 + alpha, -2 * cos, 1 - alpha])
    b, a = b / a[0], a / a[0]
    y = np.zeros_like(x)
    x1 = x2 = y1 = y2 = 0.0
    for i, v in enumerate(x):
        out = b[0] * v + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2
        x2, x1, y2, y1 = x1, v, y1, out
        y[i] = out
    return y


def onset(x, start, end):
    """
    First 2ms frame inside [start, end) above a quarter of the loudest one.

    A tenth kept the crow's quiet lead-in: its caw then took 25ms to reach 30%
    of full level, against 0-5ms for every other voice — a soft onset, which
    blunts exactly the cue left/right judgement uses. From a quarter, with the
    3ms fade-in, it starts as sharply as the rest and sounds the same.
    """
    frame = int(0.002 * RATE)
    seg = x[start:end]
    env = np.array([np.sqrt(np.mean(seg[i:i + frame] ** 2)) for i in range(0, len(seg) - frame, frame)])
    first = int(np.argmax(env > env.max() * 0.25))
    return start + first * frame


def cut(animal, filename, rough_start, rough_end):
    x = high_pass(decode(os.path.join(SOURCE, 'originals', filename)))
    at = onset(x, int(rough_start * RATE), int(rough_end * RATE))
    start = max(0, at - int(PRE_ROLL_S * RATE))
    end = min(len(x), int((rough_end + TAIL_S) * RATE), start + int(MAX_S * RATE))
    clip = x[start:end].copy()

    fade_in = int(FADE_IN_S * RATE)
    clip[:fade_in] *= np.linspace(0, 1, fade_in)
    fade_out = int(TAIL_S * RATE)
    clip[-fade_out:] *= 0.5 * (1 + np.cos(np.linspace(0, np.pi, fade_out)))

    # Loudness without clipping. Scaling to a set average level clipped 0.6%
    # of the duck flat — an audible crackle, because a call's peaks sit ~4x
    # above its average. So: peak to full scale, then a gentle tanh curve that
    # rounds the loudest moments instead of chopping them, lifting the body.
    clip /= np.abs(clip).max()
    clip = 0.95 * np.tanh(DRIVE * clip) / np.tanh(DRIVE)

    out = os.path.join(SOURCE, f'{animal}.wav')
    with wave.open(out, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes((clip * 32767).astype('<i2').tobytes())
    print(f'{animal}: {len(clip) / RATE * 1000:.0f}ms from {start / RATE:.3f}s, peak {np.abs(clip).max():.2f}')


if __name__ == '__main__':
    for animal, (filename, a, b) in CALLS.items():
        cut(animal, filename, a, b)
