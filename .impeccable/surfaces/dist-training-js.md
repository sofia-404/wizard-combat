---
version: 1
slug: "dist-training-js"
primary_target: "dist/training.js"
related_targets: ["dist/training.css","dist/training/session.js"]
---

# Training screen

Mode: Operate. Extend the established Wizard Combat design. The player selects a spell, follows its path, and completes three correct casts. Progress lasts until page reload.

## Direction contract

THESIS: Add Training by reusing the existing Fight view and legacy Practice lesson guide.

OWN-WORLD: Use Fight's current CSS, typography, controls, arena, and camera sidebar. Use legacy Practice's lesson diagram classes and exact Expelliarmus diagram. Do not apply the brandbook to gameplay.

STORY: Select a spell, follow its guide, and complete three correct casts. Keep existing spell rules and effects.

FIRST VIEWPORT: Keep Fight's arena at the left and camera at the right. Put the legacy Practice-style lesson guide and progress below the camera in the right column. Keep the existing responsive layout.

FORM: Direct reuse requested by the user. No new visual identity or concept round.

FINISH: Check the result against Fight and legacy Practice. Preserve their markup, styles, and behavior. Verify the Training lesson and update its previews.
