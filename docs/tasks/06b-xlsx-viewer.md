# 06b — XLSX viewer

Branch: `feat/xlsx-viewer`. Protocol: `docs/tasks/README.md` (gates: svelte-check ≤ 151, unit ≤ 1 failure).
Read first: `src/frontend/viewers/types.ts` and `registry.ts` (the contract; keep its public shape),
`src/frontend/viewers/pdf/index.ts` (stub shape), `components/helpers/media.ts` (`encodeFilePath`,
`locateMediaFile`) for how local files are fetched in the renderer.

## Goal
Replace the stub in `src/frontend/viewers/xlsx/` with a real viewer built on SheetJS (`xlsx` 0.18.5, already in
package.json): units are sheets, rendered as a read-only HTML table that honours merges, column widths and number
formats. No grid library (decision in `docs/decisions.md`: a presenting view does not need editing).

## Build
- `index.ts`: `load(path)` fetches the file (`fetch(encodeFilePath(path))` → `arrayBuffer` → `XLSX.read(buf,
  { type: "array", cellDates: true })`), returns units = `workbook.SheetNames` (label = sheet name), title = file
  name. `thumbnail()` returns null (the preview falls back to labels). Export the module as default and keep
  `extensions: ["xlsx", "xlsm", "xls", "csv"]`.
- `XlsxViewer.svelte` with `DocumentViewerProps`: renders sheet `unit` via `XLSX.utils.sheet_to_html` (`editable:
  false`) into a container, then styles it (CSS in the component: borders, header row bold, zebra rows, numbers
  right-aligned, `!cols` widths applied as `<col>` widths, merged cells preserved by SheetJS). `fit: "width"` scales
  the table to the container width (CSS `transform: scale` on a measured wrapper), `"page"` scales so the whole
  used range fits; `zoom` multiplies; `scrollY` scrolls the wrapper. Interactive mode: wheel scroll, ctrl+wheel
  zoom, left/right arrows change sheet; dispatch `state`. Large sheets: cap rendering at 2,000 rows and show a
  footer line "showing first 2,000 rows". Dispatch `info` after load and `error` on failure.
- Keep the whole viewer self-contained in `src/frontend/viewers/xlsx/`; add a `README.md` there (10 lines) on
  limits (no charts, no pivots, formulas show cached values).
- Tests: vitest `src/frontend/viewers/xlsx/xlsx.test.ts` loading `config/testing/fixtures/budget.xlsx` through the
  same parsing function as `load()` (factor the parsing so it accepts an ArrayBuffer): expects sheets `Budget 2026`
  and `Attendance`, 7 and 6 rows respectively, and that the first cell is "Line item".

## Definition of done
Protocol gates (build, svelte-check, unit, Playwright). One commit: `feat(viewers): XLSX viewer on SheetJS`.
Owned files: `src/frontend/viewers/xlsx/**` only (plus the test). Do not touch any other file.
