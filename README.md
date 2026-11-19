# Cover Snap Pro

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/tuyulsembilandua-beep/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/tuyulsembilandua-beep/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline cover-art maker for [make.fun](https://make.fun/bounty/gta6-cover-art-01)'s gta6-cover-art-01 bounty: drop in any photo and a caption, and it builds GTA-style multi-panel cover art — sunset and neon colour grades, bold gradient lettering with a neon script subtitle, film grain, vignette and halftone — and exports it as a PNG in 1080 x 1080, 1080 x 1350 or 1920 x 1080. Everything runs in the browser from static files; photos never leave the machine.

## What it does

- **Six layouts** — Four Corners (2 x 2 grid), Hero + Three, Full Bleed, Six Strip (3 x 2), Nine Grid (3 x 3 with the title block at the centre), and Tilted Snaps (overlapping polaroid-style snapshots).
- **Six grades** — Vice Sunset, Neon Night, Golden Hour, Teal Noir, Rose Dusk and Mono Heat, each a gradient-map wash over the photos.
- **Any photo** — load your own photos, or start with the two samples. Click a panel to select it, drag to move its photo, scroll to zoom, or fill every panel with one photo at different crops.
- **Lettering** — Anton titles with a sunset-gradient fill and white outline, Pacifico neon subtitles, a heat meter of stars and a badge ribbon. Both fonts are vendored under the SIL Open Font License.
- **Fast and easy** — a photo to a PNG in a few clicks; export the current size, or all three post sizes at once.
- **Polish** — undo/redo, live preview, film grain, vignette and halftone title texture.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. No build step, no network request: every script, font and sample image is a file under `app/`.

## Screenshots

`screenshots/` holds the cover the app exports (first by name) and the editor with a photo loaded. They are taken with the app's own `?shot=` scenes — see `shots.json`.

## License

MIT — see `LICENSE`. Anton and Pacifico are licensed under the SIL Open Font License 1.1 (see `app/fonts/OFL.txt`).
