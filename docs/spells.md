# Spell files

```text
dist/spells/              Definitions and registry
  <id>/definition.js     One spell or practice shape
dist/gestures/            Movement checkers
dist/combat/              Cast effects and dummy state
dist/presentation/        Practice animation and shape guides
dist/training/           Shared lesson state
```

`dist/spells/index.js` registers Protego, Basic Cast, Confringo, and Expelliarmus as named spells.

Basic Cast uses the existing valley checker and down-then-up path, in either direction. Its guide shows a start dot, arrows, and an end diamond. This project defines the path. Its violet color (`#c5a0ff`), damage tiers, flinch, and lack of a lesson stay unchanged.

Confringo uses a red flight, impact, and hit glow (`#ef4444`). Its guide shows a start dot, three strokes, direction arrows, and an end diamond. The existing zigzag detector, damage tiers, and shake animation remain unchanged.

Protego uses the existing loop checker and cyan color. Its only effect is a three-second shield, targeted at `self`. Repeat casts refresh the deadline. It has no damage or dummy reaction. `dist/combat/shield.js` owns protection and damage blocking; `dist/presentation/shield-view.js` draws the transparent sphere. Practice and Duel use separate shield instances. The loop guide allows either direction and any start point.

Each definition contains:

- `id`: stable internal ID.
- `label`: current display and event label.
- `kind`: `shape` or `spell`.
- `version`: definition version.
- `description`: guide text.
- `gesture`: checker type, score scale, and diagnostic settings.
- `guide`: SVG data for the small movement diagram.
- `effects`: damage, disarm, or shield settings. Shield effects use `target: self`; other effects use the target by default.
- `visuals`: the shared Practice animation and the Duel spell color (`#RRGGBB`).
- `lesson`: lesson count and messages, or `null`.

Definitions are checked and frozen at startup. Player state stays in the dummy, shield, and lesson objects.

## Add a spell

1. Add `dist/spells/<id>/definition.js`.
2. Import it and add it to the list in `dist/spells/index.js`.
3. Reuse a checker, effect, and animation when their behavior fits.
4. Add a new shared checker or effect when new behavior is needed.
5. Test the new movement against every existing shape. Two matches must reject the cast.

The Practice shape list and small guides use the registry. Store future image and sound files in the spell folder only when needed.

## Compatibility limits

This change moves the existing algorithms. It does not replace them with a general path-template matcher. The numerical fit limits and direction rules stay in `dist/gestures/`. The guide SVG describes the display; it does not define the recognition algorithm.

The current lesson screen still teaches Expelliarmus. Its large diagram stays in the HTML. The registry selects this default explicitly. Adding another lesson requires a screen for selecting and showing it.

New Protego events and saved records use `Protego` and ID `protego`. Fit fields use `protegoDistance`, `protegoGate`, and `protegoLimit`. Internal circle measurements and old records stay unchanged. Duel records a `shield` event with the cast ID and duration, without a launch or hit event.

New Basic Cast events and saved records use `Basic Cast` and the diagnostic prefix `basiccast`. Its registry ID is `basic-cast`. The server still accepts historical `v*` fields. Existing saved records are not rewritten.

New events, saved records, and the `wizard:cast` event use `Confringo` for the former Z spell. Its ID is `confringo`, and its diagnostic fields use the `confringo` prefix. Existing saved records are not rewritten. Internal geometric gate codes such as `z_orientation` stay unchanged. The server still checks the version 3 field list. A new diagnostic field requires a matching server field entry. A future log format should use spell IDs and a versioned diagnostic object.

The old module paths remain as small forwarding modules. Existing imports keep working.

Practice and Duel read damage tiers from the spell registry through `dist/combat/cast.js`. Duel keeps its score checks and applies health loss at impact. Protego returns zero damage. The score-only damage API uses Basic Cast as its default. Missing or unknown labels retain the existing 20/25/30 damage bands.

Duel also applies the shared disarm effect after a valid impact. `dist/duel-disarm.js` keeps a separate `TrainingDummy` state for Duel. The spell definition supplies the two-second duration. Repeat hits refresh the deadline. The view timer returns the wand even when the camera is off. Practice uses its existing state and display.

Duel flight, impact, and dummy reaction colors read `visuals.color` through `dist/presentation/spell-color.js`. Unknown shapes keep the existing cyan fallback color. Artwork, health limits, travel times, and reaction moves remain in the Duel modules.

## Checks

Run `npm test` and `npm run test:browser`. Run `npm run test:duel` when the Duel view is present. The registry tests cover invalid data, damage boundaries, separate player state, old imports, and shape conflicts.
