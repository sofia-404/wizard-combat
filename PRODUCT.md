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

Local runs use Node.js 24 or later. Camera permission is required for input in all three game modes, not menu navigation. Tracking and combat run in the browser with bundled assets. Records go to the serving server; see [saved data](README.md#camera-and-saved-data) for local and hosted runs. The camera preview and displayed path are mirrored. The detector receives unchanged camera frames. Drawing hand selects the detector's Left or Right label without a manual label reversal. The default selected hand is left.

```text
Hold -> Ready -> Draw -> Pause -> Match -> Cast
                        |
                 Tracking lost -> Cancel
```

## Capabilities and Constraints

- Current accepted shapes and spells: Protego, Basic Cast, Confringo, and Expelliarmus.
- Protego keeps the circle gesture in either direction and causes no damage. A cyan sphere protects the caster for two seconds. Its four-second cooldown starts at activation. Repeat casts do not refresh it. Every mode has separate state and uses the shared combat rules.
- Basic Cast uses the existing down-then-up path. It can start at either end. Its violet color, damage, and flinch stay unchanged. This project defines the movement; it is not a lore-defined spell diagram.
- Confringo uses the existing three-stroke zigzag: right, diagonally down-left, then right. It can start at either end. Mirrored paths are rejected. Its Practice Arena flight, impact, and hit glow are red (`#ef4444`). Damage and the Practice Arena shake are unchanged.
- Expelliarmus is right, then down in screen coordinates, with the same direction for either hand. Pause at the end, not at the corner.
- Spell Training is a separate screen with a spell selector, path guide, a progress bar, and a learned message. Each spell has its own lesson and count. Protego counts blocked opponent attacks. Other lessons count correct casts of the selected spell. Other accepted spells still show their normal effects. Rejected paths and tracking losses do not increase the count.
- Spell Training uses the shared damage, flight, recovery, queue, shield, and disarm rules in `dist/combat/rules.js`. Both fighters start at 200 health. Target damage applies at impact. At zero health, the target falls and returns after two seconds with full health and its wand. This keeps lesson progress, learned marks, player health, and the active shield. A fallen target cannot take damage. Starting a lesson refills the target. The Protego lesson uses the selected difficulty attack profile without opponent shields. Three blocks complete it and stop attacks. Other lessons do not generate attacks. Camera stop, tracker recovery, hidden pages, navigation, spell changes, and defeat cancel attacks. Released selected spells count; queued, replaced, or rejected spells do not count. Spell changes keep progress. Camera stop clears active attempts, but keeps completed lessons and learned marks. Reload clears progress.
- Expelliarmus in every mode disarms at impact for two seconds. Repeated hits cannot extend it. The target has four seconds of disarm protection after wand return. The timer continues when the camera stops or the view changes. Restart returns the wand at once.
- Spell Training starts the selected lesson when the camera becomes ready. Selecting an idle spell while the camera runs starts its lesson. Camera restart starts a fresh attempt; tracker recovery keeps the current attempt. There are no separate lesson start or stop buttons. Stopping the camera ends active lessons and clears their counts. Completed lessons and learned marks remain.
- Practice Arena saves timing, tracking diagnostics, and result cards. Spell Training shows lesson progress.
- Camera images, video, and raw point sequences are not saved. Practice Arena and Solo Duel records include results, timing, settings, tracking reasons, and path drawings. Spell Training saves scalar result and lesson-control records without path cards.
- All three game modes share one camera, detector, input settings, session ID, and record queue. Spell Training has separate lesson progress and does not change Practice Arena health.
- The root opens a main menu. URL fragments select Menu, Character Selection, Stage Selection, Spell Training, Practice Arena, Solo Duel, Options, or Credits. Reload restores that screen with the camera off; game state still resets. Empty or unknown routes open the menu. Browser Back and Forward use the same screen changes. See `docs/design/screen-specs.md` for menu details. Practice Arena opens the static dummy. Spell Training opens the separate four-spell lessons. Each entry shows only its own screen, without an internal mode tab bar. No entry starts the camera. Back or Escape stops the camera and clears active lesson counts. Completed lessons and learned marks remain until reload.
- All three menu game entries open Character Selection, then Stage Selection. There are 11 skins, nine stages, and Random choices. Solo Duel lets the player choose both fighters. Other modes keep the dummy. Choices change appearance only. See [character selection](docs/design/screen-specs.md#implemented-character-selection) and [stage selection](docs/design/screen-specs.md#implemented-stage-selection) for layout, loading, URL state, and navigation rules.
- Music volume, sound effects volume, drawing hand, track point, and difficulty persist in browser storage when available. Left hand, Index fingertip, and Normal are defaults. Drawing hand and Track point are in Options, not in Practice Arena or Spell Training. Music starts after user interaction. Menu screens play menu music. Spell Training, Practice Arena, and Solo Duel share the battle music. Options has separate Music volume and Sound effects volume sliders. Zero mutes that sound group. An old saved mute sets both sliders to zero. All three game screens have drawing, accepted cast, damage, victory, and control sounds. Cast sounds play only when the game accepts the spell. Changing game screens stops active effects, even when the music is shared. Each screen keeps its own defeat state. Spell Training resumes music after its existing automatic reset. Hiding the page stops audio; returning does not replay interrupted effects.
- Difficulty changes draw timeout and selected recognition tolerances: Easy uses 9 seconds and scale 1.35; Normal uses 6 seconds and scale 1; Hard uses 3.5 seconds and scale 0.7. Normal preserves earlier behavior. Directions, holds, tracking-loss rules, three-cast count, and two-second dummy response stay the same. See [Options and sound](docs/design/screen-specs.md#options-and-sound) for the affected recognition checks. Physical difficulty has not been validated.
- Credits identify the creators, local fonts, CC BY 4.0 menu and battle music, and the CC0 interface, drawing, spell, damage, and victory sound sources.
- Practice Arena implements a static target with health, spell travel, hit reactions, defeat, and reset. The dummy does not attack. Health and hit counts are separate from Spell Training and reset on page reload. See [the combat reference](docs/combat.md) for the current rules and `docs/spells.md` for shared spell definitions.
- Practice Arena and Spell Training show small idle movements. A falling or defeated character and a dropped wand stop their idle motion. Reduced motion disables idle animation.
- At zero health, the player falls in both views and cannot cast or receive more damage until restored. Practice Arena awards the round to the target. Two round wins end a match; Restart restores both actors, the timer, and the match score. Spell Training restores the player after two seconds without changing dummy health or lesson progress. Reduced motion shows the fallen pose directly. A player match loss stops arena music without the victory fanfare.
- Practice Arena events use the shared browser record queue. Cast IDs link launches, hits, cancellations, and defeat to the gesture record. Records do not restore game state.
- Solo Duel is enabled at `#soloDuel`. It shares player rules, layout, artwork, controls, and music with Practice Arena. Each mode has separate health, shields, recovery, disarm, queue, timer, and events. `dist/combat/rules.js` owns all balance values. Normal has a 6.5-second minimum attack gap, 2.6/2.8-second warnings, and a 70% eligible shield attempt with 300 ms notice plus 600 ms preparation. Easy is slower and shields less; Hard is faster and shields more. Opponent shields cannot earn perfect blocks. See [the combat reference](docs/combat.md) for the full table, player rules, and lifecycle. Multiplayer, online play, and progression remain unimplemented.

## Shared rounds (implemented)

Practice Arena and Solo Duel use `dist/combat/rounds.js` through their shared arena view. Each mode keeps a separate match. The first fighter with two round wins wins the match. Practice Arena keeps the static dummy. Both modes use the same fixed damage and player combat timings.

Start camera -> Camera ready -> Round 1 (1.5 seconds) -> Fight (0.5 seconds) -> Timer and combat start. No release or impact is allowed before active combat. Zero health awards one round. A two-second result message precedes the next round. Both fighters reset to 200 health; the timer resets to 100 seconds. Queues, shields, disarm, recovery, partial gestures, and flights clear. Stage, character, and score remain. Two win markers appear beside each health bar.

Camera stop, tracker recovery, hidden pages, and navigation pause round transitions and the active timer. Pending attacks and flights are cancelled. Returning with the camera ready resumes the current phase. No transition runs in a hidden mode. The camera stays on between rounds. The timer does not decide an outcome at zero. Match completion shows Restart and stops battle music; a player match win plays the existing victory sound once. Restart clears the score; navigation preserves it and reload clears it. Spell Training is unchanged.

## Brand Commitments

Repository language rules are in `AGENTS.md`.

Keep the name Wizard Combat. Use midnight navy, teal fog, aged gold, and cyan magic. Create original marks, diagrams, layout, and typography treatment. The shipped character and stage sets include Harry Potter themes; the original-scene briefs in `docs/design/asset-prompts.md` are optional future concepts. The identity must feel mature and restrained.

The repository includes a brandbook, reusable design assets, and screen specifications. See `DESIGN.md` for the design system and screen-specific limits.

## Evidence on Hand

- `README.md`: current controls, privacy behavior, test instructions, and limitations.
- `dist/index.html`, `dist/style.css`, and `dist/app.js`: implemented prototype.
- `dist/spell-training.js`, `dist/spell-training.css`, and `dist/spell-training/session.js`: separate Spell Training screen, guides, effects, and per-spell progress.
- `dist/spell-training/lesson.js` and `dist/combat/practice-dummy.js`: shared lesson and target states. Old top-level modules remain compatibility exports.
- `dist/spells/`, `dist/gestures/`, and `dist/combat/`: shared definitions, recognition checks, and cast effects.
- `dist/practice-arena.js`, `dist/practice-arena-health.js`, `dist/practice-arena-effects.js`, and `dist/practice-arena-reactions.js`: implemented Practice Arena behavior.
- `tests/`: simulated-input checks. These do not replace physical player trials.

Practice Arena uses local arena and dummy artwork in `dist/assets/`; its source prompts are in `evidence/practice-arena-artwork.txt` and `evidence/practice-arena-reaction-artwork.txt`. The idle wizard layers come from the arena image; see `evidence/practice-arena-idle-artwork.txt`. Solo Duel implements opponent attacks and defense; see [combat rules](docs/combat.md). Brandbook previews remain labeled visual concepts.
The menu uses supplied artwork and video. See the [asset source index](evidence/asset-sources.md) for source records and missing metadata.

## Product Principles

1. Teach one clear movement at a time.
2. Keep readiness, capture, success, and tracking loss easy to distinguish.
3. Keep the player and target visible during a cast.
4. Keep raw recognition diagnostics out of the normal player flow.
5. Preserve honest local-processing and recording language.

## Accessibility & Inclusion

Design defaults: keyboard access, visible focus, readable contrast, reduced motion, and text or shape alongside status colors. These are design requirements, not claims that camera-based play is accessible to every player. A non-camera gameplay alternative remains an open product decision.
