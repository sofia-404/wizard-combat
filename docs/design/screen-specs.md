# Each screen gives the player one clear next action.

The root implements the main menu, Options, and Credits. Spell Training opens the separate four-spell lessons; Practice Arena opens the static dummy with health, hit reactions, defeat, and reset. The game views keep their current styles. Their full visual migration and full combat remain separate target specifications. Brandbook illustrations use synthetic state and must say so outside their frames.

## Current screen rules

Work scope and document conflicts follow `AGENTS.md`. Screen-specific design limits are in `DESIGN.md`.

- Preserve visible keyboard focus and keyboard controls. Return focus to the trigger when a modal closes.
- Keep sound optional; every essential cue also has a visual or text equivalent.
- Honor reduced motion. No flashing success or failure overlays.
- Pause or recovery text stays visible until resolved.

### Style ownership

All game styles load from `dist/index.html`. A file name does not limit which views its selectors affect.

Practice Arena, Solo Duel, Spell Training, Options, and Credits use `.screen-title` in `dist/menu.css`. This shared rule sets the font, size, weight, letter spacing, and uppercase text. Screen-specific rules keep the existing spacing, alignment, and color. The main-menu game title keeps its separate brand style.

| File | Current reach |
| --- | --- |
| `dist/brand/tokens.css` | Shared tokens, fonts, root color scheme, and aliases used by the menu and brandbook. Check gameplay when root values change. |
| `dist/menu.css` | Menu, Options, Credits, shared page defaults, and the game navigation wrapper. |
| `dist/style.css` | Base styles inside `#gameView`, including camera and lesson styles used by the game views. |
| `dist/practice-arena.css` | Practice Arena and Spell Training arena styles. Both views use the `practice-arena-open` body class. |
| `dist/spell-training.css` | Spell Training-specific rules that also depend on the shared base and Practice Arena styles. |
| `dist/presentation/shield.css` | Shield display rules used by the game views. |
| `dist/brand/components.css`, `dist/brand/brandbook.css` | Brandbook components and preview layout. They are not loaded by the game page. |

Use `#menuShell`, `#spellTrainingView`, or `#practiceArenaView` for a change that belongs only to that view. Keep shared camera, lesson-guide, and arena rules shared. Practice Arena and Spell Training both use the base styles. Check all affected views after a shared style change.

## Future design requirements

Apply these targets within the limits in `DESIGN.md`. The Future Spell Training brandbook concept and Future practice arena sections describe planned designs.

- Reference desktop: 1920×1080, 16:9 play area.
- Keep primary text at least 18px and utility text at least 14px in the final player UI.
- Primary controls are at least 48px high; other touch targets are at least 44px.
- Keep play instructions near the active area.

## Implemented main menu

Purpose: choose a mode without requesting camera access.

Each game mode has a short subheader below its button: Spell Training shows “Learn how to cast each spell” Practice Arena shows “Practice spells on a training dummy” Solo Duel shows “Duel against a computer opponent” Multiplayer keeps “Duel with friends online. Coming soon” below its disabled button. Options and Credits have no description. Subheaders have no final period and stay close to their titles. An extra 8px separates mode groups: 80px between mode titles on desktop and 72px on narrow screens.

Menu entries: Spell Training, Practice Arena, Solo Duel, Multiplayer, Options, and Credits. Solo Duel opens a copy of Practice Arena at `#soloDuel`, with the SOLO DUEL heading. It shares the layout, artwork, controls, damage rules, and music. Its opponent attacks and casts Protego. Its health, shields, timer, and events are separate. Multiplayer remains a native disabled button with no route or screen. Keep the existing design and the PRACTICE ARENA game header.

Options and Credits form a stacked group at the bottom-left of the main menu. Keep the existing item sizes and spacing. Leave at least 48px between the modes and this group. On short screens, the menu grows and the page scrolls; the group never overlaps the modes.

Source: `dist/index.html`, `dist/menu.css`, and `dist/shell.js`.

All screens use the same Back to menu control. `dist/presentation/menu-back.js` sets its arrow, label, and click handler. The shared `.menu-back` rules in `dist/menu.css` set its appearance: 14px Source Sans 3, weight 500, a 44px minimum height, muted text, gold hover, and cyan keyboard focus. The shared `--menu-back-left` and `--menu-back-top` values place the control at the same position on each screen, using Practice Arena as the reference. The control scrolls with the page. Reserved space keeps all other content in place.

Initial loads and reloads do not assign focus. Mouse clicks and touch taps do not select a control on the new screen. A pointer return to the menu focuses its container without an outline, so the next Tab reaches Spell Training. Keyboard and assistive activation, Escape, and route history changes keep the existing focus targets. Browser-restored focus is preserved. Tab follows the normal document order and keeps visible keyboard focus.

When a keyboard camera start fails in Practice Arena or Spell Training, focus returns to Start camera only if the user has not used another key, clicked elsewhere, moved focus, or left the screen while waiting. Pointer starts do not request this focus return.

Spell Training opens its separate four-spell lesson view without starting the camera. Back to menu or Escape stops the camera and cancels capture while preserving completed lessons until reload. Returning to a game mode leaves the camera off. Keyboard navigation back returns focus to the original menu trigger. Detail headings receive focus when keyboard navigation opens their view.

Practice Arena opens the existing static-dummy practice arena without starting the camera. Each menu entry shows only its own existing screen. Change modes through the main menu; there is no internal mode tab bar. Back to menu or Escape stops the camera and clears pending Practice Arena flights. Dummy health and lesson progress remain until reset or reload.

Reload selects the URL screen before showing the menu. Practice Arena and Spell Training reserve the arena space while its background and character images load and decode. The arena appears as one scene, without a fade or layout change. Back to menu stays available. If an image fails, hide all arena image layers together and keep the controls on the plain arena background. Entering the mode again retries the images.

### Options and sound

Options use labeled switches for Music and Sound effects, plus native selectors for Drawing hand, Track point, and Difficulty. Left hand, Index fingertip, and Normal are the defaults. Drawing hand and Track point apply to both Practice Arena and Spell Training; these screens do not have copies of the controls. The OPTIONS heading matches the Practice Arena heading type: 24px Georgia, weight 400, with uppercase text. Music and Sound effects are the only sound controls. An old saved master mute turns both switches off, so either switch can enable sound again. These values save in browser storage when available.

Easy allows 9 seconds to draw with tolerance scale 1.35. Normal allows 6 seconds with scale 1 and preserves earlier behavior. Hard allows 3.5 seconds with scale 0.7. The scale changes shape-distance limits, circle radial variation, and Basic Cast/Confringo/Expelliarmus bend and straightness checks. Easy also widens the Expelliarmus corner check used to identify an attempt; Hard leaves that check at Normal tolerance. Directions, minimum size, holds, tracking-loss rules, lesson count, and dummy response are unchanged. These are implementation values, not validated physical-player difficulty claims.

Music begins after a pointer or keyboard action. Menu screens play menu music. Practice Arena plays battle music. Spell Training has no music. Each track pauses when its view closes or the page is hidden. A spell with a cast sound plays it on each accepted cast in every game view. Dummy defeat in Practice Arena stops battle music and plays a victory fanfare once. Player defeat stops the music without the fanfare. The battle music starts again from the beginning after Restart. Leaving Practice Arena stops the fanfare. Hiding the page stops drawing audio and effects too. Interrupted effects do not replay on return. Focus, hover, click, and spell effects respect the effects preference and master mute. Essential state remains readable without audio.

### Credits and responsive behavior

Credits identify Sofia, Ricky, Emil and Ivan, link to “Night Vigil” and “Clash Defiant” by Kevin MacLeod and CC BY 4.0, disclose the music edits, and identify the original CC0 interface sounds, the CC0 spell, damage, and victory sound sources, and local SIL Open Font License fonts. Recording disclosures remain visible in the game views and Credits.

At narrow widths, text and controls fill the viewport while the image dims behind them. Detail views use a dark reading field. Reduced motion removes scene drift, view entrance, and hover travel. Inspect at 1920x1080 and a narrow viewport. Mobile camera play remains unvalidated.

## Implemented Spell Training

Purpose: select one spell and complete three correct casts, or block three attacks for Protego. Open Spell Training from the main menu. Back to menu or Escape returns to the menu; no other mode is shown inside Spell Training.

The menu entry and Back to menu control belong to the shell. Spell Training uses Practice Arena's compact header and outer spacing. SPELL TRAINING is centered over the arena. On narrow screens, the heading sits below the controls. Start camera sits in the arena center. When ready, the same button moves to the top-right corner as Stop camera. Stopping moves it back. The heading and button are hidden outside Spell Training.

```text
Back to menu          SPELL TRAINING          Stop camera (when on)
------------------------------------------------------------------
Player health       Correct casts       Dummy health | Camera
ARENA + LIVE PATH                                    | Choose a spell
Start camera; lesson starts when ready               | Recent Events
Small path guide inside arena, bottom center         | Learned total
Lesson feedback and completion
```

Spell Training keeps the current fonts, controls, colors, and artwork. Its spell selector sits between the camera and Recent Events. On desktop, Recent Events ends at the battlefield bottom edge. Correct casts and its progress bar sit between the health bars. The diagram sits inside the battlefield at the bottom center, on a semitransparent background. Its width is 240px, or 168px at widths up to 900px. It does not intercept pointer input. Narrow battlefields have enough height to keep it below the central action. It has no visible text caption; its accessible description is kept. Lesson feedback and other spell completions stay below the battlefield. Protego completion appears in a centered battlefield popup, using the existing arena window style. Close or Escape dismisses it and returns focus to the spell selector. Spell effect notes are not shown in the UI. Idle lessons show no status message. The generic rejected-cast instruction is not shown below the battlefield. There is no Spell Lesson panel.

At widths of 1100px and above, the camera and Recent Events use the 290px right column. Narrow layouts stack the header controls, battlefield with its guide, lesson feedback, camera, spell selector, and events in that order. Recent Events fills the remaining right-column height on desktop and keeps its 320px height on narrow screens. Its timestamps, bottom fade, and reduced-motion behavior stay the same. It shows up to 50 events, newest first, with the learned total in its header. Camera changes, accepted spells, rejections, and drawing cancellations add rows. Attacks add one row at impact with damage and precision. Protego adds one row when cast with 0 damage and precision. Navigation, spell changes, and lesson controls keep the list; reload clears it. Practice Arena events stay separate.

Start camera occupies the arena center while the camera is off or loading. Once ready, that button moves to navigation and the selected lesson starts automatically. There is no Start lesson or Practice again button. Stopping the camera ends all active lessons and clears their counts. Completed lessons and learned marks remain. Restarting the camera starts a fresh attempt for the selected spell. Tracker recovery does not restart the lesson. Selecting an idle spell while the camera runs starts its lesson; active and completed spells keep their state on selection. Camera activation remains explicit.

The arena uses Practice Arena's YOUR WIZARD / Player and TARGET / Dummy header. Both bars use the shared Practice Arena health styles and start at 200 / 200. Dummy health drops at impact. Starting or repeating a lesson refills it. Incoming player hits update the player bar in either view, with Protego blocking and no health below zero. During an active Protego lesson, the opponent uses the shared attack effects, a two-second warning, and a six-second attack interval. The header uses Opponent and Attacks blocked. The warning below opponent health stays visible at narrow widths. Other lessons keep the static dummy. The selected spell stays beside the Spell Training heading. It has no repeated instructions, location caption, or bottom help notes. Live input instructions stay in the camera preview. Camera errors also appear in Recent Events. The illustrated arena contains the transparent live path, not camera pixels. The same mirrored camera preview moves between screens. There is one camera and detector. Spell Training does not apply the brandbook design to the game.

The spell selector uses the shared spell registry. The Expelliarmus diagram comes from the `expelliarmusGuide` template. Other spell diagrams use the same path, ring, arrow, start, and end styles. Protego, Basic Cast, Confringo, and Expelliarmus keep their existing directions and recognition rules. Camera controls start and stop lessons. Only correct selected-spell casts increase the active lesson count, except Protego, which counts blocked training attacks. Wrong accepted spells show their normal effects without a count increase. Rejections and tracking loss do not count.

At 3/3, show the spell's learned message, a full progress bar, and the learned total. Restarting the camera starts the selected spell again at zero. There are no separate lesson start or stop buttons. Each spell keeps its state across spell changes. Camera stops end active attempts, including stops caused by navigation, a hidden page, or a disconnected camera. Completed lessons and learned marks remain. Reload clears all Spell Training progress. It is not restored from local records.

Attack spells reuse the existing travel and dummy reactions. Expelliarmus removes the wand for two seconds. Protego shows its three-second caster shield. A shield cast alone does not count. The player must block an incoming training attack. Three blocks stop opponent attacks and complete the lesson. Missed blocks reduce player health. Camera stop, tracker recovery, hidden pages, navigation, spell changes, and defeat cancel opponent attacks. At zero health, the dummy uses Practice Arena's 900 ms fall. Reduced motion shows the fallen pose directly. Two seconds after the final hit, it returns with 200 health and its wand. The automatic restart keeps lesson state, counts, learned marks, player health, and the active shield. Attacks cannot hit the fallen dummy, but lesson counts can still advance. Defeat and restart add Recent Events rows. Player health at zero uses a matching fall toward the arena center. Player casts stop until automatic recovery after two seconds. Player recovery keeps dummy health, the selected lesson, its count, and learned marks. Both recovery timers continue when Spell Training is hidden. There is no separate dummy reset control. Spell changes and navigation keep health; reload resets it. Changing modes clears pending effects and ends active lessons; completed lessons remain. Reduced motion preserves the effect state without travel. Status uses text as well as color; lesson messages use a polite live region.

Completed-lesson previews use simulated lesson events with camera access blocked: [desktop](previews/spell-training-layout-desktop.png) and [narrow](previews/spell-training-layout-mobile.png). The automatic restart delay is shown in [desktop](previews/spell-training-defeat-desktop.png) and [narrow](previews/spell-training-defeat-mobile.png) previews. They are not physical player trial evidence. See the [preview guide](previews/README.md) for all four spell diagrams and capture steps.

## Future Spell Training brandbook concept

The brandbook Spell Training illustration remains a synthetic design study. It is not the implemented screen. Its camera/play-field composition and sample states do not define new game behavior. Keep its concept label visible outside the frame. Update the illustration only in a separate design task.

## Implemented Practice Arena

Practice Arena and Spell Training use half the previous outer left and right space. Navigation and main content share 19px horizontal padding, 11px at widths from 721px to 900px, and 8px at widths up to 720px. Above 1600px, the centered outer margin is also halved.

The battlefield keeps YOUR WIZARD above Player and TARGET above Dummy. Each health bar keeps its numeric value. There are no bottom actor labels or static/no-attack notes. The target detail shows Defeated only after defeat.

At widths of 1100px and above, the Practice Arena camera and events column is 270px wide. On desktop, Recent Events fills the space below the camera and ends at the battlefield's bottom edge. At widths below 1100px, it has a fixed height of 320px. New events slide in from the top over 380ms with a gentle start and stop, and push older rows down through a 20px fade at the bottom edge, without a scrollbar. Rows stay in the flow instead of hiding in full. Reduced motion removes the slide. Event count does not change the panel height.

Each event puts its bold name on the left and its smaller timestamp on the right of the first line. Damage or the error appears below. Rows use 10px vertical padding. Long names and errors can wrap; timestamps stay on one line.

The top navigation bar shows PRACTICE ARENA in a compact serif heading centered over the battlefield column. Back to menu stays on the left. On narrow screens, the heading sits below the controls. The gap to the main content is 16px, or 8px at widths of 600px and below. There is no separate Practice Arena label or subtitle. Start camera is centered in the battlefield. Its label stays unchanged while camera access and tracking load. When ready, the same button moves to the top-right corner and reads Stop camera. Stopping returns it to the battlefield center. The start button is hidden during defeat. The camera button and heading are hidden outside Practice Arena. Restart appears inside the Dummy defeated or Player defeated window. There is no control row above the arena. After reset, keyboard focus returns to the camera button. Recent Events replaces Spell Control. It keeps up to 50 timestamped events, newest first, in one panel with row separators. Each attack adds one event at impact with the spell name, actual damage, and gesture precision percentage. Protego shows 0 damage and its precision percentage. There is no separate cast event. The header keeps the hit count. The empty state says "No events yet. Start the camera to begin." Restart clears the list and adds a restart event. Navigation keeps the list; reload clears it. Spell Training events are excluded. Input phases and live instructions stay in the camera preview. Camera errors also appear in the event list.

Practice Arena shares the camera and detector with Spell Training. It shows the same transparent hand/path overlay on an illustrated arena, without camera pixels in the arena. Both figures have small idle movements. Falling, defeat, disarm, and reduced motion stop the relevant idle animation. Target health changes at impact. Reset restores both health bars and ready poses; mode changes preserve health and cancel pending flights. The player stays at full health because the dummy does not attack. `README.md` defines the current values and state rules.

Keep these mechanics during the separate design migration. The future practice arena study below does not replace them.

## Implemented Solo Duel

Solo Duel and active Protego training share a wand charge during opponent attack preparation. A white core, spell-colored glow, and filling arc sit at the wand tip and follow its idle movement. The charge is visible from the start and grows until release. Reduced motion uses a steady core and ring. Release or cancellation clears the charge. The charge follows each prepared attack's warning time. Solo Duel uses the difficulty values in README.md; Protego training keeps a two-second warning.

Solo Duel keeps Practice Arena's layout and artwork. The right fighter is named Opponent. The detail below its health shows Casting Basic Cast, Casting Confringo, Protego active, Disarmed, or Defeated. Cast warnings stay visible at narrow widths. Recent Events gives the warning and tells the player to cast Protego before impact.

Opponent spells travel from the right wand to the player on the left. The existing cyan shield sphere appears around each protected fighter. Shields block at impact. Blocked attacks do not cause a hit reaction, damage, or disarm. Recent Events confirms the block. The opponent attacks on a timer and reacts to launched player attacks with Protego, only while the camera and tracking are ready. Both fighters' spells travel for 600 ms. README.md defines reaction, cooldown, and lifecycle rules. Reduced motion removes spell travel and idle movement, while keeping combat timing unchanged.

## Future practice arena

Purpose: present a future combat scene while keeping input state clear.

Practice Arena opens the implemented static-dummy mode. The scene below remains a future design for full combat.

```text
Pause                   TARGET / OPPONENT                Tracking


                  UNOBSTRUCTED ACTIVE SCENE


Spell guide                         READY / DRAW / CAST
```

The brandbook demonstrates visual hierarchy only. Use a stationary practice target and “Practice Arena concept” labeling until combat rules are decided. Current spell and cast readiness sit at the edge. Keep large target-facing information out of the camera-hand region.

Do not implement health bars, damage numbers, cooldowns, opponent AI, victory, or defeat from a visual mockup. Those need defined rules, input handling, persistence decisions, and tests. A paused state must stop new capture and expose a clear resume action. A tracking loss must cancel a cast rather than punish the player as a missed attack.

Open decisions for full practice arena mode: attacking opponents, player damage and defeat, additional spells, cooldowns, full-combat win conditions, camera composition, accessibility alternatives, and session duration. Existing dummy Practice Arena hit rules and feedback remain the implemented baseline.

## UI copy

Use literal instructions first. Short atmosphere lines can appear in menus, but never replace an error or input cue. Prefer “Hand lost” to “Your magic has faded.” Prefer “Allow camera access, then retry” to “Something went wrong.” Retain the implemented spell names unless a separate naming change is approved.
