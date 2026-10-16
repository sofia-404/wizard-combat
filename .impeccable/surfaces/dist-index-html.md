---
version: 1
slug: "dist-index-html"
primary_target: "dist/index.html"
related_targets: ["dist/menu.css", "dist/shell.js", "dist/settings.js", "dist/menu-audio.js"]
---

# The menu opens Spell Training without starting the camera.

Target: the root game shell in `dist/index.html`. Mode: Experience for the main menu and its character scene; Operate for Options and navigation. Credits is a short reading view. The existing game views remain separate implemented surfaces within this shell.

Menu details: [screen specifications](../../docs/design/screen-specs.md#implemented-main-menu).

## Direction contract

THESIS: Provide direct access to Spell Training and Practice Arena within the established fantasy design.

OWN-WORLD: Preserve Arc & Anchor, midnight navy, teal fog, aged gold, cyan focus, local Cormorant Garamond, and Source Sans 3. Use the supplied original mage image at `dist/brand/assets/menu-wizard.webp`. Its adjacent JSON file records provenance.

STORY: Practice Arena opens the static dummy. Solo Duel opens the same arena with an opponent that attacks and casts Protego. It has separate health, timer, shields, and events. Cast warnings and both shield states use the existing arena styles. Spell Training opens its separate four-spell lessons. Each game view shows only its own screen, with no internal mode tab bar, and opens with the camera off. Options save sound, hand, and difficulty choices. Back or Escape returns to the menu and stops camera capture without resetting the lesson.

FIRST VIEWPORT: Show Spell Training, Practice Arena, Solo Duel, disabled Multiplayer, Options, and Credits. Each game mode has a short description, as listed in the menu specification. Multiplayer keeps “Duel with friends online. Coming soon” Use the menu specification above. Options uses separate Music and Sound effects switches.

Options and Credits form a stacked group at the bottom-left of the main menu. Keep the existing item sizes and spacing. Leave at least 48px between the modes and this group. On short screens, the menu grows and the page scrolls; the group never overlaps the modes.

FORM: Place the menu on the left and a large character on the right within full-screen artwork. Retain original artwork, identity, fonts, and controls. Use code with the supplied raster asset.

FINISH: Check capability labels, keyboard focus, camera controls, audio preferences, responsive layout, reduced motion, and asset notices for the affected controls.

## Behavior and boundaries

- Work scope follows `AGENTS.md`; screen-specific design limits are in `DESIGN.md`.
- Game views retain their developer diagnostics.
- Left hand is default. Preview stays mirrored. Spell directions remain screen-coordinate directions for either hand.
- Options persist music, effects, hand, and difficulty when browser storage is available. Normal keeps the original recognition behavior. README.md documents the exact tolerance and timeout changes.
- Menu music is “Night Vigil” by Kevin MacLeod, CC BY 4.0, edited for length and looping. The two original menu effects use CC0. Keep Credits and `licenses/audio/` notices intact.
- Music starts after user input and pauses in all game modes or when the page is hidden. Essential feedback must work without sound.
- Practice Arena keeps its current static-dummy health, damage, reactions, defeat, and reset. Opponent attacks and full combat remain undecided.
- Camera frames and video are not saved. Practice Arena records include results, timing, settings, and captured path drawings. Spell Training saves scalar results and lesson controls without path cards.

## Responsive and motion rules

Desktop reference is 1920x1080. Keep the right-side mage dominant without reducing text readability. At narrow widths, dim the artwork behind a full-width menu; use a dark reading field for detail views. Keep native selects and labeled switches usable. Honor reduced motion by removing scene drift, view entrance, and hover travel. Physical mobile camera play is not validated.
