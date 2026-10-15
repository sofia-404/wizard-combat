#!/usr/bin/env python3
"""Create original interface tones and adapt the credited menu music.

Run with Python 3 and FFmpeg installed. The optional source argument is the
original Night Vigil MP3 downloaded from the URL in the provenance file.
"""

import argparse
import math
from pathlib import Path
import struct
import subprocess
import wave

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'dist' / 'audio'
RATE = 44100


def tone(name, duration, voices, peak):
    """Render smooth sine partials, then add two quiet delayed reflections."""
    count = round(duration * RATE)
    samples = [0.0] * count
    for start, frequency, strength, decay in voices:
        start_sample = round(start * RATE)
        for index in range(start_sample, count):
            t = (index - start_sample) / RATE
            # A slow attack and end taper prevent clicks at both boundaries.
            attack = min(1.0, t / 0.018)
            tail = min(1.0, (duration - index / RATE) / 0.06)
            envelope = attack * tail * math.exp(-t / decay)
            fundamental = math.sin(math.tau * frequency * t)
            shimmer = 0.10 * math.sin(math.tau * frequency * 2.001 * t)
            samples[index] += strength * envelope * (fundamental + shimmer)
    dry = samples[:]
    for delay, gain in ((0.051, 0.15), (0.089, 0.07)):
        offset = round(delay * RATE)
        for index in range(offset, count):
            samples[index] += dry[index - offset] * gain
    scale = peak / max(abs(value) for value in samples)
    with wave.open(str(OUTPUT / name), 'wb') as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(RATE)
        audio.writeframes(b''.join(struct.pack('<h', round(value * scale * 32767))
                                   for value in samples))


def music(source):
    # Join the closing six seconds to the opening six seconds. The loop starts
    # at source time 6 s, continues through 94 s, then returns through this join.
    graph = (
        '[0:a]asplit=3[head][body][tail];'
        '[head]atrim=start=0:end=6,asetpts=PTS-STARTPTS[h];'
        '[body]atrim=start=6:end=94,asetpts=PTS-STARTPTS[b];'
        '[tail]atrim=start=94:end=100,asetpts=PTS-STARTPTS[t];'
        '[t][h]acrossfade=d=6:c1=tri:c2=tri[bridge];'
        '[b][bridge]concat=n=2:v=0:a=1,volume=0.85[out]'
    )
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source),
        '-filter_complex', graph, '-map', '[out]', '-ar', str(RATE),
        '-c:a', 'libmp3lame', '-b:a', '96k', '-map_metadata', '-1',
        '-metadata', 'title=Night Vigil — menu loop',
        '-metadata', 'artist=Kevin MacLeod',
        '-metadata', 'comment=CC BY 4.0; excerpt and loop edit; see licenses/audio',
        str(OUTPUT / 'menu-night-vigil.mp3'),
    ], check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--music-source', type=Path)
    options = parser.parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    # D and A partials make a soft, brief magical interval without a noise bed.
    tone('menu-hover.wav', 0.26, [(0, 587.33, 1, 0.07),
                                (0.024, 880, 0.22, 0.065)], 0.20)
    tone('menu-click.wav', 0.46, [(0, 293.66, 0.40, 0.10),
                                (0.012, 587.33, 1, 0.11),
                                (0.048, 880, 0.30, 0.12)], 0.24)
    if options.music_source:
        music(options.music_source)


if __name__ == '__main__':
    main()
