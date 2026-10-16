The menu and Practice Arena use credited music. The menu also uses two original interface
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

## Practice Arena music

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
an adaptation of "magic loop" by Rising_Moon, released under CC0 1.0
Universal: https://creativecommons.org/publicdomain/zero/1.0/

No attribution is required. The game credits the author as a courtesy.

- Source: https://freesound.org/people/Rising_Moon/sounds/711353/
  The sound page lists the license as Creative Commons 0.
- Retrieved October 15, 2026, as the Freesound high-quality preview
  `711353_15071386-hq.mp3` (SHA-256
  4448d20ebcadd55e9035e8ad220486a1d79253e6c2e43dcbaf8a99326a1f61cf).

The source is a 9.85-second loop. Its last and first samples do not join
smoothly, so the edit starts the loop 0.2 s into the source and crossfades the
last 0.2 s into the first 0.2 s with an equal-power curve. It is mixed to mono,
raised by 23.1 dB to about -17 LUFS, resampled to 22.05 kHz, and stored as
16-bit WAV. Almost all source energy is below 3.4 kHz, so the lower sample
rate removes nothing audible. The loop is 9.65 seconds.

The game plays it through Web Audio. Fingertip speed sets its level and a
small pitch rise. The level is zero below 0.05 screen widths per second and
reaches the maximum gain of 0.14 at 0.6 screen widths per second. It fades out
in about 60 ms when the stroke ends, tracking is lost, or sound is off.

## Spell sounds

Each spell plays one cast sound from its spell folder. The sounds are
adaptations of third-party recordings released under CC0 1.0 Universal:
https://creativecommons.org/publicdomain/zero/1.0/

No attribution is required. The game credits the authors as a courtesy.

| File | Source recording | Author and pack |
|---|---|---|
| `dist/spells/protego/cast.wav` | Ice Spell Impact 5.wav | Lentikula, Basic Spell Impacts |
| `dist/spells/basic-cast/cast.wav` | qubodup-PowerDrain.ogg and impactPunch_heavy_000.ogg | qubodup, Energy Drain; Kenney, Impact Sounds |
| `dist/spells/confringo/cast.wav` | Lightning Spell Impact 1.wav | Lentikula, Basic Spell Impacts |
| `dist/spells/expelliarmus/cast.wav` | Fire Spell Impact 3.wav and metal_02.ogg | Lentikula, Basic Spell Impacts; rubberduck, 80 CC0 RPG SFX |

Sources, retrieved October 15, 2026:

- Basic Spell Impacts [Free/CC0] by Lentikula:
  https://lentikula.itch.io/freecc0-basic-spell-impacts-sfx
  (`Basic Spell Impacts.zip`, SHA-256
  6e265452877dd4121635200b2c59be3b36a2d2aed20ee15915c7c59396028f4d).
  The page states: "I release this pack under a CC0 license, so you can use
  it in whatever project without attribution".
- 80 CC0 RPG SFX by rubberduck:
  https://opengameart.org/content/80-cc0-rpg-sfx
  (`80-CC0-RPG-SFX_0.zip`, SHA-256
  1c2f06ff4e8563b5b8b745b23cf213c1474142a69bb82bd8f5e10d9b3f7a7bbd).
- Energy Drain by qubodup (CC0):
  https://opengameart.org/content/energy-drain
  (`qubodup-PowerDrain.ogg`, SHA-256
  853067fb0e5b532a83eaa1ce3d06c59819ab7ca72445cc49b132fd938be0234a).
- Impact Sounds (1.0) by Kenney, also used for the damage sound below
  (`Audio/impactPunch_heavy_000.ogg`).

`scripts/generate-spell-audio.py` records the excerpt times and the SHA-256
of each source recording. Each excerpt starts so that its main hit lands
about 120 ms after playback starts. That is when the Practice Arena flight reaches the
dummy. The Expelliarmus sound adds the metal clink at half gain, 75 ms after
the start. The Basic Cast sound adds the Kenney punch at 0.8 gain, 40 ms after the start. Each file has a 5 ms fade-in and a fade-out of 150 to 400 ms. It is
mixed to mono, normalized to about -16 LUFS with a -1 dBFS peak limit, and
encoded as 44.1 kHz 16-bit WAV.

## Duel damage sound

`dist/audio/duel-hit.wav` plays when a spell hits the Duel dummy and deals
damage. It is a short punch impact with no voice. It is an adaptation of a
third-party recording released under CC0 1.0 Universal:
https://creativecommons.org/publicdomain/zero/1.0/

No attribution is required. The game credits the author as a courtesy.

- Source recording: `Audio/impactPunch_medium_000.ogg` from Impact Sounds (1.0)
  by Kenney: https://kenney.nl/assets/impact-sounds
  (`kenney_impact-sounds.zip`, SHA-256
  029d734af1582474edf3a694d1b0cebc97c1c152f2f39fa34d4c2bafc5de77f8).
  Retrieved October 15, 2026. The included `License.txt` states:
  "License: (Creative Commons Zero, CC0)".

`scripts/generate-hit-audio.py` records the SHA-256 of the source recording.
The edit adds a 5 ms fade-in, mixes to mono, normalizes to about -18 LUFS with
a -1 dBFS peak limit, and encodes 44.1 kHz 16-bit WAV. That is about 2 dB below
the spell sounds, so the spell impact stays in front.

## Duel victory fanfare

`dist/audio/duel-victory.mp3` plays once when the Duel dummy is defeated.
The battle music stops while the dummy stays defeated. It is an adaptation of
a third-party recording released under CC0 1.0 Universal:
https://creativecommons.org/publicdomain/zero/1.0/

No attribution is required. The game credits the author as a courtesy.

- Source recording: "Just a random fanfare" by Spring Spring (Julie
  Damsgaard): https://opengameart.org/content/just-a-random-fanfare
  (`fanfare_0.ogg`, SHA-256
  952e2492abd4376d2034f4b546cadd077236e350a05b1bd05f8cec81936680a2).
  Retrieved October 15, 2026. The page lists the license as CC0.

`scripts/generate-victory-audio.py` records the SHA-256 of the source
recording. The edit keeps the first 10 seconds: the fanfare ends near 8 s,
then the start of its reverb tail fades out over 1.5 s. It adds a 5 ms fade-in,
normalizes to about -17 LUFS with a -1 dBFS peak limit, and encodes 44.1 kHz
stereo MP3 at 96 kbit/s.

## Reproduction and playback

Run `python3 scripts/generate-menu-audio.py` to regenerate the interface sounds.
To recreate the drawing sound, download its source preview and run
`python3 scripts/generate-draw-audio.py /path/to/711353_15071386-hq.mp3`.
To recreate the music edits, download the originals to temporary files and run:

```sh
python3 scripts/generate-menu-audio.py --music-source /path/to/Night-Vigil.mp3
python3 scripts/generate-menu-audio.py --battle-source /path/to/Clash-Defiant.mp3
```

To recreate the spell sounds, extract the source ZIP files and
`qubodup-PowerDrain.ogg` into one temporary folder and run:

```sh
python3 scripts/generate-spell-audio.py /path/to/folder
```

Add a spell ID, such as `v`, to rebuild only that spell.

Python 3 and FFmpeg with `libmp3lame` are required for the music edits.
To recreate the damage sound, extract its source ZIP file and run:

```sh
python3 scripts/generate-hit-audio.py /path/to/folder
```

To recreate the victory fanfare, download `fanfare_0.ogg` and run:

```sh
python3 scripts/generate-victory-audio.py /path/to/fanfare_0.ogg
```

FFmpeg is also required for the spell, damage, and victory sounds.
The interface sounds use only Python's standard library. The drawing sound
also requires FFmpeg.

Start music at about 0.25 volume and effects at about 0.35 volume. Keep both
under the user's sound controls. Start playback after a user gesture. Music
can use HTML audio's loop setting; Web Audio buffer looping avoids decoder
scheduling gaps. The loop has a composed crossfade, so do not add a long
silence or restart it on menu interactions. Fade music over about 300 ms when
switching screens or muting. The WAV effects have smooth attacks and tails.
Throttle repeated hover playback so movement across buttons stays quiet.
Spell, damage, and victory sounds use the effects volume and preload so the
first cast, hit, and defeat are on time.

`assets.json` records file size, duration, encoding, and SHA-256 hashes.
The 11 distributed audio files total about 3.19 MB. Of this total, the
four spell sounds are about 0.46 MB, the drawing sound is about 0.43 MB,
the damage sound is about 0.04 MB, and the victory fanfare is about 0.12 MB.
