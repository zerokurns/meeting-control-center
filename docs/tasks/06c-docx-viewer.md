# 06c — DOCX viewer

Branch: `feat/docx-viewer`. Protocol: `docs/tasks/README.md` (gates: svelte-check ≤ 151, unit ≤ 1 failure).
Read first: `src/frontend/viewers/types.ts` and `registry.ts` (the contract; keep its public shape),
`src/frontend/viewers/pdf/index.ts` (stub shape), `components/helpers/media.ts` (`encodeFilePath`,
`locateMediaFile`) for how local files are fetched in the renderer. docx-preview 0.4.1 is already in package.json
(`import { renderAsync } from "docx-preview"`).

## Goal
Replace the stub in `src/frontend/viewers/docx/` with a real viewer built on docx-preview: layout-faithful
rendering of Word documents, paginated where the document has page/section breaks, otherwise one scrolling unit.

## Build
- `index.ts`: `load(path)` fetches the file (`fetch(encodeFilePath(path))` → `blob`/`arrayBuffer`) and renders it
  once into a detached container with `renderAsync(buffer, container, undefined, { breakPages: true,
  ignoreWidth: false, inWrapper: true, useBase64URL: true })` to count pages (`container.querySelectorAll("section.docx")`),
  returning units `Page 1..n` (n ≥ 1) and title = file name. Cache the rendered HTML per path so the component does
  not render twice. `thumbnail()` returns null. Keep `extensions: ["docx"]`.
- `DocxViewer.svelte` with `DocumentViewerProps`: mounts the rendered pages; shows only page `unit` (hide the other
  `section.docx` elements); `fit: "page"` scales the page box to fit the container (measure the section's width and
  height and apply `transform: scale`), `"width"` fits width; `zoom` multiplies; `scrollY` scrolls when taller than
  the container. Interactive mode: wheel scroll, ctrl+wheel zoom, arrow keys change unit; dispatch `state`, `info`,
  `error`. Default page background white with a subtle shadow so it reads as a document on dark outputs; respect the
  `background` prop for the area around the page.
- Fonts: docx-preview injects font faces from the file when `useBase64URL` is on; leave default fonts otherwise.
- Keep everything in `src/frontend/viewers/docx/`; add a `README.md` there (10 lines) on limits (complex layouts
  drift, no tracked changes, no macros).
- Tests: docx-preview needs a DOM; vitest runs in node here, so instead add a unit test for a pure helper you
  factor out (for example `countPagesFromHtml(html)` or the extension/unit-label logic) on a fixed string. Do not
  add jsdom.

## Definition of done
Protocol gates (build, svelte-check, unit, Playwright). One commit: `feat(viewers): DOCX viewer on docx-preview`.
Owned files: `src/frontend/viewers/docx/**` only (plus the test). Do not touch any other file.
