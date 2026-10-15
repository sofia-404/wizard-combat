---
version: 1
slug: "dist-index-html"
primary_target: "dist/index.html"
related_targets: ["dist/menu.css", "dist/shell.js", "dist/settings.js", "dist/menu-audio.js"]
---

# The menu opens Training without starting the camera.

Target: the root game shell in `dist/index.html`. Mode: Experience for the main menu and its character scene; Operate for Options and navigation. Credits is a short reading view. The existing light Training interface remains a separate implemented surface within this shell.

## Direction contract

THESIS: Make the first screen feel like entering a restrained fantasy game, then give the player a direct path into Training.

OWN-WORLD: Preserve Arc & Anchor, midnight navy, teal fog, aged gold, cyan focus, local Cormorant Garamond, and Source Sans 3. Use the supplied original mage image at `dist/brand/assets/menu-wizard.webp`. Its adjacent JSON file records provenance.

STORY: Choose Fight, Training, Options, or Credits. Fight honestly says Coming soon. Training opens with the camera off. Options save sound, hand, and difficulty choices. Back or Escape returns to the menu and stops camera capture without resetting the lesson.

FIRST VIEWPORT: A full-viewport scene holds the original mage on the right and the title and four menu choices on the left. Keep the requested order: Fight, Training, Options, Credits. A separate master sound control stays easy to reach.

FORM: The user pinned a Mortal Kombat-style left menu and full-screen right character composition. This is a composition reference only; retain original artwork, identity, fonts, and controls. The work is code-led with a supplied raster asset. No new global palette or design-system direction is introduced.

FINISH: Preserve truthful capability labels, working keyboard focus, camera boundaries, audio preferences, readable responsive views, reduced motion, and asset notices. Parent review owns final visual and functional acceptance.

## Behavior and boundaries

- Training keeps its light interface and current developer diagnostics. Do not silently restyle `dist/style.css` to match the menu.
- Left hand is default. Preview stays mirrored. Spell directions remain screen-coordinate directions for either hand.
- Options persist music, effects, master mute, hand, and difficulty when browser storage is available. Normal keeps the original recognition behavior. README.md documents the exact tolerance and timeout changes.
- Menu music is “Night Vigil” by Kevin MacLeod, CC BY 4.0, edited for length and looping. The two original menu effects use CC0. Keep Credits and `licenses/audio/` notices intact.
- Music starts after user input and pauses in Training or when the page is hidden. Essential feedback must work without sound.
- Fight with dummy is Coming soon. Do not add combat rules, health, accuracy, progression, or performance claims.
- Camera frames and video are not saved. Local training records include results, timing, settings, and captured path drawings.

## Responsive and motion rules

Desktop reference is 1920x1080. Keep the right-side mage dominant without reducing text readability. At narrow widths, dim the artwork behind a full-width menu; use a dark reading field for detail views. Keep native selects and labeled switches usable. Honor reduced motion by removing scene drift, view entrance, and hover travel. Physical mobile camera play is not validated.

## Completion evidence

The parent task reports 28 passing tests and a passing simulated-input browser regression before final review. Documentation was checked against the implemented shell, audio, settings, and recognition code. Final review remains with the parent task. Simulated input does not replace a physical player trial.
