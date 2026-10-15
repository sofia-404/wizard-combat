# Each screen gives the player one clear next action.

These are target UI specifications. The game implements camera input, free practice, a three-cast lesson, and a static-dummy Duel with health, hit reactions, defeat, and reset. Menu and full fight mode remain proposed surfaces. Applying these visual rules to Practice and Duel is a separate migration. The brandbook illustrations use synthetic state and must say so outside their frames.

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

## Training

Purpose: learn one movement and complete three correct casts.

```text
Back   TRAINING                           Camera / hand status
-------------------------------------------------------------
                      | Spell guide: start -> right -> down
   CAMERA / PLAY      | Keep moving at the corner.
   FIELD              | Pause at the end.
                      |
   Live path          | Correct casts: 0 / 3
   Target response    | Start / Stop lesson
-------------------------------------------------------------
READY: Hold still     | Optional setup and diagnostics
```

The live camera/play field is the largest region. Keep a compact diagram visible beside it. Show the actual Expelliarmus direction for both hands. Start and stop controls must retain their existing separate camera and lesson meanings. At 3/3 show “Lesson complete” with “Practice again” and “Finish lesson.”

The current prototype shows the target separately from the camera. The concept may place a stylized target within an illustrated play area, but an actual migration must choose and implement the composition honestly; it cannot imply existing camera compositing.

| State | Player text | Visual rule |
| --- | --- | --- |
| Camera off | Start the camera to begin. | Quiet field and primary camera action |
| Camera starting | Starting camera… | Stable status, no fake progress percentage |
| Hand absent | Show your selected hand. | Hand outline plus text |
| Ready | Hold still, then draw. | Cyan start marker plus READY label |
| Capturing | Keep moving. | One cyan live trace |
| End hold | Pause to cast. | Stable terminal cue |
| Accepted | Spell cast. | Brief local impact and count update |
| Rejected | Follow the shown path and try again. | Path remains visible; specific reason when known |
| Tracking lost | Hand lost. Bring it back into view. | Cancel cue; do not count a failed cast |
| Wrong hand | Show your selected hand. | Selected hand named in setup |
| Ignored return | Ready for the next movement. | Quiet feedback, no attempt increment |
| Complete | Three correct casts. Lesson complete. | 3/3 and two next actions |

Show “Wand ready” and “Wand returning” for the dummy. Preserve its actual two-second return rule. An accepted Expelliarmus cast may restart that timer. Do not promise an accuracy percentage based on matcher distances.

On narrow screens, place the play field first, then the compact instruction and progress, then setup. Keep controls usable even if a physical mobile-camera trial is still pending.

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
