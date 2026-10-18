# 07 — Smoke test for agenda items and documents, wired into CI

Branch: `test/agenda-smoke`. Protocol: `docs/tasks/README.md` (gates: svelte-check ≤ 151, unit ≤ 1 failure).
Read first: `config/testing/start.test.ts` (the existing Electron smoke test: first-run setup, new project, new
show, save), `config/testing/playwright.config.ts`, `components/show/ProjectContentList.svelte` (the "+" menu:
button `.addButton`, menu `.addMenu`, entries titled `new.document` / `new.timer_item` / `new.section`, English
labels "Document", "Timer", "Section"), `src/electron/document/importDocument.ts` (`pick: true` calls
`selectFilesDialog`, which uses Electron's `dialog.showOpenDialog`, already mocked in the test),
`components/show/document/DocumentPreview.svelte` and `src/frontend/viewers/*/` (what the preview renders per
format; add `data-testid` attributes there if no stable selector exists), `.github/workflows/ci.yml`.

## Goal
Milestone 0 definition of done, automated: the app presents document agenda items and reopens the saved project.
One Playwright spec, run locally and in CI.

## Build
1. New spec `config/testing/agenda.test.ts` (keep `start.test.ts` as is). Flow, each step with an assertion:
   a. Launch as `start.test.ts` does (`FS_MOCK_STORE_PATH`, mocked `dialog.showOpenDialog`, first-run setup,
      skip guide). Make the dialog mock return **whatever paths the test sets next**, so the data-folder pick and
      the document picks can return different values (keep a mutable array in the main process via
      `electronApp.evaluate`).
   b. "New project" → name it "Smoke meeting".
   c. "+" → "Document" with the mock returning the absolute paths of `config/testing/fixtures/agenda.pdf`,
      `budget.xlsx`, `minutes.docx` → expect three project rows whose names start with `agenda`, `budget`,
      `minutes` (order may follow the import). Wait up to 20 s.
   d. If `soffice` is on PATH (check with `which` from the test via `child_process`), repeat with `deck.pptx` →
      expect a `deck` row and that its item data has `notes` (read the `projects` store through the main process:
      `electronApp.evaluate` cannot see renderer stores, so instead read `<FS_MOCK_STORE_PATH>/projects.json`
      after a save, or expose nothing new: simplest is to press `Ctrl+S` then parse that JSON file from the test).
      Skip this step with a logged note when LibreOffice is absent.
   e. Click the `agenda` row → expect the PDF viewer canvas to appear; press `ArrowRight` → the unit indicator
      shows 2 / 5 (the fixture has five pages; or assert the thumbnail selection moves). Click `budget` → expect a table with a cell containing
      "Line item"; press `ArrowRight` → the second sheet (a cell "Meeting"). Click `minutes` → expect rendered
      docx content containing "Minutes" (heading text).
   f. "+" → "Timer" → pick/create a timer named "Smoke timer" (the picker popup; if creating requires the timer
      popup, drive it) → expect a timer row; click it → the timer item view shows a time.
   g. `Ctrl+S`, close the app the way `start.test.ts` does, relaunch with the same `FS_MOCK_STORE_PATH` and data
      folder, expect the project "Smoke meeting" and its rows to be present and the `agenda` row to render again.
2. Keep selectors resilient: prefer `getByText`/`getByTitle` on the English labels and `data-testid`s you add
   (`document-preview`, `document-unit-indicator`, `document-thumbnails`, `timer-item-view` …). Adding
   `data-testid` attributes to components is allowed and is the only component change permitted.
3. `config/testing/playwright.config.ts`: keep one worker; raise the per-test timeout to 180 s for the new spec if
   needed (document conversion in CI is slow).
4. `.github/workflows/ci.yml`: install LibreOffice Impress for the PPTX step (`sudo apt-get install -y
   libreoffice-impress --no-install-recommends`; accept the extra minute) and make sure the smoke step runs both
   specs (it already runs `npm run test:playwright`).
5. `docs/dev-setup.md`: one line under "Build and check" naming the new spec and the LibreOffice requirement.

## Definition of done
Protocol gates; both Playwright specs pass locally under `xvfb-run` (report their durations); `npm run
test:playwright` runs both. One commit: `test: Electron smoke test for agenda documents and timers; CI installs LibreOffice`.
Owned files: `config/testing/**`, `.github/workflows/ci.yml`, `docs/dev-setup.md` (one line), and `data-testid`
additions only in `src/frontend/components/show/document/**`, `components/show/timer/**`,
`src/frontend/viewers/**`.
