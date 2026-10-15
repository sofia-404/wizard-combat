# Adopt the brandbook without changing recognition behavior.

This branch adds a design reference and reusable assets. It leaves the current gameplay page and recognizer behavior intact. The future migration should be a separate implementation change.

## Adoption order

1. Read `PRODUCT.md`, `DESIGN.md`, and `screen-specs.md`. Keep existing input and lesson behavior as the baseline.
2. Import the token stylesheet into the new player surface. Use its local fonts and `--wc-*` custom properties; do not duplicate hex values throughout components.
3. Build a shared button, field, status, and gesture-guide layer with keyboard and reduced-motion support.
4. Recompose training around the current camera, lesson, and dummy state. Preserve existing IDs or update their JavaScript bindings deliberately.
5. Put technical settings and event logs behind an explicit diagnostics view. Keep them available for trials.
6. Add a main-menu route only when its actions lead to working screens.
7. Define fight mechanics before implementing the fight concept. Treat mockup numbers and states as illustrative.

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
| Right-then-down spell direction | `dist/expelliarmus.js` |
| Three-cast progress and completion actions | `dist/lesson.js` |
| Two-second wand return | `dist/dummy.js` |
| Captured path drawing and recording limits | `dist/result-card.js` |

## Verification before migration ships

- Run `npm test` for existing rules. Run the current browser training check after adapting selectors deliberately.
- Inspect at 1920×1080 and a narrow viewport. Check 200% zoom and keyboard focus.
- Check camera off, starting, blocked, absent hand, ready, drawing, accepted, rejected, lost tracking, and 3/3 completion.
- Check both hands and both control points. The displayed Expelliarmus guide stays right then down.
- Verify that stopping the camera preserves lesson count and that the wand still returns.
- Confirm that local-processing and recording copy remains accurate.
- Run a physical trial. Simulated input cannot prove that a person can comfortably see and use the new layout.

## Asset and documentation maintenance

`DESIGN.md` owns the normative visual rules. `dist/brand/tokens.css` is their reusable CSS form. `.impeccable/design.json` adds preview snippets and metadata without redefining primitives. Update all three together when the system changes. Keep font licenses with the local files and preserve their recorded sources.
