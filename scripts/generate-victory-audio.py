#!/usr/bin/env python3
"""Adapt the CC0 fanfare into the Duel victory sound.

Download "Just a random fanfare" by Spring Spring (see licenses/audio/NOTICE.md).
Then run:

    python3 scripts/generate-victory-audio.py /path/to/fanfare_0.ogg

Python 3 and FFmpeg with libmp3lame are required.
"""

import argparse
import hashlib
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'dist' / 'audio' / 'duel-victory.mp3'
RATE = 44100
# About 1 dB below the spell sounds. The battle music stops while it plays.
TARGET_LUFS = -17.0
PEAK_LIMIT = 0.89  # About -1 dBFS.
DIGEST = '952e2492abd4376d2034f4b546cadd077236e350a05b1bd05f8cec81936680a2'
# The fanfare ends near 8 s. Keep the start of its reverb tail, then fade out.
END, FADE = 10.0, 1.5


def ffmpeg(*args):
    return subprocess.run(['ffmpeg', '-hide_banner', '-nostats', *args],
                          check=True, capture_output=True, text=True).stderr


def render(path, gain=1.0, limit=False):
    graph = (f'[0:a]atrim=end={END},asetpts=PTS-STARTPTS,aresample={RATE},'
             f'afade=t=in:d=0.005,afade=t=out:st={END - FADE}:d={FADE},volume={gain:.4f}')
    if limit:
        graph += f',alimiter=limit={PEAK_LIMIT}:attack=1:release=40:level=disabled'
    ffmpeg('-loglevel', 'error', '-y', '-i', str(path), '-filter_complex', graph + '[out]',
           '-map', '[out]', '-c:a', 'libmp3lame', '-b:a', '96k', '-map_metadata', '-1',
           '-metadata', 'title=Just a random fanfare — Duel victory edit',
           '-metadata', 'artist=Spring Spring',
           '-metadata', 'comment=CC0; trimmed and faded; see licenses/audio',
           str(TARGET))


def measure():
    report = ffmpeg('-i', str(TARGET), '-af', 'ebur128=peak=sample', '-f', 'null', '-')
    summary = report[report.rindex('Summary:'):]
    loudness = float(re.search(r'I:\s+(-?[\d.]+) LUFS', summary)[1])
    peak = float(re.search(r'Peak:\s+(-?[\d.inf]+) dBFS', summary)[1])
    return loudness, peak


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source', help='path to fanfare_0.ogg')
    path = Path(parser.parse_args().source)
    if hashlib.sha256(path.read_bytes()).hexdigest() != DIGEST:
        raise SystemExit(f'{path}: SHA-256 does not match the recorded source')
    render(path)
    loudness, _ = measure()
    render(path, 10 ** ((TARGET_LUFS - loudness) / 20), limit=True)
    loudness, peak = measure()
    print(f'duel-victory: {loudness:.1f} LUFS, peak {peak:.1f} dBFS')


if __name__ == '__main__':
    main()
