#!/usr/bin/env python3
"""Adapt the CC0 "Magic Object Floating" loop into the spell stroke sound.

Download the source listed in licenses/audio/NOTICE.md, then run:

    python3 scripts/generate-draw-audio.py /path/to/758005_9616576-hq.mp3

Python 3 and FFmpeg are required.
"""

import argparse
import hashlib
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'dist' / 'audio' / 'draw-trail.wav'
SOURCE_SHA256 = 'a5cfd5bb6adcdca35409eeb34935c820169d7bef60182625bfac8ed2f8f1af18'
# The source has a one-shot version, a short silence, then the loopable version.
# These 44.1 kHz sample positions are the first and last audible samples of
# the loopable version, so the loop wraps without a silent gap.
LOOP_START, LOOP_END = 793796, 1190212
# The loop is about -40.8 LUFS. This gain brings it to about -17 LUFS, the
# level that the stroke volume in dist/draw-audio.js was set for.
GAIN_DB = 23.8
# The source has no content above 11 kHz, so 22.05 kHz keeps it unchanged.
RATE = 22050


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    source = parser.parse_args().source
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    if digest != SOURCE_SHA256:
        raise SystemExit(f'Unexpected source SHA-256: {digest}')
    graph = (f'atrim=start_sample={LOOP_START}:end_sample={LOOP_END},'
             f'pan=mono|c0=0.5*c0+0.5*c1,volume={GAIN_DB}dB,'
             f'aresample={RATE}:resampler=soxr')
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source),
        '-af', graph, '-map_metadata', '-1', '-c:a', 'pcm_s16le', str(OUTPUT),
    ], check=True)


if __name__ == '__main__':
    main()
