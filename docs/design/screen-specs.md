# Each screen gives the player one clear next action.

The root implements the main menu, Options, and Credits. Training opens the separate four-spell lessons; Fight opens the static dummy with health, hit reactions, defeat, and reset. The game views keep their current styles. Their full visual migration and full combat remain separate target specifications. Brandbook illustrations use synthetic state and must say so outside their frames.

## Current screen rules

Work scope and document conflicts follow `AGENTS.md`. Screen-specific design limits are in `DESIGN.md`.

- Preserve visible keyboard focus and keyboard controls. Return focus to the trigger when a modal closes.
- Keep sound optional; every essential cue also has a visual or text equivalent.
- Honor reduced motion. No flashing success or failure overlays.
- Pause or recovery text stays visible until resolved.

### Style ownership

All game styles load from `dist/index.html`. A file name does not limit which views its selectors affect.

| File | Current reach |
| --- | --- |
| `dist/brand/tokens.css` | Shared tokens, fonts, root color scheme, and aliases used by the menu and brandbook. Check gameplay when root values change. |
| `dist/menu.css` | Menu, Options, Credits, shared page defaults, and the game navigation wrapper. |
| `dist/style.css` | Base styles inside `#gameView`, including camera and lesson styles used by the game views. |
| `dist/fight.css` | Fight and Training arena styles. Both views use the `fight-open` body class. |
| `dist/training.css` | Training-specific rules that also depend on the shared base and Fight styles. |
| `dist/presentation/shield.css` | Shield display rules used by the game views. |
| `dist/brand/components.css`, `dist/brand/brandbook.css` | Brandbook components and preview layout. They are not loaded by the game page. |

Use `#menuShell`, `#trainingView`, or `#fightView` for a change that belongs only to that view. Keep shared camera, lesson-guide, and arena rules shared. Fight and Training both use the base styles. Check all affected views after a shared style change.

## Future design requirements

Apply these targets within the limits in `DESIGN.md`. The Future Training brandbook concept and Future fight sections describe planned designs.

- Reference desktop: 1920×1080, 16:9 play area.
- Keep primary text at least 18px and utility text at least 14px in the final player UI.
- Primary controls are at least 48px high; other touch targets are at least 44px.
- Keep play instructions near the active area.

## Implemented main menu

Purpose: choose a mode without requesting camera access.

**Unresolved:** Final menu entries, title mark, and related layout and focus details. Keep the current implementation until the user specifies a change.

Source: `dist/index.html`, `dist/menu.css`, and `dist/shell.js`.

Initial loads and reloads do not assign focus. Mouse clicks and touch taps do not select a control on the new screen. A pointer return to the menu focuses its container without an outline, so the next Tab reaches Fight. Keyboard and assistive activation, Escape, and route history changes keep the existing focus targets. Browser-restored focus is preserved. Tab follows the normal document order and keeps visible keyboard focus.

When a keyboard camera start fails in Fight or Training, focus returns to Start camera only if the user has not used another key, clicked elsewhere, moved focus, or left the screen while waiting. Pointer starts do not request this focus return.

Training opens its separate four-spell lesson view without starting the camera. Back to menu or Escape stops the camera and cancels capture while preserving lesson progress until reload. Returning to a game mode leaves the camera off. Keyboard navigation back returns focus to the original menu trigger. Detail headings receive focus when keyboard navigation opens their view.

Fight opens the existing static-dummy fight without starting the camera. Each menu entry shows only its own existing screen. Change modes through the main menu; there is no internal mode tab bar. Back to menu or Escape stops the camera and clears pending Fight flights. Dummy health and lesson progress remain until reset or reload.

Reload selects the URL screen before showing the menu. Fight and Training reserve the arena space while its background and character images load and decode. The arena appears as one scene, without a fade or layout change. Back to menu stays available. If an image fails, hide all arena image layers together and keep the controls on the plain arena background. Entering the mode again retries the images.

### Options and sound

Options use labeled switches for Music and Sound effects, plus native selectors for Drawing hand, Track point, and Difficulty. Left hand, Index fingertip, and Normal are the defaults. Drawing hand and Track point apply to both Fight and Training; these screens do not have copies of the controls. The Mute sound button appears only in Options. It controls master mute without clearing the music/effects preferences. These values save in browser storage when available.

Easy allows 9 seconds to draw with tolerance scale 1.35. Normal allows 6 seconds with scale 1 and preserves earlier behavior. Hard allows 3.5 seconds with scale 0.7. The scale changes shape-distance limits, circle radial variation, and Basic Cast/Confringo/Expelliarmus bend and straightness checks. Easy also widens the Expelliarmus corner check used to identify an attempt; Hard leaves that check at Normal tolerance. Directions, minimum size, holds, tracking-loss rules, lesson count, and dummy response are unchanged. These are implementation values, not validated physical-player difficulty claims.

Music begins after a pointer or keyboard action. Menu screens play menu music. Fight plays battle music. Training has no music. Each track pauses when its view closes or the page is hidden. A spell with a cast sound plays it on each accepted cast in every game view. A Fight defeat stops the battle music and plays a victory fanfare once. The battle music starts again from the beginning after Restart. Leaving Fight stops the fanfare. Hiding the page stops drawing audio and effects too. Interrupted effects do not replay on return. Focus, hover, click, and spell effects respect the effects preference and master mute. Essential state remains readable without audio.

### Credits and responsive behavior

Credits identify Emil Vakhitov and Sofia, link to “Night Vigil” and “Clash Defiant” by Kevin MacLeod and CC BY 4.0, disclose the music edits, and identify the original CC0 interface sounds, the CC0 spell, damage, and victory sound sources, and local SIL Open Font License fonts. Recording disclosures remain visible in the game views and Credits.

At narrow widths, text and controls fill the viewport while the image dims behind them. Detail views use a dark reading field. Reduced motion removes scene drift, view entrance, and hover travel. Inspect at 1920x1080 and a narrow viewport. Mobile camera play remains unvalidated.

## Implemented Training

Purpose: select one spell and complete three correct casts. Open Training from the main menu. Back to menu or Escape returns to the menu; no other mode is shown inside Training.

The menu entry and Back to menu control belong to the shell. Training uses Fight's compact header and outer spacing. SPELL TRAINING is centered over the arena. On narrow screens, the heading sits below the controls. Start camera sits in the arena center. When ready, the same button moves to the top-right corner as Stop camera. Stopping moves it back. The heading and button are hidden outside Training.

```text
Back to menu          SPELL TRAINING          Stop camera (when on)
------------------------------------------------------------------
ARENA + LIVE PATH                              | Mirrored camera
Wizard -> dummy                               | SPELL LESSON
Start camera (when off)                        | Spell selector
                                              | Path guide
RECENT EVENTS          0 of 4 spells learned   | Correct casts: 0 / 3
                                              | Start / Stop lesson
```

Training reuses Fight's layout, fonts, controls, and arena styles. It keeps the 290px lesson column at widths of 1100px and above. The Spell Lesson panel, guides, and controls keep their existing content and styles. Narrow layouts use the existing stacking rules. Recent Events replaces the repeated input, cast, wand, and shield status below the arena. It uses Fight's event list, timestamps, 320px fixed height, bottom fade, and reduced-motion behavior. It shows up to 50 Training events, newest first, and the learned total in its header. Camera changes, accepted spells, rejections, and drawing cancellations add rows. Each accepted attack adds one row at impact with damage and precision. Protego adds one row when cast with 0 damage and precision. Navigation, spell changes, and lesson controls keep the list; reload clears it. Fight and Training events stay separate.

The arena uses Fight's YOUR WIZARD / Player and TARGET / Dummy header. Both bars use the shared Fight health styles and start at 200 / 200. Dummy health drops at impact. Starting or repeating a lesson refills it. Incoming player hits update the player bar in either view, with Protego blocking and no health below zero. The dummy does not attack yet. The selected spell stays in Spell Lesson. It has no repeated instructions, location caption, or bottom help notes. Live input instructions stay in the camera preview. Camera errors also appear in Recent Events. The illustrated arena contains the transparent live path, not camera pixels. The same mirrored camera preview moves between screens. There is one camera and detector. Training does not apply the brandbook design to the game.

The spell selector uses the shared spell registry. The Expelliarmus diagram comes from the `expelliarmusGuide` template. Other spell diagrams use the same path, ring, arrow, start, and end styles. Protego, Basic Cast, Confringo, and Expelliarmus keep their existing directions and recognition rules. Start and stop camera controls are separate from lesson controls. Only correct selected-spell casts increase the active lesson count. Wrong accepted spells show their normal effects without a count increase. Rejections and tracking loss do not count.

At 3/3, show the spell's learned message, a full progress bar, and the learned total. **Practice again** starts that spell at zero. **Stop lesson** or **Finish lesson** clears its current count. Learned marks remain. Each spell keeps its own state across spell changes, mode changes, and camera stops. Reload clears all Training progress. It is not restored from local records.

Attack spells reuse the existing travel and dummy reactions. Expelliarmus removes the wand for two seconds. Protego shows only its three-second caster shield. At zero health, the dummy uses Fight's 900 ms fall. Reduced motion shows the fallen pose directly. Two seconds after the final hit, it returns with 200 health and its wand. The automatic restart keeps lesson state, counts, learned marks, player health, and the active shield. Attacks cannot hit the fallen dummy, but lesson counts can still advance. Defeat and restart add Recent Events rows. There is no separate dummy reset control. Spell changes and navigation keep health; reload resets it. Changing modes clears pending effects but keeps lesson progress. Reduced motion preserves the effect state without travel. Status uses text as well as color; lesson messages use a polite live region.

Completed-lesson previews use simulated lesson events with camera access blocked: [desktop](previews/training-layout-desktop.png) and [narrow](previews/training-layout-mobile.png). The automatic restart delay is shown in [desktop](previews/training-defeat-desktop.png) and [narrow](previews/training-defeat-mobile.png) previews. They are not physical player trial evidence. See the [preview guide](previews/README.md) for all four spell diagrams and capture steps.

## Future Training brandbook concept

The brandbook Training illustration remains a synthetic design study. It is not the implemented screen. Its camera/play-field composition and sample states do not define new game behavior. Keep its concept label visible outside the frame. Update the illustration only in a separate design task.

## Implemented Fight

Fight and Training use half the previous outer left and right space. Navigation and main content share 19px horizontal padding, 11px at widths from 721px to 900px, and 8px at widths up to 720px. Above 1600px, the centered outer margin is also halved.

The battlefield keeps YOUR WIZARD above Player and TARGET above Dummy. Each health bar keeps its numeric value. There are no bottom actor labels or static/no-attack notes. The target detail shows Defeated only after defeat.

At widths of 1100px and above, the Fight camera and events column is 270px wide. On desktop, Recent Events fills the space below the camera and ends at the battlefield's bottom edge. At widths below 1100px, it has a fixed height of 320px. New events slide in from the top over 380ms with a gentle start and stop, and push older rows down through a 20px fade at the bottom edge, without a scrollbar. Rows stay in the flow instead of hiding in full. Reduced motion removes the slide. Event count does not change the panel height.

Each event puts its bold name on the left and its smaller timestamp on the right of the first line. Damage or the error appears below. Rows use 10px vertical padding. Long names and errors can wrap; timestamps stay on one line.

The top navigation bar shows PRACTICE ARENA in a compact serif heading centered over the battlefield column. Back to menu stays on the left. On narrow screens, the heading sits below the controls. The gap to the main content is 16px, or 8px at widths of 600px and below. There is no separate Fight label or subtitle. Start camera is centered in the battlefield. Its label stays unchanged while camera access and tracking load. When ready, the same button moves to the top-right corner and reads Stop camera. Stopping returns it to the battlefield center. The start button is hidden during defeat. The camera button and heading are hidden outside Fight. Restart appears only inside the Dummy defeated window. There is no control row above the arena. After reset, keyboard focus returns to the camera button. Recent Events replaces Spell Control. It keeps up to 50 timestamped events, newest first, in one panel with row separators. Each attack adds one event at impact with the spell name, actual damage, and gesture precision percentage. Protego shows 0 damage and its precision percentage. There is no separate cast event. The header keeps the hit count. The empty state says "No events yet. Start the camera to begin." Restart clears the list and adds a restart event. Navigation keeps the list; reload clears it. Training events are excluded. Input phases and live instructions stay in the camera preview. Camera errors also appear in the event list.

Fight shares the camera and detector with Training. It shows the same transparent hand/path overlay on an illustrated arena, without camera pixels in the arena. Both figures have small idle movements. Falling, defeat, disarm, and reduced motion stop the relevant idle animation. Target health changes at impact. Reset restores the target; mode changes preserve health and cancel pending flights. The player stays at full health because the dummy does not attack. `README.md` defines the current values and state rules.

Keep these mechanics during the separate design migration. The future fight study below does not replace them.

## Future fight

Purpose: present a future combat scene while keeping input state clear.

Fight opens the implemented static-dummy mode. The scene below remains a future design for full combat.

```text
Pause                   TARGET / OPPONENT                Tracking


                  UNOBSTRUCTED ACTIVE SCENE


Spell guide                         READY / DRAW / CAST
```

The brandbook demonstrates visual hierarchy only. Use a stationary practice target and “Fight concept” labeling until combat rules are decided. Current spell and cast readiness sit at the edge. Keep large target-facing information out of the camera-hand region.

Do not implement health bars, damage numbers, cooldowns, opponent AI, victory, or defeat from a visual mockup. Those need defined rules, input handling, persistence decisions, and tests. A paused state must stop new capture and expose a clear resume action. A tracking loss must cancel a cast rather than punish the player as a missed attack.

Open decisions for full fight mode: attacking opponents, player damage and defeat, additional spells, cooldowns, full-fight win conditions, camera composition, accessibility alternatives, and session duration. Existing dummy Fight hit rules and feedback remain the implemented baseline.

## UI copy

Use literal instructions first. Short atmosphere lines can appear in menus, but never replace an error or input cue. Prefer “Hand lost” to “Your magic has faded.” Prefer “Allow camera access, then retry” to “Something went wrong.” Retain the implemented spell names unless a separate naming change is approved.
