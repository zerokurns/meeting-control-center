# Development setup

Meeting Control Center (MCC) is a fork of [FreeShow](https://github.com/ChurchApps/FreeShow): an Electron
app (TypeScript main process) with a Svelte + Vite front end. This page covers getting the fork building
and running from source. The first section is what worked on the reference workstation
(Debian 13, Node 24, npm 12); platform notes follow.

## Repository

| Remote     | URL                                                | Purpose                      |
| ---------- | -------------------------------------------------- | ---------------------------- |
| `origin`   | https://github.com/zerokurns/meeting-control-center | the fork; all MCC work       |
| `upstream` | https://github.com/ChurchApps/FreeShow             | merge bug fixes from here    |

```sh
git clone https://github.com/zerokurns/meeting-control-center.git
cd meeting-control-center
git remote add upstream https://github.com/ChurchApps/FreeShow.git
git fetch upstream
```

Fork discipline: keep upstream as a remote, avoid gratuitous reformatting, and put new MCC code in
clearly separated folders (see `docs/decisions.md`) so `git merge upstream/main` stays cheap.

## Prerequisites

1. **Node.js 22.12 or newer.** Node 24 LTS via `nvm` is what this repo is developed on
   (`nvm use 24`). Electron ships its own Node at runtime, so the host version only drives tooling.
2. **Python 3 with `setuptools`** for `node-gyp`. Upstream says 3.12; 3.13 works once `setuptools`
   is installed. Debian/Ubuntu: `sudo apt-get install python3-setuptools`.
3. **A C/C++ toolchain** (`build-essential` on Debian/Ubuntu, Xcode CLT on macOS, the
   "Desktop development with C++" workload plus Windows 10 SDK on Windows).
4. **Linux native-addon headers**, the same set upstream CI installs:

   ```sh
   sudo apt-get install -y libfontconfig1-dev uuid-dev libltc-dev libegl1-mesa-dev libgles2-mesa-dev
   ```

   (`osr-capture` links against `libEGL.so.1` and `libGLESv2.so.2`; on a desktop they are usually present
   already, on a bare CI runner they are not.)
5. **Git access to GitHub over HTTPS.** Seven dependencies are pinned to GitHub commits
   (`grandiose`, `libltc-wrapper`, `macadam`, `openmediatransport`, `osr-capture`, `slideshow`,
   `svelte-inspector`, plus transitive `open-in-editor`). npm resolves them to `git+ssh://` URLs, which
   fail unless an SSH key is registered with GitHub. Either register a key or add this rewrite once:

   ```sh
   git config --global url."https://github.com/".insteadOf "ssh://git@github.com/"
   ```

6. **Network access** during install: `electron` downloads its binary, and `grandiose` downloads the
   NDI 6 SDK from `downloads.ndi.tv` and compiles against it.

## Install

```sh
npm install
```

That is the whole step. Two repo files make it work on npm 12 (bundled with Node 24):

- `.npmrc` sets `allow-git=all` (npm 12 refuses git dependencies by default, error `EALLOWGIT`) and
  `allow-scripts-pin=false` (so approvals are recorded by package name, not version).
- `package.json` carries an `allowScripts` block. npm 12 blocks dependency install scripts unless they
  are listed there; the approved set is exactly the native addons and binary downloads the app needs
  (`electron`, `esbuild`, `better-sqlite3`, `@discordjs/opus`, `grandiose`, `libltc-wrapper`,
  `macadam`, `openmediatransport`, `osr-capture`, `protobufjs`, `electron-winstaller`,
  `@firebase/util`). `core-js-pure` and `svelte-preprocess` are denied; their scripts only print
  messages.

If an upstream merge adds a dependency with an install script, `npm install` will end with a
"blocked because they are not covered by allowScripts" notice. Review it, then:

```sh
npm approve-scripts --allow-scripts-pending    # list what is pending
npm approve-scripts <pkg>                       # or: npm deny-scripts <pkg>
```

The root `postinstall` (`electron-builder install-app-deps`) rebuilds the native addons against
Electron's ABI; it runs automatically at the end of `npm install`.

## Run

```sh
npm start
```

`scripts/start.js` frees port 3000, runs the pre-build step (cleans `build/` and `public/build/`,
copies the PDF.js worker into `public/assets/`), then starts three things together: the Vite dev server
for the renderer, a watch build of the LAN servers (remote, stage, controller, output), and a
`tsc --watch` of the Electron main process followed by `electron .`. First launch shows FreeShow's
setup popup (language, data folder) and onboarding guide.

## Build and check

| Command                | What it does                                                                 |
| ---------------------- | ---------------------------------------------------------------------------- |
| `npm run build`        | Production build: Vite renderer, server bundles, `tsc` main process to `build/` |
| `npm run test:unit`    | Vitest unit tests (`src/**/*.test.ts`)                                        |
| `npm run test:svelte`  | `svelte-check` type checking of the front end                                 |
| `npm run test:format`  | Prettier check (`config/formatting/.prettierrc.yaml`)                         |
| `npm run test:playwright` | Electron smoke test (`config/testing/start.test.ts`) against the last `npm run build`; needs a display (`xvfb-run` headless) and a one-time `npx playwright install chromium` |
| `npm run test:playwright` (agenda) | `config/testing/agenda.test.ts` also runs under this command: imports the fixture PDF/XLSX/DOCX/PPTX, opens each viewer, adds a timer, saves and relaunches; the PPTX step needs LibreOffice (`soffice` on PATH, `libreoffice-impress`) and is skipped without it |
| `npm run lint`         | ESLint + stylelint with `--fix`                                               |
| `npm run pack`         | Unpacked distributable via electron-builder (`dist/`)                        |

Configuration for all of these lives under `config/` (`building/`, `formatting/`, `linting/`,
`testing/`, `typescript/`).

`npm run build` rewrites `public/index.html` to load `./build/bundle.js` instead of the Vite dev entry
(see `scripts/postBuild.js`). Run `node scripts/cleanBuilds.js` afterwards to delete `build/` and
`public/build/` and restore the dev `index.html`, otherwise `git status` shows a spurious change and
`npm start` serves the stale bundle.

### Current baseline (after task 4, the rebrand and telemetry removal, 2026-10-18)

| Check                  | Result                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `npm install` (clean)  | OK                                                                                       |
| `npm run build`        | OK, ~60 s                                                                                |
| `npm run test:playwright` | OK, 1 passed                                                                          |
| `npm run test:unit`    | 104 passed, 1 failed: `src/electron/streaming/RtmpStreamer.integration.test.ts` (real-ffmpeg pipeline). Pre-existing. |
| `npm run test:format`  | 32 files not Prettier-clean, all pre-existing upstream drift (the strip formatted only files it had changed). |
| `npm run test:svelte`  | 151 errors, 56 warnings. Pre-existing.                                                   |

Rule for every task: build and Playwright green; the other three not worse than this table. Update the table
when a task legitimately moves a number.

### Baseline on the unmodified fork (2026-10-18, upstream 1.6.7-beta.2)

Upstream's `ci.yml` is `workflow_dispatch` only and has never run, so these checks are not enforced
upstream. Numbers below are the starting point; MCC work must not make them worse.

| Check                  | Result                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `npm install` (clean)  | OK, ~60 s                                                                                |
| `npm run build`        | OK, ~70 s                                                                                |
| `npm run test:playwright` | OK, 1 passed (~20 s): first-run setup, new project, new show, save                     |
| `npm run test:unit`    | 178 passed, 3 failed: two in `src/electron/cloud/syncManager.test.ts`, one in `src/electron/streaming/RtmpStreamer.integration.test.ts` (real-ffmpeg pipeline). Pre-existing. |
| `npm run test:format`  | 40 files not Prettier-clean (mostly `src/frontend/components`). Pre-existing.            |
| `npm run test:svelte`  | 195 errors, 60 warnings. Pre-existing; identical with and without build output present.  |

## Data locations and moving from FreeShow

MCC keeps its data apart from FreeShow:

| What | FreeShow | Meeting Control Center |
| --- | --- | --- |
| Electron `userData` (settings, projects, caches) | `…/FreeShow` (`…/freeshow` in dev) | `…/Meeting Control Center` (`…/meeting-control-center` in dev) |
| Default data folder (shows, media, backups) | `~/Documents/FreeShow` | `~/Documents/Meeting Control Center` |

On Linux `…` is `~/.config`, on macOS `~/Library/Application Support`, on Windows `%APPDATA%`. Nothing is
migrated automatically. To reuse FreeShow content, quit both apps, copy the FreeShow `userData` directory to the
MCC one (or just `projects.json`, `settings_synced.json`, `themes.json`, `templates.json`, `overlays.json`,
`stage.json`) and copy or point `config.dataPath` at the old data folder from Settings → Files. Shows removed
by the church-feature strip (scripture, chords, calendar items) load as plain text slides or are skipped.

## Platform notes

- **Linux (reference).** Everything above. Electron needs `--no-sandbox` under some sandboxes/CI; the
  Playwright test already passes it.
- **macOS.** Upstream CI pins Python 3.11 for `node-gyp` and installs `node-gyp` globally. Blackmagic
  (`macadam`) and NDI builds are expected to work out of the box with Xcode CLT.
- **Windows.** Install Visual Studio "Desktop development with C++" and the Windows 10 SDK before
  `npm install`; `grandiose` downloads `innoextract` to unpack the NDI SDK installer.

## Troubleshooting

- `EALLOWGIT` / "Fetching packages of type git have been disabled": the repo `.npmrc` was not picked
  up (check you are running npm from the repo root) or an older npm overrides it.
- `Permission denied (publickey)` while fetching a dependency: add the HTTPS rewrite from
  prerequisite 5.
- `Source directory does not exist: .../grandiose/ndi/lib/lnx-x64` during `electron-builder
  install-app-deps`: grandiose's own install script was skipped (allowScripts) so the NDI SDK was never
  downloaded. Confirm the `allowScripts` block is present, then `npm rebuild grandiose && npm run postinstall`.
- `electron` has no `dist/` folder: its postinstall was skipped; `npm rebuild electron`.
- `browserType.launch: Executable doesn't exist at .../ms-playwright/chromium_headless_shell-...`: the
  smoke test's `context` fixture needs Playwright's Chromium even though the app under test is Electron;
  run `npx playwright install chromium` once.
