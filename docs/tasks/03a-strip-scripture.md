# 03a — Remove scripture and Bibles

Branch: `strip/scripture`. Protocol: `docs/tasks/README.md`. Map: `docs/codebase-map.md` §9a.

## Goal
Remove the Bible/scripture feature entirely: the drawer tab, importers, API actions, remote-app pages,
speech auto-detection, stores and saved data. After this commit the app builds, boots and presents, with no
"scripture" tab and no scripture code paths.

## Delete
- `src/frontend/components/drawer/bible/` (whole dir), `drawer/navigation/ScriptureTabs.svelte`,
  `drawer/info/ScriptureInfo.svelte`
- `src/frontend/ai/scripture/` (whole dir) and `src/frontend/ai/components/settings/AutoScriptureOptions.svelte`
- `src/frontend/converters/bible.ts`, `bebliaBible.ts`, `osisBible.ts`, `zefaniaBible.ts`
- `src/frontend/components/main/popups/ImportScripture.svelte`, `CreateCollection.svelte`
- `src/server/remote/components/pages/Scripture.svelte`, `ScriptureContent.svelte`,
  `ScriptureContentTablet.svelte`; `src/server/common/util/scripture.ts`
- `src/electron/data/bibleDetecter.ts`
- `src/types/Bible.ts`, `src/types/Scripture.ts`; `BibleCategories` in `src/types/Tabs.ts`

## Edit (remove only scripture lines)
- `src/types/Tabs.ts`: drop `"scripture"` from `DrawerTabIds`. `src/frontend/values/tabs.ts`: drop the
  `scripture` drawer tab. `src/frontend/components/drawer/Content.svelte` and `Navigation.svelte`: drop the
  tab branch and import. `drawer/info/Info.svelte`: drop the scripture info branch.
- `src/frontend/stores.ts`: remove `scriptures`, `scripturesCache`, `scriptureSettings`, `activeScripture`,
  `scriptureHistory`, `customScriptureBooks`, `openScripture`, `scriptureMode` and the `json-bible` type
  import. `src/types/Save.ts`: remove `scriptures`, `scriptureSettings`, `scripturesCache` and the
  `json-bible` import. `src/electron/data/save.ts`: remove the `scripturesCache` save branch.
  `src/electron/data/defaults.ts`: remove scripture defaults.
- `src/electron/utils/files.ts`: remove `scriptures: "Bibles"` from `dataFolderNames` and any scripture
  file helpers; `src/types/IPC/Main.ts` + `src/electron/IPC/responsesMain.ts` + `src/frontend/IPC/responsesMain.ts`:
  remove Bible/scripture ids and handlers.
- `src/frontend/components/actions/api.ts` / `apiHelper.ts` / `apiGet.ts`: remove `start_scripture`,
  `scripture_next`, `scripture_previous`, `API_scripture` and their implementations. Report the removed ids.
- `src/frontend/utils/shortcuts.ts` (`ctrl+h` special case), `quicksearch/`, `context/contextMenus.ts`,
  `context/menuClick.ts`, `main/Popup.svelte` popup registry, `main/popups/Import.svelte` (scripture
  formats), `helpers/` dynamic values that reference scripture, `frontend/ai/` suggestion code that calls
  the scripture detector, `utils/receivers.ts` / `listeners.ts`, remote-app routing in
  `src/server/remote/` (`App.svelte`, `components/Main.svelte`, tablet drawer pages, `util/`) and the
  stage server if it references scripture.
- Find the rest: `grep -rniE "scripture|bible" src --include=*.ts --include=*.svelte -l`. The expected
  starting hit count is about 120 files; finish at zero except `public/` assets and `lang` files.

## Keep
Everything else. In particular keep the generic drawer, categories, the `Import.svelte` popup for the
remaining formats, and the `frontend/ai/` STT/LLM code that does not depend on scripture.
