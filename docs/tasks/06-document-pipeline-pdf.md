# 06 — Document pipeline and the PDF viewer

Branch: `feat/document-pdf`. Protocol: `docs/tasks/README.md` (gates: svelte-check ≤ 151, unit ≤ 1 failure).
Read first: `src/frontend/viewers/types.ts`, `registry.ts`, `agenda/agenda.ts` (contract; keep its public shape),
`components/show/pdf/PdfPreview.svelte`, `components/output/layers/PdfOutput.svelte`, the pdf branch of
`helpers/showActions.ts` (around `nextSlide`/`previousSlide`, `setOutput("slide", { type: "pdf" … })`), and
`docs/codebase-map.md` §6–§7.

## Goal
Project items of `type: "document"` (and legacy `"pdf"`) are previewed, navigated and sent to outputs through the
shared viewer contract, with a real PDF viewer behind it. Task 05 (parallel) creates the items; until it lands you
can test with a legacy `pdf` item (drop `config/testing/fixtures/agenda.pdf` on a project) and by temporarily
hand-editing a project ref to `type: "document"`.

## Build
1. `src/frontend/viewers/pdf/PdfViewer.svelte` + `index.ts` (replace the stub): PDF.js rendering ported from
   `PdfOutput.svelte`/`PdfPreview.svelte` (same `GlobalWorkerOptions.workerSrc`, same `encodeFilePath` /
   `locateMediaFile` loading). Props per `DocumentViewerProps`; `fit: "page"` fits the whole page, `"width"` fits
   width; `zoom` multiplies; when the rendered page is taller than the container, `scrollY` (0..1) positions it.
   Interactive mode: wheel scrolls, ctrl+wheel zooms, arrow keys change unit; dispatch `state` on each change.
   `load()` returns units `Page 1..n`; `thumbnail()` renders a page to a canvas at the requested width (cache by
   path+unit+width). Use HiDPI-aware scaling as `PdfOutput.svelte` does.
2. `components/show/document/DocumentPreview.svelte`: operator view for document items. Layout: thumbnail strip
   (lazy, uses `module.thumbnail`; falls back to unit labels when it returns null), main viewer (interactive),
   toolbar (prev/next unit, unit `x / n`, zoom −/+, fit toggle, "Take" button), and the current unit's speaker
   note from `show.data?.notes` under the viewer. Clicking a thumbnail selects it in the preview **and** takes it
   to the output when the output is not locked (mirror `PdfPreview.svelte`'s `outputPdf` behaviour). Sending to
   output = `setOutput("slide", { id: path, type: "document", kind, unit, units, zoom, scrollY, fit, name, projectIndex })`.
3. `components/output/layers/DocumentOutput.svelte`: mounts `getViewer(kind).Component` non-interactive, filling
   the output, from the `OutSlide` fields; wire it in `components/output/Output.svelte` where the pdf layer is
   handled today (`actualSlide?.type === "pdf"` → also `"document"`). Transitions as the pdf layer has.
4. Migrate legacy PDF: `Show.svelte` renders `DocumentPreview` for both `pdf` and `document`; delete
   `show/pdf/PdfPreview.svelte` and `output/layers/PdfOutput.svelte` once nothing imports them. Legacy
   `OutSlide.page/pages` stay readable (map to unit/units when you encounter them).
5. `helpers/showActions.ts`: generalise the pdf page navigation to document units (next/previous unit, wrap to the
   next/previous project item at the ends exactly as pdf does today, `index_select_slide` selects a unit). Add one
   API id in `components/actions/api.ts`/`apiHelper.ts`: `set_document_view` with `{ unit?, zoom?, fit?, scrollY? }`
   applied to the active document output. Report it.
6. Stage display: if `utils/stageTalk.ts` sends slide notes for the current slide, send the current document unit's
   note the same way so the stage "notes" item shows it. Skip if it needs more than ~20 lines; say so.
7. Tests: vitest for `viewers/pdf/index.ts` `load()` on `config/testing/fixtures/agenda.pdf` if PDF.js runs in the
   node environment without a DOM (try `pdfjs-dist/legacy/build/pdf.mjs`); otherwise skip and report.

## Definition of done
Protocol gates; Playwright smoke test still passes; a manual `npm start` check is optional but describe what you
verified. One commit: `feat(viewers): document preview/output pipeline and PDF viewer`.

## Owned files: `src/frontend/viewers/pdf/**`, `components/show/document/**`, `components/output/layers/DocumentOutput.svelte`,
`Output.svelte` (document branch), `Show.svelte` (pdf/document branches only), `showActions.ts` (document navigation),
`api.ts`/`apiHelper.ts` (the new id), the two deleted files. Do not touch `ProjectContentList.svelte`,
`dropActions.ts`, `src/electron/**` (task 05 owns them) or `viewers/docx|xlsx/**` (tasks 06b/06c).
