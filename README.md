# Wizard Combat

Wizard Combat turns hand movements into spells through your camera.

This browser game prototype lets you learn four spells, train on a dummy, and duel a computer opponent. Draw a shape with your hand, then pause to cast. The game runs on your own computer. Online multiplayer is the main next step.

## How to Run

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

No `npm install` or build step is needed to play. Open the URL printed in the terminal, usually `http://127.0.0.1:5185/`. Use this address instead of opening `dist/index.html` directly. Keep the terminal open while you play. Press Ctrl+C there to stop the server.

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

## What is working

The prototype has three playable modes:

| Mode | What to do |
| --- | --- |
| **Spell Training** | Follow each spell's path guide. Complete three correct casts, or block three attacks for Protego. Start here. |
| **Practice Arena** | Cast freely at a dummy. It takes damage but does not attack. |
| **Solo Duel** | Fight an opponent that attacks and uses shields. Use Protego to block and Expelliarmus to interrupt it. |

**Options** also controls difficulty, music volume, and sound effects volume. Difficulty changes spell recognition and the Solo Duel opponent's timing.

Combat includes health, spell impacts, shields, disarming, defeat, and restart. Music, sound effects, and character animations give feedback during play. Input and audio settings stay saved in your browser.

These features are implemented, but physical player testing is still needed. Mobile camera play has not been validated. Online play and saved progression are not available yet.

## Learn the spells

| Spell | Draw | Effect |
| --- | --- | --- |
| **Protego** | A circle, in either direction. | Block attacks with a shield for three seconds. |
| **Basic Cast** | A V: down, then up. | Damage the target. |
| **Confringo** | A Z: right, diagonally down-left, then right. | Damage the target. |
| **Expelliarmus** | Right, then down. Keep moving at the corner. | Damage the target and briefly disarm it. |

Follow the on-screen guides with either hand. For Protego training, finish your circle before the incoming spell hits.

Attack spells currently deal 20, 25, or 30 damage, based on the gesture match score. Protego blocks all incoming damage while active. It has no damage limit yet.

## How it works

The browser uses a bundled MediaPipe hand model to track your selected hand. It follows your index fingertip or knuckles and collects a path as you move. When you pause, the game checks the path against the spell shapes. An accepted shape triggers the spell's effects.

```text
Camera -> Hand tracking -> Drawn path -> Spell match -> Combat effect
```

The game uses HTML, CSS, and JavaScript. Hand tracking runs in a browser worker. Shared spell definitions keep gesture rules and combat effects consistent across modes. A small Node.js server serves the local files and saves play records. The application source and runtime assets are in `dist/`; no bundler is required.

## Camera and saved data

Camera input is processed locally. Gameplay uses bundled files and no external service. The game does not save camera images or video.

It saves results, timing, input settings, and tracking details under `play-data/`. Practice Arena and Solo Duel also save drawings of captured paths there.

Reloading the page resets the game and lesson progress; local records do not restore them.

## Short build log

These milestones summarize the repository's commit history:

| Date | What was built |
| --- | --- |
| 2026-10-15 | Added camera gesture casting and four spells. Added a practice dummy, shared spell rules, training lessons, shields, and disarming. |
| 2026-10-15 | Added the main menu, saved options, music, spell sounds, and idle character motion. |
| 2026-10-16 | Added Solo Duel with opponent attacks and shields, difficulty-based combat timing, and expanded training health mechanics and event logs. |
| 2026-10-16 | Added separate audio volume controls and a looping menu animation. Updated camera processing and opponent rendering to reduce repeated work. |

## What comes next

**The main priority is online multiplayer:** duel another player over the internet.

Further planned work:

- Refine how gesture accuracy affects spell damage, and make shield reliability depend on it too. Damage already uses three score tiers; shield reliability does not yet depend on accuracy.
- Give shields a damage limit, so they can block only a limited amount of damage.
- Let players create custom spells.
- Offer character models with different stats that affect combat, beyond visual skins.
- Add a character scoreboard.
- Require players to say a spell aloud before drawing its gesture.
- Add fatalities: finishing moves at the end of a duel.

These are planned features, not a release schedule.

## Project details

- [Product scope](PRODUCT.md)
- [Spell implementation](docs/spells.md)
- [Design and screen specifications](DESIGN.md)
- [Third-party licenses](licenses/) and [audio credits](licenses/audio/NOTICE.md)

For development, `npm test` runs the unit tests without package installation or a camera. Browser test commands are listed in [package.json](package.json); they need `npm ci` and `npx playwright-core install chromium`. Automated tests use simulated input.
