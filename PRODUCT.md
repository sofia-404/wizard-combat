# Wizard Combat turns hand movements into spells.

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The intended audience is adults. The design direction is restrained, mature dark fantasy, with no childish or cartoon treatment.

Working assumption: one player uses a desktop or laptop camera at home or in a demonstration. Mobile layouts support reading and setup; mobile camera play has not been validated.

## Product Purpose

Make deliberate hand movements feel like casting spells. The current prototype tests whether tracking and pause-based casting are usable. A successful lesson is three correct casts of the selected spell.

## Positioning

The player holds a hand still, draws a shape, then pauses to cast. Input follows an index fingertip or knuckles while holding a wand. It does not track the physical wand tip.

## Operating Context

The app runs locally with Node.js 24 or later. Camera permission is required for Training input, not menu navigation. Runtime assets are bundled locally; gameplay uses no external service. The camera preview and displayed path are mirrored. The detector receives unchanged camera frames. Drawing hand selects the detector's Left or Right label without a manual label reversal. The default selected hand is left.

```text
Hold -> Ready -> Draw -> Pause -> Match -> Cast
                        |
                 Tracking lost -> Cancel
```

## Capabilities and Constraints

- Current accepted shapes and spells: Protego, Basic Cast, Confringo, and Expelliarmus.
- Protego keeps the existing circle gesture in either direction. It causes no damage. A transparent cyan sphere protects the caster for three seconds; another cast restarts the timer. Training and Fight have separate shield states. Shield damage blocking is implemented and tested, but the static dummy still does not attack.
- Basic Cast uses the existing down-then-up path. It can start at either end. Its violet color, damage, and flinch stay unchanged. This project defines the movement; it is not a lore-defined spell diagram.
- Confringo uses the existing three-stroke zigzag: right, diagonally down-left, then right. It can start at either end. Mirrored paths are rejected. Its Fight flight, impact, and hit glow are red (`#ef4444`). Damage and the Fight shake are unchanged.
- Expelliarmus is right, then down in screen coordinates, with the same direction for either hand. Pause at the end, not at the corner.
- Training is a separate screen with a spell selector, path guide, a progress bar, and a learned message. Each spell has its own lesson and count. Only correct casts of the selected spell increase its active lesson count. Other accepted spells still show their normal effects. Rejected paths and tracking losses do not increase the count.
- Training reuses the existing spell travel, dummy reactions, two-second wand return, and three-second Protego shield. Protego does not hit the dummy. Training health starts at 200 / 200. Dummy health drops at impact using Fight's damage rules. At zero, the dummy falls as in Fight. Two seconds after the final hit, it returns with 200 health and its wand. The automatic restart keeps all lesson progress, learned marks, player health, and the active shield. Attacks cannot hit the fallen dummy. Starting or repeating a lesson refills the dummy. Player hits use the same incoming-damage and Protego rules as Fight. There are no automatic dummy attacks. Its progress and learned marks survive spell changes, mode changes, and camera stops. Reloading clears them; there is no saved progress restoration.
- In Fight, Expelliarmus drops the wand at impact. It returns after two seconds. Another Expelliarmus hit restarts the timer. The timer continues when the camera stops or the view changes. Restart returns the wand at once.
- Camera controls and lesson controls work separately. Stopping the camera preserves lesson progress.
- Fight saves timing, tracking diagnostics, and result cards. Training shows lesson progress.
- Camera images, video, and raw point sequences are not saved. Fight records include results, timing, settings, tracking reasons, and path drawings. Training saves scalar result and lesson-control records without path cards.
- Fight and Training share one camera, detector, input settings, session ID, and record queue. Training has separate lesson progress and does not change Fight health.
- The root opens a main menu. URL fragments select Menu, Training, Fight, Options, or Credits. Reload restores that screen with the camera off; game state still resets. Empty or unknown routes open the menu. Browser Back and Forward use the same screen changes. See `docs/design/screen-specs.md` for menu details. Fight opens the static dummy. Training opens the separate four-spell lessons. Each entry shows only its own screen, without an internal mode tab bar. No entry starts the camera. Back or Escape stops the camera and preserves the current lesson until reload.
- Music, sound effects, master mute, drawing hand, track point, and difficulty persist in browser storage when available. Left hand, Index fingertip, and Normal are defaults. Drawing hand and Track point are in Options, not in Fight or Training. Music starts after user interaction. Menu screens play menu music, Fight plays battle music, and Training has no music. Master mute is available only in Options. Drawing and accepted casts have sound effects. Fight hits and victory have separate sounds. Hiding the page stops audio; returning does not replay interrupted effects.
- Difficulty changes draw timeout and selected recognition tolerances: Easy uses 9 seconds and scale 1.35; Normal uses 6 seconds and scale 1; Hard uses 3.5 seconds and scale 0.7. Normal preserves earlier behavior. Directions, holds, tracking-loss rules, three-cast count, and two-second dummy response stay the same. See README.md for the affected checks. Physical difficulty has not been validated.
- Credits identify the creators, local fonts, CC BY 4.0 menu and Fight music, and the CC0 interface, drawing, spell, damage, and victory sound sources.
- Fight implements a static target with health, spell travel, hit reactions, defeat, and reset. The dummy does not attack. Health and hit counts are separate from Training and reset on page reload. See `README.md` for the current rules and `docs/spells.md` for shared spell definitions.
- Fight and Training show small idle movements. A falling or defeated dummy and a dropped wand stop their idle motion. Reduced motion disables idle animation.
- Fight events use the existing local record queue. Cast IDs link launches, hits, cancellations, and defeat to the gesture record. There is no database or saved health restoration. No database migration is needed.
- Opponent attacks, multiplayer, progression, player defeat, and full-fight win conditions remain undecided.

## Brand Commitments

Repository language rules are in `AGENTS.md`.

Keep the name Wizard Combat. Use midnight navy, teal fog, aged gold, and cyan magic. Create original marks, diagrams, layout, scenes, and typography treatment. The identity must feel mature and restrained.

The repository includes a brandbook, reusable design assets, and screen specifications. See `DESIGN.md` for the design system and screen-specific limits.

## Evidence on Hand

- `README.md`: current controls, privacy behavior, test instructions, and limitations.
- `dist/index.html`, `dist/style.css`, and `dist/app.js`: implemented prototype.
- `dist/training.js`, `dist/training.css`, and `dist/training/session.js`: separate Training screen, guides, effects, and per-spell progress.
- `dist/training/lesson.js` and `dist/combat/training-dummy.js`: shared lesson and target states. Old top-level modules remain compatibility exports.
- `dist/spells/`, `dist/gestures/`, and `dist/combat/`: shared definitions, recognition checks, and cast effects.
- `dist/fight.js`, `dist/fight-health.js`, `dist/fight-effects.js`, and `dist/fight-reactions.js`: implemented Fight behavior.
- `tests/`: simulated-input checks. These do not replace physical player trials.

Fight uses local arena and dummy artwork in `dist/assets/`; its source prompts are in `evidence/fight-artwork.txt` and `evidence/fight-reaction-artwork.txt`. The idle wizard layers come from the arena image; see `evidence/fight-idle-artwork.txt`. A full combat system is not implemented. Brandbook previews must label illustrative states and future screens clearly.
The menu uses a supplied wizard image.

## Product Principles

1. Teach one clear movement at a time.
2. Keep readiness, capture, success, and tracking loss easy to distinguish.
3. Keep the player and target visible during a cast.
4. Keep raw recognition diagnostics out of the normal player flow.
5. Preserve honest local-processing and recording language.

## Accessibility & Inclusion

Design defaults: keyboard access, visible focus, readable contrast, reduced motion, and text or shape alongside status colors. These are design requirements, not claims that camera-based play is accessible to every player. A non-camera gameplay alternative remains an open product decision.
