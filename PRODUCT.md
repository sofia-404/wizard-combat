# Wizard Combat turns hand movements into spells.

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The intended audience is adults. The design direction is restrained, mature dark fantasy, with no childish or cartoon treatment.

Working assumption: one player uses a desktop or laptop camera at home or in a demonstration. Mobile layouts support reading and setup; mobile camera play has not been validated.

## Product Purpose

Make deliberate hand movements feel like casting spells. The current prototype tests whether tracking and pause-based casting are usable. A successful lesson is three correct casts of the selected spell, or three blocked attacks for Protego.

## Positioning

The player holds a hand still, draws a shape, then pauses to cast. Input follows an index fingertip or knuckles while holding a wand. It does not track the physical wand tip.

## Operating Context

The app runs locally with Node.js 24 or later. Camera permission is required for Spell Training input, not menu navigation. Runtime assets are bundled locally; gameplay uses no external service. The camera preview and displayed path are mirrored. The detector receives unchanged camera frames. Drawing hand selects the detector's Left or Right label without a manual label reversal. The default selected hand is left.

```text
Hold -> Ready -> Draw -> Pause -> Match -> Cast
                        |
                 Tracking lost -> Cancel
```

## Capabilities and Constraints

- Current accepted shapes and spells: Protego, Basic Cast, Confringo, and Expelliarmus.
- Protego keeps the existing circle gesture in either direction. It causes no damage. A transparent cyan sphere protects the caster for three seconds; another cast restarts the timer. Spell Training and Practice Arena have separate shield states. Shield damage blocking is implemented and tested, but the static dummy still does not attack.
- Basic Cast uses the existing down-then-up path. It can start at either end. Its violet color, damage, and flinch stay unchanged. This project defines the movement; it is not a lore-defined spell diagram.
- Confringo uses the existing three-stroke zigzag: right, diagonally down-left, then right. It can start at either end. Mirrored paths are rejected. Its Practice Arena flight, impact, and hit glow are red (`#ef4444`). Damage and the Practice Arena shake are unchanged.
- Expelliarmus is right, then down in screen coordinates, with the same direction for either hand. Pause at the end, not at the corner.
- Spell Training is a separate screen with a spell selector, path guide, a progress bar, and a learned message. Each spell has its own lesson and count. Protego counts blocked opponent attacks. Other lessons count correct casts of the selected spell. Other accepted spells still show their normal effects. Rejected paths and tracking losses do not increase the count.
- Spell Training reuses the existing spell travel, dummy reactions, two-second wand return, and three-second Protego shield. Protego does not hit the dummy. Spell Training health starts at 200 / 200. Dummy health drops at impact using Practice Arena's damage rules. At zero, the dummy falls as in Practice Arena. Two seconds after the final hit, it returns with 200 health and its wand. The automatic restart keeps all lesson progress, learned marks, player health, and the active shield. Attacks cannot hit the fallen dummy. Starting or repeating a lesson refills the dummy. Player hits use the same incoming-damage and Protego rules as Practice Arena. An active Protego lesson uses the shared opponent effects, with six seconds between attacks on every difficulty. The opponent alternates Basic Cast and Confringo without casting its own shield. Three blocked attacks complete the lesson and stop attacks. Camera stop, tracker recovery, hidden pages, navigation, spell changes, and defeat cancel attacks. Other lessons do not generate attacks. Spell changes keep lesson progress. Stopping the camera ends active lessons and clears their counts. Completed lessons and learned marks survive camera stops and mode changes. Reloading clears them; there is no saved progress restoration.
- In Practice Arena, Expelliarmus drops the wand at impact. It returns after two seconds. Another Expelliarmus hit restarts the timer. The timer continues when the camera stops or the view changes. Restart returns the wand at once.
- Spell Training starts the selected lesson when the camera becomes ready. Selecting an idle spell while the camera runs starts its lesson. Camera restart starts a fresh attempt; tracker recovery keeps the current attempt. There are no separate lesson start or stop buttons. Stopping the camera ends active lessons and clears their counts. Completed lessons and learned marks remain.
- Practice Arena saves timing, tracking diagnostics, and result cards. Spell Training shows lesson progress.
- Camera images, video, and raw point sequences are not saved. Practice Arena records include results, timing, settings, tracking reasons, and path drawings. Spell Training saves scalar result and lesson-control records without path cards.
- Practice Arena and Spell Training share one camera, detector, input settings, session ID, and record queue. Spell Training has separate lesson progress and does not change Practice Arena health.
- The root opens a main menu. URL fragments select Menu, Spell Training, Practice Arena, Solo Duel, Options, or Credits. Reload restores that screen with the camera off; game state still resets. Empty or unknown routes open the menu. Browser Back and Forward use the same screen changes. See `docs/design/screen-specs.md` for menu details. Practice Arena opens the static dummy. Spell Training opens the separate four-spell lessons. Each entry shows only its own screen, without an internal mode tab bar. No entry starts the camera. Back or Escape stops the camera and preserves the current lesson until reload.
- Music volume, sound effects volume, drawing hand, track point, and difficulty persist in browser storage when available. Left hand, Index fingertip, and Normal are defaults. Drawing hand and Track point are in Options, not in Practice Arena or Spell Training. Music starts after user interaction. Menu screens play menu music. Spell Training, Practice Arena, and Solo Duel share the battle music. Options has separate Music volume and Sound effects volume sliders. Zero mutes that sound group. An old saved mute sets both sliders to zero. All three game screens have drawing, accepted cast, damage, victory, and control sounds. Cast sounds play only when the game accepts the spell. Changing game screens stops active effects, even when the music is shared. Each screen keeps its own defeat state. Spell Training resumes music after its existing automatic reset. Hiding the page stops audio; returning does not replay interrupted effects.
- Difficulty changes draw timeout and selected recognition tolerances: Easy uses 9 seconds and scale 1.35; Normal uses 6 seconds and scale 1; Hard uses 3.5 seconds and scale 0.7. Normal preserves earlier behavior. Directions, holds, tracking-loss rules, three-cast count, and two-second dummy response stay the same. See README.md for the affected checks. Physical difficulty has not been validated.
- Credits identify the creators, local fonts, CC BY 4.0 menu and Practice Arena music, and the CC0 interface, drawing, spell, damage, and victory sound sources.
- Practice Arena implements a static target with health, spell travel, hit reactions, defeat, and reset. The dummy does not attack. Health and hit counts are separate from Spell Training and reset on page reload. See `README.md` for the current rules and `docs/spells.md` for shared spell definitions.
- Practice Arena and Spell Training show small idle movements. A falling or defeated character and a dropped wand stop their idle motion. Reduced motion disables idle animation.
- At zero health, the player falls in both views and cannot cast or receive more damage until restored. Practice Arena shows Player defeated; Restart restores both actors and the timer. Spell Training restores the player after two seconds without changing dummy health or lesson progress. Reduced motion shows the fallen pose directly. Player defeat stops Practice Arena music without the victory fanfare.
- Practice Arena events use the existing local record queue. Cast IDs link launches, hits, cancellations, and defeat to the gesture record. There is no database or saved health restoration. No database migration is needed.
- Solo Duel is enabled at `#soloDuel`. It copies Practice Arena with the SOLO DUEL heading and separate health, shields, timer, and recent events. It shares artwork, damage rules, camera controls, and battle music. Its opponent alternates Basic Cast and Confringo. Attack intervals are five seconds on Easy, three seconds on Normal, and two seconds on Hard, including the warning. Warnings last two seconds on Easy, 1.5 seconds on Normal, and one second on Hard. The interval and warning use the difficulty selected when the warning starts. The wand charge follows that warning time. It reacts to launched player attacks with Protego using the selected difficulty: Easy uses a 400 ms reaction and nine-second cooldown; Normal uses 200 ms and six seconds; Hard uses 100 ms and 4.5 seconds. Cooldown starts at shield activation. The shield lasts three seconds. Pending reactions and active cooldowns keep their original timing when difficulty changes. Defense interrupts attack preparation. Both fighters' spells travel for 600 ms, including with reduced motion. Both fighters can block spells with Protego. Disarm interrupts opponent preparation. Opponent actions require a ready camera and stop on camera stop, tracker recovery, hidden page, navigation, or defeat. Restart restores both fighters and the action cycle. See README.md for timing and damage values. Multiplayer remains disabled. Online play and progression are not implemented.

## Brand Commitments

Repository language rules are in `AGENTS.md`.

Keep the name Wizard Combat. Use midnight navy, teal fog, aged gold, and cyan magic. Create original marks, diagrams, layout, scenes, and typography treatment. The identity must feel mature and restrained.

The repository includes a brandbook, reusable design assets, and screen specifications. See `DESIGN.md` for the design system and screen-specific limits.

## Evidence on Hand

- `README.md`: current controls, privacy behavior, test instructions, and limitations.
- `dist/index.html`, `dist/style.css`, and `dist/app.js`: implemented prototype.
- `dist/spell-training.js`, `dist/spell-training.css`, and `dist/spell-training/session.js`: separate Spell Training screen, guides, effects, and per-spell progress.
- `dist/spell-training/lesson.js` and `dist/combat/practice-dummy.js`: shared lesson and target states. Old top-level modules remain compatibility exports.
- `dist/spells/`, `dist/gestures/`, and `dist/combat/`: shared definitions, recognition checks, and cast effects.
- `dist/practice-arena.js`, `dist/practice-arena-health.js`, `dist/practice-arena-effects.js`, and `dist/practice-arena-reactions.js`: implemented Practice Arena behavior.
- `tests/`: simulated-input checks. These do not replace physical player trials.

Practice Arena uses local arena and dummy artwork in `dist/assets/`; its source prompts are in `evidence/practice-arena-artwork.txt` and `evidence/practice-arena-reaction-artwork.txt`. The idle wizard layers come from the arena image; see `evidence/practice-arena-idle-artwork.txt`. A full combat system is not implemented. Brandbook previews must label illustrative states and future screens clearly.
The menu uses a supplied wizard image.

## Product Principles

1. Teach one clear movement at a time.
2. Keep readiness, capture, success, and tracking loss easy to distinguish.
3. Keep the player and target visible during a cast.
4. Keep raw recognition diagnostics out of the normal player flow.
5. Preserve honest local-processing and recording language.

## Accessibility & Inclusion

Design defaults: keyboard access, visible focus, readable contrast, reduced motion, and text or shape alongside status colors. These are design requirements, not claims that camera-based play is accessible to every player. A non-camera gameplay alternative remains an open product decision.
