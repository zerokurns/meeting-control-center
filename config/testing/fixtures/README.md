# Test fixtures

Small, synthetic meeting documents used by the Playwright smoke test, the viewer unit tests and the user-testing
walkthrough. Generated with python-docx / openpyxl / python-pptx and LibreOffice; no real data.

| File | What it exercises |
| --- | --- |
| `agenda.pdf` | 5-page PDF (the deck converted with LibreOffice): PDF viewer, page navigation |
| `minutes.docx` | Headings, a table, bullet lists: DOCX viewer |
| `budget.xlsx` | Two sheets, formulas, column widths: XLSX viewer and sheet switching |
| `deck.pptx` | 5 slides with speaker notes: LibreOffice conversion on import and notes extraction |
