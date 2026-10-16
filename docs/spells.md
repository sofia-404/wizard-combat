# Spell files

```text
dist/spells/              Definitions and registry
  <id>/definition.js     One spell or practice shape
dist/gestures/            Movement checkers
dist/combat/              Cast effects and dummy state
dist/presentation/        shared shield display and spell colors
dist/spell-training/           Shared lesson state
```

`dist/spells/index.js` registers Protego, Basic Cast, Confringo, and Expelliarmus as named spells.

Basic Cast uses the existing valley checker and down-then-up path, in either direction. Its guide shows a start dot, arrows, and an end diamond. This project defines the path. Its violet color (`#c5a0ff`), fixed damage, and flinch use the shared rules. Spell Training has a separate Basic Cast lesson.

Confringo uses a red flight, impact, and hit glow (`#ef4444`). Its guide shows a start dot, three strokes, direction arrows, and an end diamond. The existing zigzag detector and shake animation remain unchanged; damage comes from the shared rules.

Protego uses the existing loop checker and cyan color. Its only effect is a two-second shield, targeted at `self`. Repeat casts cannot refresh the deadline. The cooldown is four seconds from activation. It has no damage or dummy reaction. `dist/combat/shield.js` owns protection and damage blocking; `dist/presentation/shield-view.js` draws the transparent sphere. Practice Arena, Spell Training, and both Solo Duel fighters use separate shield instances. Solo Duel checks the target shield at impact; a block prevents damage and disarm. The loop guide allows either direction and any start point.

Each definition contains:

- `id`: stable internal ID.
- `label`: current display and event label.
- `kind`: `shape` or `spell`.
- `version`: definition version.
- `description`: guide text.
- `gesture`: checker type, score scale, and diagnostic settings.
- `guide`: SVG data for the small movement diagram.
- `effects`: damage, disarm, or shield settings. Shield effects use `target: self`; other effects use the target by default.
- `visuals`: the shared cast type and spell color (`#RRGGBB`).
- `sound`: optional cast sound path under `/spells/<id>/`, with a `.wav` or `.mp3` extension. A spell without a sound is silent.
- `lesson`: lesson count and messages, or `null`.

Definitions are checked and frozen at startup. Player state stays in the dummy, shield, and lesson objects.

## Shared combat rules

`dist/combat/rules.js` owns health, damage, flight, recovery, shield, disarm, cue timing, and the three difficulty profiles. Spell definitions read these values. `dist/gesture.js` reads the recognition scale and draw timeout from the same profiles; recognition algorithms are unchanged.

`dist/combat/solo-duel.js` supplies `DuelFighter` to all three modes, despite its older file name. It owns release gating and the one-spell queue. A ready Protego can replace a queued attack without changing the deadline. `DuelOpponent` adds difficulty-based attacks and reactive defense. The Protego lesson uses it with `attacksOnly:true`. `solo-opponent.js` is a compatibility export.

Health validates and consumes each impact once. Only accepted impacts can apply disarm or perfect-block recovery. Shared effects keep full flight times under reduced motion. Shared shield and disarm effect functions enforce cooldown and disarm protection. Views render state; they do not supply their own balance values. See [the combat reference](combat.md#shared-combat-rules) for the values and timing rules.

The event flow is:

```text
Recognize -> release / queue / reject -> flight -> impact
                    |
                    +-> ready Protego can replace a queued attack
```

Recognition records remain separate from combat records. `cast_queued`, `queue_replaced`, and `cast_rejected` identify gameplay delays. `cast` and `shield` combat records mean release. Training lesson progress and cast audio follow release. The combat status row is separate from hand tracking.

## Add a spell

1. Add `dist/spells/<id>/definition.js` and its balance entry in `dist/combat/rules.js`.
2. Import it and add it to the list in `dist/spells/index.js`.
3. Reuse a checker, effect, and animation when their behavior fits.
4. Add a new shared checker or effect when new behavior is needed.
5. Test the new movement against every existing shape. Two matches must reject the cast.

Spell Training uses the shared spell registry. Store future image and sound files in the spell folder only when needed. `scripts/generate-spell-audio.py` builds the current cast sounds from their CC0 sources. Practice Arena and Spell Training each play a sound once per accepted cast. Spell Training emits `wizard:spell-training-cast` after its duplicate and acceptance checks, without changing Practice Arena state.

## Compatibility limits

This change moves the existing algorithms. It does not replace them with a general path-template matcher. The numerical fit limits and direction rules stay in `dist/gestures/`. The shared checkers receive the selected difficulty scale from `dist/gesture.js`; Normal keeps the original limits. The guide SVG describes the display; it does not define the recognition algorithm.

Spell Training starts with Expelliarmus. Its exact diagram is stored in the `expelliarmusGuide` HTML template. Spell Training has a selector, guide, and lesson state for each of the four spells.

New Protego events and saved records use `Protego` and ID `protego`. Fit fields use `protegoDistance`, `protegoGate`, and `protegoLimit`. Internal circle measurements and old records stay unchanged. Practice Arena records a `shield` event with the cast ID and duration, without a launch or hit event.

New Basic Cast events and saved records use `Basic Cast` and the diagnostic prefix `basiccast`. Its registry ID is `basic-cast`. The server still accepts historical `v*` fields. Existing saved records are not rewritten.

New events, saved records, and the `wizard:cast` event use `Confringo` for the former Z spell. Its ID is `confringo`, and its diagnostic fields use the `confringo` prefix. Existing saved records are not rewritten. Internal geometric gate codes such as `z_orientation` stay unchanged. The server still checks the version 3 field list. A new diagnostic field requires a matching server field entry. A future log format should use spell IDs and a versioned diagnostic object.

The old module paths remain as small forwarding modules. Existing imports keep working.

Practice Arena and Spell Training read fixed damage from spell definitions through `dist/combat/cast.js`. Each definition has one damage tier from the shared rules. Precision is still validated and displayed. Protego returns zero damage. The score-only compatibility API defaults to Basic Cast.

`dist/practice-arena-disarm.js` displays the injected fighter state. The two-second duration cannot be extended, followed by four seconds of protection. Its view timer returns the wand while the camera is off. Each mode has a separate target state.

Spell colors still come from `visuals.color` through `dist/presentation/spell-color.js`. Unknown shapes keep the cyan display fallback. Artwork and reaction moves are unchanged.

## Checks

Run `npm test`, `npm run test:solo-duel`, `npm run test:protego-training`, `npm run test:practice-arena`, `npm run test:spell-training`, and `npm run test:rounds`. The registry tests cover invalid data, damage boundaries, separate player state, old imports, and shape conflicts.
