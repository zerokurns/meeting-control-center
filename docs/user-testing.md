# User testing walkthrough

A 20-minute script to try Meeting Control Center on a real (or mock) meeting. It assumes a laptop with one
external display or a Google Meet call to share into. Where something does not work, note the step number and
what you saw; the "Known limits" list at the end says what is expected to be rough.

## 0. Setup (once)

1. Follow `docs/dev-setup.md`: `npm install`, then `npm start`. LibreOffice must be installed for PowerPoint
   files (`soffice` on PATH or in the default location); Debian/Ubuntu: `sudo apt install libreoffice-impress`.
2. First launch: pick a language and a data folder (default `~/Documents/Meeting Control Center`). Skip the guide.
3. Settings → Outputs: confirm one output exists; set it to the external display if you have one. Press `Ctrl+O`
   to toggle the output window.

Sample files for the steps below are in `config/testing/fixtures/` (`agenda.pdf`, `minutes.docx`,
`budget.xlsx`, `deck.pptx`).

## 1. Build an agenda (5 min)

1. In the left panel, **New project** → name it "Board meeting". A project is a meeting; its items are the agenda.
2. Press **+** at the bottom of the item list → **Document** → pick `deck.pptx`. Expect a toast while LibreOffice
   converts it, then a "deck" item with a document icon.
3. **+** → **Document** → pick `minutes.docx` and `budget.xlsx` together.
4. Drag `agenda.pdf` from your file manager onto the item list. It is copied into the data folder, not linked.
5. **+** → **Section** → "Treasurer's report"; drag it above the budget item. Sections are agenda headings.
6. **+** → **Timer** → create a 5-minute countdown called "Discussion".
7. **+** → **New show** → "Welcome" with one text slide ("Welcome, we start at 10:00") using Quick text.
   Drag it to the top.

## 2. Present (10 min)

1. Click **Welcome** and press `Space`: the slide should appear on the output. `Space`/`→` advances,
   `←` goes back. `F1` blanks the output, `F1` again restores it.
2. Click **deck**: the thumbnails strip shows the slides, the main area the current slide, the speaker note under
   it. Click slide 2 → it should be on the output. Use `→` to page through; at the last slide `→` moves to the next
   agenda item.
3. Click **minutes.docx**: page through; try the zoom buttons and the fit toggle; scroll a zoomed page with the
   wheel. Take a page to the output.
4. Click **budget.xlsx**: switch between the two sheets with `→`/`←` or the thumbnails; check the numbers and
   column widths; take a sheet to the output.
5. Click **agenda.pdf**: page through; confirm the output matches the preview.
6. Click the **Discussion** timer item: it starts; open **Functions → Timers** in the drawer to see it, or add a
   timer item to a slide to show it on screen.
7. Open a browser on a phone at the address shown in **Settings → Connection** (remote, port 5510) and advance
   the agenda from there; open the stage display (port 5511) and check the current item and notes.

## 3. Save and reopen (2 min)

1. `Ctrl+S`, quit, start again. The project should reopen with every item; documents should still render
   (they live in `Documents/` under the data folder).

## 4. Google Meet (optional, 3 min)

Share the output window (or the external display) in Meet via "Present now → A window/A screen". Confirm the
remote side sees documents at full resolution and that advancing works while sharing.

## Known limits in this build

- PPTX animations, transitions and embedded video are lost in the LibreOffice conversion; fonts may substitute.
- Excel charts, pivots and conditional formatting are not rendered; formulas show their cached values.
- Complex Word layouts (text boxes, columns) can drift; pagination follows the document's page breaks.
- Lower thirds, holding slides and branded templates use FreeShow's overlays/templates as they are; meeting-flavoured
  presets come in Phase 2.
- Virtual display driver and Google Meet attendance export are Phase 3; today you share a window or screen.
- The LAN remote still shows FreeShow's layout and wording in places.

## What to report

For each step: worked / rough / failed, plus a sentence. Attach the file if a document rendered badly. Error
details are in Settings → Other → error log and in the terminal running `npm start`.
