# 03c — Remove Planning Center and the other church content providers

Branch: `strip/planning-center`. Protocol: `docs/tasks/README.md`. Map: `docs/codebase-map.md` §9c.

## Goal
Remove the Planning Center, ChurchApps (B1/Chums), OnStage and AmazingLife (Lessons.church) integrations.
The content-provider framework (`base/`, the registry) and the Canva provider stay so a generic provider can
be added later.

## Delete
- `src/electron/contentProviders/planningCenter/`, `churchApps/`, `onStage/`, `amazingLife/` (whole dirs)
- `src/electron/cloud/ChurchAppsSyncManager.ts` (it exists only for the ChurchApps provider; remove its
  references in `cloud/cloud.ts` / `cloud/syncManager.ts` with the smallest edit, the rest of cloud sync is
  a separate task)
- `src/frontend/utils/pcoLiveSync.ts`, `src/frontend/converters/lessonsChurch.ts`
- `src/frontend/components/main/popups/PcoServicePicker.svelte`, `PcoServiceTreeNodes.svelte`,
  `ChurchAppsSyncCategories.svelte`; `Connect.svelte` only if nothing but these providers uses it (check
  Canva first)
- `src/electron/utils/keys.ts` entries `pco_id`, `churchApps_id`, `churchApps_secret`, `amazinglife_id`
  (keep the file if `enc_*` keys are still used; otherwise delete it and its callers)

## Edit (remove only provider lines)
- `src/electron/contentProviders/ContentProviderRegistry.ts`: keep only the Canva registration.
  `base/types.ts`: `ContentProviderId` becomes `"canva"`; remove song-specific types
  (`ContentProviderSongData` etc.) if nothing left uses them.
- `src/electron/utils/files.ts`: remove `lessons: "Lessons"` and `planningcenter: "Planning Center"` from
  `dataFolderNames` and their helpers. `src/electron/IPC/responsesMain.ts`, `src/types/IPC/Main.ts`,
  `ToMain.ts`: remove PCO/ChurchApps/OnStage/AmazingLife ids and handlers.
- `src/frontend/stores.ts`: remove `lessonsLoaded`; keep `providerConnections` and `contentProviderData`
  (Canva uses them). `src/frontend/utils/startup.ts` `contentProviderSync`: keep only what Canva needs.
- `src/frontend/components/settings/tabs/Connection.svelte` and related settings components: remove the
  PCO/ChurchApps/OnStage/AmazingLife sections. `drawer/media/ContentLibraryBrowser.svelte` and
  `drawer/media/Media.svelte`: remove the Lessons/AmazingLife branches, keep Canva.
- `main/popups/Import.svelte`, `context/contextMenus.ts`, `main/Popup.svelte`, `utils/receivers.ts`,
  `listeners.ts`, `show/Projects.svelte` (PCO service import buttons), `drawer/pages/Shows.svelte`.
- Find the rest: `grep -rniE "planning ?center|pco|churchapps|chums|onstage|amazinglife|lessons" src --include=*.ts --include=*.svelte -l`
  (ignore matches that are only the word "lessons" in unrelated prose).

## Keep
`contentProviders/base/`, `contentProviders/canva/`, `ContentProviderRegistry.ts` (Canva only),
`data/contentProviders.ts` (token storage, used by Canva), `converters/canvaPresentation.ts`,
`drawer/media/Canva.svelte`.
