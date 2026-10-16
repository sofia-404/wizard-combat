---
name: Wizard Combat
description: Restrained dark fantasy expressed through deliberate movement.
colors:
  ink: "#081821"
  deep: "#0D222D"
  surface: "#12313B"
  surface-raised: "#1A414A"
  line: "#49656A"
  gold: "#C4A363"
  gold-bright: "#E5C98C"
  cyan: "#82E7EC"
  text: "#F1E8D5"
  muted: "#AAC0C1"
  danger: "#EF9B8D"
  success: "#A8D5B5"
  gold-pressed: "#AC884E"
  danger-line: "#93645F"
  success-line: "#60806B"
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(3.8rem, 7vw, 6rem)"
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(2.2rem, 3vw, 3.25rem)"
    fontWeight: 500
    lineHeight: 1.04
  body:
    fontFamily: "Source Sans 3, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Source Sans 3, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  control: "2px"
  panel: "8px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "32px"
  xl: "48px"
  section: "96px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "13px 26px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.gold-bright}"
    textColor: "{colors.ink}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "13px 26px"
    height: "48px"
  input:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "13px 16px"
    height: "48px"
---

# Wizard Combat makes movement the visual identity.

## Overview

**Creative North Star: "Arc & Anchor"**

Wizard Combat uses the precision of movement notation inside a quiet, mature dark-fantasy world. The anchor marks intent, the trace records movement, and the terminal diamond marks completion. These shapes teach the same action that drives the game.

Navy and teal hold the scene. Aged gold organizes it. Cyan appears when magic or input becomes active. Cormorant Garamond gives titles an engraved character; Source Sans 3 keeps instructions direct. The brandbook, main menu, Options, and Credits use this system. Spell Training, Practice Arena, and Solo Duel use separate gameplay styles.

Follow the task scope in `AGENTS.md`. Apply target values only within requested visual work. A local visual change does not require a full migration.

| Screen or work | Scope |
| --- | --- |
| Main menu, Options, Credits | Preserve the existing design outside the requested change. |
| Spell Training, Practice Arena, and Solo Duel | Preserve the existing gameplay styles outside the requested change. |
| Brandbook | Keep it as a design reference and simulation. Its screen studies do not replace the game screens. |
| Future migration | Start only on user request. Apply target rules only to the named screens. |

**Key Characteristics:**

- Deliberate strokes and open space.
- Warm metal against a cool, dark field.
- Clear instruction beside expressive titles.
- One active gesture at a time.

## Colors

Use the frontmatter values and the matching `--wc-*` properties in `dist/brand/tokens.css`.

| Token | Role |
| --- | --- |
| ink | Main background and text on filled gold buttons |
| deep | Inset fields, camera-off state, quiet navigation |
| surface | Instruction and result surfaces |
| surface-raised | Selected surfaces and lifted utility content |
| line | Structural rules; not normal text |
| gold | Primary action, navigation selection, permanent diagram |
| gold-bright | Primary hover and small title accents |
| cyan | Live trace, focus, ready marker, active magical response |
| text | Primary reading text |
| muted | Secondary reading text |
| danger | Error text and failed input marker |
| success | Completed lesson and accepted result marker |
| gold-pressed | Pressed primary control |
| danger-line | Error surface edge, paired with readable error text |
| success-line | Completed surface edge, paired with readable status text |

**The Signal Rule.** Reserve cyan for active input, focus, and magic. A static instructional start point may use cyan to identify where active input begins. Do not fill every panel with glow.

**The Contrast Rule.** Use text, muted, gold, cyan, danger, and success on the dark surfaces. Filled gold controls use ink text. Do not assume a decorative line color is suitable for a control boundary; use gold or muted for an essential boundary. Status always has text or shape as well as color.

## Typography

Use English for all interface copy, accessible labels, examples, and design documentation. Keep spell names unchanged.

Use local Cormorant Garamond for display and section titles. Use local Source Sans 3 for body copy, controls, counters, and instructions. Font files and licenses live in `dist/brand/fonts/` and `licenses/fonts/`.

Display may be large and tightly led. Body text stays at 18px in the brandbook; utility text stays at least 14px. Readable prose should remain around 60–70 characters per line. Player instructions use sentence case and short verbs: “Hold still,” “Move right, then down,” “Pause to cast.” Reserve spaced uppercase for short labels.

Use tabular numerals for timers and counters. Do not set long instructions or controls in the display face. Do not replace clear text with fictional runes.

## Layout

Use an 8px spacing rhythm with 16, 24, 32, 48, 64, and 96px steps. Compact 4px and 12px steps support related icon/label gaps. Brandbook sections share a wide reading grid and a clear heading/content division. Screen previews use wide landscape composition; inspect desktop at 1920×1080.

Spell Training and practice arena layouts prioritize the active scene. Keep key status near the play field. Setup choices and diagnostics belong in a separate region. On narrow screens, stack content in reading order, wrap navigation, and preserve control size. A scaled screen illustration is a reference, not proof that a full mobile game exists.

Primary actions have a minimum 48px target; compact secondary controls have at least 44px targets. At 200% zoom, text and controls remain usable without overlapping. Do not clip instructions to preserve a decorative frame.

## Elevation & Depth

Use tonal layers and fine rules before shadows. Teal haze belongs behind the scene and never behind dense reading text at full strength. Gold edges are restrained, not embossed chrome. Glows are local feedback around the active trace or impact. Avoid full-panel glass blur and continuous particle storms.

The base interactive transition is 180ms with `cubic-bezier(0.16, 1, 0.3, 1)`. The brandbook cast simulation may resolve in 320ms. Game flight timing follows [combat rules](docs/combat.md#shared-combat-rules). Reduced-motion mode removes travel, shimmer, and repeated motion while preserving the state change. Do not convey readiness by animation alone or introduce flashing effects.

## Shapes

Controls use 2px corners. Utility panels may use 8px corners as a future recipe; there is no shared panel component yet. The 38×22px switch track uses a 15px radius to express its familiar on/off behavior. Circular markers and loading indicators are also intentional exceptions. Essential outlines are clear and complete; ornamental rules may be fine and interrupted. Avoid oversized rounded pills for ordinary buttons.

The original mark combines an open measured arc with an anchored movement stroke. Keep its aspect ratio, a clear space of one start-dot diameter around it, and a minimum screen size of 24px. Use the simplified mark at small sizes. Gold, cyan, or single-color ivory versions are permitted. Do not recolor individual fragments for decoration.

The gesture diagram uses a dot for start, an ordered path, directional arrows, and a terminal diamond. Decorative identity marks are never presented as accepted gameplay gestures. Spell guides must match the recognizer's screen-coordinate rules exactly.

## Components

### Buttons and fields

Gold fill identifies the primary action. Secondary actions use a transparent fill and a visible edge. Text-only actions remain readable. Hover brightens the existing material; active state is a subtle press. Keyboard focus uses a 2px cyan outline with a 5px offset. Disabled controls use `disabled` semantics and a readable explanation nearby when useful.

Fields have visible labels. A placeholder cannot replace the label. Errors explain the action needed: “Camera access is blocked. Allow access in your browser, then retry.”

### Navigation

Main-menu options are a vertical list, with one dominant next action. The current choice uses a gold edge or marker plus clear text. Documentation navigation uses real anchors. Demo tabs support keyboard access and expose the selected state to assistive technology.

### Panels and status

Group information because it belongs together, not to create a grid of cards. Keep the current instruction, progress, and live state separate from long explanations. A status marker includes a label; a live region announces meaningful changes without reading every tracking frame.

### Gesture guide

Show start, direction, end, and one short instruction. For Expelliarmus, move right then down for both hands. Gold is the stable reference. Cyan is the live path. Feedback must not cover the path, hand, or target. The three-cast lesson uses three discrete steps plus a numeric count; no invented accuracy percentage.

### Combat HUD

Keep the center free for the target and cast. Put current spell and casting state at the perimeter. The static-dummy Practice Arena already implements target health, damage at impact, defeat, and reset; preserve those rules during visual migration. Solo Duel already implements opponent attacks, player damage, cooldowns, and match results. Preserve the [shared combat rules](docs/combat.md). Brandbook examples remain proposed designs, not playable combat.

## Do's and Don'ts

### Do

- Do keep active input easy to see against the scene.
- Do use readable sans-serif instructions and serif titles.
- Do preserve current spell directions and three-cast lesson behavior.
- Do show errors with a specific next action.
- Do label simulated previews and unimplemented features.

### Don't

- For new original-scene concepts, avoid third-party crests, faction symbols, castle silhouettes, typography, maps, and interface layouts. The shipped character and stage sets include Harry Potter themes; this rule does not authorize replacing them. See [asset scope](docs/design/asset-prompts.md).
- Don't use cartoon characters, toy-like controls, or ornamental clutter.
- Don't make cyan decoration compete with the live gesture.
- Don't hide tracking loss behind a spell-failure message.
- Don't imply that the design preview enables new gameplay.
