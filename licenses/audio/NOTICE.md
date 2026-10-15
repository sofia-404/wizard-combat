The menu and Duel use credited music. The menu also uses two original interface
sounds.

## Menu music

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

## Duel music

“Clash Defiant” by Kevin MacLeod (incompetech.com).
Licensed under Creative Commons Attribution 4.0 International (CC BY 4.0).

- Source and author credit: https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1600003
- Original download: https://incompetech.com/music/royalty-free/mp3-royaltyfree/Clash%20Defiant.mp3
- License: https://creativecommons.org/licenses/by/4.0/
- Legal terms: https://creativecommons.org/licenses/by/4.0/legalcode
- Retrieved: October 15, 2026.
- Original ISRC: USUAN1600003. Published January 13, 2016. Tempo: 170 BPM.
- Original instruments: basses, cellos, war horn, brass, percussion, choir.
- Original download SHA-256:
  e2c0dfd33481c032fc8626c86f279b41a542d9b359f72c8b90833c28a1211f76

The distributed `dist/audio/duel-clash-defiant.mp3` is an adaptation. A 56-bar
section of the source repeats 79.046 seconds later. The edit uses source time
12.02 s to 93.889 s. A 2.823-second (two-bar) equal-power crossfade joins its
closing and opening bars. The resulting loop is 79.05 seconds and starts at
source time 14.843 s. Gain was reduced to 45% to match the menu loop's
loudness, and the result was encoded as 44.1 kHz stereo MP3 at 96 kbit/s.

Include this credit in the game's credits, with working links to the source
and license:

> “Clash Defiant” by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0.
> Edited for length and looping.

`clash-defiant-source.json` preserves the publisher's track metadata and source
URLs. The publisher's attribution template is the same as the one preserved in
`incompetech-license-evidence.txt`; the Clash Defiant track page was checked on
the retrieval date.

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

## Drawing sound

`dist/audio/draw-trail.wav` loops while the player draws a spell shape. It is
an original procedural sound made for Wizard Combat by
`scripts/generate-draw-audio.py`. It mixes quiet sine partials from 2.5 to
8 kHz, faint A5 and E6 tones, short sparkle pings, and an 8 Hz flutter. Every
part completes whole cycles in the 2-second loop, so the loop has no seam. It
uses no third-party recordings, sound libraries, or external AI service. It is
released under CC0 1.0 Universal like the other original interface sounds.

The game plays it through Web Audio. Fingertip speed sets its level and a
small pitch rise. The level is zero below 0.05 screen widths per second and
reaches the maximum gain of 0.14 at 0.6 screen widths per second. It fades out
in about 60 ms when the stroke ends, tracking is lost, or sound is off.

## Reproduction and playback

Run `python3 scripts/generate-menu-audio.py` to regenerate the interface sounds.
Run `python3 scripts/generate-draw-audio.py` to regenerate the drawing sound.
To recreate the music edits, download the originals to temporary files and run:

```sh
python3 scripts/generate-menu-audio.py --music-source /path/to/Night-Vigil.mp3
python3 scripts/generate-menu-audio.py --battle-source /path/to/Clash-Defiant.mp3
```

Python 3 and FFmpeg with `libmp3lame` are required for the music edits.
The interface and drawing sounds use only Python's standard library.

Start music at about 0.25 volume and effects at about 0.35 volume. Keep both
under the user's sound controls. Start playback after a user gesture. Music
can use HTML audio's loop setting; Web Audio buffer looping avoids decoder
scheduling gaps. The loop has a composed crossfade, so do not add a long
silence or restart it on menu interactions. Fade music over about 300 ms when
switching screens or muting. The WAV effects have smooth attacks and tails.
Throttle repeated hover playback so movement across buttons stays quiet.

`assets.json` records file size, duration, encoding, and SHA-256 hashes.
The five distributed audio files total about 2.32 MB. The drawing sound is
about 0.18 MB.
