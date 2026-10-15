The menu uses credited music and two original interface sounds.

## Music

“Night Vigil” by Kevin MacLeod (incompetech.com).
Licensed under Creative Commons Attribution 4.0 International (CC BY 4.0).

- Source and author credit: https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1900047
- Original download: https://incompetech.com/music/royalty-free/mp3-royaltyfree/Night%20Vigil.mp3
- License: https://creativecommons.org/licenses/by/4.0/
- Legal terms: https://creativecommons.org/licenses/by/4.0/legalcode
- Retrieved: October 15, 2026.
- Original ISRC: USUAN1900047. Published January 5, 2020. Tempo: 54 BPM.
- Original instruments: choir, flute, basses, cellos.

The distributed `dist/audio/menu-night-vigil.mp3` is an adaptation. It uses the
first 100 seconds of the source. A six-second crossfade joins its closing and
opening phrases. The resulting loop is 94 seconds. Gain was reduced to 85%,
and the result was encoded as 44.1 kHz stereo MP3 at 96 kbit/s.

Include this credit in the game's credits or settings, with working links to
the source and license:

> “Night Vigil” by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0.
> Edited for length and looping.

`night-vigil-source.json` preserves the publisher's track metadata and source
URLs. `incompetech-license-evidence.txt` preserves the attribution template
from the publisher's track page. These are evidence and notices, not a copy
of the full license; the linked license controls use.

## Original interface sounds

`dist/audio/menu-hover.wav` and `dist/audio/menu-click.wav` are original
procedural tones made for Wizard Combat by the included Python script.
They contain sine partials and quiet delayed reflections. They use no
third-party recordings, sound libraries, or external AI music service.

To the extent copyright applies, the original generated WAV sounds are
released under CC0 1.0 Universal:
https://creativecommons.org/publicdomain/zero/1.0/

No attribution is required for these two sounds. The music has its separate
CC BY 4.0 requirements above.

## Reproduction and playback

Run `python3 scripts/generate-menu-audio.py` to regenerate the interface sounds.
To recreate the music edit, download the original to a temporary file and run:

```sh
python3 scripts/generate-menu-audio.py --music-source /path/to/Night-Vigil.mp3
```

Python 3 and FFmpeg with `libmp3lame` are required for the music edit.
The interface sounds use only Python's standard library.

Start music at about 0.25 volume and effects at about 0.35 volume. Keep both
under the user's sound controls. Start playback after a user gesture. Music
can use HTML audio's loop setting; Web Audio buffer looping avoids decoder
scheduling gaps. The loop has a composed crossfade, so do not add a long
silence or restart it on menu interactions. Fade music over about 300 ms when
switching screens or muting. The WAV effects have smooth attacks and tails.
Throttle repeated hover playback so movement across buttons stays quiet.

`assets.json` records file size, duration, encoding, and SHA-256 hashes.
The three distributed audio files total about 1.19 MB.
