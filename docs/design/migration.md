# Future plan: adopt the brandbook without changing game rules.

Scope: requested migrations under `DESIGN.md`.

The brandbook supplies a design reference and reusable assets. Spell Training, Practice Arena, and Solo Duel use their existing gameplay styles. Preserve current recognition and game rules during any requested migration. The main menu, Options, and Credits already use the brandbook system; their implementation is not pending work.

## Adoption order

1. Read `PRODUCT.md`, `DESIGN.md`, and `screen-specs.md`. Keep existing input and lesson behavior as the baseline.
2. Import the token stylesheet into the new player surface. Use its local fonts and `--wc-*` custom properties; do not duplicate hex values throughout components.
3. Build a shared button, field, status, and gesture-guide layer with keyboard and reduced-motion support.
4. Recompose spell training around the current camera, lesson, and dummy state. Preserve existing IDs or update their JavaScript bindings deliberately.
5. Put technical settings and event logs behind an explicit diagnostics view. Keep them available for trials.
6. Preserve the implemented main-menu routes. Add a route only when the requested work needs it and its action leads to a working screen.
7. Preserve the [implemented combat rules](../combat.md), including Solo Duel attacks, shields, and arena rounds. Mockup numbers and states do not change those rules.

## Current migration gaps

The gameplay screens do not yet meet all target font, text-size, control-size, and token rules. `DESIGN.md` defines when those targets apply.

The token sheet defines global aliases such as `--line` and `--muted`, which gameplay base styles also use. It also sets the root color scheme. The component sheet includes global focus and reduced-motion rules. Scope these rules before adopting them in one view, then check all affected views for unintended changes. See the style ownership table in `screen-specs.md`.

## Import

```html
<link rel="stylesheet" href="/brand/tokens.css">
<link rel="stylesheet" href="/brand/components.css">
```

```css
.player-surface {
  background: var(--wc-ink);
  color: var(--wc-text);
  font-family: "Source Sans 3", "Segoe UI", sans-serif;
}
.player-title {
  font-family: "Cormorant Garamond", Georgia, serif;
}
```

The preview stylesheet `brandbook.css` belongs to the brandbook. Import the tokens and reusable `components.css`, not the full preview layout, into gameplay. Existing reusable classes are `.arc-button`, `.arc-button.secondary`, `.arc-field`, `.arc-input`, `.arc-alert.error`, `.arc-alert.success`, `.arc-badge.ready`, `.arc-badge.error`, and `.arc-switch`.

SVG assets live in `dist/brand/assets/`: `emblem.svg`, `mark.svg` (the mark alias), `gesture-expelliarmus.svg`, and `cursor.svg`. The wordmark is live text, not a separate SVG. Keep the native browser cursor for normal controls; the optional cursor asset is for a specific in-scene pointer only. SVG assets can have accessible names when meaningful or empty alternative text when decorative.

```html
<button class="arc-button">Start camera</button>
<button class="arc-button secondary">Back to menu</button>
<label class="arc-field">
  <span>Drawing hand</span>
  <select class="arc-input"><option>Left hand</option><option>Right hand</option></select>
</label>
<p class="arc-alert error" role="alert">Hand lost. Bring it back into view.</p>
```

## Preserve during implementation

| Behavior | Source |
| --- | --- |
| Camera lifecycle, mirrored preview, server records | `dist/app.js` |
| Hand selection and short label changes | `dist/hand-input.js` |
| Start, end, timeout, and loss rules | `dist/gesture.js` |
| Right-then-down spell direction | `dist/gestures/ordered-corner.js` |
| Spell definitions, damage, and colors | `dist/spells/`, `dist/combat/cast.js` |
| Cast/block counts and camera-stop behavior | `dist/spell-training/lesson.js`, `dist/spell-training/session.js` |
| Disarm and wand return | `dist/combat/solo-duel.js`, `dist/practice-arena-disarm.js` |
| Shared arena, health, effects, and rounds | `dist/arena-view.js`, `dist/practice-arena-health.js`, `dist/practice-arena-effects.js`, `dist/combat/rounds.js` |
| Captured path drawing and recording limits | `dist/result-card.js` |

## Verification before migration ships

- Run `npm test`, `npm run test:practice-arena`, `npm run test:spell-training`, `npm run test:input`, `npm run test:navigation`, `npm run test:solo-duel`, `npm run test:protego-training`, and `npm run test:rounds` for a migration that affects all game views. Adapt selectors deliberately if the layout changes.
- Check shared camera controls, mode changes, damage at impact, cancelled flights, defeat, reset, separate Practice Arena and Spell Training state, and Spell Training's per-spell lesson progress.
- Inspect at 1920×1080 and a narrow viewport. Check 200% zoom and keyboard focus.
- Check camera off, starting, blocked, absent hand, ready, drawing, accepted, rejected, lost tracking, and 3/3 completion.
- Check both hands and both control points. The displayed Expelliarmus guide stays right then down.
- Verify that camera stops clear active lesson counts and keep completed lessons and learned marks. Check that the wand still returns.
- Confirm that local-processing and recording copy remains accurate.
- Run a physical trial only with explicit permission for real camera access. Simulated input cannot prove that a person can comfortably see and use the new layout.

## Asset and documentation maintenance

`DESIGN.md` defines the visual rules and their scope. `dist/brand/tokens.css` is their reusable CSS form. `.impeccable/design.json` adds preview snippets and metadata without redefining primitives. Keep these files in agreement when a requested system change affects them. A prose correction does not require changes to CSS or token values. Keep font licenses with the local files and preserve their recorded sources.
