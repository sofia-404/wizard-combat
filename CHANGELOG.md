# Changelog

Each entry covers one commit, including merged branches. Oldest entries come first. Names and rules reflect the game at that commit.

## 2026-10-15 - `b5390ba` - ODYSSEY-2026-UNLEASH-THE-GODS: Add core webcam gesture casting

- Implement hand tracking, Circle/V/Z recognition, and target feedback.
- Add local event logs, result cards, bundled models, and core tests.

## 2026-10-15 - `37b3e72` - Add Expelliarmus casting and training

- Add a three-cast lesson, movement guide, and training controls.
- Disarm the dummy on Expelliarmus casts and return its wand after two seconds.
- Reject tall corner paths that could match Z. Add spell, lesson, wand timer, and browser tests.

## 2026-10-15 - `e5d7bb5` - Reuse the successful end hold for consecutive casts

- Prepare the next cast after a successful end hold. Start a fresh path and require a new hold after failed or cancelled gestures.
- Add consecutive-cast and recovery tests. Update casting instructions, lesson feedback, and record version.

## 2026-10-15 - `faadc63` - Add Arc & Anchor UI brandbook and reusable design system

- Add an interactive brandbook, shared styles, fonts, marks, and design tokens.
- Add product and design rules, screen specifications, migration notes, and preview images.

## 2026-10-15 - `30b1e11` - Use English throughout the brandbook and require it repository-wide

- Translate the brandbook and related assets to English. Require English in repository content.
- Update design docs and preview images.

## 2026-10-15 - `5015c9d` - Keep the game README free of internal brandbook guidance

- Remove internal brandbook guidance from the README and add a rule to keep it in design documents.

## 2026-10-15 - `e459614` - Add dummy duel mode and shared spell registry

- Add a Duel view with shared camera controls, gesture feedback, arena artwork, health, hit reactions, defeat, and reset.
- Centralize spell definitions, damage, colors, and lesson settings. Keep existing module imports compatible.
- Add Duel event logs, unit and browser tests, and project docs.

## 2026-10-15 - `fdd48c3` - Merge origin/main into feat/dummy-duel-layout

- Combine project work rules and reconcile product and design docs with the implemented dummy Duel.
- Keep the Practice and Duel design migration separate.

## 2026-10-15 - `0988337` - Add cinematic main menu with audio and saved options

- Add menu artwork, music, interface sounds, Options, and Credits.
- Save sound, drawing hand, and difficulty settings. Apply difficulty to drawing time and shape tolerance.
- Add keyboard navigation, camera cleanup when leaving Training, licenses, and settings tests.

## 2026-10-15 - `16bae6b` - Merge dummy duel with the main menu and shared difficulty settings

- Combine the dummy Duel branch with the main menu and saved difficulty settings.

## 2026-10-15 - `15195f4` - Add spell training, Protego shields, and Duel disarm effects

- Add per-spell lessons and progress in a Training tab.
- Rename Circle, V, and Z to Protego, Basic Cast, and Confringo.
- Add three-second shields and timed wand drops on Duel hits. Update guides, artwork, logs, and tests.

## 2026-10-15 - `9c06423` - Add looping battle music to Duel

- Add a 79-second loop of Kevin MacLeod's "Clash Defiant" to Duel. Keep menu music separate and Practice quiet.
- Apply music and mute settings, add game sound controls, and update credits and the audio script.

## 2026-10-15 - `18d5973` - Add a trail sound while a spell shape is drawn

- Play a generated loop during drawing in Practice and Duel. Use fingertip speed to control volume and pitch.
- Fade it out when drawing ends, tracking is lost, or effects are disabled or muted.

## 2026-10-15 - `8057f8a` - Use IENBA Magic Object Floating as the drawing sound

- Replace the generated drawing sound with IENBA's CC0 "Magic Object Floating" loop, trimmed, mixed to mono, and normalized.
- Update audio credits and asset records.

## 2026-10-15 - `be70cc3` - Integrate main menu with existing game screens

- Connect Training, Fight, and legacy Practice to their existing screens; remove nested tabs and rename Duel to Fight.
- Integrate menu audio, saved settings, and difficulty controls. Stop camera input when leaving the game screen.
- Require explicit permission for real camera or microphone use. Update docs, previews, and simulated-input tests.

## 2026-10-15 - `6d131dc` - Use Rising_Moon magic loop as the drawing sound

- Replace the IENBA loop with Rising_Moon's CC0 "magic loop". Blend its ends for smooth looping, mix to mono, and normalize its level.
- Update audio credits and asset records.

## 2026-10-15 - `30de56c` - Merge origin/main into feat/sound-effects

- Adapt audio to the separate Fight, Training, and legacy Practice screens.
- Play battle music in Fight, keep the other game screens quiet, and move the sound toggle to game navigation.

## 2026-10-15 - `d788623` - Add spell cast, damage, and victory sounds

- Play a separate sound for each accepted spell. Align Fight sounds with spell impacts and add damage sounds.
- Stop battle music on defeat, play the victory fanfare once, and resume music on reset.
- Add CC0 audio sources, generation scripts, credits, and documentation.

## 2026-10-15 - `21e8c27` - Add idle motion to the Fight and Training figures

- Make the wizard and dummy breathe, sway, and move their arms and wands between hits.
- Stop idle motion during falls, defeat, and wand drops. Disable it with reduced motion.
- Add separate artwork layers, a generation script, and browser checks.

## 2026-10-15 - `e9e9281` - Merge pull request #1 from sofia-404/feat/sound-effects

- Merge sound effects and idle animation.

## 2026-10-15 - `ea8aff2` - Remove legacy Practice and simplify game navigation

- Share camera and cast state between Fight and Training. Remove legacy Practice.
- Move hand and track-point settings to Options; remove label swapping.
- Add URL routes, reload support, and browser history. Simplify menu layout, focus states, and sound control.

## 2026-10-15 - `0aa0c6b` - Merge origin/main audio and idle motion into current game flow

- Integrate battle music, spell sounds, mute controls, and idle motion with the current navigation and input settings.
- Stop audio on camera shutdown, page exit, and hidden tabs. Accept obsolete input fields from older open tabs.
- Remove remaining references to the retired mode. Update tests, previews, asset tools, and credits.

## 2026-10-16 - `5fa5529` - Add arena event logs and Training health mechanics

- Add timestamped spell, camera, and combat events. Share damage rules and restart defeated Training dummies.
- Simplify arena layouts and camera controls; move mute to Options.
- Fix navigation focus and incomplete arena rendering on reload. Update tests and previews.

## 2026-10-16 - `bc66abd` - Fix menu text zoom and detail portrait sizing

- Adjust menu font sizes for browser zoom and portrait sizing on detail screens.

## 2026-10-16 - `c3e4352` - Add Solo Duel and expand spell training

- Add opponent attacks, shields, disarm, and player defeat.
- Teach Protego through three blocked attacks. Start lessons with the camera and clear active attempts on stop.
- Rename Fight to Practice Arena and Training to Spell Training. Update layout, navigation, audio, tests, and artwork.

## 2026-10-16 - `7485759` - Add difficulty-based duel combat and wand charge effects

- Scale opponent attack timing and reactive Protego by difficulty.
- Keep Solo Duel spell travel at 600 ms with reduced motion.
- Show wand charges in Solo Duel and Protego training. Preserve fixed training timing.

## 2026-10-16 - `64798c8` - Align Options selectors with volume controls

- Adjust Options selector widths to align with the volume controls.

## 2026-10-16 - `5bcb6e4` - Differentiate menu click and add sound volume sliders

- Give menu clicks a distinct sound. Add separate music and sound effects volume sliders with saved values.
- Update audio handling, tests, and documentation for the volume controls.

## 2026-10-16 - `c5aeebf` - Remove required browser tool from project instructions

- Remove the rule that requires a specific browser tool.

## 2026-10-16 - `c04bd92` - docs: simplify README for first-time players

- Replace the long technical README with a shorter guide to setup, first casts, modes, spells, and saved data.
- Link to product, spell, design, license, and test details.

## 2026-10-16 - `c9d04d9` - Update README.md

- Shorten the README title to "Wizard Combat".

## 2026-10-16 - `8eceb69` - Optimize Solo Duel tracking and rendering

- Track one hand in Solo Duel, including after tracker recovery.
- Update opponent charge, shield, and status displays only when needed.

## 2026-10-16 - `2396ee0` - Apply camera and opponent update optimizations to all modes

- Track one hand in all three game modes.
- Avoid repeated charge and status updates in Protego training when nothing changes.

## 2026-10-16 - `9ada087` - Add looping menu animation video

- Play a muted video loop behind the menu. Keep static artwork as a fallback and for reduced motion.
- Pause the video when the menu or page is hidden.

## 2026-10-16 - `a0fb719` - docs: explain gameplay, setup, build history, and next steps

- Expand the README with local setup, casting steps, game modes, technical details, build history, and planned online play.

## 2026-10-16 - `3b89615` - Add character and stage selection, shared combat rules, and rounds

- Add 11 character skins, nine stages, random picks, and URL-based selection state.
- Share damage, shield, disarm, recovery, and spell queue rules across modes.
- Add matches in Practice Arena and Solo Duel: two round wins decide the match.
- Add selection and combat tests, artwork, screen previews, and rule documentation.

## 2026-10-16 - `9514fee` - Merge branch 'feat/gameplay-improvements'

- Merge character selection, stage selection, shared combat rules, and rounds. Resolve the README conflict.

## 2026-10-16 - `8bb590e` - Update README.md

- Remove "prototype" from the opening game description.

## 2026-10-16 - `20c13fd` - Update README.md

- Change the title to "Wizard Combat game" and state the aim: relax after work and have fun with teammates.
