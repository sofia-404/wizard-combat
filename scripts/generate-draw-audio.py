#!/usr/bin/env python3
"""Create the original looping sound for a spell stroke while it is drawn.

Run with Python 3. Only the standard library is required:

    python3 scripts/generate-draw-audio.py
"""

import math
from pathlib import Path
import random
import struct
import wave

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'dist' / 'audio' / 'draw-trail.wav'
RATE = 44100
LOOP = 2.0  # Every partial and modulation completes whole cycles in this time.
PEAK = 0.5


def cycles(frequency):
    """Round a frequency to whole cycles per loop so the loop has no seam."""
    return max(1, round(frequency * LOOP)) / LOOP


def main():
    rng = random.Random(26)
    count = round(LOOP * RATE)
    samples = [0.0] * count
    voices = []
    # Airy shimmer: many quiet partials make band-limited noise from 2.5 to 8 kHz.
    for _ in range(160):
        frequency = cycles(rng.uniform(2500, 8000))
        voices.append((frequency, 0.012 * math.sqrt(2500 / frequency), rng.uniform(0, math.tau)))
    # A faint A5 and E6 glow keeps the trail related to the menu tones.
    voices += [(cycles(880), 0.10, 0.0), (cycles(1318.5), 0.05, 1.3)]
    for frequency, strength, phase in voices:
        step = math.tau * frequency / RATE
        for index in range(count):
            samples[index] += strength * math.sin(phase + step * index)
    # Short sparkle pings wrap around the loop end, so they also stay seamless.
    for _ in range(14):
        start = rng.randrange(count)
        frequency = rng.uniform(2200, 4200)
        for offset in range(round(0.06 * RATE)):
            t = offset / RATE
            envelope = min(1.0, t / 0.002) * math.exp(-t / 0.018)
            samples[(start + offset) % count] += 0.09 * envelope * math.sin(math.tau * frequency * t)
    # An 8 Hz flutter gives the trail slight movement without a rhythm.
    flutter = cycles(8)
    for index in range(count):
        samples[index] *= 1 - 0.18 * (0.5 + 0.5 * math.sin(math.tau * flutter * index / RATE))
    scale = PEAK / max(abs(value) for value in samples)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUTPUT), 'wb') as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(RATE)
        audio.writeframes(b''.join(struct.pack('<h', round(value * scale * 32767))
                                   for value in samples))


if __name__ == '__main__':
    main()
