# Historical brandbook checks

Checked on 2026-10-15 using Chromium through `playwright-cli`.

This record contains past results. It does not verify the current files.

| Check | Revision or base | Recorded result |
| --- | --- | --- |
| Brandbook browser checks | `5015c9d` | Results below. |
| Node.js tests on Node.js 24.11.0 | Base: `e5d7bb5` | All 24 tests passed, including 137 gesture cases and consecutive-cast checks. |
| `node --check dist/brand/brandbook.js` | Base: `e5d7bb5` | Passed. |
| Gameplay source comparison | Base: `e5d7bb5` | No changes to gameplay JavaScript, HTML, or CSS in the brandbook changes. |

## Browser checks

- Desktop: 1920×1080. Narrow layout: 390×844. No horizontal overflow in any of the three screen studies.
- Local Cyrillic/Latin fonts load successfully. SVG assets load locally.
- Menu, training, and fight tabs work with pointer and arrow keys.
- Training simulation reaches 3/3, disables the completed action, and resets to 0/3.
- Fight response toggles and resets. This is a visual simulation, not a combat engine.
- Example error clears after text input. The sound switch and action examples update their feedback.
- Color copying returns the displayed HEX value when clipboard permission is available; the UI provides the value when copying fails.
- Internal section links resolve. Reduced-motion mode preserves visible content and state changes.
- Final reload reports no JavaScript page errors.

## Contrast

Normal text colors meet 4.5:1 on the four dark surfaces. The lowest approved normal-text pair is gold on raised teal, about 4.62:1. Essential input and unchecked-switch edges use muted text color rather than the lower-contrast decorative rule color.

## Preview provenance

The [preview guide](previews/README.md) lists the saved images, their source, and their capture steps. Files with the `brandbook-` prefix show illustrative concepts. Training and Fight images show implemented screens with camera access blocked. These images are maintained separately from the historical results above.

## English text checks

The English version was checked at 1920×1080 and 390×844. Preview images contain English text. The checks covered page errors, horizontal overflow, keyboard tabs, gesture completion and reset, duel feedback, and form-error recovery. No page errors or horizontal overflow were found. The interaction checks passed. A scan of tracked text files found no Cyrillic text. The revision for these checks was not recorded.

These checks do not validate physical camera play, a complete fight mode, or a migration of the existing gameplay page.
