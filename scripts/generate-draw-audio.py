#!/usr/bin/env python3
"""Adapt the CC0 "magic loop" recording into the spell stroke sound.

Download the source listed in licenses/audio/NOTICE.md, then run:

    python3 scripts/generate-draw-audio.py /path/to/711353_15071386-hq.mp3

Python 3 and FFmpeg are required.
"""

import argparse
import hashlib
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'dist' / 'audio' / 'draw-trail.wav'
SOURCE_SHA256 = '4448d20ebcadd55e9035e8ad220486a1d79253e6c2e43dcbaf8a99326a1f61cf'
# The last and first samples of the source do not join smoothly. The loop
# starts FADE seconds into the source, and its end crossfades back into the
# first FADE seconds, so the wrap has no click.
LENGTH, FADE = 9.850884, 0.2
# The mono mix is about -40.1 LUFS. This gain brings it to about -17 LUFS, the
# level that the stroke volume in dist/draw-audio.js was set for.
GAIN_DB = 23.1
# Almost all source energy is below 3.4 kHz, so 22.05 kHz keeps it unchanged.
RATE = 22050


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    source = parser.parse_args().source
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    if digest != SOURCE_SHA256:
        raise SystemExit(f'Unexpected source SHA-256: {digest}')
    tail = round(LENGTH - FADE, 6)
    graph = (
        '[0:a]pan=mono|c0=0.5*c0+0.5*c1,asplit=3[head][body][tail];'
        f'[head]atrim=end={FADE},asetpts=PTS-STARTPTS[h];'
        f'[body]atrim=start={FADE}:end={tail},asetpts=PTS-STARTPTS[b];'
        f'[tail]atrim=start={tail},asetpts=PTS-STARTPTS[t];'
        f'[t][h]acrossfade=d={FADE}:c1=qsin:c2=qsin[bridge];'
        f'[b][bridge]concat=n=2:v=0:a=1,volume={GAIN_DB}dB,'
        f'aresample={RATE}:resampler=soxr[out]'
    )
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source),
        '-filter_complex', graph, '-map', '[out]', '-map_metadata', '-1',
        '-c:a', 'pcm_s16le', str(OUTPUT),
    ], check=True)


if __name__ == '__main__':
    main()
