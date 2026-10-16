---
version: 1
slug: "dist-spell-training-js"
primary_target: "dist/spell-training.js"
related_targets: ["dist/spell-training.css","dist/spell-training/session.js"]
---

# Spell Training screen

Mode: Operate. Design limits are in `DESIGN.md`. The player selects a spell, follows its path, and completes three correct casts, or blocks three attacks with Protego. Camera stops clear active attempts. Completed lessons remain until page reload.

## Direction contract

THESIS: Spell Training reuses the existing Practice Arena view and shared lesson guide.

OWN-WORLD: Use Practice Arena's current CSS, typography, controls, arena, and camera sidebar. Use the shared lesson diagram classes and exact Expelliarmus diagram.

STORY: Select a spell, follow its guide, and complete three correct casts, or block three attacks with Protego. Protego training reuses Solo Duel attack timing and effects.

FIRST VIEWPORT: Keep Practice Arena's arena at the left and camera at the right. Put the spell selector between the camera and Recent Events. Put correct casts between the health bars and the small guide inside the battlefield at the bottom center, on a semitransparent background. The selected lesson starts automatically when the camera is ready. Protego completion appears in a centered battlefield popup with Close and Escape dismissal. Other lesson completions stay below the battlefield. On desktop, Recent Events ends at the battlefield bottom edge. On narrow screens, show the battlefield, camera, spell selector, and events in that order.

FORM: Reuse the Practice Arena layout and existing diagrams.

FINISH: Check the changed behavior and affected shared styles. Preview updates follow `AGENTS.md`.
