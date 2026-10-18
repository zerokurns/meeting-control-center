# 05 — Agenda items: document import and timer items

Branch: `feat/agenda-items`. Protocol: `docs/tasks/README.md` (gates: svelte-check ≤ 151, unit ≤ 1 failure).
Read first: `src/frontend/viewers/types.ts`, `src/frontend/viewers/registry.ts`, `src/frontend/agenda/agenda.ts`
(the shared contract; do not change its public shape), `docs/codebase-map.md` §5 and §7, `docs/spec.md` "Vision"
and task 5 of the kickoff prompt.

## Goal
An agenda is a project; its items are `ProjectShowRef`s. After this task an operator can add **documents**
(PDF, Word, Excel, PowerPoint) and **timers** to a project through the "+" menu or by dropping files, the files
are **copied into the data folder** (never referenced in place), PowerPoint is converted to PDF with LibreOffice
and its speaker notes are kept, and every item row shows its agenda kind. Rendering of document items on the
operator screen and the output is task 06 (parallel); do not build viewers or output layers here.

## Main process — `src/electron/document/` (new folder, spec-mandated)
- `libreoffice.ts`: move `getSofficePath`, `DEFAULT_SOFFICE_PATHS` and `convertWithLibreOffice` out of
  `src/electron/output/ppt/pptToPdf.ts` into here (export `findLibreOffice(): string | null` and
  `convertToPdf(input, outDir): Promise<string | null>`), and make `pptToPdf.ts` import them. Behaviour unchanged.
- `pptxNotes.ts`: `extractPptxNotes(pptxPath): Promise<{ [slideIndex: number]: string }>` by reading the zip
  (`decompressZipStream` / yauzl as `src/electron/output/ppt/pptToShow.ts` does) and parsing
  `ppt/slides/_rels/slideN.xml.rels` → `notesSlideM.xml` → text of `a:t` runs (fast-xml-parser). Slide order
  comes from `ppt/_rels/presentation.xml.rels` + `ppt/presentation.xml` `p:sldIdLst`. Unit-test it with
  `config/testing/fixtures/deck.pptx` (5 slides, every slide has a note; slide 0 note starts "Welcome").
- `importDocument.ts`: handler for a new `Main.IMPORT_DOCUMENTS` (payload `{ paths?: string[]; pick?: boolean;
  extensions: string[] }`; when `pick` is true open `selectFilesDialog` with those extensions). For each file:
  copy into `getDataFolderPath("documents")` (add `documents: "Documents"` to `dataFolderNames` in
  `src/electron/utils/files.ts`), de-duplicating names (`name (2).pdf`); if the extension is one that needs
  conversion (the renderer passes the list), convert to PDF into the same folder and, for `.pptx`, attach notes;
  return `ToMain.DOCUMENTS_IMPORTED` with `{ items: { id: finalPath; name; type: "document"; data: DocumentItemData }[]; failed: { path; reason }[] }`.
  If LibreOffice is missing, fail those files with a reason and send the same alert `pptToPdf.ts` shows (download
  link). Send a `ToMain.TOAST` when conversion starts for a file (it can take seconds).
- Register the ids in `src/types/IPC/Main.ts` / `ToMain.ts` with typed payloads and the handlers in both
  `responsesMain.ts` files (renderer side: append the items to the active project with the existing project
  helpers and select the first new item).

## Renderer
- `components/show/ProjectContentList.svelte` "+" menu: add **Document** (`new.document`, icon `document` if it
  exists in `values/icons.ts`, else pick a fitting one and update `AGENDA_KIND_ICONS` in
  `src/frontend/agenda/agenda.ts` accordingly) → `sendMain(Main.IMPORT_DOCUMENTS, { pick: true, extensions:
  acceptedDocumentExtensions() })`; and **Timer** (`new.timer_item`) → a small popup `TimerItemPicker.svelte`
  (register in `utils/popup.ts` / `types/Main.ts` popup ids) listing `timers` from the store with a "create new
  timer" shortcut to the existing timer popup; picking one appends `{ id: timerId, type: "timer", name }`.
- Row rendering: show the agenda-kind icon (`agendaKindOf(ref)` + `AGENDA_KIND_ICONS`) for `document`,
  `spreadsheet`, `timer`; keep everything else as is. Legacy `type: "pdf"` rows render as documents.
- File drop onto the project (`helpers/dropActions.ts`, `projectExtra`): pdf/docx/xlsx/pptx and the other
  `CONVERTED_EXTENSIONS` go through `Main.IMPORT_DOCUMENTS` (copy), replacing today's in-place `pdf` ref. Keep
  image/video/audio drops unchanged.
- `components/show/Show.svelte`: add **only** a `show.type === "timer"` branch rendering a new
  `components/show/timer/TimerItemView.svelte` (timer name, large remaining time, start/pause/reset buttons
  using the helpers in `components/drawer/timers/timers.ts` / `helpers/timerTick.ts`). Do not add a `document`
  branch; task 06 owns it.
- Activating a timer item (clicking it in the project list, or arriving at it with next-item navigation in
  `helpers/showActions.ts`) starts the referenced timer unless `data.autoStart === false`.
- Strings: add to `public/lang/en.json` only: `new.document`, `new.timer_item`, `agenda.document`,
  `agenda.spreadsheet`, `agenda.timer`, `agenda.import_failed`, `agenda.converting`.

## Definition of done
Protocol gates plus: `npm run test:unit` includes passing tests for `extractPptxNotes` and `agendaKindOf`;
`npm start` manual check is not required, but the Playwright smoke test must still pass. One commit:
`feat(agenda): document import with LibreOffice conversion, timer items`.

## Owned files (task 06 will not touch): everything above. Do not touch `src/frontend/viewers/**`,
`components/show/document/**`, `components/output/**`, `Show.svelte` beyond the timer branch.
