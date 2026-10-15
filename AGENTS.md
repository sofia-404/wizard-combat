# Work rules

## Work location

- This folder is the project root. Keep changes inside it unless the user requests work elsewhere.
- Use `.tmp/` for temporary project files.
- Before a Git write, check that the repository root is this project.

## Task scope

- Follow the user's current request and agreed task scope. Preserve behavior outside that scope.
- Preserve the current layout, fonts, colors, spacing, artwork, and motion outside the requested change. A behavior change does not authorize a redesign. Design plans, review findings, and skill checks do not expand the task scope. Report unrelated findings without changing them.
- During a read-only task, do not change files. Do not run commands that write logs or test files.
- Treat a design proposal as a proposal until the user requests implementation.
- Do not commit, push, publish, or deploy unless the user requests that action.
- Continue work that the user has authorized. Do not request the same approval again.
- Never activate the user's real camera or microphone without explicit permission. Use simulated input for tests. If real camera or microphone access is needed, ask explicitly and wait for permission before activating it. A request to test the app or its camera controls does not grant this permission.

## Communication

- Use ASD-STE100 Simplified Technical English for explanations and project documents.
- Use simple words, short sentences, and a concrete first sentence.
- Use English throughout the repository: code comments, identifiers, UI text, accessible labels, logs, examples, tests, documents, prompts, and committed assets. Russian is for conversation only. Preserve third-party source and license text verbatim.
- Use ASCII diagrams and schemas when they help explain a process.
- Report changes and verified test results. Report a test as passed only after it runs and passes. Identify estimates, proposals, failures, and work that was not verified.

## Project context

- Read only the context needed for the task. For behavior changes, read the relevant parts of `PRODUCT.md`, `README.md`, source files, and tests. For visual work, also read the affected screen in `docs/design/screen-specs.md`, its surface brief, and the applicable rules in `DESIGN.md`.
- Check `git status --short` before editing.
- Preserve existing changes. Do not reset, delete, or overwrite unrelated work.
- Other AI agents can work on the same branch at the same time. Treat unrelated changes as expected. Preserve their work and keep your edits within scope. If changes conflict with your task, inspect them and coordinate before overwriting.
- Check documents against the code before treating them as proof of current behavior. Report any differences. Do not restore an older design or mark a new design as accepted without support from the user's request. Update the document when the accepted result is clear.
- Clearly label planned and implemented features.

## Implementation

- Use the simplest solution that covers the required cases. Keep changes small and focused. Reuse existing code where practical. Do not overengineer.
- Follow the project's code style, structure, naming, logic, and existing patterns.
- Check dependencies, effects on other features, and relevant edge cases.
- `dist/` contains application source files. Do not delete it as build output.
- Keep input tracking, spell detection, game rules, and display logic separate.
- Keep shared game rules in one place. Reuse them across views.
- Preserve keyboard controls and reduced motion support when changing the interface.
- Add dependencies only when they are needed. Explain why they are needed.
- Do not add camera recording or external data transfer unless the user requests it.
- Do not add unsupported feature or performance claims.
- Challenge questionable UI or backend choices, but follow explicit final user decisions.
- Assess review findings for need, severity, effort, and task scope. Fix useful small items in scope. Explain declined findings and resolve their review threads where supported.

## Design and tools

- Reuse existing styles and assets. Keep screen-specific changes scoped to that screen. Before changing shared styles, check which screens use them.
- Use the `impeccable` skill for requested visual design work. A frontend behavior fix does not start a design task. If the skill is not available, tell the user and recommend downloading it. If downloading it is not possible, tell the user and proceed without it.
- Use `playwright-cli` for browser interaction. Existing automated browser tests keep their package scripts.

## Checks

- Select checks that match the change. Read the scripts in `package.json` before using them.
- Test changed game rules and input behavior with relevant automated tests.
- For interface changes, check the affected view in a browser when available. Inspect desktop and narrow viewports. Check layout, links, contrast, and interaction for visual changes.
- When shared styles change, check all affected views. Before reporting completion, check the diff for unrelated visual changes.
- Update preview screenshots when visible copy changes. Follow `docs/design/previews/README.md` for capture scope and manual review.
- Do not report simulated input as a successful physical player test.
- For document-only changes, check the text and file changes. Game tests are not required.

## Project documents

- Include useful facts, decisions, and technical notes.
- Keep `README.md` focused on the game. Put internal design standards and development guidance in `DESIGN.md`, `docs/design/`, and this file.
- Include only task-related changes in a commit.
- Update affected instructions when behavior or commands change.
- Do not include chat history, repeated warnings, or reports of routine agent actions.
- Put feature details and tuning values in the relevant project files.

```text
Read -> Change within scope -> Check -> Report
```
