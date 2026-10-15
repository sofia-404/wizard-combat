# Each screen gives the player one clear next action.

These specifications separate implemented surfaces from target concepts. The game implements camera input, free practice, the original Expelliarmus lesson, a separate Training tab for all four spells, and a static-dummy Duel with health, hit reactions, defeat, and reset. Menu and full fight mode remain proposed surfaces. Applying these visual rules to Practice and Duel is a separate migration. The brandbook illustrations use synthetic state and must say so outside their frames.

## Shared rules

- Reference desktop: 1920×1080, 16:9 play area.
- Keep primary text at least 18px and utility text at least 14px in the final player UI.
- Primary controls are at least 48px high; other touch targets are at least 44px.
- Keep play instructions near the active area. Pause or recovery text stays visible until resolved.
- Use a cyan focus ring and keyboard-operable controls. Return focus to the trigger when a modal closes.
- Keep sound optional; every essential cue also has a visual or text equivalent.
- Honor reduced motion. No flashing success or failure overlays.

## Main menu

Purpose: choose practice or a future fight without requesting camera access before it is needed.

```text
PRODUCT MARK                         QUIET SCENE / MOVEMENT STUDY
Wizard Combat                        Open arc and anchored trace

Practice                             One visible point of activity
Fight (when implemented)
Settings

Camera off                           Local camera processing
```

Use an asymmetric composition: a calm left navigation column and a larger right scene. The logo is original and small enough to leave the title readable. Use “Practice” as the available next action. A future “Fight” option stays absent or clearly unavailable until real rules exist; never route a player into a dead end.

Settings contain drawing hand, input point, reduced-motion preference when available, and audio only if implemented. Describe camera use before the permission request. Starting practice opens setup or the training scene. Esc returns through a deliberate pause/back action rather than silently dropping a lesson.

States: first use, returning user, focus/hover, unavailable feature, camera permission requested, camera blocked, camera unavailable. Do not invent persistent progression or a “Continue campaign” action.

## Implemented Training

Purpose: select one spell and complete three correct casts. The tab order is Practice, Duel, Training. Arrow keys cycle tabs; Home and End select the first and last tab.

```text
Practice | Duel | Training
Camera / hand / track point / labels
-------------------------------------------------------------
ARENA + LIVE PATH               | Mirrored camera
Wizard -> static dummy         | Spell selector
Input state and cast result    | Practice-style spell guide
Wand / shield status           | Correct casts: 0 / 3
                               | Start / Stop lesson
-------------------------------------------------------------
Camera and lesson notes
```

Training reuses the existing Duel layout, fonts, controls, and arena styles. The arena stays on the left. The camera and lesson stay in the right column. Narrow layouts use Duel's existing stacking rules. The illustrated arena contains the transparent live path, not camera pixels. The same mirrored camera preview moves between tabs. There is one camera and detector. Training does not apply the brandbook design to the game.

The spell selector uses the shared spell registry. The Expelliarmus diagram is a copy of the Practice lesson diagram. Other spell diagrams use the same Practice path, ring, arrow, start, and end styles. Protego, Basic Cast, Confringo, and Expelliarmus keep their existing directions and recognition rules. Start and stop camera controls are separate from lesson controls. Only correct selected-spell casts increase the active lesson count. Wrong accepted spells show their normal effects without a count increase. Rejections and tracking loss do not count.

At 3/3, show the spell's learned message, a full progress bar, and the learned total. **Practice again** starts that spell at zero. **Stop lesson** or **Finish lesson** clears its current count. Learned marks remain. Each spell keeps its own state across spell changes, tab changes, and camera stops. Reload clears all Training progress. It is not restored from local records. Practice keeps its original Expelliarmus lesson.

Attack spells reuse the existing travel and dummy reactions. Expelliarmus removes the wand for two seconds. Protego shows only its three-second caster shield. Training has no health, defeat, or dummy reset control. Changing tabs clears pending effects but keeps lesson progress. Reduced motion preserves the effect state without travel. Status uses text as well as color; lesson messages use a polite live region.

Completed-lesson previews use simulated input: [desktop](previews/training-tab-desktop.png) and [narrow](previews/training-tab-mobile.png). They are not physical player trial evidence.

## Training brandbook concept

The brandbook Training illustration remains a synthetic design study. It is not the implemented tab. Its camera/play-field composition and sample states do not define new game behavior. Keep its concept label visible outside the frame. Update the illustration only in a separate design task.

## Implemented Duel

Duel shares the Practice camera and detector. It shows the same transparent hand/path overlay on an illustrated arena, without camera pixels in the arena. Target health changes at impact. Reset restores the target; tab changes preserve health and cancel pending flights. The player stays at full health because the dummy does not attack. `README.md` defines the current values and state rules.

Keep these mechanics during the separate design migration. The future fight study below does not replace them.

## Future fight

Purpose: present a future combat scene while keeping input state clear.

```text
Pause                   TARGET / OPPONENT                Tracking


                  UNOBSTRUCTED ACTIVE SCENE


Spell guide                         READY / DRAW / CAST
```

The brandbook demonstrates visual hierarchy only. Use a stationary practice target and “Fight concept” labeling until combat rules are decided. Current spell and cast readiness sit at the edge. Keep large target-facing information out of the camera-hand region.

Do not implement health bars, damage numbers, cooldowns, opponent AI, victory, or defeat from a visual mockup. Those need defined rules, input handling, persistence decisions, and tests. A paused state must stop new capture and expose a clear resume action. A tracking loss must cancel a cast rather than punish the player as a missed attack.

Open decisions for full fight mode: attacking opponents, player damage and defeat, additional spells, cooldowns, full-fight win conditions, camera composition, accessibility alternatives, and session duration. Existing dummy Duel hit rules and feedback remain the implemented baseline.

## UI copy

Use literal instructions first. Short atmosphere lines can appear in menus, but never replace an error or input cue. Prefer “Hand lost” to “Your magic has faded.” Prefer “Allow camera access, then retry” to “Something went wrong.” Retain the implemented spell names unless a separate naming change is approved.
