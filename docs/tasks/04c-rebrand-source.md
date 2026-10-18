# 04c — Rebrand source text

Branch: `rebrand/source`. Protocol: `docs/tasks/README.md` (gates: svelte-check ≤ 177 errors, unit ≤ 1 failure).
Map: `docs/codebase-map.md` §10.

## Goal
Every user-visible "FreeShow" in `src/**/*.ts|svelte` becomes "Meeting Control Center" (or "MCC" where a
short name fits: MIDI port names, Bonjour service names, user agents), links to upstream's site and GitHub are
removed or repointed at `https://github.com/zerokurns/meeting-control-center`, and the default data folder
gets the new name. About 60 files; `grep -rn "FreeShow" src --include=*.ts --include=*.svelte` is the worklist.

## Rules
- Rename user-visible text, format labels ("FreeShow project" → "Meeting Control Center project"), device and
  service names, and the LLM prompts in `src/frontend/ai/llm/prompts.ts`, `llmManager.ts`, `ai/manager/ChatAction.ts`.
- Keep file extensions (`.show`, `.project`) and internal identifiers that are persisted or matched in code
  (`freeshow_project`, `freeshow_theme`, `data-freeshow-text`) unless renaming is a one-file change with no
  persisted data; say which you kept.
- `src/electron/utils/files.ts` `getDefaultDataFolderRoot`: `appFolderName = "Meeting Control Center"` and fix the
  comments (`Documents/FreeShow` → `Documents/Meeting Control Center`). No migration code: a fresh install
  starts empty; `config.dataPath` still wins when set.
- Links: remove quicksearch entries that point to `freeshow.app` docs or FreeShow YouTube tutorials
  (`components/quicksearch/quicksearch.ts`); in `main/popups/About.svelte` replace site/GitHub/support links
  with the single repository link and drop donation/"support us" text; `main/Tipbar.svelte` tips that mention
  FreeShow get the new name or go; `main/Splash.svelte` shows the new name.
- Logos: `src/server/remote/components/Auth.svelte` and `src/server/stage/App.svelte` import
  `public/import-logos/freeshow.webp`; point them at `public/icon.png` (same relative-URL technique) and delete
  `public/import-logos/freeshow.webp` if nothing else references it.
- `drawer/media/unsplash.ts`: `utm_source=mcc`. `components/slide/views/Captions.svelte` and
  `edit/scripts/itemHelpers.ts`: caption room prefix `"freeshow"` → `"mcc"` (new rooms only; harmless).
- `src/electron/index.ts` keeps `Referer = "https://freeshow.app/"` for YouTube embeds; add a one-line comment
  that any https referer works and this one is kept until MCC has a domain.
- `src/electron/utils/midi.ts` (virtual port names), `electron/audio/IcecastSender.ts`,
  `electron/streaming/WebRtcHost.ts`, `electron/data/bonjour.ts` (service names), `utils/windowOptions.ts` /
  `index.ts` (window titles), `frontend/global.d.ts`, `values/keys.ts`, `utils/createData.ts`,
  `utils/searchFast.ts`, `components/main/Top.svelte`, `ProfileSelector.svelte`, `settings/tabs/Outputs.svelte`,
  `converters/powerpoint/PowerPointHelper.ts`, `main/popups/Import.svelte` (format labels), `stores.ts` comment,
  `src/frontend/IPC/responsesMain.ts`, and the remote/stage server components listed by the grep.

## Do not touch (owned by 04a)
`src/frontend/main.ts`, `src/frontend/utils/startup.ts`, `src/electron/IPC/responsesMain.ts`,
`settings/tabs/Other.svelte`, `main/popups/Connect.svelte`, `show/Projects.svelte`, `config/testing/start.test.ts`,
anything named `interaction*`, `firebaseUtils.ts`, `remoteController.ts`, `checkForUpdates.ts`, `updater.ts`,
`UpdateManager.svelte`, `projectLink.ts`. Also nothing under `config/`, `scripts/`, `public/lang/`, `docs/`,
`package.json`, manifests or `index.html` files (owned by 04b).

## Definition of done
Protocol steps 2–7. Report the remaining `grep -rniE "freeshow|churchapps" src` hits with a one-line reason each.
One commit: `chore(brand): rename user-visible FreeShow text and links to Meeting Control Center`.
