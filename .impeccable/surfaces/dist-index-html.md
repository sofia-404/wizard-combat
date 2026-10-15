---
version: 1
slug: "dist-index-html"
primary_target: "dist/index.html"
related_targets: ["dist/menu.css", "dist/shell.js", "dist/settings.js", "dist/menu-audio.js"]
---

# The menu opens Training without starting the camera.

Target: the root game shell in `dist/index.html`. Mode: Experience for the main menu and its character scene; Operate for Options and navigation. Credits is a short reading view. The existing game views remain separate implemented surfaces within this shell.

## Direction contract

THESIS: Make the first screen feel like entering a restrained fantasy game, then give the player a direct path into Training.

OWN-WORLD: Preserve Arc & Anchor, midnight navy, teal fog, aged gold, cyan focus, local Cormorant Garamond, and Source Sans 3. Use the supplied original mage image at `dist/brand/assets/menu-wizard.webp`. Its adjacent JSON file records provenance.

STORY: Choose Fight, Training, [OLD] Practice, Options, or Credits. Fight opens the static dummy. Training opens its separate four-spell lessons. [OLD] Practice opens the original practice view. Each shows only its own screen, with no internal mode tab bar, and opens with the camera off. Options save sound, hand, and difficulty choices. Back or Escape returns to the menu and stops camera capture without resetting the lesson.

FIRST VIEWPORT: A full-viewport scene holds the original mage on the right and the title and five menu choices on the left. Keep the requested order: Fight, Training, [OLD] Practice, Options, Credits. A separate master sound control stays easy to reach.

FORM: The user pinned a Mortal Kombat-style left menu and full-screen right character composition. This is a composition reference only; retain original artwork, identity, fonts, and controls. The work is code-led with a supplied raster asset. No new global palette or design-system direction is introduced.

FINISH: Preserve truthful capability labels, working keyboard focus, camera boundaries, audio preferences, readable responsive views, reduced motion, and asset notices. Parent review owns final visual and functional acceptance.

## Behavior and boundaries

- The game views keep their existing interfaces and current developer diagnostics. Do not silently restyle `dist/style.css` to match the menu.
- Left hand is default. Preview stays mirrored. Spell directions remain screen-coordinate directions for either hand.
- Options persist music, effects, master mute, hand, and difficulty when browser storage is available. Normal keeps the original recognition behavior. README.md documents the exact tolerance and timeout changes.
- Menu music is “Night Vigil” by Kevin MacLeod, CC BY 4.0, edited for length and looping. The two original menu effects use CC0. Keep Credits and `licenses/audio/` notices intact.
- Music starts after user input and pauses in all game modes or when the page is hidden. Essential feedback must work without sound.
- Fight keeps its current static-dummy health, damage, reactions, defeat, and reset. Opponent attacks and full combat remain undecided.
- Camera frames and video are not saved. Legacy Practice and Fight records include results, timing, settings, and captured path drawings. Training saves scalar results and lesson controls without path cards.

## Responsive and motion rules

Desktop reference is 1920x1080. Keep the right-side mage dominant without reducing text readability. At narrow widths, dim the artwork behind a full-width menu; use a dark reading field for detail views. Keep native selects and labeled switches usable. Honor reduced motion by removing scene drift, view entrance, and hover travel. Physical mobile camera play is not validated.

## Completion evidence

The original menu task reported 28 passing tests and a passing simulated-input browser regression. These results predate this merge. The merged routes and names need current verification. Simulated input does not replace a physical player trial.
