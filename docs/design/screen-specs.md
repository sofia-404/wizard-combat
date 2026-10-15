# Each screen gives the player one clear next action.

The root implements the main menu, Options, and Credits. Training opens Practice; Fight opens the static-dummy Duel with health, hit reactions, defeat, and reset. Both gameplay views keep their current styles. The training layout below and full fight mode remain target specifications. Their visual migration is separate. Brandbook illustrations use synthetic state and must say so outside their frames.

## Shared rules

- Reference desktop: 1920×1080, 16:9 play area.
- Keep primary text at least 18px and utility text at least 14px in the final player UI.
- Primary controls are at least 48px high; other touch targets are at least 44px.
- Keep play instructions near the active area. Pause or recovery text stays visible until resolved.
- Use a cyan focus ring and keyboard-operable controls. Return focus to the trigger when a modal closes.
- Keep sound optional; every essential cue also has a visual or text equivalent.
- Honor reduced motion. No flashing success or failure overlays.

## Main menu

Purpose: choose a mode without requesting camera access.

```text
ORIGINAL MARK    Wizard Combat              FULL-HEIGHT WIZARD IMAGE

Fight                                      Original mature mage
Training                                   Quiet teal scene
Options
Credits

                                          Mute / unmute sound
```

Implemented in `dist/index.html`, `dist/menu.css`, and `dist/shell.js`. Keep the requested order: Fight, Training, Options, Credits. The full-viewport composition places navigation left and the supplied wizard image right. Reuse the existing palette, fonts, and original mark. Training receives initial keyboard focus. Focus and hover reveal the gold diamond, short rule, and small text shift.

Training opens the existing light interface without starting the camera. Back to menu or Escape stops the camera and cancels capture while preserving lesson progress until reload. Returning to Training leaves the camera off. Back returns focus to the original menu trigger. Detail headings receive focus when their view opens.

Fight opens the existing static-dummy Duel without starting the camera. Practice and Duel tabs remain available inside the play view. Back to menu or Escape stops the camera and clears pending Duel flights. Dummy health and lesson progress remain until reset or reload.

### Options and sound

Options use labeled switches for Music and Sound effects, plus native selectors for Drawing hand and Difficulty. Left hand and Normal are the defaults. The separate sound control mutes all menu audio without clearing the music/effects preferences. These values save in browser storage when available.

Easy allows 9 seconds to draw with tolerance scale 1.35. Normal allows 6 seconds with scale 1 and preserves earlier behavior. Hard allows 3.5 seconds with scale 0.7. The scale changes shape-distance limits, circle radial variation, and V/Z/Expelliarmus bend and straightness checks. Easy also widens the Expelliarmus corner check used to identify an attempt; Hard leaves that check at Normal tolerance. Directions, minimum size, holds, tracking-loss rules, lesson count, and dummy response are unchanged. These are implementation values, not validated physical-player difficulty claims.

Music begins after a pointer or keyboard action. It pauses in Training, Duel, and when the page is hidden. Focus, hover, and click effects respect the effects preference and master mute. Essential state remains readable without audio.

### Credits and responsive behavior

Credits identify Emil Vakhitov and Sofia, link to “Night Vigil” by Kevin MacLeod and CC BY 4.0, disclose the music edit, and identify the original CC0 interface sounds and local SIL Open Font License fonts. Recording disclosures remain visible in Training and Credits.

At narrow widths, text and controls fill the viewport while the image dims behind them. Detail views use a dark reading field. Reduced motion removes scene drift, view entrance, and hover travel. Inspect at 1920x1080 and a narrow viewport. Mobile camera play remains unvalidated.

## Training

Purpose: learn one movement and complete three correct casts.

The implemented entry and Back to menu control belong to the new shell. The layout below is the target dark-system migration; the existing light training controls and diagnostics remain in place.

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

Fight opens the implemented static-dummy Duel. The scene below remains a future design for full combat.

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
