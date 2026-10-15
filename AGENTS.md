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

## Communication

- Use ASD-STE100 Simplified Technical English for explanations and project documents.
- Use simple words, short sentences, and concise explanations.
- Use ASCII diagrams and schemas when they help explain a process.
- Report changes and verified test results. Report a test as passed only after it runs and passes. Identify estimates, proposals, failures, and work that was not verified.

## Project context

- Read the project context needed for the task.
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
- Preserve local camera processing. Do not add camera recording or external data transfer unless the user requests it.

## Checks

- Select checks that match the change. Read the scripts in `package.json` before using them.
- Test changed game rules and input behavior with relevant automated tests.
- For interface changes, check the affected view in a browser when available.
- Do not report simulated input as a successful physical player test.
- For document-only changes, check the text and file changes. Game tests are not required.

## Project documents

- Include useful facts, decisions, and technical notes.
- Update affected instructions when behavior or commands change.
- Do not include chat history, repeated warnings, or reports of routine agent actions.
- Put feature details and tuning values in the relevant project files.

```text
Read -> Change within scope -> Check -> Report
```
