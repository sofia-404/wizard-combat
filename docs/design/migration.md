# Adopt the brandbook without changing recognition behavior.

The brandbook supplies a design reference and reusable assets. Legacy Practice and the static-dummy Fight are implemented with their own styles. Their design migration remains a separate implementation change; preserve current recognition and game rules.

## Adoption order

1. Read `PRODUCT.md`, `DESIGN.md`, and `screen-specs.md`. Keep existing input and lesson behavior as the baseline.
2. Import the token stylesheet into the new player surface. Use its local fonts and `--wc-*` custom properties; do not duplicate hex values throughout components.
3. Build a shared button, field, status, and gesture-guide layer with keyboard and reduced-motion support.
4. Recompose training around the current camera, lesson, and dummy state. Preserve existing IDs or update their JavaScript bindings deliberately.
5. Put technical settings and event logs behind an explicit diagnostics view. Keep them available for trials.
6. Add a main-menu route only when its actions lead to working screens.
7. Preserve the implemented dummy Fight rules. Define opponent attacks and other full-fight mechanics separately before extending the fight concept. Treat mockup numbers and states as illustrative.

## Current migration gaps

Fight currently uses separate colors, small utility text, and controls below the target sizes. Align fonts, tokens, text, and controls in the design migration; do not change them as part of a merge.

The token sheet defines global aliases such as `--line` and `--muted`, which legacy Practice also uses. It also sets the root color scheme. The component sheet includes global focus and reduced-motion rules. Scope these rules before adopting them in one view, then check both views for unintended changes.

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
<button class="arc-button">Start lesson</button>
<button class="arc-button secondary">Stop lesson</button>
<label class="arc-field">
  <span>Drawing hand</span>
  <select class="arc-input"><option>Left hand</option><option>Right hand</option></select>
</label>
<p class="arc-alert error" role="alert">Hand lost. Bring it back into view.</p>
```

## Preserve during implementation

| Behavior | Source |
| --- | --- |
| Camera lifecycle, mirrored preview, local records | `dist/app.js` |
| Hand selection and short label changes | `dist/hand-input.js` |
| Start, end, timeout, and loss rules | `dist/gesture.js` |
| Right-then-down spell direction | `dist/gestures/ordered-corner.js` |
| Spell definitions, damage, and colors | `dist/spells/`, `dist/combat/cast.js` |
| Three-cast progress and completion actions | `dist/training/lesson.js` |
| Two-second legacy Practice wand return | `dist/combat/training-dummy.js` |
| Shared camera view, Fight health, and effects | `dist/fight.js`, `dist/fight-health.js`, `dist/fight-effects.js` |
| Captured path drawing and recording limits | `dist/result-card.js` |

## Verification before migration ships

- Run `npm test`, `npm run test:legacy-practice`, and `npm run test:fight`. Adapt selectors deliberately if the layout changes.
- Check shared camera controls, tab changes, damage at impact, cancelled flights, defeat, reset, and separate legacy Practice/Fight health state.
- Inspect at 1920×1080 and a narrow viewport. Check 200% zoom and keyboard focus.
- Check camera off, starting, blocked, absent hand, ready, drawing, accepted, rejected, lost tracking, and 3/3 completion.
- Check both hands and both control points. The displayed Expelliarmus guide stays right then down.
- Verify that stopping the camera preserves lesson count and that the wand still returns.
- Confirm that local-processing and recording copy remains accurate.
- Run a physical trial. Simulated input cannot prove that a person can comfortably see and use the new layout.

## Asset and documentation maintenance

`DESIGN.md` owns the normative visual rules. `dist/brand/tokens.css` is their reusable CSS form. `.impeccable/design.json` adds preview snippets and metadata without redefining primitives. Update all three together when the system changes. Keep font licenses with the local files and preserve their recorded sources.
