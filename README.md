# Wizard Combat

Wizard Combat turns hand movements into spells through your camera.

This browser game lets you learn four spells, train on a dummy, and duel a computer opponent. Draw a shape with your hand, then pause to cast. The game runs on your own computer. Online multiplayer is the main next step.

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
3. Return to the menu and open **Spell Training**. Choose a character or **Random**, then select **Choose location**. Pick a stage, or leave it random, then select **Start Game**. Choose a spell.
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

All three modes first open character selection with random starting skins. In Solo Duel, select **P1 You** or **P2 Computer** to choose which skin the roster changes. Manual picks can put the same character on both sides. Random picks exclude the other role’s current skin. Fresh Solo Duel entries start with two different skins. A later manual pick can match either skin; saved matching choices stay unchanged on reload. **Choose location** confirms both choices. Spell Training and Practice Arena show only P1. There is no Next step or text below the action. Setup screens have Back to menu. Location selection has no control to return to character selection. Escape exits setup to the menu. New mode entries roll new starting skins; reload restores the current choices. The chosen portraits appear on the stage screen. Choices stay in the URL through Restart and reload. The selected full-body skins also appear in battle. Training and Practice keep the dummy. Random shows its result as soon as you select it. All characters use the same combat rules.

All three modes share the stage selection screen. Choose one of nine stages, then select **Start Game**, or double-click a stage to start it. **Random** picks a stage, shows it for one second, then starts the game. **Start Game** with no stage selected uses the same random flow. Restart keeps the same stage. Reload keeps the stage in the URL but resets game progress. Camera input starts only when you select **Start camera**.

**Options** also controls difficulty, music volume, and sound effects volume. Difficulty changes spell recognition and opponent timing. Protego training uses the same attack timing as Solo Duel.

Combat includes health, spell impacts, shields, disarming, defeat, and restart. Music, sound effects, and character animations give feedback during play. Input and audio settings stay saved in your browser.

These features are implemented, but physical player testing is still needed. Mobile camera play has not been validated. Online play and saved progression are not available yet.

## Learn the spells

| Spell | Draw | Effect |
| --- | --- | --- |
| **Protego** | A circle, in either direction. | Block attacks with a shield for two seconds. |
| **Basic Cast** | A V: down, then up. | Damage the target. |
| **Confringo** | A Z: right, diagonally down-left, then right. | Damage the target. |
| **Expelliarmus** | Right, then down. Keep moving at the corner. | Damage the target and briefly disarm it. |

Follow the on-screen guides with either hand. For Protego training, finish your circle before the incoming spell hits.

Attack spells deal fixed damage: Basic Cast deals 20, Confringo deals 40, and Expelliarmus deals 10. Protego blocks all incoming damage while active. It has no damage limit yet.

## How it works

The browser uses a bundled MediaPipe hand model to track your selected hand. It follows your index fingertip or knuckles and collects a path as you move. When you pause, the game checks the path against the spell shapes. An accepted shape triggers the spell's effects.

```text
Camera -> Hand tracking -> Drawn path -> Spell match -> Combat effect
```

The game uses HTML, CSS, and JavaScript. Hand tracking runs in a browser worker. Shared spell definitions keep gesture rules and combat effects consistent across modes. A small Node.js server serves the local files and saves play records. The application source and runtime assets are in `dist/`; no bundler is required.

## Rounds in Practice Arena and Solo Duel

Win two rounds to win the match. A match lasts two or three rounds. Each mode keeps its own score. Practice Arena keeps its static dummy, so normal play ends with two player wins.

```text
Start camera -> Camera ready -> Round 1 -> Fight -> Timer and combat start
Round result -> Reset fighters -> Next round -> Fight -> Timer and combat start
```

The round title shows for 1.5 seconds, then Fight shows for 0.5 seconds. No spell can release or hit during these messages. A round ends at zero health. Its result shows for two seconds before the next round. Two markers beside each health bar show round wins.

Each round starts with 200 health for both fighters and 100 seconds. It clears shields, disarm, recovery, queued spells, unfinished gestures, and spells in flight. Character, stage, settings, and match score stay the same. The timer runs only during active combat with the camera ready. Zero time does not decide the round.

Camera stop, tracker recovery, hidden pages, and navigation pause round messages and the timer. They cancel pending combat actions. Returning with the camera ready resumes the current round or message. Match progress stays in memory when changing screens; reload clears it. The camera stays on between rounds. After two wins, the match result shows Restart. Restart clears the score and starts Round 1 when the camera is ready. Battle music continues between rounds; the victory sound plays only for a player match win. Spell Training keeps its own lesson and reset rules.

## Shared combat rules

`dist/combat/rules.js` is the single balance setup for Solo Duel, Practice Arena, and Spell Training. Each mode keeps its own state. Both fighters start with 200 health. Accepted spells use fixed damage; precision still shows gesture quality.

| Spell | Damage | Flight | Recovery after release |
| --- | --- | --- | --- |
| Basic Cast | 20 | 1000 ms | 600 ms |
| Confringo | 40 | 1200 ms | 2000 ms |
| Expelliarmus | 10 | 1100 ms | 800 ms |
| Protego | 0 | Immediate | None |

Recovery blocks release, including Protego, but lets you draw. One completed spell can wait. A ready Protego replaces a queued attack, keeping the same release deadline. Other spells cannot replace the queue. Protego on cooldown is rejected and leaves the queue intact. A queued shield starts at release. Ordinary hits do not cancel drawing or the queue. Training counts released spells, not queued or rejected ones.

Protego lasts **two seconds**. Its **four-second cooldown** starts at activation. Repeated casts cannot extend it. The first blocked hit within 400 ms earns a player perfect block. It clears the attacker's preparation and queue, and prevents releases for 1.5 seconds from impact. A longer existing recovery remains. Opponent shields cannot earn perfect blocks.

Expelliarmus deals damage and interrupts preparation at impact. Disarm lasts **two seconds**. It prevents all releases and clears the queue. Repeated hits deal damage but cannot extend disarm. The target then has four seconds of protection from another disarm. Shields block both damage and disarm. Disarm and perfect blocks leave spells already in flight intact.

| Opponent setting | Easy | Normal | Hard |
| --- | --- | --- | --- |
| Notice a launched spell | 350 ms | 300 ms | 180 ms |
| Prepare Protego after notice | 600 ms | 600 ms | 370 ms |
| Total time to shield | 950 ms | 900 ms | 550 ms |
| Shield attempt, when eligible | 45% | 70% | 85% |
| Minimum gap between attack releases | 8 seconds | 6.5 seconds | 5 seconds |
| Basic Cast warning before release | 3.2 seconds | 2.6 seconds | 2.1 seconds |
| Confringo warning before release | 3.4 seconds | 2.8 seconds | 2.3 seconds |

The opponent alternates Basic Cast and Confringo after an initial three-second ready delay. It rolls once per incoming spell, only when defense is available. It cannot start defense during recovery, disarm, an active shield, or shield cooldown. After notice, visible shield preparation cancels attack preparation. No shield starts after the incoming impact. Defense or interruptions can make the attack gap longer. Late frames never cause catch-up attacks.

The camera panel shows recovery, the queued spell, and Protego cooldown separately from tracking. The opponent warning says **Cast Protego now** two seconds before impact. Practice keeps a static dummy. The Protego lesson uses the same opponent attack profile, with no opponent shields. Other lessons keep a static target. All modes keep full flight time under reduced motion.

Camera stop, tracker recovery, a hidden page, navigation, and defeat cancel pending releases and opponent actions. Arena round resets clear combat state. Spell Training keeps its two-second automatic target/player reset and lesson rules. The 100-second arena timer does not end the round.

The latest local session had a median Protego drawing-plus-recognition time of 1.70 seconds and a maximum of 1.90 seconds (7 gestures). This supports the two-second cue. These settings are a starting balance profile; a new physical play session is still needed to judge win rate and comfort.

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

- Make spell damage and shield reliability depend on gesture accuracy. Current damage is fixed per spell; shield reliability does not yet depend on accuracy.
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

Run `npm run test:rounds` for shared round flow, match results, pauses, and desktop/narrow previews with simulated input.
