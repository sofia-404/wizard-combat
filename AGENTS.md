# Work rules

## Work location

- This folder is the project root. Keep changes inside it unless the user requests work elsewhere.
- Use `.tmp/` for temporary project files.
- Before a Git write, check that the repository root is this project.

## Task scope

- Follow the user's current request and agreed task scope. Preserve behavior outside that scope.
- During a read-only task, do not change files. Do not run commands that write logs or test files.
- Treat a design proposal as a proposal until the user requests implementation.
- Do not commit, push, publish, or deploy unless the user requests that action.
- Continue work that the user has authorized. Do not request the same approval again.
- Never activate the user's real camera or microphone without explicit permission. Use simulated input for tests. If real camera or microphone access is needed, ask explicitly and wait for permission before activating it. A request to test the app or its camera controls does not grant this permission.

## Communication

- Use ASD-STE100 Simplified Technical English for explanations and project documents.
- Use simple words, short sentences, and a concrete first sentence.
- Use English throughout the repository: code comments, identifiers, UI text, accessible labels, logs, examples, tests, documents, prompts, and committed assets. Russian is for conversation only. Preserve third-party source and license text verbatim. Update preview screenshots when visible copy changes.
- Use ASCII diagrams and schemas when they help explain a process.
- Report changes and verified test results. Report a test as passed only after it runs and passes. Identify estimates, proposals, failures, and work that was not verified.

## Project context

- Read the project context needed for the task. Read `PRODUCT.md` for current behavior and `DESIGN.md` for the target UI system. Check these documents against the code.
- Read `docs/design/screen-specs.md` before changing the menu, training, or fight UI.
- Check `git status --short` before editing.
- Preserve existing changes. Do not reset, delete, or overwrite unrelated work.
- Other AI agents can work on the same branch at the same time. Treat unrelated changes as expected. Preserve their work and keep your edits within scope. If changes conflict with your task, inspect them and coordinate before overwriting.
- Check the code before treating a document as proof of current behavior.
- Clearly label planned and implemented features.

## Implementation

- Be generalistic and surgical. Use the simplest solution that covers the required cases. Keep changes small and focused.
- Follow the project's code style, structure, naming, logic, and existing patterns.
- Reuse existing code where practical. Do not overengineer.
- Check dependencies, effects on other features, and relevant edge cases.
- `dist/` contains application source files. Do not delete it as build output.
- Keep input tracking, spell detection, game rules, and display logic separate.
- Keep shared game rules in one place. Reuse them across views.
- Preserve keyboard controls and reduced motion support when changing the interface.
- Add dependencies only when they are needed. Explain why they are needed.
- Preserve the left-hand default, mirrored preview, screen-coordinate spell directions, local camera processing, and recording disclosures. Do not add camera recording or external data transfer unless the user requests it.
- Keep learner feedback separate from developer diagnostics. Do not add unsupported health, accuracy, multiplayer, progression, or performance claims.
- Challenge questionable UI or backend choices, but follow explicit final user decisions.
- Assess review findings for need, severity, effort, and task scope. Fix useful small items in scope. Explain declined findings and resolve their review threads where supported.

## Design and tools

- The brandbook at `dist/brandbook.html` is a preview and design reference. It does not implement a main menu or full fight mode. The game has a separate static-dummy Fight mode.
- Keep the design migration for legacy Practice and Fight separate from merge work. Their current styles do not yet meet all target design rules.
- During the design migration, reuse `dist/brand/tokens.css` and authored assets. Scope shared styles to avoid changes to other views. Do not silently restyle `dist/style.css` while updating the brandbook.
- Use the `impeccable` skill for frontend changes. If the skill is not available, tell the user and recommend downloading it. If downloading it is not possible, tell the user and proceed without it. Use `playwright-cli` for browser interaction. Existing automated browser tests keep their package scripts.
- Keep the identity mature and restrained. Hogwarts Legacy is a palette reference only. Do not copy its interface, marks, architecture, characters, or fonts.
- Use latest Sol (`gpt-6.1-sol`, medium effort) for routine implementation. Use latest Astra (`gpt-6-astra`, high effort) for substantial design decisions and difficult debugging. Delegate when the task benefits; avoid extra agents for small chores. Return substantial design changes to Astra.

## Checks

- Select checks that match the change. Read the scripts in `package.json` before using them.
- Test changed game rules and input behavior with relevant automated tests.
- For interface changes, check the affected view in a browser when available. Inspect desktop at 1920x1080 and a narrow viewport. Check layout, links, contrast, and interaction for visual changes.
- Do not report simulated input as a successful physical player test.
- For document-only changes, check the text and file changes. Game tests are not required.

## Project documents

- Include useful facts, decisions, and technical notes.
- Keep `README.md` focused on the game. Put internal design standards and development guidance in `DESIGN.md`, `docs/design/`, and this file.
- Do not include unrelated untracked documents in a design commit.
- Update affected instructions when behavior or commands change.
- Do not include chat history, repeated warnings, or reports of routine agent actions.
- Put feature details and tuning values in the relevant project files.

```text
Read -> Change within scope -> Check -> Report
```
