# Saved previews

These images are visual references. They are not automated pixel tests or proof of physical camera play. The source code defines the current screen.

Keep one desktop/narrow pair for the shared Spell Training layout. Keep a guide crop for each spell at both widths. The guide is a small overlay at the bottom center of the battlefield; its semitransparent background shows the arena beneath it. Do not save a full Spell Training page for every spell. Keep brandbook concepts separate from implemented screens.

| Set | Files | Capture and state |
| --- | --- | --- |
| Implemented menu | [Desktop](menu-desktop.png), [narrow](menu-mobile.png) | Main menu with Spell Training, Practice Arena, and Solo Duel enabled, each with a short description; Multiplayer disabled with “Duel with friends online. Coming soon” below it. Options and Credits stacked at the bottom-left. |
| Implemented Spell Training layout | [Desktop](spell-training-layout-desktop.png), [narrow](spell-training-layout-mobile.png) | Full page. Player health at 200/200 and dummy health at 110/200. Expelliarmus complete at 3/3; 1 of 4 spells learned. Three simulated lesson events in Recent Events. Wait for the wand to return, then select Protego and Expelliarmus to clear transient effects. |
| Spell Training automatic restart | [Desktop](spell-training-defeat-desktop.png), [narrow](spell-training-defeat-mobile.png) | Full page during the two-second restart delay. Fallen dummy at 0/200, player at 175/200. Basic Cast complete at 3/3; two spells learned. Simulated casts with camera access blocked. |
| Basic Cast guide | [Desktop](spell-training-basic-cast-desktop.png), [narrow](spell-training-basic-cast-mobile.png) | Crop of `#spellTrainingGuide` after selecting Basic Cast. |
| Protego training warning | [Desktop](spell-training-protego-warning-desktop.png), [narrow](spell-training-protego-warning-mobile.png) | Full page with simulated readiness and no camera stream. Opponent prepares Basic Cast, with a steady charge at its wand tip under reduced motion. Attacks blocked is 0/3. |
| Protego training block | [Desktop](spell-training-protego-block-desktop.png), [narrow](spell-training-protego-block-mobile.png) | One blocked attack at 1/3. Player has 175 health after the first missed block. |
| Protego training complete | [Desktop](spell-training-protego-complete-desktop.png), [narrow](spell-training-protego-complete-mobile.png) | Three blocked attacks. The battlefield popup shows Protego learned and a Close button. Opponent attacks stop. |
| Protego guide | [Desktop](spell-training-protego-desktop.png), [narrow](spell-training-protego-mobile.png) | Crop of `#spellTrainingGuide` after selecting Protego. |
| Expelliarmus guide | [Desktop](spell-training-expelliarmus-desktop.png), [narrow](spell-training-expelliarmus-mobile.png) | Crop of `#spellTrainingGuide` after selecting Expelliarmus. |
| Confringo guide | [Desktop](spell-training-confringo-desktop.png), [narrow](spell-training-confringo-mobile.png) | Crop of `#spellTrainingGuide` after selecting Confringo. |
| Implemented Practice Arena | [Desktop](practice-arena-gameplay-desktop.png), [narrow](practice-arena-gameplay-mobile.png) | Full page. No casts, 0 hits, both health values at 200/200. Recent Events is empty. |
| Implemented Solo Duel | [Desktop](solo-duel-gameplay-desktop.png), [narrow](solo-duel-gameplay-mobile.png) | Full page. Same layout as Practice Arena, with the SOLO DUEL heading and Opponent label. No casts, 0 hits, and both health values at 200/200. |
| Solo Duel attack warning | [Desktop](solo-duel-warning-desktop.png), [narrow](solo-duel-warning-mobile.png) | Simulated readiness, no camera stream. First Basic Cast warning with a steady wand charge under reduced motion, both fighters at 200/200. |
| Solo Duel player block | [Desktop](solo-duel-block-desktop.png), [narrow](solo-duel-block-mobile.png) | Simulated Protego blocks the first opponent attack. Player stays at 200/200. |
| Solo Duel opponent shield | [Desktop](solo-duel-opponent-shield-desktop.png), [narrow](solo-duel-opponent-shield-mobile.png) | Opponent Protego reacts to a launched Expelliarmus. Player is at 175/200 after the second attack. |
| Practice Arena defeat window | [Desktop](practice-arena-defeat-desktop.png), [narrow](practice-arena-defeat-mobile.png) | Full page. Seven simulated Basic Cast events. Dummy health at 0/200. Wait for spell effects to clear. The window shows Dummy defeated and Restart. Recent Events keeps older events in the list; the fixed panel clips and fades content at its bottom edge. Reduced motion disables the slide for these captures. |
| Player defeat | Practice Arena: [desktop](practice-arena-player-defeat-desktop.png), [narrow](practice-arena-player-defeat-mobile.png). Spell Training: [desktop](spell-training-player-defeat-desktop.png), [narrow](spell-training-player-defeat-mobile.png). | Full page. Simulated incoming lethal hit, player at 0/200, dummy at 170/200. Practice Arena shows Player defeated and Restart. Spell Training keeps Expelliarmus at 1/3 during its two-second player recovery delay. |
| Brandbook concepts | [Menu](brandbook-menu.png), [Spell Training](brandbook-spell-training.png), [Practice Arena](brandbook-practice-arena.png) | Crop of `#screens` in `dist/brandbook.html` after selecting each tab. Default illustrative states; no simulation buttons pressed. Keep the concept label visible. |

Game captures use desktop 1920x1080 and narrow 390x844 viewports. Brandbook captures use a 1920x1080 viewport. Image height follows the full page or cropped element. All captures use Chromium, device scale factor 1, reduced motion, and loaded fonts. Browser versions can change pixel output.

The browser test blocks `getUserMedia` and checks that no camera call occurs. Game settings are Drawing hand Left and Track point Index fingertip. Options uses separate Music and Sound effects switches. Practice Arena and Spell Training show Start camera in the arena center. Idle motion is disabled for these captures. Lesson setup briefly simulates camera readiness to start the lesson automatically without a stream. The camera stays off in the saved previews; mode navigation updates the camera status message Spell guide crops have no live input.

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
4. When visible copy or layout changes, refresh the affected set. When a shared guide style changes, refresh all four guide pairs. When a spell guide changes, refresh its pair and the Spell Training layout pair if it shows that spell.
5. Check image links and the final diff. Update this table when the saved scope or capture state changes.

The browser check tests input settings and layout overflow. Image review is manual; it does not compare saved PNG files.

Solo Duel combat previews use `npm run test:solo-duel`. The test blocks real camera access and simulates readiness without a stream. Stop camera is visible only because of that simulated state. Review the desktop and narrow candidates in `.tmp/solo-combat/`, then copy only the Solo Duel files listed above. These images are not physical player tests.

Protego training combat previews use `npm run test:protego-training`. The test blocks camera access and uses a controlled clock. Review both widths in `.tmp/protego-training/`, then copy only the warning, block, and complete pairs listed above. These captures are simulated input, not physical player tests.
