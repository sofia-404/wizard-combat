#!/usr/bin/env python3
"""Adapt the CC0 punch impact into the Duel damage sound.

Download Impact Sounds from kenney.nl (see licenses/audio/NOTICE.md) and
extract the ZIP file. Then run:

    python3 scripts/generate-hit-audio.py /path/to/folder

Python 3 and FFmpeg are required.
"""

import argparse
import hashlib
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'dist' / 'audio' / 'duel-hit.wav'
RATE = 44100
# About 2 dB below the spell sounds, so the spell impact stays in front.
TARGET_LUFS = -18.0
PEAK_LIMIT = 0.89  # About -1 dBFS.

IMPACT = ('Audio/impactPunch_medium_000.ogg',
          '486988aa2d6440ffc4c62a0e8ccf3c23673ba84424bd4723378d451b7255eb5c')


def ffmpeg(*args):
    return subprocess.run(['ffmpeg', '-hide_banner', '-nostats', *args],
                          check=True, capture_output=True, text=True).stderr


def render(folder, gain=1.0, limit=False):
    name, digest = IMPACT
    path = Path(folder) / name
    if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
        raise SystemExit(f'{path}: SHA-256 does not match the recorded source')
    graph = (f'[0:a]aformat=channel_layouts=mono,aresample={RATE},'
             f'afade=t=in:d=0.005,volume={gain:.4f}')
    if limit:
        graph += f',alimiter=limit={PEAK_LIMIT}:attack=1:release=40:level=disabled'
    ffmpeg('-loglevel', 'error', '-y', '-i', str(path), '-filter_complex', graph + '[out]',
           '-map', '[out]', '-c:a', 'pcm_s16le', '-map_metadata', '-1', str(TARGET))


def measure():
    report = ffmpeg('-i', str(TARGET), '-af', 'ebur128=peak=sample', '-f', 'null', '-')
    summary = report[report.rindex('Summary:'):]
    loudness = float(re.search(r'I:\s+(-?[\d.]+) LUFS', summary)[1])
    peak = float(re.search(r'Peak:\s+(-?[\d.inf]+) dBFS', summary)[1])
    return loudness, peak


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('sources', help='folder with the extracted source files')
    folder = parser.parse_args().sources
    render(folder)
    loudness, _ = measure()
    render(folder, 10 ** ((TARGET_LUFS - loudness) / 20), limit=True)
    loudness, peak = measure()
    print(f'duel-hit: {loudness:.1f} LUFS, peak {peak:.1f} dBFS')


if __name__ == '__main__':
    main()
