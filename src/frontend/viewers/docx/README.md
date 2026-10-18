# DOCX viewer

Renders Word (.docx) files with docx-preview. The file is rendered once per path (`render.ts`) into HTML and
cached; the component mounts that HTML and shows one page (`section.docx`) at a time.

- Pages follow docx-preview's `breakPages`: explicit page and section breaks, plus page size from the file.
  A document without breaks is one tall page, scrolled with `scrollY`.
- Fit and zoom use `transform: scale` on the page box (`helpers.ts`); the area around the page takes `background`.
- Limits: complex layouts (text boxes, columns, floating shapes) can drift from Word; page breaks caused by
  text overflow are not reflowed, so counts can differ from Word.
- No tracked changes or comments, no macros, no embedded OLE objects; legacy .doc is converted to PDF elsewhere.
- Fonts embedded in the file are loaded; other fonts fall back to what the system has installed.
- Horizontal panning is not supported when zoomed wider than the view (the page stays centred).
