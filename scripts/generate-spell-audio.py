#!/usr/bin/env python3
"""Adapt the CC0 spell sound sources into one cast sound per spell.

Download the sources listed in licenses/audio/NOTICE.md. Extract the ZIP
files into one folder and put qubodup-PowerDrain.ogg in the same folder. Then run:

    python3 scripts/generate-spell-audio.py /path/to/folder

Python 3 and FFmpeg are required.
"""

import argparse
import hashlib
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
RATE = 44100
# Loudness of each finished file. At the 0.35 effect volume, spells play
# about 6 dB above the duel music at its 0.25 volume.
TARGET_LUFS = -16.0
PEAK_LIMIT = 0.89  # About -1 dBFS.

SOURCES = {
    'fire': ('Fire Spell Impacts/Fire Spell Impact 3.wav',
             '5d54547593efd13eeda5ca237118774117591769ebc3421f0f06f9755b7b514d'),
    'lightning': ('Lightning Spell Impacts/Lightning Spell Impact 1.wav',
                  '15d3a0491e6e51e14cea718dbdb3d597163b0bc00e0fc0fadf1d1d68b0f8b853'),
    'ice': ('Ice Spell Impacts/Ice Spell Impact 5.wav',
            '2d93547c3ac7c09ee010f9dbc986e57b016d6cee749cabd888e1dd29dc6ba3d6'),
    'drain': ('qubodup-PowerDrain.ogg',
              '853067fb0e5b532a83eaa1ce3d06c59819ab7ca72445cc49b132fd938be0234a'),
    'punch': ('Audio/impactPunch_heavy_000.ogg',
              'b33a8f14068aec24ec69ba85e5e87fdc41228975f6a1a3e44a6e7d6fc3d9f8d8'),
    'metal': ('metal_02.ogg',
              '30fcaab83dc3fff5335b78f87f9df305f6f8bd7316e2b46e2a4eaed85ee21768'),
}

# Source excerpts in seconds. Each main hit lands about 120 ms after the start,
# when the Practice Arena flight reaches the dummy (FLIGHT_MS in dist/practice-arena-effects.js).
SPELLS = {
    'expelliarmus': {'source': 'fire', 'start': 0.06, 'end': 1.40, 'fade': 0.30,
                     # The wand clink lands just after the fire reaches the dummy.
                     'accent': {'source': 'metal', 'delay': 0.075, 'gain': 0.5}},
    'confringo': {'source': 'lightning', 'start': 0.33, 'end': 1.83, 'fade': 0.40},
    'protego': {'source': 'ice', 'start': 0.06, 'end': 1.04, 'fade': 0.15},
    # A falling drain sound reads as damage. A bright rising shimmer sounds like a buff.
    'basic-cast': {'source': 'drain', 'start': 0.00, 'end': 1.40, 'fade': 0.40,
                   'accent': {'source': 'punch', 'delay': 0.04, 'gain': 0.8}},
}


def source_path(folder, key):
    name, digest = SOURCES[key]
    path = Path(folder) / name
    if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
        raise SystemExit(f'{path}: SHA-256 does not match the recorded source')
    return path


def ffmpeg(*args):
    return subprocess.run(['ffmpeg', '-hide_banner', '-nostats', *args],
                          check=True, capture_output=True, text=True).stderr


def render(folder, spell_id, spec, gain=1.0, limit=False):
    inputs = ['-i', str(source_path(folder, spec['source']))]
    length = round(spec['end'] - spec['start'], 3)
    graph = (f'[0:a]atrim=start={spec["start"]}:end={spec["end"]},asetpts=PTS-STARTPTS,'
             f'aformat=channel_layouts=mono,aresample={RATE},'
             f'afade=t=in:d=0.005,afade=t=out:st={length - spec["fade"]}:d={spec["fade"]}[main]')
    out = '[main]'
    if accent := spec.get('accent'):
        inputs += ['-i', str(source_path(folder, accent['source']))]
        delay = round(accent['delay'] * 1000)
        graph += (f';[1:a]aformat=channel_layouts=mono,aresample={RATE},'
                  f'adelay={delay},volume={accent["gain"]}[accent];'
                  '[main][accent]amix=inputs=2:duration=first:normalize=0[mix]')
        out = '[mix]'
    graph += f';{out}volume={gain:.4f}'
    if limit:
        graph += f',alimiter=limit={PEAK_LIMIT}:attack=1:release=40:level=disabled'
    target = ROOT / 'dist' / 'spells' / spell_id / 'cast.wav'
    ffmpeg('-loglevel', 'error', '-y', *inputs, '-filter_complex', graph + '[out]',
           '-map', '[out]', '-c:a', 'pcm_s16le', '-map_metadata', '-1', str(target))
    return target


def measure(path):
    report = ffmpeg('-i', str(path), '-af', 'ebur128=peak=sample', '-f', 'null', '-')
    summary = report[report.rindex('Summary:'):]
    loudness = float(re.search(r'I:\s+(-?[\d.]+) LUFS', summary)[1])
    peak = float(re.search(r'Peak:\s+(-?[\d.inf]+) dBFS', summary)[1])
    return loudness, peak


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('sources', help='folder with the extracted source files')
    parser.add_argument('spells', nargs='*', choices=list(SPELLS), metavar='spell',
                        help='spell IDs to rebuild; default is all')
    args = parser.parse_args()
    folder = args.sources
    for spell_id, spec in SPELLS.items():
        if args.spells and spell_id not in args.spells:
            continue
        loudness, _ = measure(render(folder, spell_id, spec))
        gain = 10 ** ((TARGET_LUFS - loudness) / 20)
        loudness, peak = measure(render(folder, spell_id, spec, gain, limit=True))
        print(f'{spell_id}: {loudness:.1f} LUFS, peak {peak:.1f} dBFS')


if __name__ == '__main__':
    main()
