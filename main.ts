// Cover Snap Pro — the entry program (Node 22, standard library only). It hands the app
// in: copy this repository's app/ and screenshots/ to /output and write /output/dossier.json
// with the vendored make.fun library, so the gate can check the files and the judge can
// read them. Run it locally with MAKEFUN_OUTPUT_DIR set:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The entry itself is the offline cover maker in app/: six multi-panel layouts, six
// sunset/neon colour grades, Anton + Pacifico lettering (SIL OFL, vendored under
// app/fonts/), grain, vignette and halftone, and PNG export in 1080x1080, 1080x1350
// and 1920x1080. Screenshots in screenshots/ show the exported covers and the editor.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  if (existsSync(from)) cpSync(from, to, { recursive: true });
}

copyTree(join(repoRoot, 'app'), join(outputDir, 'app'));
copyTree(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'));

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the
// rest refuse an entry the scorer would refuse — more than 4 screenshots or one over
// 256 KiB; more than 993 files in app/ or 48 MiB of app files in all, or a path under
// app/ over 1000 bytes. app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
