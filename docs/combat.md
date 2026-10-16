# Combat reference

Detailed rules for Practice Arena, Solo Duel, and Spell Training. See the [README](../README.md) for setup and basic play. Balance values are defined in [combat rules](../dist/combat/rules.js); round timing is defined in [round rules](../dist/combat/rounds.js).

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

These balance settings still need physical play tests to assess win rate and comfort.
