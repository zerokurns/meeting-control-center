# Codebase map

Where things live in the FreeShow fork (upstream 1.6.7-beta.2, mapped 2026-10-18), and which modules are
church-specific. Read this before any strip or feature task; do not re-explore what it already answers.
Line counts are from `find … | xargs cat | wc -l` on `.ts`/`.svelte`/`.js` files and are there to size work,
not to be kept exact. Table counts were refreshed after the task-3 strip; the per-directory numbers further
down are the pre-strip figures from the first mapping and overstate removed areas.

| Area           | Path            | Files | Lines   | What it is                                                     |
| -------------- | --------------- | ----: | ------: | -------------------------------------------------------------- |
| Main process   | `src/electron`  |   118 |  23,028 | Electron main: windows, servers, stores, outputs, I/O addons   |
| Renderer       | `src/frontend`  |   637 | 134,495 | Svelte UI for the operator window and the output windows        |
| LAN web apps   | `src/server`    |   117 |  17,453 | Remote, stage, controller and output-stream pages (Svelte)      |
| Shared types   | `src/types`     |    19 |   2,538 | Show/project/settings/IPC contracts shared by all of the above  |
| Build scripts  | `scripts`       |     9 |     500 | `start.js`, pre/post build, server bundling                     |
| Config         | `config`        |     7 |     600 | electron-builder, Vite servers config, tsconfigs, lint, tests   |

## 1. Process model

- **Main process** entry: `src/electron/index.ts`. Creates the loading window, the main window
  (`utils/windowOptions.ts` has `loadingOptions`, `mainOptions`, `outputOptions`, `screenIdentifyOptions`),
  registers the IPC channel listeners at the bottom of the file, and `require("./servers")`s the LAN servers
  once the main window is up. Production loads `public/index.html`; development loads `http://localhost:3000`
  (Vite). `loadWindowContent(window, "output")` loads the same renderer into output windows.
- **Preload** `src/electron/preload.ts` exposes `window.api.{send,receive,removeListener}` keyed by the
  channel names in `src/types/Channels.ts`: `MAIN`, `OUTPUT`, `EXPORT`, `REMOTE`, `STAGE`, `CONTROLLER`,
  `OUTPUT_STREAM`, `CLOUD`, `NDI`, `OMT`, `BLACKMAGIC`, `AUDIO`.
- **Typed IPC on the `MAIN` channel**: `src/types/IPC/Main.ts` (enum `Main`, 153 ids, renderer → main,
  with send/return payload maps) and `src/types/IPC/ToMain.ts` (enum `ToMain`, 24 ids, main → renderer).
  Handlers: `src/electron/IPC/responsesMain.ts` (`mainResponses`, one entry per `Main.*`) and
  `src/frontend/IPC/responsesMain.ts` (one entry per `ToMain.*`). Helpers: `src/frontend/IPC/main.ts`
  (`sendMain`, `requestMain`, `receiveToMain`) and `src/electron/IPC/main.ts` (`sendToMain`, `requestToMain`).
  **Every new main-process capability goes through these two enums.**
- **Other channels** are dispatched directly in `index.ts`: `OUTPUT` → `output/OutputHelper.receiveOutput`,
  `EXPORT` → `data/export.ts`, `CLOUD` → `cloud/cloud.ts`, `NDI`/`OMT`/`BLACKMAGIC`/`AUDIO` → their `talk.ts`
  or `receive*.ts`. Renderer-side handlers for these live in `src/frontend/utils/receivers.ts`
  (`setupMainReceivers`, `receiveOUTPUTasOUTPUT`, `remoteListen`).
- **Renderer windows** are one Svelte app, `src/frontend/App.svelte`, switching on the `currentWindow` store:
  main UI → `MainLayout.svelte`; output window → `MainOutput.svelte`; `"pdf"` → the export renderer used by
  `data/export.ts`.
- **Renderer startup**: `src/frontend/main.ts` → `utils/startup.ts` (`startup()`, `startupMain()` pulls every
  store from main, loads the language, runs `contentProviderSync`, then `startupOutput()` for output windows).

## 2. Main process, directory by directory

| Path (`src/electron/…`) | Lines | Purpose                                                                                           | MCC |
| ----------------------- | ----: | ------------------------------------------------------------------------------------------------- | --- |
| `index.ts`              |   425 | App lifecycle, main/loading windows, menu, IPC listener registration                              | keep |
| `servers.ts`            |   257 | Express + socket.io for REMOTE/STAGE/CONTROLLER/OUTPUT_STREAM (see §3)                            | keep |
| `IPC/`                  |   642 | `main.ts` transport, `responsesMain.ts` the 153 `Main.*` handlers                                 | keep, prune church handlers |
| `data/store.ts`         |   330 | electron-store files (see §4), `FS_MOCK_STORE_PATH` test override, `migrateConfig()`              | keep |
| `data/save.ts`, `backup.ts`, `zip.ts` | 730 | Save all stores + `.show` files; zip backups to `Backups/`                              | keep |
| `data/import.ts`        |   348 | Main-side importers keyed `word`, `pdf`, `powerkey`, `sqlite`, `mdb` (Word via `word-extractor`, EasyWorship via `better-sqlite3`/`mdb-reader`, ProPresenter via `protobufjs`) | keep `pdf`; drop song-database importers |
| `data/export.ts`        |   404 | PDF/show/project export through a hidden renderer window                                          | keep |
| `data/thumbnails.ts`, `media.ts`, `downloadMedia.ts` | 807 | Media thumbnails/metadata, online media download                                     | keep |
| `data/bonjour.ts`       |   153 | mDNS advertisement of the LAN servers                                                             | keep |
| `data/protected.ts`     |   326 | `protected://` file protocol for media                                                            | keep |
| `data/bibleDetecter.ts` |    25 | Detects Bible JSON files                                                                           | **drop** |
| `data/contentProviders.ts` | 23 | Access-token storage for content providers                                                        | drop with providers |
| `output/`               | 1,928 | Output windows (see §5) and `ppt/` (see §7)                                                       | keep |
| `utils/files.ts`        | 1,478 | Data-folder layout, file dialogs, show scanning, media helpers                                     | keep |
| `utils/api.ts`          |   314 | WebSocket (5505), REST (5506) and OSC listeners for the action API                                 | keep |
| `utils/midi.ts`, `oscPatch.ts` | 271 | MIDI in/out (`jzz`), OSC fix                                                                   | keep |
| `utils/shows.ts`        |   167 | `.show` file enumeration, `trimShow` (index entry)                                                | keep |
| `utils/LyricSearch.ts`  |   298 | Genius lyrics search (`genius-lyrics`)                                                            | **drop** |
| `utils/spotify.ts`      |   246 | Spotify now-playing bridge                                                                        | **drop** (audio playlists are post-v1) |
| `utils/keys.ts`         |    20 | Obfuscated OAuth client ids for PCO, ChurchApps, AmazingLife                                      | drop with providers |
| `utils/updater.ts`      |    71 | electron-updater against upstream releases                                                        | rebrand (point at the fork or disable) |
| other `utils/`          |       | `close.ts`, `gpu.ts`, `init.ts` (`--profile`), `menuTemplate.ts`, `requests.ts`, `spellcheck.ts`, `windowOptions.ts`, `helpers.ts` | keep |
| `capture/`              | 2,541 | Grabs output-window frames (`osr-capture` shared texture or CPU) and fans them out                | keep (feeds NDI, stream, stage mirror, recording) |
| `ndi/`                  |   407 | NDI send/receive via `grandiose`                                                                  | keep |
| `omt/`                  |   340 | Open Media Transport send/receive                                                                  | keep (cheap) |
| `blackmagic/`           | 3,039 | DeckLink output/input via `macadam`                                                               | keep (cheap, isolated) |
| `streaming/`            | 2,242 | RTMP (`ffmpeg`), WebRTC host, encoder detection                                                   | keep |
| `audio/`                | 902   | Audio receive from renderer, Icecast sender, now-playing                                          | keep |
| `timecode/`             |   329 | LTC in (`libltc-wrapper`), MTC                                                                    | keep |
| `ai/`                   | 1,705 | LLM providers (Anthropic, OpenAI, Google, Ollama), local STT (sherpa-onnx Nemotron)               | evaluate: STT could serve captions; keep for now |
| `cloud/`                | 3,474 | Google Drive sync (`@googleapis/drive`) and ChurchApps sync, sync ledger                          | **drop** (cloud sync is out of scope) |
| `contentProviders/`     | 6,014 | OAuth content providers: `planningCenter/` (1,579), `churchApps/` (1,115), `onStage/` (746), `amazingLife/` (566), `canva/` (802), `base/` + registry (690) | **drop** PCO, ChurchApps, OnStage, AmazingLife; keep `base/` and Canva only if wanted |

## 3. LAN servers and the control API

`src/electron/servers.ts` builds one Express app + HTTP server + socket.io instance per server id and
serves static files from `build/electron/<id>/`, which `config/building/vite.config.servers.mjs` builds
from `src/server/<id>/main.ts` (`scripts/vite/createServerFiles.js` in prod, `watchServers.js` in dev).
Ports default to `REMOTE 5510`, `STAGE 5511`, `CONTROLLER 5512`, `OUTPUT_STREAM 5513` (`CAM` exists in
`src/server/cam/` but is commented out). Ports, enable flags, max connections and passwords come from the
renderer via `Main.SERVER_DATA` (`ports`, `disabledServers`, `serverData`, `maxConnections` stores; UI in
`settings/tabs/Connection.svelte`). Each server is advertised with Bonjour.

| App             | `src/server/…`    | Files | Lines  | Role                                                                 |
| --------------- | ----------------- | ----: | -----: | -------------------------------------------------------------------- |
| RemoteShow      | `remote/`         |    60 | 14,385 | Phone/tablet control: projects, shows, slides, media, overlays, **lyrics page, scripture pages**, tablet layout with its own drawer |
| StageShow       | `stage/`          |    32 |  4,661 | Stage display: layouts of items (slide text, notes, progress, clocks, timers, variables, **metronome visualizer**), optional output mirror |
| ControlShow     | `controller/`     |     5 |    565 | Minimal next/previous controller with preview                        |
| OutputShow      | `output_stream/`  |     5 |    371 | Live output picture in a browser                                     |
| shared          | `common/`         |    28 |  2,103 | Buttons/inputs, `util/show.ts`, `util/media.ts`, **`util/scripture.ts`, `util/transpose.ts`** |

Server state is pushed from the renderer: `src/frontend/utils/sendData.ts`, `remoteTalk.ts`,
`stageTalk.ts`, `controllerTalk.ts`, `streamPort.ts`, with store subscriptions in `utils/listeners.ts`.

**Action API** (what Companion, n8n and scripts hit):

- Transport: `src/electron/utils/api.ts` starts a socket.io WebSocket on **5505**, REST on **5506**
  (`DEFAULT_PORTS`) and an OSC listener; all three forward to the renderer.
- Catalogue: `src/frontend/components/actions/api.ts` (`API_ACTIONS` map: `next_slide`, `previous_slide`,
  `index_select_slide`, `clear_all`, `clear_overlays`, `start_show`, `lock_output`, `start_scripture`, …) with
  implementations in `apiHelper.ts` (1,237 lines) and getters in `apiGet.ts`. `actions.ts` runs the same ids
  for in-app actions, MIDI (`midi.ts`), emitters (`emitters.ts`: OSC/HTTP/MIDI out) and REST calls (`rest.ts`).
- The Bitfocus Companion module is external (bitfocus/companion-module-freeshow) and talks to 5505; keeping
  action ids stable keeps it working.

## 4. Stores and persistence

**Renderer state** is one file: `src/frontend/stores.ts` (530 lines, roughly 300 `writable`s). It is split
by comment into *temporary* (`activePage`, `activeShow`, `activeDrawerTab`, `outputs` cache, `selected`,
`activePopup`, …) and *saved* sections, and ends with `$` (all stores as an object, used by the save code).

**What is saved where** is declared in `src/types/Save.ts`: `SaveListSettings` → the `SETTINGS` file,
`SaveListSyncedSettings` → `SYNCED_SETTINGS`, plus dedicated files. `src/electron/data/store.ts`
(`storeFilesData`) maps them to electron-store JSON files:

| Store id | File              | Portable | Holds                                                   |
| -------- | ----------------- | -------- | ------------------------------------------------------- |
| `config` | `config.json`     | no       | `dataPath`, store locations, profile                     |
| `SETTINGS` | `settings.json` | no       | outputs, ports, theme, language, drawer state, … (`SaveListSettings`) |
| `SYNCED_SETTINGS` | `settings_synced.json` | yes | categories, styles, profiles, timers, variables, scenes, actions (`midiIn`), emitters, **scriptures, scriptureSettings**, groups, tags, … |
| `SHOWS`  | `shows.json`      | no       | `TrimmedShows` index (name, category, timestamps) of the `.show` files |
| `PROJECTS` | `projects.json` | yes      | `projects`, `folders`, `projectTemplates`                |
| `STAGE`  | `stage.json`      | yes      | stage layouts                                            |
| `OVERLAYS`, `TEMPLATES`, `THEMES`, `EVENTS` | one file each | yes | overlays, templates, themes, **calendar events** |
| `HISTORY`, `MEDIA`, `CACHE`, `CACHE_SYNC`, `USAGE`, `ERROR_LOG` | | no | undo stack, media metadata, caches, usage log, error log |
| `DRIVE_API_KEY`, `ACCESS` | | no   | Google Drive key, content-provider tokens                |

Non-portable files live in Electron's `userData` directory (the app name, e.g. `~/.config/FreeShow`);
portable ones move into `<data>/Config` when portable mode is on. `FS_MOCK_STORE_PATH` redirects all of
them (the Playwright test uses it). `setupStores()` runs `migrateConfig()` first, which is the hook for any
MCC data-location change.

**Data folder** (`src/electron/utils/files.ts` `dataFolderNames`): root is `config.dataPath`, defaulting
to `~/Documents/FreeShow`. Subfolders: `Shows`, `Backups`, `Media`, `Audio`, `Online`, `Exports`, `Imports`,
`Recordings`, `Config`, plus church ones `Bibles`, `Lessons`, `Planning Center`, `Cloud`.

**Shows** are individual files: `<data>/Shows/<name>.show`, JSON `[id, Show]`. `data/save.ts` writes
`showsCache` entries to disk on save; `utils/shows.ts` scans the folder and builds the trimmed index.
Save flow: renderer `utils/save.ts` → `Main.SAVE` → `data/save.ts`; autosave interval in `values/autosave.ts`;
`backup.ts` zips the store files (shows excluded on auto backup).

## 5. Show, project and output data model (`src/types`)

- **`Show.ts`** (684 lines): `Show { name, category, settings, timestamps, meta, slides: {id: Slide},
  layouts: {id: Layout}, media, … }`. A `Slide` has `group`, `color`, `notes`, `items: Item[]`; `Item.type` is
  `ItemType` (`text | media | camera | timer | clock | button | events | weather | variable | web | qr_code |
  icon | slide_tracker | visualizer | captions | metronome | current_output | chart | table`). A `Layout`
  orders slides via `LayoutRef[]` (with children, actions, transitions). `Overlay` and `Template` are
  single-slide shows. `Action`, `Emitter`, `Timer`, `Scene`, `Tag`, `OutBackground`/`OutSlide` (output state)
  are here too.
- **`Projects.ts`**: `Project { name, parent, created, shows: ProjectShowRef[] }`. `ProjectShowRef.type` is
  `ShowType` = `show | image | video | audio | player | section | overlay | effect | pdf | ppt | screen | ndi |
  camera | folder | DIVIDER | show_placeholder`. **This is the agenda seam**: an MCC agenda item is a
  `ProjectShowRef` with new `type`s (`document`, `spreadsheet`, …) and the project list UI in
  `components/show/Projects.svelte`, `ProjectList.svelte`, `ProjectContentList.svelte`, `project.ts`.
- **`Output.ts`**, **`Settings.ts`** (`Styles`, `Themes`, `Resolution`), **`Stage.ts`** (stage layouts),
  **`Tabs.ts`** (drawer/settings/top-view ids, `BibleCategories`), **`Main.ts`** (IPC payload types,
  `Interaction`, `Media`), **`History.ts`**, **`Calendar.ts`**, **`Bible.ts`**, **`Scripture.ts`**, **`Draw.ts`**.

## 6. Output windows

- Main side: `src/electron/output/OutputHelper.ts` is a static façade over `helpers/OutputLifecycle.ts`
  (953 lines: `createOutput`, `createOutputWindow`, preview window, OSR capture attach, frame pacing),
  `OutputBounds`, `OutputVisibility`, `OutputSend`, `OutputValues`, `OutputIdentify`, `OutputAlwaysOnTop`.
  Output windows use `outputOptions` (transparent, frameless, always-on-top) and are placed on displays by
  bounds saved in the `outputs` setting. Frames captured here feed `capture/` → NDI, OMT, Blackmagic,
  RTMP/WebRTC, `OUTPUT_STREAM` and the stage mirror.
- Renderer side: `MainOutput.svelte` → `components/output/Output.svelte` with layers in
  `components/output/layers/` (`Background`, `BackgroundMedia`, `SlideContent`, `Overlays`, `PdfOutput`,
  `SceneMedia`, `Media`), transitions in `output/transitions/`, effects in `output/effects/`. The operator's
  preview is `components/output/preview/` (`PreviewCanvas`, `MultiOutputs`, clear buttons) with controls in
  `output/tools/`. Slide/clear/next logic that both UI and API use: `components/helpers/showActions.ts`,
  `output.ts`, `OutputHelper.ts` (renderer one), `components/output/clear.ts`.
- Output and style configuration UI: `components/settings/tabs/Outputs*.svelte`, `Styles*.svelte`,
  `Screens.svelte`, popups `OutputSetup`, `ChooseScreen`, `ChangeOutputValues`.
- Stage display styling for in-app stage outputs reuses `components/stage/` (layout editor) and the stage
  server renders the same layouts in a browser.

## 7. Existing document support (what Phase 1 builds on)

- **PDF already works end to end**: `ShowType "pdf"` project item → `components/show/pdf/PdfPreview.svelte`
  in the operator window → `components/output/layers/PdfOutput.svelte` on the output, both on `pdfjs-dist`.
  `scripts/preBuild.js` copies `pdf.worker.min.mjs` into `public/assets/`. Page navigation goes through
  `helpers/showActions.ts` and the `next_slide`/`previous_slide` API ids.
- **PowerPoint**: `src/electron/output/ppt/`
  - `pptToPdf.ts`: picks a `.ppt/.pptx`, converts with **LibreOffice headless** (`soffice --headless
    --convert-to pdf`, probing default install paths per OS, 120 s timeout), falls back to PowerPoint COM
    (Windows) or AppleScript (macOS), writes to `<data>/Imports/PowerPoint/<name>.pdf`, then imports it as a
    PDF item. This is the spec's PPTX pipeline, minus background pre-render, progress and notes.
  - `pptToShow.ts`: unzips the `.pptx` and parses slide XML (`fast-xml-parser`) into text slides; the same
    XML path can yield speaker notes.
  - `presentation.ts`: remote-controls a running PowerPoint/Keynote through the `slideshow` package
    (`ShowType "ppt"`, `presentationApps` store, `presentation_control` strings). External-app control, not
    an embedded viewer.
- **Word**: `data/import.ts` `word` extracts plain text (`word-extractor`) to create a text show. No DOCX
  layout rendering exists. **Excel**: nothing. **Images/video**: full support via media items.

## 8. Renderer layout and where UI lives

`MainLayout.svelte` renders the top tabs (`activePage`: `show`, `edit`, `stage`, `draw`, `settings`;
`TopViews` also lists `reflow` and `calendar`), the center page, side panels and the bottom drawer.

| `src/frontend/components/…` | Lines  | What                                                                                     |
| --------------------------- | -----: | ---------------------------------------------------------------------------------------- |
| `main/`                     | 15,899 | `Top.svelte`, `MenuBar`, `Popup.svelte` + `popups/` (97 popups keyed by `activePopup`), toasts, tooltips, `Splash`, `Recorder` |
| `drawer/`                   | 23,147 | Bottom drawer: `Drawer.svelte`, `Content.svelte` (tab → page), `navigation/*Tabs.svelte` (sub-tabs), `info/` (right-hand info panes), pages below |
| `show/`                     |  7,726 | Show page: `Show.svelte`, `Slides.svelte`, project list (`Projects.svelte`, `ProjectList`, `ProjectContentList`, `project.ts`), `pdf/`, `ppt/`, `media/`, `tools/` (notes, metadata, groups) |
| `slide/`                    |  7,471 | Slide rendering shared by edit/show/output: `Slide.svelte`, `Textbox.svelte`, `views/` (timer, clock, chart, table, QR, website, captions, visualizer, weather…) |
| `edit/`                     | 12,035 | Editors (`editors/`: Slide, Overlay, Template, Media, Audio, Camera, Effect, Scene), `editbox/`, `tools/`, `scripts/` |
| `output/`                   |  9,226 | See §6                                                                                   |
| `stage/`                    |  2,530 | Stage layout editor (`StageLayout`, `Stagebox`, `items/`, `tools/`)                      |
| `settings/`                 |  5,136 | `Settings.svelte`, `SettingsTabs.svelte`, `tabs/` (general, display_settings=Outputs, styles, audio, connection, files, profiles, theme, ai, other) |
| `actions/`                  |  4,042 | Action API catalogue + MIDI/OSC/REST (see §3), `CreateAction.svelte`, `specific/`        |
| `context/`                  |  4,760 | Right-click menus: `contextMenus.ts` (definitions), `menuClick.ts` (handlers), `loadItems.ts` |
| `helpers/`                  | 14,391 | Cross-cutting logic: `history*.ts` (undo/redo), `show.ts`/`shows.ts`/`setShow.ts`, `showActions.ts`, `output.ts`, `media.ts`, `drop*.ts` (drag-and-drop), `clipboard.ts`, `T.svelte`/`Icon.svelte` |
| `draw/`                     |    656 | Draw/paint/spotlight page                                                                |
| `timeline/`                 |  3,682 | Slide and show timelines, timecode sync                                                  |
| `quicksearch/`              |  1,564 | Ctrl-space command palette                                                               |
| `export/`                   |  1,336 | PDF/project export UI                                                                    |
| `system/`, `inputs/`, `input/`, `media/`, `guide/` | | Generic widgets, media elements, onboarding guide (`guide/guideSteps.ts`) |

Drawer tabs (`values/tabs.ts`, `types/Tabs.ts` `DrawerTabIds`), rendered by `drawer/Content.svelte`:

| Tab         | Page component                         | Sub-tabs / notes                                              |
| ----------- | -------------------------------------- | ------------------------------------------------------------- |
| shows       | `drawer/pages/Shows.svelte`            | categories (`categories` store), `all`, `unlabeled`            |
| media       | `drawer/media/Media.svelte`            | folders, `online` (Pixabay/Unsplash), `canva`, screens/cameras/NDI/OMT/BMD via `drawer/live/` |
| audio       | `drawer/audio/Audio.svelte`            | folders, playlists, streams, mixers/effects, **`metronome`**   |
| overlays    | `drawer/pages/Overlays.svelte`         | overlay categories                                             |
| templates   | `drawer/pages/Templates.svelte`        | template categories                                            |
| scripture   | `drawer/bible/Scripture.svelte`        | **church**                                                     |
| calendar    | `drawer/calendar/Calendar.svelte`      | events, show scheduling                                        |
| functions   | `pages/Actions`, `timers/Timers`, `pages/Variables`, `pages/Scenes`, `pages/Interactions`, `pages/OBS` | sub-tab ids `actions`, `timer`, `variables`, `scenes`, `interactions`, `obs` |

Other renderer anchors: keyboard shortcuts `utils/shortcuts.ts` (`ctrlKeys`, `shiftCtrlKeys`, `altKeys`,
`keys`, `previewCtrlShortcuts`); i18n `public/lang/*.json` (31 languages; `en.json` has 77 groups and
1,697 strings, used through `helpers/T.svelte` and `utils/language.ts`); importers `src/frontend/converters/`
(dispatched from `ToMain.IMPORT2` in `frontend/IPC/responsesMain.ts`); analytics `utils/analytics.ts`
(Google Analytics), Sentry in `main.ts`; update check `utils/checkForUpdates.ts` (GitHub releases of
ChurchApps/freeshow, also mocked in the Playwright test).

## 9. Church-specific and out-of-scope modules

> **Status (task 3, 2026-10-18):** sections 9a–9h are done. Scripture, songs/chords/CCLI, Planning Center and the
> other church providers, cloud sync, draw, metronome, audio playlists/Spotify and the calendar are removed on
> branch `task/03-strip-church-features` (one commit each, about 41,800 lines). The inventories below are kept as
> the record of what was there and where the seams were; 9i is still open and 9j is the keep list.

Grouped as the spec's strip commits. "Couplings" are the shared files each removal touches; expect every
strip commit to also edit `stores.ts`, `types/Save.ts`, `public/lang/*.json`, `context/contextMenus.ts`,
`main/popups/` registration and `actions/api.ts`.

### 9a. Scripture and Bibles (drop)

| What                                   | Where                                                                                       | Size   |
| -------------------------------------- | ------------------------------------------------------------------------------------------- | -----: |
| Drawer tab                             | `components/drawer/bible/Scripture.svelte`, `scripture.ts`; `navigation/ScriptureTabs.svelte`; `info/ScriptureInfo.svelte` | 4,270 |
| Auto-detect from speech                | `frontend/ai/scripture/` (detectors, dictionaries), `ai/components/settings/AutoScriptureOptions.svelte` | 1,900 |
| Importers                              | `converters/bible.ts`, `bebliaBible.ts`, `osisBible.ts`, `zefaniaBible.ts`; `electron/data/bibleDetecter.ts` | |
| Popups                                 | `main/popups/ImportScripture.svelte`, `CreateCollection.svelte`                              | |
| Remote app                             | `server/remote/components/pages/Scripture*.svelte`, `server/common/util/scripture.ts`       | |
| Types / deps                           | `types/Bible.ts`, `types/Scripture.ts`, `BibleCategories` in `Tabs.ts`; npm `json-bible` (its `Bible` type is imported by `types/Save.ts` and `stores.ts`) | |
| State                                  | stores `scriptures`, `scripturesCache`, `scriptureSettings`, `activeScripture`, `scriptureHistory`, `customScriptureBooks`, `openScripture`, `scriptureMode`; `scripturesCache` save path in `data/save.ts`; data folder `Bibles` | |
| API                                    | `start_scripture`, `scripture_next`, `scripture_previous`, `API_scripture`                  | |

### 9b. Songs, lyrics, chords, CCLI (drop the song machinery, keep slides/groups/templates)

| What                                   | Where                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| Chords                                 | `EditMode "chords"` in `types/Tabs.ts`, `utils/chordTranspose.ts`, `converters/chordpro.ts`, popup `ChooseChord.svelte`, `storedChordsData` store, `server/common/util/transpose.ts`, `Chords` in `Show.ts`, API `transpose_show_up/down` |
| Lyrics search / quick lyrics           | `electron/utils/LyricSearch.ts` (npm `genius-lyrics`), `main/popups/createShow/WebSearch.svelte` and "Quick Lyrics" in `CreateShow.svelte`, remote `pages/Lyrics.svelte` |
| Auto verse/chorus labels               | `converters/txtAutoSections.ts`, `txt.ts`; default `groups` (verse, chorus, pre_chorus, bridge…) seeded in `src/electron/data/defaults.ts`; `popups/ManageGroups.svelte` keeps the generic group editor |
| CCLI / song metadata                   | `Show.meta` CCLI fields in `types/Show.ts`, `show/tools/Metadata.svelte`, `helpers/show.ts`, `setShow.ts`, `showActions.ts`, `stage/stage.ts`, `stage/tools/BoxStyle.svelte` (CCLI display) |
| Church-software importers              | `converters/easyworship.ts`, `propresenter.ts`, `openlp.ts`, `opensong.ts`, `quelea.ts`, `songbeamer.ts`, `videopsalm.ts`, `verseview.ts`, `softprojector.ts`, `easyslides.ts`, `mediashout.ts`; main side `data/import.ts` `sqlite`/`mdb` (npm `better-sqlite3`, `mdb-reader`) and ProPresenter protobuf (`protobufjs`, `public/proto/`) |
| Strings                                | `en.json` groups `create_show`, parts of `meta`, `groups`, `edit`                           |

Keep: `groups`/`categories` concept, `txt.ts` plain import (minus auto-sections), `csv.ts`, `xml.ts`,
`project.ts`, `imageShow.ts`, `canvaPresentation.ts`, `powerpoint/`.

### 9c. Planning Center and other church content providers (drop)

- `src/electron/contentProviders/planningCenter/`, `churchApps/`, `onStage/`, `amazingLife/`, plus
  `ContentProviderRegistry.ts` entries, `utils/keys.ts`, `data/contentProviders.ts`, `ACCESS` store.
- Renderer: `utils/pcoLiveSync.ts`, popups `PcoServicePicker.svelte`, `PcoServiceTreeNodes.svelte`,
  `Connect.svelte`, `ChurchAppsSyncCategories.svelte`; `contentProviderSync()` in `utils/startup.ts`;
  `converters/lessonsChurch.ts`; `drawer/media/ContentLibraryBrowser.svelte` (shared with Canva); stores
  `providerConnections`, `contentProviderData`, `lessonsLoaded`; data folders `Planning Center`, `Lessons`;
  settings `Connection` tab sections; `en.json` strings under `cloud`, `popup`, `settings`.
- Canva (`contentProviders/canva/`, `drawer/media/Canva.svelte`, `converters/canvaPresentation.ts`) is a
  generic design source; keep or drop by taste, it is not church-specific.

### 9d. Cloud sync (drop; also removes the two failing unit tests)

`src/electron/cloud/` (Drive + ChurchApps sync, `syncManager.ts`, `syncLedger.ts`), `cloud.ts` channel,
`utils/cloudSync.ts`, `utils/drive.ts`, popups `CloudSync`, `CloudMethod`, `CloudUpdate`, stores
`cloudSyncData`, `driveKeys`, `driveData`, `cloudUsers`, store file `DRIVE_API_KEY`, `CACHE_SYNC`, data folder
`Cloud`, npm `@googleapis/drive`, `en.json` `cloud(18)`.

### 9e. Draw / spotlight (drop)

`components/draw/` (page, tools, settings), `types/Draw.ts`, stores `drawTool`, `draw`, `paintCache`,
`paintCacheSlide`, `drawSettings`; on the output side `components/output/Output.svelte` imports `draw/Draw.svelte`
as a layer, and `output/clear.ts`, `slide/Zoomed.svelte`, `utils/receivers.ts` and `utils/listeners.ts` reference the
draw stores; `TopViews "draw"` and the tab in `main/Top.svelte`; API `clear_drawing`; `en.json` `draw(15)`.

### 9f. Metronome (drop)

`drawer/audio/Metronome.svelte`, `MetronomeInputs.svelte`, `MetronomeVisualizer.svelte`, `metronome.ts`;
`ItemType "metronome"` and `slide/views/` visualizer use; stage item `server/stage/items/MetronomeVisualizer.svelte`;
stores `metronome`, `playingMetronome`, `metronomeTimer`; sounds in `public/assets/metronome/`; `AudioTabs`
sub-tab `metronome`.

### 9g. Audio playlists and Spotify (post-v1; drop for now)

`frontend/audio/audioPlaylist.ts`, stores `audioPlaylists`, `activePlaylist`; `electron/utils/spotify.ts`,
`components/output/preview/SpotifyController.svelte`, `SpotifyManager.ts`, optional npm `libspotifyctl`.
Keep the rest of `frontend/audio/` (player, fading, routing, effects, meters): it is the media audio engine.

### 9h. Calendar scheduling (out of scope)

`drawer/calendar/` (1,522 lines), `converters/calendar.ts`, `types/Calendar.ts`, `events`/`calendars`/
`calendarAddShow` stores and the `EVENTS` file, popups `EditEvent`, `ImportCalendar`, `ItemType "events"`
(`slide/views/DynamicEvents.svelte`), `nextActionEvent*` stores (scheduled actions), `TopViews "calendar"`.
Note the `Timer`/`Clock` items are separate and stay.

### 9i. Not in the spec but worth deciding early

- **Interactions** (`drawer/pages/Interactions*.svelte`, `interactions.ts`, `firebaseUtils.ts`): audience
  polls stored in FreeShow's own Firebase project (`freeshow-net`). Useless outside upstream's account;
  drop.
- **Telemetry**: Google Analytics (`utils/analytics.ts`), Sentry (`@sentry/electron`, `autoErrorReport`),
  update checks against upstream. Disable or repoint during rebrand.
- **AI** (`electron/ai`, `frontend/ai`): keep the STT/caption path as a candidate meeting feature, drop
  `ai/scripture`.

### 9j. Keep (generic presenting and AV)

Outputs and styles, stage display, remote/controller/output-stream servers, action API + MIDI/OSC/REST
emitters, timers/clocks/variables/scenes/overlays/templates/profiles/themes, media and player items, NDI,
OMT, Blackmagic, capture, RTMP/WebRTC streaming, Icecast, timecode, OBS integration (`drawer/pages/OBS.svelte`,
`utils/obsTalk.ts`), quick search, history, export, PDF/PPT modules from §7.

## 10. Rebranding surface

> **Status (task 4, 2026-10-18):** done on branch `task/04-rebrand`. Package `meeting-control-center`, product
> name `Meeting Control Center`, app id `app.meetingcontrolcenter`, default data root `~/Documents/Meeting
> Control Center`, placeholder icons, all user-visible text and the 31 language files renamed; Sentry, Google
> Analytics, the upstream update check, Firebase interactions, the internet remote relay and freeshow.net share
> links removed. Kept on purpose: persisted import ids (`freeshow_project` …), the `freeshow-protected://` and
> `freeshow-cache` internal schemes, the `/freeshow/*` OSC address prefix (external API contract), the
> `FREESHOW_VAAPI_DEVICE` env var, and the YouTube `Referer` workaround. The list below is the original survey.

- `package.json` (`name`, `description`, `repository`), `config/building/electron-builder.yaml` and
  `electron-builder-lnxarm.yaml` (`appId: app.freeshow`, `productName`, artifact names, icons),
  `config/building/snapcraft.yaml`, `scripts/snap/`, `scripts/macos/notarize.js`, `config/building/rollup.config.mjs`.
- `"FreeShow"` appears in 75 `src` files (window titles, about popup, toasts, server pages, `menuTemplate`),
  once in `en.json`, and in `config/testing/start.test.ts` (release URL mock).
- Data: `~/Documents/FreeShow` (`getDefaultDataFolderRoot`) and the userData folder named after the app;
  `store.ts` `migrateConfig()` is where a rename migration belongs.
- Icons: `public/icon.{png,ico,icns}`, `public/512x512.png`, `public/dmg.png`, `src/server/icon.png`,
  `public/import-logos/`.
- Network identity: Bonjour service names in `data/bonjour.ts`, update feed in `utils/updater.ts`.

## 11. Working with upstream

Upstream lands roughly 6 squash-merged PRs a month, each touching hundreds of files (last 3 months: 20
commits, 688 files; hottest paths `src/frontend/components`, `frontend/audio`, `frontend/utils`,
`frontend/ai`, `server/remote`). Consequences for the fork:

- Delete whole files and directories where possible; avoid reformatting surviving files so merges stay
  mechanical. `stores.ts`, `types/Save.ts`, `en.json`, `contextMenus.ts` and `api.ts` will conflict on
  every merge regardless; keep MCC edits to those files minimal and grouped.
- New MCC code goes in `src/frontend/viewers/`, `src/electron/document/` and `src/electron/meet/` (per
  `docs/spec.md`) so it never collides with upstream paths.
