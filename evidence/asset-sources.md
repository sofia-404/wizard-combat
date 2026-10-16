# Asset source records

These records describe shipped files. Unknown means the repository does not record the fact. Keep exact historical prompts unchanged. Optional future art briefs are in [asset-prompts.md](../docs/design/asset-prompts.md).

## Artwork

| Assets | Existing record | Missing facts |
| --- | --- | --- |
| Arena, background, and dummy | [Arena](practice-arena-artwork.txt), [reaction layers](practice-arena-reaction-artwork.txt), [disarm layers](practice-arena-disarm-artwork.txt) | Generation model and dates; original user reference is not archived here. |
| Idle player layers | [Processing record](practice-arena-idle-artwork.txt) | Processing date. Model, source, versions, and method are recorded. |
| Player fall background | [Generation record](../dist/assets/practice-arena-player-fall-background.json) | Model is not reported. |
| Menu still | [Source record](../dist/brand/assets/menu-wizard.webp.json) | Exact model and final prompt are unconfirmed. |
| Character portraits | [Generation record](../dist/assets/characters/portraits-v1/generation.json) | Model is not recorded. Absolute generated-source paths refer to the original workstation. |
| Battle skins | [Generation record](../dist/assets/characters/battle-v1/generation.json) | Model and generation date are not recorded. Absolute source paths refer to the original workstation. |
| Stages and selection pair | [Generation record](../dist/assets/stages/generation.json) | Model is not recorded. The referenced selection mockup is not archived here. |

Local source paths are historical identifiers, not portable links. Record the source file and hash when a source is available. Do not claim exact regeneration where the model or reference is missing.

## Menu animation

- Supplied source: [main_menu_animation.mp4](../main_menu_animation.mp4).
- Runtime copy: [menu-animation.mp4](../dist/brand/assets/menu-animation.mp4).
- Both files entered Git on 2026-10-16 in `9ada087`. This is an import date, not a creation date.
- The source has video and audio tracks; the runtime copy has video only. The conversion command is not recorded.
- Author, original source URL, creation date, tool/model, prompt, and license are unknown. The supplied-file status does not establish those facts.
- [Playback code](../dist/menu-video.js) uses a muted loop at 1x speed, with the existing menu still as fallback. Reduced motion and hidden game/menu state control playback.

| File | Bytes | SHA-256 |
| --- | --- | --- |
| `main_menu_animation.mp4` | 1691649 | `069bdc260d1a670cf895fc315df1e989d8510eedf05a4b681d232b9d91ef96ec` |
| `dist/brand/assets/menu-animation.mp4` | 1519820 | `8206e012f2ff8a80eb01ba49166022baf920dfa8cbace43b5d809705a342bc4f` |
