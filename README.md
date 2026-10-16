# Wizard Combat turns hand movements into spells.

## Run

Use Node.js 24 or later. No package installation is needed to play or run the unit tests.

```sh
npm start
```

Open the printed local URL. The default is `http://127.0.0.1:5185/`. If that port is busy, the server tries the next port.

## Views

The root URL opens the main menu. **Spell Training** opens the separate four-spell lessons. **Practice Arena** opens the static-dummy practice arena. **Solo Duel** opens the same arena with an attacking opponent and the SOLO DUEL heading. These actions do not start the camera. **Multiplayer** remains disabled.
Solo Duel keeps the Practice Arena artwork, controls, damage rules, and battle music. It has separate health, shields, timer, and recent events. Its opponent attacks and casts Protego. Restart affects only Solo Duel.

The opponent starts three seconds after the camera and tracking are ready. It prepares Basic Cast for two seconds, then sends the spell toward the player over 600 ms. Actions start six seconds apart: Basic Cast, Confringo, Protego, then repeat. Both attacks use the shared damage rules at score 85, for 25 damage. Reduced motion hides travel but keeps the same warning and impact times. These timing values are in `dist/combat/solo-opponent.js`; physical play has not been validated.

Cast Protego before impact to block incoming damage for three seconds. The opponent's Protego also lasts three seconds. It blocks damage and Expelliarmus disarm at impact, without adding to the player's hit count. After its shield expires, attacks work again. Expelliarmus interrupts a prepared attack and prevents new actions while the wand is dropped. A spell already in flight can still hit. After the wand returns, the opponent waits three seconds before preparing another action.

Stopping the camera, tracker recovery, hiding the page, or leaving Solo Duel cancels opponent preparation and incoming spells. Resuming starts a new three-second wait. Either fighter's defeat stops the opponent. Restart restores both fighters, clears both shields and flights, and starts a new cycle if the camera is ready. Practice Arena does not generate opponent attacks. Spell Training generates attacks only during an active Protego lesson.

Select **Practice Arena** for a wizard on the left and a human-shaped static dummy on the right, in a moonlit arena based on the supplied reference.
Each menu entry opens only its own screen. Use **Back to menu** or Escape to stop the camera and return, then choose another mode. There is no mode tab bar inside these screens.

Start or stop the camera from any mode. Set Drawing hand and Track point in Options. Both settings apply to Practice Arena and Spell Training. Practice Arena has a live camera view and spell feedback. Hold until READY, draw Protego, Basic Cast, Confringo, or Expelliarmus, then pause. Each accepted attack spell travels from the player's wand to the dummy, followed by a hit effect and accuracy-based damage. Protego creates a shield around the player. Rejected paths and tracking losses do not cast.

The battlefield shows the live hand path and cursor. It copies the existing transparent path overlay, with no camera picture or second detector. Recent Events keeps up to 50 Practice Arena events, newest first, with local timestamps. New events slide in at the top and move older rows down through the faded bottom edge. The panel has a fixed height. Reduced motion updates the list without sliding. On desktop, its bottom edge matches the battlefield. It includes camera changes, spells and damage, rejected or cancelled drawings, defeat, and restart. Each attack adds one event at impact with the spell name, actual damage, and gesture precision percentage. Protego adds one event with 0 damage and its precision percentage. Restart clears the list. Mode changes keep it; reloading clears it. Spell Training events stay in its own list. Live input instructions stay in the camera preview. Attack spell travel takes 120 ms after recognition. The end hold and spell detection rules are unchanged.

Practice Arena, Solo Duel, and Spell Training use one camera controller, detector, settings, session ID, and local record queue. Spell Training has its own lesson progress. The same camera video and path overlay move to the selected screen. Returning to the menu stops the camera and active lessons; learned spells remain. Each screen opens with the camera off.

Attack effects play only in the visible Practice Arena screen and clear when you leave it or hide the page. The dummy is a separate image. Each spell hit moves it: Basic Cast gives a flinch, Confringo gives a short shake, and Expelliarmus pushes it back. The arena stays still.

Between hits, the wizard and the dummy idle. They breathe, sway a little on planted feet, and move their wands slightly. The wizard's free arm also swings a little. Spell Training shows the same motion. A falling or defeated character and a dropped wand stay still. Reduced motion turns the idle motion off.

In Practice Arena, Expelliarmus also drops the dummy's wand at impact. The wand returns two seconds after the hit. Another Expelliarmus hit restarts that timer. Other spells do not change it. The timer continues with the camera off or another mode open. **Restart** returns the wand at once. Reduced motion shows the dropped wand without travel. A lethal Expelliarmus hit follows the same timer; the dummy stays defeated.

In Practice Arena, at zero health, the dummy falls and stays down. **Restart** stops any active reaction and returns it to its starting pose. Mode changes keep a defeated dummy down. Reduced motion uses a stationary hit glow and changes directly to the fallen pose.

Both Practice Arena health bars start at 200. The player stays at full health because the static dummy does not attack. A spell hit removes 20 health below 78% accuracy, 25 health from 78% to below 88%, or 30 health at 88% and above. Damage applies once at impact and cannot reduce health below zero. At zero, the dummy shows defeat and accepts no further attack spells. Protego can still protect the player.

**Restart** appears in the **Dummy defeated** or **Player defeated** window. It restores both health bars and clears the Practice Arena hit count and pending spell effects. It keeps the camera, settings, saved records, and Spell Training lesson progress. Spell Training casts and lesson controls do not change Practice Arena health. Mode changes keep health but cancel spells still in flight. Reloading the page starts with full health.

Spell Training uses the same spell effects and artwork with its own target state. Navigation is in `dist/practice-arena.js`. Practice Arena and Solo Duel use `dist/arena-view.js` for separate game state and `dist/practice-arena.css` for shared styles. Spell flight and hit effects are in `dist/practice-arena-effects.js`; health state and damage timing are in `dist/practice-arena-health.js`. Damage tiers and spell colors come from `dist/spells/`. Both views use `dist/combat/cast.js` for damage values. Dummy poses and reactions are in `dist/practice-arena-reactions.js`. The battlefield path display is in `dist/practice-arena-gesture.js`.

The current artwork uses `dist/assets/practice-arena-background.jpg`, `dist/assets/practice-arena-dummy-unarmed.png`, and a separate `dist/assets/practice-arena-wand.png`. The edit prompts are in `evidence/practice-arena-reaction-artwork.txt` and `evidence/practice-arena-disarm-artwork.txt`. The original character and arena images are kept. `dist/practice-arena-disarm.js` uses the shared dummy state for the wand timer. The wizard is part of the arena image. For the idle motion, `dist/assets/practice-arena-player-*.png` cover the wizard with a body layer and two arm layers. At rest these layers show the same pixels as the arena image. `scripts/generate-practice-arena-idle-art.py` makes them, and `evidence/practice-arena-idle-artwork.txt` describes the method.

## Use

1. Open **Spell Training** or **Practice Arena** from the main menu. Start the camera only when ready.
2. In Options, select Drawing hand and Track point.
3. Use **Index fingertip** with an extended finger, or **Knuckles** while holding a wand.
4. Select **Start camera** and allow access.
5. Keep the whole selected hand visible. Hold still until **READY** appears.
6. Draw Protego (a circle), Basic Cast, Confringo, or Expelliarmus at normal speed. Use at least one tenth of the camera width.
7. Stop briefly. An accepted shape casts once. Attack spells hit the dummy; Protego protects the player. Circle gaps of up to about 60 degrees are allowed. Extra circle loops still produce one cast.
8. Straight and simple curved return moves show **Move ignored**. They do not cast a spell or advance a lesson.

```text
Hold -> Ready -> Draw -> Stop -> Match -> Cast
                         |
                  Tracking lost -> Cancel
```

## Protego

Draw a circle in either direction, then pause. The movement rules are unchanged. Protego causes no damage and does not increase hit counts or move the dummy. Its transparent cyan sphere lasts three seconds. Another accepted Protego cast restarts that time without adding extra seconds.

Practice Arena and Spell Training show the shield around the player in the arena. Each view has a separate shield state. The timer continues when the camera stops, the mode changes, or the page is hidden. Restart clears the Practice Arena shield. Reduced motion keeps the sphere still.

All three screens accept incoming player hits through the local `wizard:player-hit` event with `{view, id, damage}`. `view` is `practiceArena`, `soloDuel`, or `spellTraining`. The active screen applies each hit ID once, updates the player bar and value, and adds a Recent Events row. Protego blocks the hit for its existing three-second duration. Invalid damage and hits for a hidden screen are ignored. Damage cannot reduce health below zero. Practice Arena does not generate attacks. Protego training uses the Solo Duel attack path. Solo Duel sends opponent spells through this same incoming-hit path. At zero health, the player falls and cannot cast or take more hits until restored. Practice Arena and Solo Duel show Player defeated with the existing Restart button. Restart restores both actors to 200 health and their ready poses, clears pending effects, and resets the timer. Player defeat stops battle music without the victory fanfare. In Spell Training, the player returns with 200 health two seconds after the final hit. This keeps dummy health, the selected lesson, its count, and all learned marks. The two Spell Training restart timers are separate. Reduced motion shows the fallen pose directly.

## Spell Training

Select **Spell Training** to learn Protego, Basic Cast, Confringo, or Expelliarmus. Choose a spell and start the camera. The selected lesson starts when the camera is ready. Follow the path guide. Protego requires three blocked opponent attacks. The other lessons count correct casts of the selected spell. At three blocks or casts, the screen shows the spell as learned, a full progress bar, and the learned total.

Other accepted spells still show their normal effects but do not increase the lesson count. Attack spells use the existing travel and dummy reactions. Expelliarmus removes the wand for two seconds. Protego creates the three-second shield; it does not hit the opponent. Spell Training shows Player and Dummy in its header. Protego training uses Opponent and Attacks blocked. Both bars start at 200 / 200. Attack spells reduce dummy health once at impact, using the same accuracy-based damage as Practice Arena. Protego does not damage the dummy. At zero health, the dummy uses the same fall as Practice Arena. Two seconds after the final hit, it stands up with 200 health and its wand. This automatic restart keeps the selected spell, lesson counts, learned marks, player health, and active shield. Attack spells cannot hit the fallen dummy; lesson counts can still advance. Starting the camera starts a new attempt and refills the dummy. Spell changes, camera stops, and mode changes keep health; reload resets both bars. Spell Training health is separate from Practice Arena.

During an active Protego lesson, the opponent alternates Basic Cast and Confringo. It uses Solo Duel's three-second ready wait, two-second warning, 600 ms flight, six-second action interval, and 25 damage. It does not cast its own shield. Draw a circle and pause before impact. Only a blocked training attack adds progress; casting a shield early or missing a block does not count. Three blocks complete the lesson and stop attacks. A popup appears on the battlefield. Close or Escape dismisses it and returns focus to the spell selector. Expelliarmus interrupts preparation. Player and opponent defeat pause attacks until the existing two-second recovery. Camera stop, tracker recovery, hidden pages, navigation, and spell changes cancel warnings and incoming spells. Resuming starts a new ready wait. Other lessons keep their existing behavior. Physical timing has not been validated.

Each spell keeps its own lesson state and count when you choose another spell. Stopping the camera ends all active lessons and clears their current counts. Completed lessons and learned marks remain. Restarting the camera starts the selected spell again at zero. Selecting an idle spell while the camera runs starts its lesson. There are no separate lesson start or stop buttons. Reloading clears all Spell Training progress. Saved local records do not restore it.

Spell Training uses the compact Practice Arena header and outer spacing. Start camera sits in the arena center. When the camera is ready, the same button moves to the top bar as Stop camera. Stopping moves it back. The spell selector sits between the camera and Recent Events. On desktop, Recent Events ends at the battlefield bottom edge. Correct casts sits between the health bars. The small path guide sits inside the battlefield at the bottom center, on a semitransparent background. The mirrored camera preview and Recent Events share the right column. Narrow layouts put the battlefield first, then the camera, spell selector, and events. The camera starts the lesson automatically when ready; the arena center stays clear while it runs. The arena shows the live path without camera pixels. Hand and track-point controls share the existing settings. Spell Training does not change Practice Arena health or hit counts.

Recent Events sits below the Spell Training camera and keeps up to 50 timestamped events, newest first. It uses the same event list and motion as Practice Arena. It shows camera changes, accepted spells, rejected paths, and cancelled drawings. Attack spells add one row at impact; Protego adds one row when cast. Each spell row shows damage and precision. The damage value is the health removed by that hit, including a smaller final hit. Defeat and automatic restart also add rows. The header shows the learned total. Spell changes, lesson controls, and menu navigation keep the list; reload clears it. Live input instructions stay in the camera preview. The diagram has no text caption. Lesson feedback and other spell completions sit below the battlefield. Protego completion appears in a battlefield popup. Spell effect notes are not shown in the UI. The existing fonts, colors, artwork, and spell rules are kept.

## Menu and options

The enabled menu entries are **Practice Arena**, **Spell Training**, **Solo Duel**, **Options**, and **Credits**. They open the practice arena, spell lessons, the separate arena copy, settings, and credits. **Back to menu** or Escape leaves a game mode, stops the camera, and cancels pending Practice Arena flights while keeping learned spells and dummy health. Returning to a game mode requires starting the camera again. Lesson progress is not saved across page reloads.

The URL identifies the screen with `#menu`, `#spellTraining`, `#practiceArena`, `#soloDuel`, `#options`, or `#credits`. Reload keeps that screen. Browser Back and Forward also select screens. Empty or unknown routes open the menu. Leaving a game screen stops the camera. Reload still resets lesson progress, the selected spell, Practice Arena health, and timers. It clears active effects. The camera stays off until you start it. Back/Forward can restore a cached page with its game state. If the browser loads the page again, the normal reload resets apply. Both return paths leave the camera off.

Options save music, sound effects, drawing hand, track point, and difficulty in this browser. Left hand and Normal difficulty are the defaults. Music and Sound effects have separate switches. An old saved mute turns both switches off. If browser storage is unavailable, settings still work for the open page.

| Difficulty | Maximum draw time | Shape tolerance scale |
| --- | --- | --- |
| Easy | 9 seconds | 1.35 |
| Normal | 6 seconds | 1 |
| Hard | 3.5 seconds | 0.7 |

The scale adjusts shape-distance limits, circle radial variation, and Basic Cast/Confringo/Expelliarmus bend and straightness tolerances. It does not change spell directions, minimum drawing size, start/end holds, tracking-loss rules, lesson count, or the dummy timer. Normal preserves the original recognition behavior. Easy also uses its wider Expelliarmus tolerance when deciding whether a return move contains a spell corner; Hard keeps that attempt-counting check at Normal tolerance. These profiles are checked with simulated paths; physical difficulty has not been validated.

Music starts after a pointer or keyboard action. The menu, Options, and Credits play the menu music. Spell Training, Practice Arena, and Solo Duel share the battle music. Changing game screens stops active effects while the shared music continues. Hiding the page stops music, drawing audio, and effects. Returning does not replay interrupted effects. While a shape is drawn, a looping magic sound follows the fingertip speed and stops when the stroke ends. The Sound effects switch controls menu and game control sounds, and spell sounds, independently from music. Each spell accepted by the game plays its cast sound: ice for Protego, a falling energy drain with a punch for Basic Cast, lightning for Confringo, and fire with a metal clink for Expelliarmus. In Practice Arena, the main hit of each sound lands when the spell reaches the dummy. Each hit that deals damage also plays a short punch impact. When the dummy is defeated, the battle music stops and a short brass fanfare plays once. Player defeat stops the music without this fanfare. The battle music starts again from the beginning after **Restart**. Spell Training uses the same hit and victory sounds, and resumes music after its existing two-second automatic reset. Each screen keeps its own defeat state. Casts rejected by the game play no cast sound. The Sound effects switch controls the punch and the fanfare too. Credits link to the music source and license.

On reload, the menu stays hidden until the URL selects a screen. Practice Arena and Spell Training keep the arena space empty until the background and character images are decoded, then show the complete arena. Back to menu stays available during loading. If an image fails, the arena uses its plain background and keeps its controls. Enter the mode again to retry.

## Expelliarmus

Move right, then down in screen coordinates. Use the same direction with either hand. Keep moving at the corner, then pause at the end. Reversed and reflected paths do not cast this spell. Learn it in Spell Training. Its wand effect starts at impact and lasts two seconds.

## Hand and path controls

Left hand is the default. The path follows the hand, not the physical wand tip. Only the camera preview and displayed path are mirrored. The detector receives unchanged camera frames. Drawing hand selects the detector's Left or Right label. Basic Cast and Confringo allow unequal stroke lengths and small corner curves. Follow the Confringo path shown on screen with either hand. A mirrored path is rejected. You can start at either end. Confringo needs horizontal outer strokes and a diagonal middle stroke. A tall corner with small sideways drift is rejected.

Similar palm detections of the same hand are combined, even when finger estimates differ. Selection follows both palm and control-point motion. A short label change can keep the same hand selected for up to 250 ms. Gaps of up to 200 ms can resume within a movement limit based on recent speed. A gap is never counted as an end pause. Longer gaps cancel capture.

Hold for about 0.3 seconds to start or finish. After a successful cast, the end hold also prepares the next cast. No extra start hold is needed. Failed gestures, ignored moves, and tracking cancellations still require a new start hold. Small point movements are allowed during the hold. Capture starts after 4.5% image-width movement, with recent points kept for the start of the path. Capture stops after six seconds on Normal if no end pause is found; Easy allows nine seconds and Hard allows 3.5 seconds.

## Go/no-go trial

- Select a spell in Spell Training and make 10 casts at normal speed.
- Repeat for the other shapes. Aim for at least 9 correct casts per 10 attempts, with no wrong spell.
- Move the hand normally between attempts. Check for false casts.
- Hide the hand during a gesture. It must cancel without casting.
- Check whether the displayed path follows your intended motion.

The first useful decision is whether hand tracking and pause-based casting feel usable. Shape scores are provisional. Static-dummy damage rules are implemented. Opponent attacks and full-combat win conditions remain undecided.

## Records and privacy

- Results, timing, tracking-loss reasons, and input settings save to `play-data/events.jsonl`.
- Older open tabs can still send `swap: 0` or `swap: 1`. The server accepts and drops this obsolete field so it does not block the record queue. Other values are rejected. Existing records keep version 3; no data migration is needed.
- Existing saved records are not rewritten. The existing record keys are kept for compatibility: `activeTab` identifies the current screen, and `tab_change` records a screen change. Each new record includes `activeTab` (`menu`, `practiceArena`, `soloDuel`, or `spellTraining`). Practice Arena and Solo Duel records use `type: practiceArena`. Their `source` is `practiceArena` or `soloDuel`. Solo Duel also records `opponent_prepare`, `opponent_cast`, `opponent_shield`, and `opponent_block`. Incoming Solo Duel hit records include a cast ID and `reason: blocked` or `reason: hit`. Their other `cause` values are `view_init`, `tab_change`, `cast`, `hit`, `cancel`, `defeat`, `reset`, or `player_hit`. Incoming player hits in any game view save `player_hit` records with that view as their source, actual damage, and both health values.
- Practice Arena records include player health, dummy health, maximum health, and hit count. A hit includes `previousDummyHealth`, actual `damage`, and `castToHitMs`, measured from Practice Arena cast handling to impact with the browser clock. This time excludes gesture detection and the end hold. `castId` links cast, hit, cancellation, and defeat records to the original gesture record. Reset records include health before and after reset.
- Practice Arena uses the existing local save queue and session ID. Failed saves retry. Cancelled flights do not log a hit. Closing the page before the queue is saved can lose pending records.
- Version 3 records include tracking summaries each second: detected labels, label confidence, missing frames, label holds, wrong-hand frames, edge frames, and duplicate detections.
- Gesture records include the cause, path size, point count, each shape distance, and each shape gate. Each shape has its own limit. Do not compare circle and Basic Cast/Confringo distance values. Label confidence measures left/right certainty, not detection quality.
- Spell records include the Expelliarmus distance, gate, limit, bend, and straightness. Records also include lesson state and count. Spell Training lesson controls and Practice Arena hits save separate events.
- Basic Cast/Confringo records include stroke bend, straightness, fit limits, the Basic Cast corner turn, Confringo orientation, and trimmed tail length. A reflected Confringo has a separate error message. An inward loop turn also has a separate message. Other failed matches show neutral advice. Each shape gate remains in the log.
- Loss causes distinguish no hand, wrong hand, overlapping hands, position jumps, edge limits, and camera delay. `gapCause` keeps the initial gap cause. Selection records include palm/point prediction errors and duplicate separation. Rejection causes distinguish size, incomplete shape, and similar matches.
- Spell Training results use `source: spellTraining` with scalar fields for spell, score, reason, cause, expected spell, lesson state, and count. Lesson controls use `spell_training_spell`, `spell_training_start`, `spell_training_stop`, and `spell_training_finish` causes. Spell Training creates no path cards or saved progress restoration.
- In Practice Arena, each cast, rejection, cancellation, and ignored move saves a PNG result card to `play-data/results/`. It contains the path drawing, match result, cause, and event ID. The log field `resultImage` links the card to its record.
- A counted attempt needs a V-like down/up turn, a zigzag, a loop, or an accepted right-then-down corner. Simple curved return moves are ignored. The first segment is kept. A return move that forms a spell can still cast.
- In Practice Arena, tracking interruptions always save as `cancel` with `endRule: loss`, even before a shape is clear. Manual stops use `endRule: stop`. Only completed return moves use `ignored`.
- Completed attempts count casts and rejections. Tracking losses have a separate counter. Ignored moves and manual stops are excluded.
- Circle checks use inward depth and turn direction to detect a deliberate-looking bend. Small inward hooks are allowed. Small closure gaps are joined for this check. Start tails and repeated laps use the outer loop. These measurements infer shape structure, not human intent.
- Capture records include start/end measurements, recovered gaps, movement limits, and path length. Protego records include the $P distance, arc coverage, turn count, and cornered-shape comparison. Timeouts also include shape distances.
- Camera images, video, and raw point sequences are not saved. The path is stored only as a drawing on the result card.
- Reload creates a new session ID and resets game state. Saved records remain.
- Failed writes retry while the page stays open. Pending writes do not survive page closure.
- **Stop camera**, hiding the page, or leaving the page stops the camera.
- All runtime files are local. No external service is used during play.
- There is no database. Settings use browser storage; local event files do not restore progress or health. No database migration is needed.

## Implementation

See [Spell files](docs/spells.md) for the registry, definition fields, and steps to add a spell. The old top-level spell modules remain as compatibility exports.

- `dist/shell.js` and `dist/menu.css`: main menu, view navigation, and responsive shell.
- `dist/settings.js`: saved sound, hand, track point, and difficulty options.
- `dist/menu-audio.js`: local menu and game music, interface sounds, spell sounds, and damage and victory sounds for all three game screens.
- `dist/draw-audio.js`: looping trail sound while a shape is drawn.
- `dist/app.js`: camera lifecycle, hand selection, display, and local records.
- `dist/hand-input.js`: hand selection and short label-change handling.
- `dist/tracker-worker.js`: MediaPipe Hand Landmarker in a worker, with GPU/CPU fallback.
- `dist/gesture.js`: capture, movement filtering, and match selection.
- `dist/spells/`: spell and shape definitions, registry, and data checks.
- `dist/gestures/`: loop, ordered stroke, and ordered corner checks.
- `dist/combat/`: shared damage, shields, wand removal, and the Solo Duel opponent cycle.
- `dist/spell-training/lesson.js`: shared lesson state and messages.
- `dist/spell-training/session.js`: separate per-spell Spell Training progress and learned marks.
- `dist/spell-training.js` and `dist/spell-training.css`: Spell Training controls, guides, arena, and scalar records.
- `dist/presentation/`: shared shield display and spell colors.
- `dist/input-state.js`: shared camera and cast status for Practice Arena and Spell Training.
- `dist/result-card.js`: result card image, with no camera content.
- `server.mjs`: local static server, scalar logs, and result card storage.

## Runtime notices

| Component | Version | Local files |
| --- | --- | --- |
| MediaPipe Tasks Vision | 1.1.0 | `dist/vendor/vision_bundle.js` and `dist/vendor/wasm/` |
| Hand Landmarker model | float16, version 1 | `dist/models/hand_landmarker.task` |
| $P recognizer | JavaScript edition; no package version | `dist/vendor/pdollar.js` |

MediaPipe and the $P recognizer retain their copyright and license terms in `licenses/`. The bundled MediaPipe runtime includes local modifications.

The menu uses “Night Vigil” and all three game screens use “Clash Defiant”, both by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0 and edited for length and looping. Original interface sounds use CC0. Spell sounds are adapted from CC0 packs by Lentikula, rubberduck, qubodup, and Kenney. The Practice Arena damage sound is adapted from a CC0 pack by Kenney. The Practice Arena victory fanfare is adapted from a CC0 recording by Spring Spring. See [audio credits and source details](licenses/audio/NOTICE.md). Local fonts use the SIL Open Font License.

`evidence/runtime-integrity.json` lists SHA-256 hashes for bundled runtime files and license files.

## Tests

Run `npm test`. The tests use Node.js built-in tools and the bundled runtime files. They need no installed packages, browser, or camera.

- Gesture tests check Protego/Basic Cast/Confringo, rejected paths, tracking gaps, manual stops, and one cast per gesture.
- Spell tests check accepted and rejected paths, speed, size, direction, tracking loss, and the narrow-corner Confringo regression.
- Cast-flow tests check all 16 shape pairs without an extra start hold, fresh paths, duplicate casts, rejected moves, tracking loss, and control resets.
- Lesson and dummy tests check the three-cast count, completion, reset, and two-second wand return.
- Practice Arena disarm tests check the impact payload, two-second return, repeat hits, other spells, reset, and delayed timers.
- Hand-input tests check hand selection, label changes, duplicate detections, and invalid input.
- Settings and difficulty tests check defaults, saved values, invalid input, timeouts, and tolerance changes.
- Runtime tests check file hashes and the three WASM binaries.
- Server tests check static files, event storage, result cards, and request limits. They use a temporary folder and a local port, then remove the test data.

The optional browser test uses Playwright Core 1.63.0. Install it and its matching Chromium browser:

```sh
npm ci
npx playwright-core install chromium
npm run test:practice-arena
```

To use an existing Chromium browser, set `CHROMIUM_EXECUTABLE` to its executable path. Browser tests start their own servers and use simulated input. Test records are removed when each test finishes. Screenshots are saved in `.tmp/browser-check/`.

Run `npm run test:practice-arena` for the Practice Arena browser checks, using the same Playwright setup. They check shared camera controls, the battlefield path and instructions, cast-to-hit time, casts and hits for all four spells, health at impact, hit reactions, falling, reset during a fall, repeated hits, cancelled-flight damage, separate Spell Training state, rejected input, tracking loss, mode changes, stopped camera, denied permission, reduced motion, idle motion, and desktop/mobile layout. Wand checks cover disarm at impact, return after two seconds, repeat hits, reset, other spells, cancelled flights, hidden views, and lethal hits. Unit tests also check damage boundaries, duplicate hits, and late hits after reset.

Practice Arena test paths use elapsed camera time to keep their drawing speed stable and wait for READY before drawing. Positive cast checks retry at most twice if a browser timing gap cancels the path. Each retry is printed. Shape rejection and deliberate tracking-loss checks are not retried. The simulated camera defaults to 20 FPS. Run `PRACTICE_CAMERA_FPS=10 npm run test:practice-arena` to check slower frames. The test accepts integer rates from 10 to 60 FPS and prints the input state and recent events if a check fails.

Run `npm run test:spell-training` for the Spell Training screen checks, with the same Playwright setup. `CHROMIUM_EXECUTABLE` is supported. The checks cover shared camera use, keyboard menu navigation, selected-spell counts, effects, completion, per-spell progress, camera stops, reload reset, scalar records, idle motion, and desktop/narrow layout. Screenshots are saved in `.tmp/browser-check/`.

Run `npm run test:cast-flow` for consecutive spells without an extra hold, duplicate-cast prevention, Practice Arena effects, saved records, and path cards.

All automated tests use simulated input. They do not replace a physical player trial.

Run `npm run test:input` for the shared input controls. This browser check blocks camera access. It checks saved Drawing hand and Track point settings in Options, their use in Practice Arena and Spell Training, mirrored preview, and desktop/narrow layouts. It also checks audio routing in all three game screens with mocked playback, player defeat in both views, Practice Arena restart, Spell Training player recovery with lesson progress, and Spell Training falling, the two-second automatic restart, lesson progress, reduced motion, and restart after mode changes. It creates preview candidates in `.tmp/input-settings/`, with simulated lesson events for Spell Training. See the [preview guide](docs/design/previews/README.md) for the saved sets and capture steps. `CHROMIUM_EXECUTABLE` is supported.

Run `npm run test:navigation` for routes, reload, direct links, browser history, focus, invalid routes, camera cleanup, and game reset checks at desktop and narrow sizes. A local second site tests leaving and returning with Back/Forward. The suite checks both fresh loads and real Back/Forward cache restores, including active and pending simulated camera input. Cache restore checks use full Chromium in headless mode (`channel: chromium`). Install it with `npx playwright-core install chromium`; a shell-only install is not sufficient. If `CHROMIUM_EXECUTABLE` is set, point it to a full Chromium browser. Test records stay under `.tmp/`. No real camera is used.

Solo Duel combat checks: `npm run test:solo-duel`. Protego training checks: `npm run test:protego-training`. Both use simulated input with real camera access blocked. Preview candidates are in `.tmp/solo-combat/` and `.tmp/protego-training/`.
