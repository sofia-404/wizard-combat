# Wizard Combat turns hand movements into spells.

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The user confirmed that the intended audience is adults. The chosen design direction is restrained, mature dark fantasy, with no childish or cartoon treatment.

Working assumption: one player uses a desktop or laptop camera at home or in a demonstration. Mobile layouts support reading and setup; mobile camera play has not been validated.

## Product Purpose

Make deliberate hand movements feel like casting spells. The current prototype tests whether tracking and pause-based casting are usable. A successful training lesson is three correct Expelliarmus casts.

## Positioning

The player holds a hand still, draws a shape, then pauses to cast. Input follows an index fingertip or knuckles while holding a wand. It does not track the physical wand tip.

## Operating Context

The app runs locally with Node.js 24 or later. Camera permission is required for Training input, not menu navigation. Runtime assets are bundled locally; gameplay uses no external service. The camera preview is mirrored. The default selected hand is left.

```text
Hold -> Ready -> Draw -> Pause -> Match -> Cast
                        |
                 Tracking lost -> Cancel
```

## Capabilities and Constraints

- Current accepted shapes: Circle, V, Z, and Expelliarmus.
- Expelliarmus is right, then down in screen coordinates, with the same direction for either hand. Pause at the end, not at the corner.
- Training requires three correct Expelliarmus casts. Other casts, rejected paths, and tracking losses do not increase the count.
- In Practice, Expelliarmus removes the stationary dummy's wand for two seconds. Another accepted Expelliarmus cast restarts that timer.
- Camera controls and lesson controls work separately. Stopping the camera preserves lesson progress.
- The current page includes developer diagnostics, timing, result cards, and session counters.
- Camera images, video, and raw point sequences are not saved. Local records include results, timing, settings, tracking reasons, and drawings of captured paths.
- The root opens a main menu with Fight, Training, Options, and Credits. Fight opens the static-dummy Duel. Training opens Practice. Neither entry starts the camera. Back or Escape stops the camera and preserves the current lesson until reload.
- Music, sound effects, master mute, drawing hand, and difficulty persist in browser storage when available. Left hand and Normal are defaults. Music starts after user interaction. Menu screens play menu music, Duel plays battle music, and Practice has no music. Music pauses on a hidden page. A sound control in the Training and Duel bar uses the same master mute.
- Difficulty changes draw timeout and selected recognition tolerances: Easy uses 9 seconds and scale 1.35; Normal uses 6 seconds and scale 1; Hard uses 3.5 seconds and scale 0.7. Normal preserves earlier behavior. Directions, holds, tracking-loss rules, three-cast count, and two-second dummy response stay the same. See README.md for the affected checks. Physical difficulty has not been validated.
- Credits identify the creators, local fonts, CC BY 4.0 menu and Duel music, and original CC0 interface sounds.
- Practice and Duel share one camera, detector, input settings, and Practice session, including lesson progress.
- Duel implements a static target with health, spell travel, hit reactions, defeat, and reset. The dummy does not attack. Health and hit counts are separate from Practice and reset on page reload. See `README.md` for the current rules and `docs/spells.md` for shared spell definitions.
- Duel events use the existing local record queue. Cast IDs link launches, hits, cancellations, and defeat to the gesture record. There is no database or saved health restoration.
- Opponent attacks, multiplayer, progression, player defeat, and full-fight win conditions remain undecided.

## Brand Commitments

All repository content must use English, as requested by the user. This includes UI, code comments, logs, examples, accessible labels, documentation, and asset prompts. Russian is reserved for conversation.

Keep the name Wizard Combat. Use Hogwarts Legacy only as a palette reference: midnight navy, teal fog, aged gold, and cyan magic. Create original marks, diagrams, layout, scenes, and typography treatment. The identity must feel mature and restrained.

The repository includes a brandbook, reusable design assets, and screen specifications. The main menu, Options, and Credits apply this system. Practice and Duel keep their existing styles. Their full visual migration remains separate.

## Evidence on Hand

- `README.md`: current controls, privacy behavior, test instructions, and limitations.
- `dist/index.html`, `dist/style.css`, and `dist/app.js`: implemented prototype.
- `dist/training/lesson.js` and `dist/combat/training-dummy.js`: Practice lesson and target states. Old top-level modules remain compatibility exports.
- `dist/spells/`, `dist/gestures/`, and `dist/combat/`: shared definitions, recognition checks, and cast effects.
- `dist/duel.js`, `dist/duel-health.js`, `dist/duel-effects.js`, and `dist/duel-reactions.js`: implemented Duel behavior.
- `tests/`: simulated-input checks. These do not replace physical player trials.

Duel uses local arena and dummy artwork in `dist/assets/`; its source prompts are in `evidence/duel-artwork.txt` and `evidence/duel-reaction-artwork.txt`. A full combat system is not implemented. Brandbook previews must label illustrative states and future screens clearly.
The menu uses a supplied wizard image.

## Product Principles

1. Teach one clear movement at a time.
2. Keep readiness, capture, success, and tracking loss easy to distinguish.
3. Keep the player and target visible during a cast.
4. Keep raw recognition diagnostics out of the normal player flow.
5. Preserve honest local-processing and recording language.

## Accessibility & Inclusion

Design defaults: keyboard access, visible focus, readable contrast, reduced motion, and text or shape alongside status colors. These are design requirements, not claims that camera-based play is accessible to every player. A non-camera gameplay alternative remains an open product decision.
