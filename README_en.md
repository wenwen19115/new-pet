# new-pet / 新宠

[中文](README.md) | **English**

Windows desktop pet “新宠” (repo name `new-pet`). Tauri 2 + Vue 3, with separate windows for the pet, bubbles, menu, chat, and settings.

## Demo

[Download / open demo video](images/new-det-show.mp4)

<video src="images/new-det-show.mp4" controls width="720" poster="images/天问七号.png">
  Your reader does not support embedded video. Open
  <a href="images/new-det-show.mp4">images/new-det-show.mp4</a> directly.
</video>

## Features

The pet stays on the desktop; settings open in their own window. Nickname, personality, motion toggles, chat config, and so on are stored per character.

### Characters

Five companions share the same “slacking / roasting / showing off” pet shell, but differ in medium, motion budget, and how looks are swapped. Nickname, personality, motion toggles, and chat config are per character. You can switch characters in settings when none is summoned; after summon, the matching look and motion pool load.

| Display name | id | Medium in one line |
| --- | --- | --- |
| Tianwen-7 | `chip` | Chip shell + LED + fly windows |
| Pearbao | `fig-sci` | 2D full-body art; personality / holiday looks |
| Fox Qingqing | `toon` | Pixel parts + FX + wormhole |
| Susu | `vrm` | Upload `.vrm`; VRMA / custom bones |
| Beibei | `mug-cat` | Codex 8×9 spritesheet (Original mug only) |

#### Tianwen-7 · `chip`

<img src="images/天问七号.png" alt="Tianwen-7 settings preview" width="720" />

A tiny chip on your desk: cubic shell, screen face, pins that breathe with LEDs. “Hardware cute” — performance comes from shell motion, rolls, and fly windows, not a humanoid skeleton.

- **Looks**: Qingxin / Weld / Silisugar / Star-purple color sets
- **Motions**: camera dash, orbit flight, figure-8, barrel roll, edge glide, etc.; `screenFlight: fly`
- **Notes**: shell bob while sleeping; talks more after USB comes online; settings preview supports drag orbit

#### Pearbao · `fig-sci`

<img src="images/梨宝.png" alt="Pearbao settings preview" width="720" />

Illustration-style desk buddy: one full-body image carries the show via window motion, a light shell, and lines — not exaggerated joint animation. Personality and holiday looks are tied together, so outfit changes feel strongest.

- **Looks**: cheerful / soft / aloof / grumpy personality arts; Valentine, Spring Festival, Mid-Autumn, Labor Day limited looks
- **Motions**: tip-toe, sway, side hop, bow, stretch, short glide, etc.
- **Notes**: taller silhouette (illustration proportions); landing feedback often via lines; hit-test uses transparent pixels on the art

#### Fox Qingqing · `toon`

<img src="images/狐青青.png" alt="Fox Qingqing settings preview" width="720" />

Pixel fox: head, body, tail, and flame assembled by part; cyan-flame style decorations follow the look. Budget goes to pixel bits and wormhole screen-crossing, not flinging the whole window around.

- **Looks**: Cyan Crystal / Warm Lantern / Flower Sprite / Star-Moon Spirit (palette + head decor)
- **Motions**: grass / thunder FX, tilt, sway, walk, happy-bounce; screen flight uses `screen-wormhole`
- **Notes**: pupils track the mouse; empty pixels pass clicks through; mischievous dodge shows the pixel form best

#### Susu · `vrm`

<img src="images/酥酥.png" alt="Susu settings preview" width="720" />

3D humanoid slot: no fixed face ships in-repo; looks come entirely from a local `.vrm` (upload, ≤50MB). Default playback uses built-in VRMA idle clips; sleep / pick-up still use procedural poses.

- **Looks**: whatever model you upload; nickname is editable (example in the image: “Axing”)
- **Motions**: several idle loops + wave / peace / think / shy gestures; bone editor for custom motions
- **Notes**: no screen flight (`screenFlight: none`); preview supports drag orbit and scroll zoom; gaze follows the mouse

#### Beibei · `mug-cat`

<img src="images/杯杯.png" alt="Beibei settings preview" width="720" />

A steaming cat mug: desk-object vibe, driven by a Codex-compatible 8×9 spritesheet (Original mug only for now).

- **Looks**: Original mug (single atlas)
- **Motions**: steam, purr, tip cup, sip, nap, stare, etc.; desk vignettes
- **Notes**: no screen flight; workstation weather maps to drink / nap / steam style motions; assets under `assets/pets/mug-cat/`


### Interaction

- Drag, click: change mood, play motions, bubble lines; release has landing feedback
- Random idle; sleep / wake (falls asleep after idle time; click or USB can wake)
- Mischief mode: dodges when the mouse approaches; catch / miss each have lines; right-click “Mischief once” for a single trigger
- Hide: sticks to the edge half-visible; click or menu “Come out” restores
- While speaking, click the bubble for a light bounce (three rapid taps get annoyed); bubbles and the context menu avoid overlapping
- Motion pools differ per character: fly / wormhole / edge crawl / stay put come from character config

### Appearance

- ~64 Theme Packs (`src/theme/`): settings, bubbles, and menu colors follow the pack; independent of look
- Wallpaper: optional image / GIF / video background with dimming; boot animation supports auto / media / manual duration
- Tianwen-7 and Fox Qingqing can change color sets; Pearbao picks illustration looks; Susu looks like the uploaded VRM

### Chat & voice

- Context menu opens AI chat: DeepSeek (needs API Key) or local companion chat; failures surface errors and can retry
- Xiaozhi voice: after binding a device, talk to the pet; dialogue bar under the pet + chat window read-only history
- Edge neural TTS for lines (needs network; can mute)
- Chat history stored locally, per character; chat window shows the latest 50; Settings → AI Chat can search, delete, export (up to 2000 per character)
- AI provider, model, and Key are configured per character

### Environment sensing

- Workstation weather: lines from window open/close, focus switching rate, and how full the screen is (thresholds and cooldown configurable)
- Window-scene weather: pet window can project sky / weather (online via Open-Meteo, offline via manual config); collapses during drag, flight, or hide
- USB online notice: can announce the port list when a new device is detected

### Other

- Context menu: perform one, always on top, open settings, reset position, dismiss summon, slacking dashboard (today’s interaction stats)
- Factory reset, clear cache, restore defaults per character
- Startup entrance animation and pixel pet icon

## Requirements

| Item | Notes |
| --- | --- |
| OS | Windows 10/11 |
| Node.js | 18+, LTS recommended |
| Package manager | Yarn 1.x |
| Rust | stable, install via [rustup](https://rustup.rs/) |
| C++ toolchain | Visual Studio Build Tools or VS 2022 with “Desktop development with C++” (MSVC, needed to build the Rust backend) |
| WebView2 | Required at runtime; installer guides setup when packaging |

Optional when maintaining pet motion sheets: `sharp` is in devDependencies, used with `scripts/` for keying, defringe, and anchoring (see below).

## Getting started

1. Clone the repo

   ```bash
   git clone <repo-url>
   cd desktop-pet
   ```

2. Install dependencies

   ```bash
   yarn
   ```

3. Confirm Rust is installed

   ```bash
   rustc --version
   cargo --version
   ```

   If missing, run `rustup` and install stable.

4. First compile

   The first `yarn tauri dev` or `yarn tauri build` downloads and compiles Rust deps; it can take a while — that is expected.

## Development

### With desktop windows (recommended)

```bash
yarn tauri dev
```

- App URL: http://localhost:1421 (see `devUrl` in `src-tauri/tauri.conf.json`)
- Opens settings and other windows; Vue/TS hot-reloads; Rust changes need a rebuild.

### Web only

```bash
yarn dev
```

Same port 1421. No desktop windows, no native APIs, no multi-window testing — UI work only.

## Testing

After changes, run:

```bash
yarn test                  # Vitest smoke (architecture, petHost, etc.)
yarn vue-tsc --noEmit      # typecheck (also runs before packaging)
yarn check:pre-commit      # pre-commit checks (directory placement, forbidden imports, etc.)
```

Manual release checklist: [`docs/GOLDEN_PATHS.md`](docs/GOLDEN_PATHS.md). Layering: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Runtime state: [`docs/STATE.md`](docs/STATE.md).

## Build & package

Web assets only (output to `dist/` for Tauri packaging):

```bash
yarn build
```

That is `vue-tsc --noEmit && vite build`.

Windows installer:

```bash
yarn tauri build --bundles nsis
```

- Runs `yarn sync-version && yarn build` first, then Release build and NSIS installer.
- Installer usually lands in `src-tauri/target/release/bundle/nsis/`; filename follows the version.
- After install the app name is「新宠」, main binary `new-pet.exe`.

### Version

Only bump **`version` in root `package.json`**. `yarn sync-version` (and `tauri dev` / `tauri build`) writes it into `src-tauri/tauri.conf.json` and `Cargo.toml`. The release workflow also only watches `package.json` for bumps.

### GitHub auto-release

Workflow: [`.github/workflows/release.yml`](.github/workflows/release.yml). When `package.json` version changes vs the previous commit and is pushed to `main`, it tags, builds Windows NSIS, and creates a Release with What's Changed. You can also Run workflow manually in Actions (check force). Artifact name looks like `new-pet-1.0.1-windows-x64-setup.exe`. The repo needs Actions **Read and write permissions** enabled.

## Pet motion sheets (optional)

When maintaining 8×9 atlases (e.g. `src/pet/assets/pets/mug-cat/`), use Node scripts under `scripts/` (depends on `sharp`):

```bash
# Magenta-backed sheet → transparent PNG (provide a raw sheet dir; files named <id>-magenta.png)
set PET_SHEET_SRC=D:\path\to\raw-sheets
node scripts/key-magenta-sheets.mjs

node scripts/defringe-sheets.mjs
node scripts/anchor-atlas-frames.mjs
node scripts/measure-atlas-drift.mjs
```

Generated files default to `src/pet/assets/pets` (see `scripts/petAssetsRoot.mjs`). The local Python env under `.tools/` is gitignored — do not commit it.
