# 03f — Remove cloud sync (Google Drive and ChurchApps)

Branch: `strip/cloud-sync`. Protocol: `docs/tasks/README.md`. Map: `docs/codebase-map.md` §9d.
Runs after 03a–03e are integrated (03c already removed `ChurchAppsSyncManager.ts`).

## Goal
Remove cloud synchronisation of shows and settings. Local save, backups and the data folder stay.

## Delete
- `src/electron/cloud/` (whole dir, including `syncManager.test.ts` and `syncLedger.test.ts`; this removes
  the two baseline unit-test failures)
- `src/frontend/utils/cloudSync.ts`, `src/frontend/utils/drive.ts`
- `src/frontend/components/main/popups/CloudSync.svelte`, `CloudMethod.svelte`, `CloudUpdate.svelte`

## Edit (remove only cloud lines)
- `src/electron/index.ts`: the `CLOUD` channel listener and `cloudConnect` import. `src/types/Channels.ts`:
  `CLOUD`. `src/electron/preload.ts` if it lists channels explicitly.
- `src/electron/data/store.ts`: `DRIVE_API_KEY` and `CACHE_SYNC` store files; `src/types/Save.ts`:
  `DRIVE_API_KEY`, `cloudSyncData`, `driveData`; `src/electron/data/save.ts` and `data/backup.ts`: cloud
  branches; `src/electron/utils/files.ts`: `cloud: "Cloud"` in `dataFolderNames` and helpers;
  `src/electron/utils/close.ts` if it waits for sync on quit.
- `src/frontend/stores.ts`: `cloudSyncData`, `driveKeys`, `driveData`, `cloudUsers`. `src/electron/data/defaults.ts`.
- `src/frontend/utils/startup.ts`, `save.ts`, `receivers.ts`, `listeners.ts`, `shortcuts.ts`
  (`disablePopupClose` has `cloud_method`), `main/Popup.svelte`, `main/MenuBar.svelte` / `Top.svelte`
  (sync button or status), `settings/tabs/Files.svelte` or wherever the Drive settings UI lives,
  `context/contextMenus.ts`, `quicksearch/`, `values/` entries.
- `src/types/IPC/Main.ts` / `ToMain.ts` and both `responsesMain.ts`: cloud/drive ids and handlers.
- Find the rest: `grep -rniE "cloud|drive(Keys|Data|Sync)|syncManager|syncLedger" src --include=*.ts --include=*.svelte -l`
  (ignore `syncedOutputs`, `SYNCED_SETTINGS`, hardware "driver" words, and Canva "cloud" strings).

## Keep
`SYNCED_SETTINGS` (the portable settings file is unrelated to cloud sync), backups, profiles, the
`@googleapis/drive` package removal is done by the orchestrator.
