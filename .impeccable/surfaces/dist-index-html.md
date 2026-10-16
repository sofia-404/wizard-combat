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

THESIS: Open Spell Training, Practice Arena, or Solo Duel through character and stage setup, with the camera off.

OWN-WORLD: Preserve Arc & Anchor, midnight navy, teal fog, aged gold, cyan focus, local Cormorant Garamond, and Source Sans 3. Use the supplied original mage image at `dist/brand/assets/menu-wizard.webp`. Its adjacent JSON file records provenance.

STORY: Practice Arena opens the static dummy. Solo Duel opens the same arena with an opponent that attacks and casts Protego. It has separate health, timer, shields, and events. Cast warnings and both shield states use the existing arena styles. Spell Training opens its separate four-spell lessons. Each game view shows only its own screen, with no internal mode tab bar, and opens with the camera off. Options save sound, hand, and difficulty choices. Back or Escape returns to the menu and stops camera capture. Active lesson counts clear; completed lessons and learned marks remain.

FIRST VIEWPORT: Show Spell Training, Practice Arena, Solo Duel, disabled Multiplayer, Options, and Credits. Each game mode has a short description, as listed in the menu specification. Multiplayer keeps “Duel with friends online. Coming soon”. Options uses separate Music volume and Sound effects volume sliders.

Sizing and spacing follow the [main-menu specification](../../docs/design/screen-specs.md#implemented-main-menu).

FORM: Place the menu on the left and a large character on the right within full-screen artwork. Retain original artwork, identity, fonts, and controls. Use code with the supplied raster asset.

FINISH: Check capability labels, keyboard focus, camera controls, audio preferences, responsive layout, reduced motion, and asset notices for the affected controls.

## Behavior and boundaries

- Work scope follows `AGENTS.md`; screen-specific design limits are in `DESIGN.md`.
- Game views retain their developer diagnostics.
- Left hand is default. Preview stays mirrored. Spell directions remain screen-coordinate directions for either hand.
- Options persist volume, drawing hand, track point, and difficulty when browser storage is available. See [Options and sound](../../docs/design/screen-specs.md#options-and-sound) for recognition limits and defaults.
- Menu music is “Night Vigil” by Kevin MacLeod, CC BY 4.0, edited for length and looping. The two original menu effects use CC0. Keep Credits and `licenses/audio/` notices intact.
- Music starts after user input. Menu screens use menu music; all three game modes use battle music. Hidden pages pause audio. Essential feedback must work without sound.
- Practice Arena keeps a static dummy. Solo Duel adds opponent attacks and shields. Preserve the [shared combat and round rules](../../docs/combat.md).
- Camera frames and video are not saved. Practice Arena and Solo Duel records include results, timing, settings, and captured path drawings. Spell Training saves scalar results and lesson controls without path cards. Records go to the serving server; see [saved data](../../README.md#camera-and-saved-data).

## Responsive and motion rules

Desktop reference is 1920x1080. Keep the right-side mage dominant without reducing text readability. At narrow widths, dim the artwork behind a full-width menu; use a dark reading field for detail views. Keep native selects and labeled sliders usable. Honor reduced motion by removing scene drift, view entrance, and hover travel. Physical mobile camera play is not validated.

Menu, Character, and Location share the [setup sizing rules](../../docs/design/screen-specs.md#shared-setup-sizing). Other screens keep their existing sizing.

## Character and stage selection

All three game entries use Character -> Stage -> Game. Solo Duel lets the player edit both skins; Training and Practice keep the dummy. Skins and stages change appearance only. Keep the existing art, fonts, colors, and keyboard controls.

The [character specification](../../docs/design/screen-specs.md#implemented-character-selection) and [stage specification](../../docs/design/screen-specs.md#implemented-stage-selection) define layout, Random, loading, cancellation, and URL behavior.

## Shared arena rounds

Practice Arena and Solo Duel share the round display, with separate match state. Spell Training keeps its own lessons. See the [round display specification](../../docs/design/screen-specs.md#shared-round-display-implemented) for layout and the [combat reference](../../docs/combat.md#rounds-in-practice-arena-and-solo-duel) for timing and resets.
