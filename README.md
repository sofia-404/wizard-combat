# Wizard Combat

Use your camera to draw spells, train on a dummy, and duel a computer opponent. This is a local browser game prototype with four spells. Multiplayer is not available yet.

## Start the game

You need a desktop or laptop with a camera, a browser, and [Node.js 24 or later](https://nodejs.org/).

Download this repository and open its folder in a terminal. Or use Git:

```sh
git clone https://github.com/sofia-404/wizard-combat.git
cd wizard-combat
```

Start the local server:

```sh
npm start
```

No `npm install` is needed to play. Open the URL printed in the terminal, usually `http://127.0.0.1:5185/`. Keep the terminal open while you play. Press Ctrl+C there to stop the server.

## Cast your first spell

1. Open **Options**. Set **Drawing hand** to the hand you will use; the default is left.
2. Choose **Index fingertip** to draw with an extended finger. If you hold a wand, choose **Knuckles · wand grip**. The game tracks your hand, not the wand tip.
3. Return to the menu and open **Spell Training**. Choose a spell.
4. Select **Start camera** and allow camera access in your browser.
5. Keep your whole drawing hand visible. Hold still until **READY** appears.
6. Follow the path guide at normal speed. Make the shape at least one tenth of the camera view's width, then pause to cast.

```text
Hold -> READY -> Draw -> Pause -> Cast
```

If a spell does not cast, check your selected hand, keep it in view, and try a larger shape. **Easy** difficulty gives you more time and accepts less exact shapes.

Use **Stop camera** to pause camera input. **Back to menu** leaves the mode and stops the camera.

## Choose a mode

| Mode | What to do |
| --- | --- |
| **Spell Training** | Follow each spell's path guide. Complete three correct casts, or block three attacks for Protego. Start here. |
| **Practice Arena** | Cast freely at a dummy. It takes damage but does not attack. |
| **Solo Duel** | Fight an opponent that attacks and uses shields. Use Protego to block and Expelliarmus to interrupt it. |

**Options** also controls difficulty, music volume, and sound effects volume. Difficulty changes spell recognition and the Solo Duel opponent's timing.

## Learn the spells

| Spell | Draw | Effect |
| --- | --- | --- |
| **Protego** | A circle, in either direction. | Block attacks with a shield for three seconds. |
| **Basic Cast** | A V: down, then up. | Damage the target. |
| **Confringo** | A Z: right, diagonally down-left, then right. | Damage the target. |
| **Expelliarmus** | Right, then down. Keep moving at the corner. | Damage the target and briefly disarm it. |

Follow the on-screen guides with either hand. For Protego training, finish your circle before the incoming spell hits.

## Camera and saved data

Camera input is processed locally. Gameplay uses bundled files and no external service. The game does not save camera images or video.

It saves results, timing, input settings, and tracking details under `play-data/`. Practice Arena and Solo Duel also save drawings of captured paths there.

Options stay saved in your browser. Reloading the page resets the game and lesson progress; local records do not restore them. This prototype still needs physical player testing. Mobile camera play has not been validated.

## Project details

- [Product scope](PRODUCT.md)
- [Spell implementation](docs/spells.md)
- [Design and screen specifications](DESIGN.md)
- [Third-party licenses](licenses/) and [audio credits](licenses/audio/NOTICE.md)

For development, `npm test` runs the unit tests without package installation or a camera. Browser test commands are listed in [package.json](package.json); they need `npm ci` and `npx playwright-core install chromium`. Automated tests use simulated input.
