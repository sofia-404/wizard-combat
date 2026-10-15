# Wizard Combat

Local camera game for one player and a stationary target.

## Run

Use Node.js 24 or later. No package installation is needed to play or run the unit tests.

```sh
npm start
```

Open the printed local URL. The default is `http://127.0.0.1:5185/`. If that port is busy, the server tries the next port.

## Use

1. Select the drawing hand.
2. Use **Index fingertip** with an extended finger, or **Knuckles** while holding a wand.
3. Select **Start camera** and allow access.
4. Keep the whole selected hand visible. Hold still until **READY** appears.
5. Draw a circle, V, Z, or Expelliarmus at normal speed. Use at least one tenth of the camera width.
6. Stop briefly. An accepted shape casts once at the dummy. Circle gaps of up to about 60 degrees are allowed. Extra circle loops still produce one cast.
7. Straight and simple curved return moves show **Move ignored**. They do not increase attempt or failure counts.

```text
Hold -> Ready -> Draw -> Stop -> Match -> Cast
                         |
                  Tracking lost -> Cancel
```

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

Hold for about 0.3 seconds to start or finish. Small point movements are allowed during the hold. Capture starts after 4.5% image-width movement, with recent points kept for the start of the path. Capture stops after six seconds if no end pause is found.

## Go/no-go trial

- Select a test shape and make 10 casts at normal speed.
- Repeat for the other shapes. Aim for at least 9 correct casts per 10 attempts, with no wrong spell.
- Move the hand normally between attempts. Check for false casts.
- Hide the hand during a gesture. It must cancel without casting.
- Check whether the displayed path follows your intended motion.

The first useful decision is whether hand tracking and pause-based casting feel usable. Shape scores and damage are provisional.

## Records and privacy

- Results, timing, tracking-loss reasons, and input settings save to `play-data/events.jsonl`.
- Version 2 records include tracking summaries each second: detected labels, label confidence, missing frames, label holds, wrong-hand frames, edge frames, and duplicate detections.
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

- `dist/app.js`: camera lifecycle, hand selection, display, and local records.
- `dist/hand-input.js`: hand selection and short label-change handling.
- `dist/tracker-worker.js`: MediaPipe Hand Landmarker in a worker, with GPU/CPU fallback.
- `dist/gesture.js`: capture, movement filtering, and match selection.
- `dist/expelliarmus.js`: ordered right-then-down spell fitting.
- `dist/lesson.js`: three-cast lesson state and messages.
- `dist/dummy.js`: wand removal and return timer.
- `dist/stroke-match.js`: ordered two-stroke V and three-stroke Z fitting.
- `dist/path-turns.js`: outer-loop depth and ordered turn checks.
- `dist/circle-match.js`: circle templates and the $P matcher.
- `dist/result-card.js`: result card image, with no camera content.
- `server.mjs`: local static server, scalar logs, and result card storage.

## Runtime notices

| Component | Version | Local files |
| --- | --- | --- |
| MediaPipe Tasks Vision | 1.1.0 | `dist/vendor/vision_bundle.js` and `dist/vendor/wasm/` |
| Hand Landmarker model | float16, version 1 | `dist/models/hand_landmarker.task` |
| $P recognizer | JavaScript edition; no package version | `dist/vendor/pdollar.js` |

MediaPipe and the $P recognizer retain their copyright and license terms in `licenses/`. The bundled MediaPipe runtime includes local modifications.

`evidence/runtime-integrity.json` lists SHA-256 hashes for bundled runtime files and license files.

## Tests

Run `npm test`. The tests use Node.js built-in tools and the bundled runtime files. They need no installed packages, browser, or camera.

- Gesture tests check Circle/V/Z, rejected paths, tracking gaps, manual stops, and one cast per gesture.
- Spell tests check accepted and rejected paths, speed, size, direction, tracking loss, and the narrow-corner Z regression.
- Lesson and dummy tests check the three-cast count, completion, reset, and two-second wand return.
- Hand-input tests check hand selection, label changes, duplicate detections, and invalid input.
- Runtime tests check file hashes and the three WASM binaries.
- Server tests check static files, event storage, result cards, and request limits. They use a temporary folder and a local port, then remove the test data.

The optional browser test uses Playwright Core 1.63.0. Install it and its matching Chromium browser:

```sh
npm ci
npx playwright-core install chromium
npm run test:browser
```

To use an existing Chromium browser, set `CHROMIUM_EXECUTABLE` to its executable path. The test starts its own server and uses simulated camera and hand input. It checks spell feedback, lesson controls, wand return, saved records, and desktop/mobile layout. Test records are removed when it finishes. Screenshots are saved in `.tmp/browser-check/`.

All automated tests use simulated input. They do not replace a physical player trial.
