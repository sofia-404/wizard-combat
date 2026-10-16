# Saved previews

These images are visual references. They are not automated pixel tests or proof of physical camera play. The source code defines the current screen.

Keep one desktop/narrow pair for the shared Training layout. Keep a guide crop for each spell at both widths. Do not save a full Training page for every spell. Keep brandbook concepts separate from implemented screens.

| Set | Files | Capture and state |
| --- | --- | --- |
| Implemented Training layout | [Desktop](training-layout-desktop.png), [narrow](training-layout-mobile.png) | Full page. Player health at 200/200 and dummy health at 110/200. Expelliarmus complete at 3/3; 1 of 4 spells learned. Three simulated lesson events in Recent Events. Wait for the wand to return, then select Protego and Expelliarmus to clear transient effects. |
| Training automatic restart | [Desktop](training-defeat-desktop.png), [narrow](training-defeat-mobile.png) | Full page during the two-second restart delay. Fallen dummy at 0/200, player at 175/200. Basic Cast complete at 3/3; two spells learned. Simulated casts with camera access blocked. |
| Basic Cast guide | [Desktop](training-basic-cast-desktop.png), [narrow](training-basic-cast-mobile.png) | Crop of `#trainingGuide` after selecting Basic Cast. |
| Protego guide | [Desktop](training-protego-desktop.png), [narrow](training-protego-mobile.png) | Crop of `#trainingGuide` after selecting Protego. |
| Expelliarmus guide | [Desktop](training-expelliarmus-desktop.png), [narrow](training-expelliarmus-mobile.png) | Crop of `#trainingGuide` after selecting Expelliarmus. |
| Confringo guide | [Desktop](training-confringo-desktop.png), [narrow](training-confringo-mobile.png) | Crop of `#trainingGuide` after selecting Confringo. |
| Implemented Fight | [Desktop](fight-gameplay-desktop.png), [narrow](fight-gameplay-mobile.png) | Full page. No casts, 0 hits, both health values at 200/200. Recent Events is empty. |
| Fight defeat window | [Desktop](fight-defeat-desktop.png), [narrow](fight-defeat-mobile.png) | Full page. Seven simulated Basic Cast events. Dummy health at 0/200. Wait for spell effects to clear. The window shows Dummy defeated and Restart. Recent Events keeps older events in the list; the fixed panel clips and fades content at its bottom edge. Reduced motion disables the slide for these captures. |
| Brandbook concepts | [Menu](brandbook-menu.png), [Training](brandbook-training.png), [Fight](brandbook-fight.png) | Crop of `#screens` in `dist/brandbook.html` after selecting each tab. Default illustrative states; no simulation buttons pressed. Keep the concept label visible. |

Game captures use desktop 1920x1080 and narrow 390x844 viewports. Brandbook captures use a 1920x1080 viewport. Image height follows the full page or cropped element. All captures use Chromium, device scale factor 1, reduced motion, and loaded fonts. Browser versions can change pixel output.

The browser test blocks `getUserMedia` and checks that no camera call occurs. Game settings are Drawing hand Left and Track point Index fingertip. Master mute is available only in Options. Fight and Training show Start camera in the arena center. Idle motion is disabled for these captures. The camera stays off; mode navigation produces the message "Camera stopped. Lesson progress kept." Spell guide crops have no live input.

## Capture and review

From the project root, run:

```sh
npm run test:input
```

The existing Playwright setup is required. Set `CHROMIUM_EXECUTABLE` to use an installed Chromium executable. The capture code is in `tests/browser-input-settings.mjs`.

```text
Capture to .tmp/input-settings/ -> Inspect -> Copy selected files here
```

1. Require a passing test run. The command only writes candidates to `.tmp/input-settings/`; it does not replace these references.
2. Inspect both sizes. Check fonts, artwork, text, guide arrows, and start/stop marks. Full pages must include the lesson controls and event panels, with no repeated sections or clipping. Brandbook crops must include the concept label.
3. Copy only the reviewed files listed in the table. Use the same names. Keep Options and other test-only captures in `.tmp/`.
4. When visible copy or layout changes, refresh the affected set. When a shared guide style changes, refresh all four guide pairs. When a spell guide changes, refresh its pair and the Training layout pair if it shows that spell.
5. Check image links and the final diff. Update this table when the saved scope or capture state changes.

The browser check tests input settings and layout overflow. Image review is manual; it does not compare saved PNG files.
