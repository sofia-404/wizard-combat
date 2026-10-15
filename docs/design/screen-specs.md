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

Training opens its separate four-spell lesson view without starting the camera. Back to menu or Escape stops the camera and cancels capture while preserving lesson progress until reload. Returning to a game mode leaves the camera off. Back returns focus to the original menu trigger. Detail headings receive focus when their view opens.

Fight opens the existing static-dummy fight without starting the camera. Each menu entry shows only its own existing screen. Change modes through the main menu; there is no internal mode tab bar. Back to menu or Escape stops the camera and clears pending Fight flights. Dummy health and lesson progress remain until reset or reload.

### Options and sound

Options use labeled switches for Music and Sound effects, plus native selectors for Drawing hand, Track point, and Difficulty. Left hand, Index fingertip, and Normal are the defaults. Drawing hand and Track point apply to both Fight and Training; these screens do not have copies of the controls. The separate sound control mutes all menu audio without clearing the music/effects preferences. These values save in browser storage when available.

Easy allows 9 seconds to draw with tolerance scale 1.35. Normal allows 6 seconds with scale 1 and preserves earlier behavior. Hard allows 3.5 seconds with scale 0.7. The scale changes shape-distance limits, circle radial variation, and Basic Cast/Confringo/Expelliarmus bend and straightness checks. Easy also widens the Expelliarmus corner check used to identify an attempt; Hard leaves that check at Normal tolerance. Directions, minimum size, holds, tracking-loss rules, lesson count, and dummy response are unchanged. These are implementation values, not validated physical-player difficulty claims.

Music begins after a pointer or keyboard action. It pauses in all game modes and when the page is hidden. Focus, hover, and click effects respect the effects preference and master mute. Essential state remains readable without audio.

### Credits and responsive behavior

Credits identify Emil Vakhitov and Sofia, link to “Night Vigil” by Kevin MacLeod and CC BY 4.0, disclose the music edit, and identify the original CC0 interface sounds and local SIL Open Font License fonts. Recording disclosures remain visible in the game views and Credits.

At narrow widths, text and controls fill the viewport while the image dims behind them. Detail views use a dark reading field. Reduced motion removes scene drift, view entrance, and hover travel. Inspect at 1920x1080 and a narrow viewport. Mobile camera play remains unvalidated.

## Implemented Training

Purpose: select one spell and complete three correct casts. Open Training from the main menu. Back to menu or Escape returns to the menu; no other mode is shown inside Training.

The menu entry and Back to menu control belong to the shell. The layout below shows the existing Training view. Its controls and diagnostics stay in place. A full visual migration remains separate.

```text
Back to menu | Training
Camera start / stop
-------------------------------------------------------------
ARENA + LIVE PATH               | Mirrored camera
Wizard -> static dummy         | Spell selector
Input state and cast result    | Training spell guide
Wand / shield status           | Correct casts: 0 / 3
                               | Start / Stop lesson
-------------------------------------------------------------
Camera and lesson notes
```

Training reuses the existing Fight layout, fonts, controls, and arena styles. The arena stays on the left. The camera and lesson stay in the right column. Narrow layouts use Fight's existing stacking rules. The illustrated arena contains the transparent live path, not camera pixels. The same mirrored camera preview moves between screens. There is one camera and detector. Training does not apply the brandbook design to the game.

The spell selector uses the shared spell registry. The Expelliarmus diagram comes from the `expelliarmusGuide` template. Other spell diagrams use the same path, ring, arrow, start, and end styles. Protego, Basic Cast, Confringo, and Expelliarmus keep their existing directions and recognition rules. Start and stop camera controls are separate from lesson controls. Only correct selected-spell casts increase the active lesson count. Wrong accepted spells show their normal effects without a count increase. Rejections and tracking loss do not count.

At 3/3, show the spell's learned message, a full progress bar, and the learned total. **Practice again** starts that spell at zero. **Stop lesson** or **Finish lesson** clears its current count. Learned marks remain. Each spell keeps its own state across spell changes, mode changes, and camera stops. Reload clears all Training progress. It is not restored from local records.

Attack spells reuse the existing travel and dummy reactions. Expelliarmus removes the wand for two seconds. Protego shows only its three-second caster shield. Training has no health, defeat, or dummy reset control. Changing modes clears pending effects but keeps lesson progress. Reduced motion preserves the effect state without travel. Status uses text as well as color; lesson messages use a polite live region.

Completed-lesson previews use simulated lesson events with camera access blocked: [desktop](previews/training-layout-desktop.png) and [narrow](previews/training-layout-mobile.png). They are not physical player trial evidence. See the [preview guide](previews/README.md) for all four spell diagrams and capture steps.

## Future Training brandbook concept

The brandbook Training illustration remains a synthetic design study. It is not the implemented screen. Its camera/play-field composition and sample states do not define new game behavior. Keep its concept label visible outside the frame. Update the illustration only in a separate design task.

## Implemented Fight

Fight shares the camera and detector with Training. It shows the same transparent hand/path overlay on an illustrated arena, without camera pixels in the arena. Target health changes at impact. Reset restores the target; mode changes preserve health and cancel pending flights. The player stays at full health because the dummy does not attack. `README.md` defines the current values and state rules.

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
