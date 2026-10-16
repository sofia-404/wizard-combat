# Build original assets around the player’s movement.

The shipped brandbook uses authored vector assets and local fonts. The prompts below are production briefs for optional future scene art. They do not describe the shipped arena, character, or stage art. Those assets have separate [source records](../../evidence/asset-sources.md).

The shipped game includes Harry Potter house themes and settings. The original-art limits below apply to these optional future briefs, not to replacement of shipped assets. Stage PNG originals currently live beside runtime JPEGs in `dist/assets/stages/`; preserve them unless a separate task changes that structure.

## Shared art direction

Adult, restrained dark fantasy. Midnight navy ground, deep teal atmosphere, aged brushed gold, and one controlled cyan source. Materials feel worn and real. Use open space and deliberate composition. Avoid cartoons, chibi figures, candy colors, recognizable franchise landmarks, crests, house symbols, famous characters, copied UI, and baked-in interface text.

Keep scenery separate from controls. Do not generate logos, labels, counters, or readable text into the art. Use original vector assets for marks and spell guides so they stay sharp and accessible.

## Main-menu background

**Prompt:** Original cinematic dark-fantasy practice chamber for adult players, empty and quiet, midnight navy stone and deep teal mist, a single worn brass spell training instrument on the right, one subtle cyan point of light tracing a deliberate movement, restrained believable materials, no characters, no text or symbols from an existing franchise. Landscape 16:9. Leave the left 40 percent calm and dark for a vertical menu. Maintain readable low detail behind that menu. No ornate gold border, no castle skyline, no star field.

Deliver 3840×2160 source, a 1920×1080 optimized WebP, and a darker fallback crop. Confirm that the left control area still supports text contrast at the brightest frame.

## Spell Training environment

**Prompt:** Original sparse magical spell training room for a mature fantasy game, frontal viewpoint, a simple wooden practice target slightly right of center, navy and deep teal stone, soft practical side light, muted aged brass details, target clearly separated from the background, unobstructed central movement area, no particles across the player input region, no UI, no lettering, no recognizable franchise architecture. Landscape 16:9, grounded proportions and restrained texture.

Deliver environment and target separately if the game will animate the dummy. Keep a clean empty-room plate. The existing wand-return behavior needs a movable wand layer rather than painted-in animation.

## Practice Arena environment

**Prompt:** Original adult dark-fantasy sparring hall, wide frontal combat view, quiet midnight navy foreground, deep teal distance, narrow aged-gold architectural accents, one clear central target zone with generous uncluttered space, cinematic but readable lighting, no characters or interface, no health bars, no grand castle silhouette, no existing franchise motifs. Leave top corners and lower edge low contrast for a future HUD. Landscape 16:9.

Treat this as environment art only. Do not infer enemy rules or hit locations from it.

## Effect brief

One cyan path follows actual input. It has a small bright core, a soft bounded halo, and a short fade after the result. Render it from gameplay data rather than a canned raster loop. Avoid full-screen flashes. A reduced-motion state shows the final path and text immediately.

## Asset acceptance

- Record the tool, model, exact prompt, date, and source references for generated assets. Mark missing facts as unknown; do not infer them from commit dates.
- Record the author, source URL, license, and allowed use for sourced assets.
- Inspect at actual display size, including the brightest state.
- For these original-art briefs, remove accidental text, logos, and franchise resemblance.
- Supply a static fallback, optimized file, dimensions, and descriptive filename.
- For new assets, keep originals outside the runtime bundle and ship only the sizes used. Existing stage originals are an exception, as noted above.
