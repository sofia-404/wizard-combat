# Spell files

```text
dist/spells/              Definitions and registry
  <id>/definition.js     One spell or practice shape
dist/gestures/            Movement checkers
dist/combat/              Cast effects and dummy state
dist/presentation/        Practice animation and shape guides
dist/training/           Shared lesson state
```

`dist/spells/index.js` registers Circle, V, Z, and Expelliarmus. Circle, V, and Z remain practice shapes. They do not receive new spell names.

Each definition contains:

- `id`: stable internal ID.
- `label`: current display and event label.
- `kind`: `shape` or `spell`.
- `version`: definition version.
- `description`: guide text.
- `gesture`: checker type, score scale, and diagnostic settings.
- `guide`: SVG data for the small movement diagram.
- `effects`: damage tiers and optional disarm settings.
- `visuals`: the shared Practice animation and the Duel spell color (`#RRGGBB`).
- `lesson`: lesson count and messages, or `null`.

Definitions are checked and frozen at startup. Player state stays in the dummy and lesson objects.

## Add a spell

1. Add `dist/spells/<id>/definition.js`.
2. Import it and add it to the list in `dist/spells/index.js`.
3. Reuse a checker, effect, and animation when their behavior fits.
4. Add a new shared checker or effect when new behavior is needed.
5. Test the new movement against every existing shape. Two matches must reject the cast.

The Practice shape list and small guides use the registry. Store future image and sound files in the spell folder only when needed.

## Compatibility limits

This change moves the existing algorithms. It does not replace them with a general path-template matcher. The numerical fit limits and direction rules stay in `dist/gestures/`. The shared checkers receive the selected difficulty scale from `dist/gesture.js`; Normal keeps the original limits. The guide SVG describes the display; it does not define the recognition algorithm.

The current lesson screen still teaches Expelliarmus. Its large diagram stays in the HTML. The registry selects this default explicitly. Adding another lesson requires a screen for selecting and showing it.

Existing events, saved records, and the `wizard:cast` event keep their labels and fields. The server still checks the version 3 field list. A new diagnostic field requires a matching server field entry. A future log format should use spell IDs and a versioned diagnostic object.

The old module paths remain as small forwarding modules. Existing imports keep working.

Practice and Duel read damage tiers from the spell registry through `dist/combat/cast.js`. Duel keeps its score checks and applies health loss at impact. The score-only damage API uses Circle as its default. Missing or unknown shape labels also use Circle to preserve the existing fallback behavior.

Duel flight, impact, and dummy reaction colors read `visuals.color` through `dist/presentation/spell-color.js`. Unknown shapes keep the Circle color. Artwork, health limits, travel times, and reaction moves remain in the Duel modules.

## Checks

Run `npm test` and `npm run test:browser`. Run `npm run test:duel` when the Duel view is present. The registry tests cover invalid data, damage boundaries, separate player state, old imports, and shape conflicts.
