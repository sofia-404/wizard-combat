# Preserve the game rules while building the new visual system.

- Read `PRODUCT.md` for product truth and `DESIGN.md` for the target UI system.
- Keep `README.md` focused on the game. Put internal design standards and development guidance in `DESIGN.md`, `docs/design/`, and this file.
- Read `docs/design/screen-specs.md` before changing the menu, training, or fight UI.
- Use the `impeccable` skill for every frontend change.
- Use `playwright-cli` for browser interaction. Inspect desktop at 1920×1080; add a narrow viewport for responsive checks.
- Use plain words, short sentences, and a concrete first sentence in user-facing writing.
- Use latest Sol (`gpt-6.1-sol`, medium effort) for routine implementation. Use latest Astra (`gpt-6-astra`, high effort) for substantial design decisions and difficult debugging. Delegate when the task benefits; avoid extra agents for small chores. Return substantial design changes to Astra.
- Challenge questionable UI or backend choices, but follow explicitly final user decisions.
- Assess review findings for need, severity, effort, and task fit. Fix useful small items in scope. Explain declined findings and resolve their review threads where supported.
- The brandbook at `dist/brandbook.html` is a preview and design reference. It does not implement a main menu or full fight mode in the game.
- Reuse `dist/brand/tokens.css` and authored assets. Do not silently restyle `dist/style.css` while updating the brandbook.
- Use English throughout the repository: code comments, identifiers, UI text, accessible labels, logs, examples, tests, documentation, prompts, and committed assets. Russian is for our conversation only. Preserve third-party source and license text verbatim. Update preview screenshots when visible copy changes.
- Keep the identity mature and restrained. Hogwarts Legacy is a palette reference only. Do not copy its interface, marks, architecture, characters, or fonts.
- Preserve left-hand default, mirrored preview, screen-coordinate spell directions, local camera processing, and recording disclosures.
- Keep learner feedback distinct from developer diagnostics. Do not add invented health, accuracy, multiplayer, progression, or performance claims.
- Preserve user files and unrelated work. In particular, do not include an unrelated untracked document in a design commit.
- Run checks appropriate to changed behavior. Visual-only documentation changes need layout, links, contrast, and interaction checks; gameplay changes also need relevant existing tests.
