---
version: 1
slug: "dist-training-js"
primary_target: "dist/training.js"
related_targets: ["dist/training.css","dist/training/session.js"]
---

# Training screen

Mode: Operate. Design limits are in `DESIGN.md`. The player selects a spell, follows its path, and completes three correct casts. Progress lasts until page reload.

## Direction contract

THESIS: Training reuses the existing Fight view and shared lesson guide.

OWN-WORLD: Use Fight's current CSS, typography, controls, arena, and camera sidebar. Use the shared lesson diagram classes and exact Expelliarmus diagram.

STORY: Select a spell, follow its guide, and complete three correct casts. Keep existing spell rules and effects.

FIRST VIEWPORT: Keep Fight's arena at the left and camera at the right. Put the existing lesson guide and progress below the camera in the right column. Keep the existing responsive layout.

FORM: Reuse the Fight layout and existing diagrams.

FINISH: Check the changed behavior and affected shared styles. Preview updates follow `AGENTS.md`.
