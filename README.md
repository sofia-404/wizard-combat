# Wizard Combat lets one player cast spells at a stationary target.

## Run

Use Node.js 24 or later. No package installation is needed to play or run the unit tests.

```sh
npm start
```

Open the printed local URL. The default is `http://127.0.0.1:5185/`. If that port is busy, the server tries the next port.

## Views

The main menu opens first. **Training** opens Practice and keeps the existing camera controls, lessons, and spell detection. **Fight** opens Duel. Neither action starts the camera.
Select **Duel** for a wizard on the left and a human-shaped static dummy on the right, in a moonlit arena based on the supplied reference.
Use **Back to Practice** to return. The tabs also support Left/Right Arrow, Home, and End keys.

Start or stop the camera from either tab. Duel has hand, control-point, and hand-label settings, a live camera view, and spell feedback. Hold until READY, draw Circle, V, Z, or Expelliarmus, then pause. Each accepted cast sends one spell from the player's wand to the dummy, followed by a hit effect and the existing accuracy-based damage value. Rejected paths and tracking losses do not cast.

The battlefield also shows the live hand path, cursor, READY/DRAWING instructions, and spell result. It copies the existing transparent path overlay, with no camera picture or second detector. Spell travel takes 120 ms after recognition. The end hold and spell detection rules are unchanged.

Both tabs share one camera stream, detector, settings, and practice session, including lesson progress and saved records. The same camera video and path overlay move to the selected tab. Changing tabs does not restart the camera or reset practice progress. The original Practice controls and behavior remain in place.

Spell effects play only in the visible Duel tab and clear when you leave it or hide the page. The dummy is a separate image. Each spell hit moves it: Circle gives a small recoil, V gives a stronger flinch, Z gives a short shake, and Expelliarmus pushes it back. The player and arena stay still.

At zero health, the dummy falls and stays down. **Reset dummy** stops any active reaction and returns it to its starting pose. Tab changes keep a defeated dummy down. Reduced motion uses a stationary hit glow and changes directly to the fallen pose.

Both Duel health bars start at 200. The player stays at full health because the static dummy does not attack. A spell hit removes 20 health below 78% accuracy, 25 health from 78% to below 88%, or 30 health at 88% and above. Damage applies once at impact and cannot reduce health below zero. At zero, the dummy shows defeat and accepts no further Duel spells.

**Reset dummy** restores dummy health and clears the Duel hit count and pending spell effects. It keeps the camera, settings, Practice records, and lesson progress. Duel health and hits are separate from Practice: Practice casts and its session reset do not change Duel health. Tab changes keep health but cancel spells still in flight. Reloading the page starts with full health.

Navigation and arena styles are in `dist/duel.js` and `dist/duel.css`. Spell flight and hit effects are in `dist/duel-effects.js`; health state and damage timing are in `dist/duel-health.js`. Damage tiers and spell colors come from `dist/spells/`. Both views use `dist/combat/cast.js` for damage values. Dummy poses and reactions are in `dist/duel-reactions.js`. The battlefield path display is in `dist/duel-gesture.js`.

The current artwork uses `dist/assets/duel-arena-background.jpg` and the transparent `dist/assets/duel-dummy.png`. Their edit prompts are in `evidence/duel-reaction-artwork.txt`. The original `dist/assets/duel-arena.jpg` and its prompt in `evidence/duel-artwork.txt` are kept.

## Use

1. Select **Training** from the main menu. The camera stays off until you start it.
2. Select the drawing hand.
3. Use **Index fingertip** with an extended finger, or **Knuckles** while holding a wand.
4. Select **Start camera** and allow access.
5. Keep the whole selected hand visible. Hold still until **READY** appears.
6. Draw a circle, V, Z, or Expelliarmus at normal speed. Use at least one tenth of the camera width.
7. Stop briefly. An accepted shape casts once at the dummy. Circle gaps of up to about 60 degrees are allowed. Extra circle loops still produce one cast.
8. Straight and simple curved return moves show **Move ignored**. They do not increase attempt or failure counts.

```text
Hold -> Ready -> Draw -> Stop -> Match -> Cast
                         |
                  Tracking lost -> Cancel
```

## Menu and options

The menu lists **Fight**, **Training**, **Options**, and **Credits**. Fight opens the static-dummy Duel. Training opens Practice. **Back to menu** or Escape leaves either mode, stops the camera, and cancels pending Duel flights while keeping lesson progress and dummy health. Returning to either mode requires starting the camera again. Lesson progress is not saved across page reloads.

Options save music, sound effects, drawing hand, and difficulty in this browser. Left hand and Normal difficulty are the defaults. The top-right sound control in the menu, and the sound control in the Training and Duel bar, save a separate master mute setting. If browser storage is unavailable, settings still work for the open page.

| Difficulty | Maximum draw time | Shape tolerance scale |
| --- | --- | --- |
| Easy | 9 seconds | 1.35 |
| Normal | 6 seconds | 1 |
| Hard | 3.5 seconds | 0.7 |

The scale adjusts shape-distance limits, circle radial variation, and V/Z/Expelliarmus bend and straightness tolerances. It does not change spell directions, minimum drawing size, start/end holds, tracking-loss rules, lesson count, or the dummy timer. Normal preserves the original recognition behavior. Easy also uses its wider Expelliarmus tolerance when deciding whether a return move contains a spell corner; Hard keeps that attempt-counting check at Normal tolerance. These profiles are checked with simulated paths; physical difficulty has not been validated.

Music starts after a pointer or keyboard action. The menu, Options, and Credits play the menu music. Duel plays separate battle music. Practice has no music. Music pauses when the page is hidden. While a shape is drawn, a looping magic sound follows the fingertip speed and stops when the stroke ends. The Sound effects switch controls menu focus, hover, and click sounds independently from music. Credits link to the music source and license.

## Expelliarmus and training

Move right, then down in screen coordinates. Use the same direction with either hand. Keep moving at the corner, then pause at the end. Reversed and reflected paths do not cast this spell.

Select **Start lesson** and make three correct Expelliarmus casts. Other shapes, rejected paths, and tracking losses do not increase the lesson count. At 3/3, use **Practice again** to restart or **Finish lesson** to return to free practice. **Stop lesson** ends an active lesson. Camera controls work separately. Stopping the camera keeps the lesson count.

An accepted Expelliarmus cast removes the dummy's wand for two seconds. Another accepted Expelliarmus cast restarts that timer. The wand returns even when the camera is off. **New test session** resets the lesson and returns the wand at once.

```text
Start lesson -> Correct Expelliarmus -> 1/3 -> 2/3 -> 3/3
                                                        |
                                              Finish or practice again

Expelliarmus -> Wand removed -> Wait 2 seconds -> Wand ready
```

## Hand and path controls

Left hand is the default. The path follows the hand, not the physical wand tip. The camera image is mirrored. V and Z allow unequal stroke lengths and small corner curves. Draw the Z shown on screen with either hand. A reflected Z is rejected. The same Z can start at either end. Z needs horizontal outer strokes and a diagonal middle stroke. A tall corner with small sideways drift is rejected. If the detected hand label is reversed, use **Swap left and right labels**.

Similar palm detections of the same hand are combined, even when finger estimates differ. Selection follows both palm and control-point motion. A short label change can keep the same hand selected for up to 250 ms. Gaps of up to 200 ms can resume within a movement limit based on recent speed. A gap is never counted as an end pause. Longer gaps cancel capture.

Hold for about 0.3 seconds to start or finish. After a successful cast, the end hold also prepares the next cast. No extra start hold is needed. Failed gestures, ignored moves, and tracking cancellations still require a new start hold. Small point movements are allowed during the hold. Capture starts after 4.5% image-width movement, with recent points kept for the start of the path. Capture stops after six seconds on Normal if no end pause is found; Easy allows nine seconds and Hard allows 3.5 seconds.

## Go/no-go trial

- Select a test shape and make 10 casts at normal speed.
- Repeat for the other shapes. Aim for at least 9 correct casts per 10 attempts, with no wrong spell.
- Move the hand normally between attempts. Check for false casts.
- Hide the hand during a gesture. It must cancel without casting.
- Check whether the displayed path follows your intended motion.

The first useful decision is whether hand tracking and pause-based casting feel usable. Shape scores are provisional. Combat damage rules are not implemented.

## Records and privacy

- Results, timing, tracking-loss reasons, and input settings save to `play-data/events.jsonl`.
- Each new record includes `activeTab` (`practice` or `duel`). Duel records use `type: duel` and `source: duel`. Their `cause` is `view_init`, `tab_change`, `cast`, `hit`, `cancel`, `defeat`, or `reset`.
- Duel records include player health, dummy health, maximum health, and hit count. A hit includes `previousDummyHealth`, actual `damage`, and `castToHitMs`, measured from Duel cast handling to impact with the browser clock. This time excludes gesture detection and the end hold. `castId` links cast, hit, cancellation, and defeat records to the original gesture record. Reset records include health before and after reset.
- Duel uses the existing local save queue and session ID. Failed saves retry. Cancelled flights do not log a hit. Closing the page before the queue is saved can lose pending records.
- Version 3 records include tracking summaries each second: detected labels, label confidence, missing frames, label holds, wrong-hand frames, edge frames, and duplicate detections.
- Gesture records include the cause, path size, point count, each shape distance, and each shape gate. Each shape has its own limit. Do not compare circle and V/Z distance values. Label confidence measures left/right certainty, not detection quality.
- Spell records include the Expelliarmus distance, gate, limit, bend, and straightness. Records also include lesson state and count. Lesson controls, wand removal, and wand return save separate events.
- V/Z records include stroke bend, straightness, fit limits, the V corner turn, Z orientation, and trimmed tail length. A reflected Z has a separate error message. An inward loop turn also has a separate message. Other failed matches show neutral advice. Each shape gate remains in the log.
- Loss causes distinguish no hand, wrong hand, overlapping hands, position jumps, edge limits, and camera delay. `gapCause` keeps the initial gap cause. Selection records include palm/point prediction errors and duplicate separation. Rejection causes distinguish size, incomplete shape, and similar matches.
- Each cast, rejection, cancellation, and ignored move saves a PNG result card to `play-data/results/`. It contains the path drawing, match result, cause, and event ID. The log field `resultImage` links the card to its record.
- A counted attempt needs a V-like down/up turn, a zigzag, a loop, or an accepted right-then-down corner. Simple curved return moves are ignored. The first segment is kept. A return move that forms a spell can still cast.
- Tracking interruptions always save as `cancel` with `endRule: loss`, even before a shape is clear. Manual stops use `endRule: stop`. Only completed return moves use `ignored`.
- Completed attempts count casts and rejections. Tracking losses have a separate counter. Ignored moves and manual stops are excluded.
- Circle checks use inward depth and turn direction to detect a deliberate-looking bend. Small inward hooks are allowed. Small closure gaps are joined for this check. Start tails and repeated laps use the outer loop. These measurements infer shape structure, not human intent.
- Capture records include start/end measurements, recovered gaps, movement limits, and path length. Circle records include the $P distance, arc coverage, turn count, and cornered-shape comparison. Timeouts also include shape distances.
- Camera images, video, and raw point sequences are not saved. The path is stored only as a drawing on the result card.
- Session counters reset on page reload or **New test session**. Saved records remain.
- Failed writes retry while the page stays open. Pending writes do not survive page closure.
- **Stop camera**, hiding the page, or leaving the page stops the camera.
- All runtime files are local. No external service is used during play.

## Implementation

See [Spell files](docs/spells.md) for the registry, definition fields, and steps to add a spell. The old top-level spell modules remain as compatibility exports.

- `dist/shell.js` and `dist/menu.css`: main menu, view navigation, and responsive shell.
- `dist/settings.js`: saved sound, hand, and difficulty options.
- `dist/menu-audio.js`: local menu and Duel music and interface sounds.
- `dist/draw-audio.js`: looping trail sound while a shape is drawn.
- `dist/app.js`: camera lifecycle, hand selection, display, and local records.
- `dist/hand-input.js`: hand selection and short label-change handling.
- `dist/tracker-worker.js`: MediaPipe Hand Landmarker in a worker, with GPU/CPU fallback.
- `dist/gesture.js`: capture, movement filtering, and match selection.
- `dist/spells/`: spell and shape definitions, registry, and data checks.
- `dist/gestures/`: loop, ordered stroke, and ordered corner checks.
- `dist/combat/`: damage values, wand removal, and return timer.
- `dist/training/lesson.js`: shared lesson state and messages.
- `dist/presentation/`: Practice cast animation and shape guides.
- `dist/result-card.js`: result card image, with no camera content.
- `server.mjs`: local static server, scalar logs, and result card storage.

## Runtime notices

| Component | Version | Local files |
| --- | --- | --- |
| MediaPipe Tasks Vision | 1.1.0 | `dist/vendor/vision_bundle.js` and `dist/vendor/wasm/` |
| Hand Landmarker model | float16, version 1 | `dist/models/hand_landmarker.task` |
| $P recognizer | JavaScript edition; no package version | `dist/vendor/pdollar.js` |

MediaPipe and the $P recognizer retain their copyright and license terms in `licenses/`. The bundled MediaPipe runtime includes local modifications.

The menu uses “Night Vigil” and Duel uses “Clash Defiant”, both by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0 and edited for length and looping. Original interface sounds use CC0. See [audio credits and source details](licenses/audio/NOTICE.md). Local fonts use the SIL Open Font License.

`evidence/runtime-integrity.json` lists SHA-256 hashes for bundled runtime files and license files.

## Tests

Run `npm test`. The tests use Node.js built-in tools and the bundled runtime files. They need no installed packages, browser, or camera.

- Gesture tests check Circle/V/Z, rejected paths, tracking gaps, manual stops, and one cast per gesture.
- Spell tests check accepted and rejected paths, speed, size, direction, tracking loss, and the narrow-corner Z regression.
- Cast-flow tests check all 16 shape pairs without an extra start hold, fresh paths, duplicate casts, rejected moves, tracking loss, and control resets.
- Lesson and dummy tests check the three-cast count, completion, reset, and two-second wand return.
- Hand-input tests check hand selection, label changes, duplicate detections, and invalid input.
- Settings and difficulty tests check defaults, saved values, invalid input, timeouts, and tolerance changes.
- Runtime tests check file hashes and the three WASM binaries.
- Server tests check static files, event storage, result cards, and request limits. They use a temporary folder and a local port, then remove the test data.

The optional browser test uses Playwright Core 1.63.0. Install it and its matching Chromium browser:

```sh
npm ci
npx playwright-core install chromium
npm run test:browser
```

To use an existing Chromium browser, set `CHROMIUM_EXECUTABLE` to its executable path. The test starts its own server and uses simulated camera and hand input. It checks menu navigation, options, camera boundaries, immediate consecutive casts, duplicate casts, spell feedback, lesson controls, wand return, saved records, and desktop/mobile layout. Test records are removed when it finishes. Screenshots are saved in `.tmp/browser-check/`.

Run `npm run test:duel` for the Duel browser checks, using the same Playwright setup. They check shared camera controls, the battlefield path and instructions, cast-to-hit time, casts and hits for all four spells, health at impact, hit reactions, falling, reset during a fall, repeated hits, cancelled-flight damage, separate Practice state, rejected input, tracking loss, tab changes, stopped camera, denied permission, reduced motion, and desktop/mobile layout. Unit tests also check damage boundaries, duplicate hits, and late hits after reset.

All automated tests use simulated input. They do not replace a physical player trial.
