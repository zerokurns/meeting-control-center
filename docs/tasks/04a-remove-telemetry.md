# 04a — Remove telemetry and upstream-hosted services

Branch: `strip/telemetry`. Protocol: `docs/tasks/README.md` (gates: svelte-check ≤ 177 errors, unit ≤ 1 failure).

## Goal
After this commit the app makes **no network requests to ChurchApps/FreeShow services or to third-party
telemetry**. Local error logging stays. Everything removed here is listed so the Phase 4 task can add
auto-update back against the fork's own releases.

## Remove
1. **Sentry.** `src/frontend/main.ts`: the `@sentry/electron/renderer` import and `Sentry.init`.
   `src/electron/IPC/responsesMain.ts`: the `@sentry/electron/main` import and `autoErrorReport()`, plus its
   call site in `src/electron/index.ts`. The `autoErrorReporting` config flag (`src/types/Main.ts` `Config`) and
   its toggle in `settings/tabs/Other.svelte`. Keep the `ERROR_LOG` store and the local error log.
2. **Google Analytics.** Delete `src/frontend/utils/analytics.ts` and every call (`utils/startup.ts` and
   wherever else `grep -rn analytics src` finds).
3. **Update checks against upstream.** Delete `src/frontend/utils/checkForUpdates.ts` and
   `main/popups/UpdateManager.svelte` (popup id `update_manager` in `src/types/Main.ts` and `utils/popup.ts`);
   remove the startup call, the `alertUpdates` store/setting (`stores.ts`, `types/Save.ts`,
   `electron/data/defaults.ts`, `utils/save.ts`, `utils/updateSettings.ts`), the "check for updates" button in
   `settings/tabs/Other.svelte`, `src/electron/utils/updater.ts` with `Main.AUTO_UPDATE` (enum + handler), and the
   `context.route("https://api.github.com/repos/ChurchApps/freeshow/releases", …)` mock in
   `config/testing/start.test.ts`. (`electron-updater` is removed from `package.json` by the orchestrator.)
4. **Interactions** (audience polls stored in upstream's Firebase project `freeshow-net`). Delete
   `drawer/pages/Interactions.svelte`, `InteractionsInfo.svelte`, `interactionSlides.ts`, `interactions.ts`,
   `firebaseUtils.ts` and `main/popups/InteractionInput.svelte`; remove the `interactions` sub-tab from
   `drawer/navigation/FunctionsTabs.svelte`, `drawer/Content.svelte`, `drawer/info/`; stores `interactions`,
   `activeInteractions`, `openedInteractionId`; `types/Save.ts` `interactions`; `types/Main.ts` `Interaction`
   and the popup id; `types/Show.ts` reference type `"interaction"` and the branch in `slide/Reference.svelte`;
   `electron/data/defaults.ts`; any API ids (`grep -n interaction src/frontend/components/actions/`).
5. **Internet remote control relayed through freeshow.net.** `src/frontend/utils/remoteController.ts`
   (Firebase) and the "remote controller" section of `main/popups/Connect.svelte`
   (`https://freeshow.net/control?id=…`), plus the settings/stores that enable it. The LAN remote on port 5510
   and the LAN QR codes in `Connect.svelte` stay.
6. **Project share links to freeshow.net.** `shareProjectLink` in `components/export/projectLink.ts` and its
   button in `show/Projects.svelte`. If `projectLink.ts` has no other user afterwards, delete it together with
   `ProjectLinkTypes.ts`; keep file-based project export (`export/project.ts`).
7. Find the rest: `grep -rniE "sentry|analytics|trackEvent|checkForUpdates|alertUpdates|UpdateManager|AUTO_UPDATE|autoErrorReport|interaction|firebase|remoteController|freeshow\.net|shareProjectLink" src config`.
   In the files you edit, you may also change user-visible "FreeShow" text to "Meeting Control Center"; leave
   other brand text to task 04c.

## Keep
caption.ninja captions (third-party, user-initiated), Pixabay/Unsplash/weather lookups (user-initiated),
Bonjour LAN discovery, the LAN remote/stage/controller/output servers, the YouTube referer workaround in
`src/electron/index.ts`.

## Files owned by this task (04c will not touch them)
`src/frontend/main.ts`, `src/frontend/utils/startup.ts`, `src/electron/IPC/responsesMain.ts`,
`settings/tabs/Other.svelte`, `main/popups/Connect.svelte`, `show/Projects.svelte`, `config/testing/start.test.ts`,
everything under item 4–6.
