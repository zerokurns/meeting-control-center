# XLSX viewer

Read-only spreadsheet viewer on SheetJS (`xlsx` 0.18.5). Units are sheets; each sheet is rendered as an HTML table.

- `parse.ts`: pure helpers (parse an ArrayBuffer, sheet list, sheet to table HTML). Unit-tested in `xlsx.test.ts`.
- `index.ts`: `DocumentViewerModule` (fetches the file via `encodeFilePath`). `XlsxViewer.svelte`: the component.
- Handles merged cells, column widths, number formats (SheetJS formatted text) and `.xlsx`, `.xlsm`, `.xls`, `.csv`.
- Fit: `width` scales the table to the container width, `page` fits the whole table; `zoom` multiplies.
- Limits: no charts, images, pivots, conditional formatting or cell styles (fills, fonts); formulas show cached values.
- Sheets are capped at 2,000 rows; a footer says "showing first 2,000 rows". No thumbnails (the preview uses labels).
- Very wide sheets in `page` fit become small; use `width` fit and zoom for those.
