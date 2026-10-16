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

Options and Credits form a stacked group at the bottom-left of the main menu. Leave at least 48px between the modes and this group. Above 600px wide, menu text, controls, and top spacing use the shared setup height limits. Mode controls stay at least 56px high; utility controls stay at least 52px high. Narrow screens retain their existing sizes. When content cannot fit, the page scrolls without overlap.

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

Menu, Character, and Location use one shared width and height sizing rule. Reserve text and controls first; limit artwork to the space left. Narrow layouts scroll vertically. See the shared setup sizing section in the screen specifications. Other screens retain their sizing.

## Shared stage selection

Mode: Operate. Each menu game entry opens one shared selector before its game screen. Use `dist/stage-select.js`, `dist/stage-select.css`, and the registry in `dist/stages.js`.

Keep the approved large stage preview and two wizard portraits. Use the existing fonts and colors. Place Start Game above two desktop rows of five tiles. Random is third. Use two columns on narrow screens. A stage click updates the preview without a text message. Start Game or a double-click loads that stage. Random picks once, highlights and previews the chosen stage for one second, then starts. Start Game with an empty choice uses the same random flow. Keep the resolved stage in the URL for reload and history. Stage changes affect scenery only. See the implemented stage selection section in the screen specifications for loading and focus behavior.


## Character selection

Implemented setup flow: Solo Duel -> Edit P1/P2 skins -> Stage -> Start Game. Training and Practice show only P1. New entries choose random starting skins; reload restores the URL choices. The character screen has 11 portraits plus Random. A four-column roster sits between large fighter previews on desktop. Narrow screens put the previews above a three-column roster. The heading is SELECT A CHARACTER for both roles. P1 You and P2 Computer are 52px role buttons with larger text and a gold active state. Role buttons align with Choose location on desktop. No outfit text appears below either portrait. Either role can be edited at any time before Choose location. Names sit around VS below the roster. There is no Next button, step count, or visible status below the action. Selection uses gold plus P1 and P2 markers; focus uses cyan. Hover uses the same gold inner border and name strip as location tiles. Keep the existing palette and fonts. The stage screen shows the chosen portraits. Setup has Back to menu, with no return from stage selection to character selection. Escape exits to the menu. Random immediately reveals and saves its result. Random picks exclude the other role’s current skin. Fresh Solo Duel entries start with two different skins. A later manual pick can match either skin; saved matching choices stay unchanged on reload. The selected full-body art appears in battle through the existing actor groups. Separate wand layers retain disarm and cast cues. Training and Practice keep the dummy. See the screen specifications for loading, history, and cancellation behavior.

## Shared arena rounds

Practice Arena and Solo Duel use one round controller and one announcement view, with separate match state. Start camera, wait for camera readiness, show Round 1 for 1.5 seconds and Fight for 0.5 seconds, then start the timer and combat. Two round wins end the match. Reset fighters between rounds; keep the stage and character. The existing result window and Restart appear at match completion. Two win markers sit below each health value. Show the existing timer in these two modes only. The centered gold announcement uses the existing arena font and no motion. Spell Training is unchanged. See README.md and the shared round display screen specification for pause, reset, and timing rules.
