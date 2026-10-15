#!/usr/bin/env python3
"""Create original interface tones and adapt the credited menu and duel music.

Run with Python 3 and FFmpeg installed. The optional source arguments are the
original Night Vigil and Clash Defiant MP3 files downloaded from the URLs in the
provenance files.
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


def loop(source, name, title, start, end, fade, curve, gain):
    # Join the closing fade to the opening fade. The loop starts at source time
    # start + fade, continues through end - fade, then returns through this join.
    body_start, tail_start = round(start + fade, 3), round(end - fade, 3)
    graph = (
        '[0:a]asplit=3[head][body][tail];'
        f'[head]atrim=start={start}:end={body_start},asetpts=PTS-STARTPTS[h];'
        f'[body]atrim=start={body_start}:end={tail_start},asetpts=PTS-STARTPTS[b];'
        f'[tail]atrim=start={tail_start}:end={end},asetpts=PTS-STARTPTS[t];'
        f'[t][h]acrossfade=d={fade}:c1={curve}:c2={curve}[bridge];'
        f'[b][bridge]concat=n=2:v=0:a=1,volume={gain}[out]'
    )
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source),
        '-filter_complex', graph, '-map', '[out]', '-ar', str(RATE),
        '-c:a', 'libmp3lame', '-b:a', '96k', '-map_metadata', '-1',
        '-metadata', f'title={title}',
        '-metadata', 'artist=Kevin MacLeod',
        '-metadata', 'comment=CC BY 4.0; excerpt and loop edit; see licenses/audio',
        str(OUTPUT / name),
    ], check=True)


def music(source):
    loop(source, 'menu-night-vigil.mp3', 'Night Vigil — menu loop',
         0, 100, 6, 'tri', 0.85)


def battle(source):
    # A 56-bar section repeats 79.046 s later. The joins fall on bar starts.
    # Two bars of equal-power crossfade cover small differences between passes.
    # The source is about 7 LU louder than the menu loop, so reduce gain more.
    loop(source, 'duel-clash-defiant.mp3', 'Clash Defiant — duel loop',
         12.02, 93.889, 2.823, 'qsin', 0.45)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--music-source', type=Path)
    parser.add_argument('--battle-source', type=Path)
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
    if options.battle_source:
        battle(options.battle_source)


if __name__ == '__main__':
    main()
