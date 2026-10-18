# Meeting Control Center: Roadmap & LLM Dev Kickoff

Oct 18, 2026 · @Eric Kearns

## Vision & scope

Fork FreeShow into **Meeting Control Center** (MCC): a personal-use presenter for virtual and hybrid meetings. One operator console drives in-room screens and the Google Meet feed from a single run-of-show, with native viewing of PowerPoint, PDF, Word and Excel files instead of lossy image conversion.

Who it's for: the person running a board meeting, membership meeting, conference general session or webinar who today juggles PowerPoint, a PDF reader, Excel, a countdown timer and screen-share. Target scale is a single operator and 1 to 3 displays plus one virtual output, not a broadcast truck.

What it must do:

- Build an agenda (run-of-show) mixing slides, documents, spreadsheets, media, timers and lower thirds, and step through it live
- Open .pptx, .pdf, .docx and .xlsx files directly and present them with navigation (slide/page/sheet), zoom and scroll, preserving fidelity
- Send program output to physical displays and into Google Meet via a virtual display or virtual camera, with NDI for OBS and recording
- Offer a stage/confidence display (notes, next item, countdown) and a browser-based remote control
- Expose a REST/WebSocket API so Stream Decks (Bitfocus Companion), n8n and scripts can drive it, and capture participants and attendance through the Google Meet REST API

Out of scope for v1: song lyrics, Bibles, CCLI, chords, Planning Center, calendar scheduling, cloud sync, drawing on output, audio playlists and the metronome. These are FreeShow's church features and add weight without serving meetings.

## The fork approach: what to keep, what to drop

Decision: fork ChurchApps/FreeShow directly and strip it down. This is personal-use software, so GPL-3.0 obligations don't bite (the license binds distribution, not private use), and reusing FreeShow's working code for outputs, stage display, remote control, NDI and the Companion API saves months over a clean-room build. Keep upstream as a git remote so bug fixes can be merged in; avoid gratuitous reformatting so those merges stay cheap.

Keep (FreeShow code reused directly):

- The project/show structure, reframed as Meeting > Agenda items
- Slide groups and templates for reusable branded layouts (title cards, lower thirds)
- Multiple independent outputs, each with its own style
- Stage display served over the LAN to any browser by IP and port
- Browser remote control with live state sync over WebSocket
- The action API pattern (next\_slide, clear\_overlays, etc. on port 5505) and the Bitfocus Companion module
- Overlays with auto-hide timeouts; countdown and clock timers; slide auto-advance

Drop:

- Bibles, scripture import, CCLI attribution, chords, auto verse/chorus labels, lyric localization
- Planning Center sync, calendar actions, cloud song sync
- Draw/spotlight mode, metronome, audio playlists (revisit post-v1 if wanted)

Add (new code in clearly separated folders so upstream merges stay clean): the four document viewers, the Google Meet integration (virtual display plus REST API client), and meeting-native agenda items. The rest of this document assumes the fork.

## Architecture & tech stack

The fork inherits FreeShow's stack: an Electron desktop app (TypeScript main process) with a Svelte + Vite front end, where every document viewer is a browser component and every output window is just another Chromium window. The viewers slot in as new renderer components; outputs, servers and remote control already exist and are kept.

- Shell: FreeShow's existing Electron main process; its NDI and Blackmagic output support comes along for free.
- UI: FreeShow's Svelte front end, with show/song language renamed to meeting/agenda terms as screens are touched.
- State: FreeShow's existing stores and IPC/WebSocket sync. New actions (viewer navigation, Meet) register in its action system so UI, keyboard, remote, API and Companion all stay aligned.
- Persistence: FreeShow's on-disk project/show format, extended with one agenda item type per document format; imported files are copied in, never referenced in place. No database.
- Servers: already in the fork (remote, stage, controller, REST/WebSocket API on 5505, Companion WebSocket); keep them untouched.
- Conversion sidecar: a bundled LibreOffice (headless) invoked as a child process for the one job the browser can't do natively: high-fidelity PPTX and fallback DOCX/XLSX conversion to PDF. Detect a system LibreOffice first; offer a download if absent.

Repo layout: the FreeShow fork as-is. New code lives in clearly marked folders inside `src/` (a viewers folder with one subfolder per format, a document folder for the conversion sidecar, a meet folder for the Google Meet client) so diffs against upstream stay readable and merges from ChurchApps/FreeShow remain possible.

## Native document viewing (PPTX, PDF, DOCX, XLSX)

Each format gets a viewer component behind one shared interface: `load(file) -> pages/slides/sheets`, `goTo(n)`, `next()`, `prev()`, `renderThumbnails()`, plus zoom and scroll. The agenda doesn't care which format an item is; the operator gets the same controls for all four.

| Format | Primary renderer | Fidelity | Fallback |
| --- | --- | --- | --- |
| PDF | [PDF.js](https://mozilla.github.io/pdf.js/) in the renderer | Reference-quality, true native | None needed |
| XLSX | [SheetJS](https://sheetjs.com/) parse + grid component (Univer or Handsontable) for live sheet view | High for data; charts/pivots partial | LibreOffice to PDF for print-perfect view |
| DOCX | [docx-preview](https://github.com/VolodymyrBaydalka/docxjs) (layout-faithful) or mammoth for clean HTML | Good for typical memos/minutes; complex layouts drift | LibreOffice to PDF |
| PPTX | LibreOffice headless to PDF, rendered via PDF.js; slide count and notes parsed from the PPTX XML directly | High visual fidelity; animations and embedded video lost | Per-slide PNG export |

Why this split: PDF and XLSX have excellent pure-JS engines. DOCX is viewable in-browser with acceptable fidelity for meeting documents. PPTX is the honest hard case: no open-source JS renderer handles real-world decks well, so the pragmatic "native" experience is automatic background conversion on import (operator drops a .pptx, sees slides seconds later, never leaves the app). Speaker notes still come from the PPTX XML so the stage display can show them.

Upgrade path if conversion fidelity disappoints: embed a self-hosted [Collabora CODE](https://www.collaboraonline.com/code/) or ONLYOFFICE Docs server and render all four formats through it natively. That fits a homelab/self-hosted deployment but adds a server dependency, so it's a v2 option, not the v1 baseline.

Rules regardless of engine: imports never modify the source file (copy into the meeting bundle), conversion runs in the background with progress shown, and every item pre-renders before the meeting starts so nothing converts live on stage.

## Hybrid outputs, control & integration

Outputs (each independently styled and cleared):

- Program: full-screen window on any connected display; multiple simultaneous outputs supported
- Virtual display: a driver-created headless monitor the OS treats as real; MCC outputs to it and the operator presents that screen in Google Meet at full resolution. Virtual camera is the fallback where no driver is available; audio routed separately in v1
- NDI send: program as an NDI source for OBS, vMix or hardware; the clean path for streaming and recording
- Stage/confidence view: browser page on the LAN showing current + next item, speaker notes, countdown and clock; multiple layouts
- Attendee web view (post-v1): read-only live view of program for remote attendees outside the meeting platform

Meeting-native elements: agenda item timers with over-time warning, lower thirds (speaker name/title), a "technical difficulties" / holding slide one keypress away, blank/logo/freeze output controls, and a template system for branded title cards.

Control:

- Operator console: keyboard-first (space/arrows advance, F1 blank, F2 logo), preview-then-take model
- Web remote: phone/tablet control with live state, password-protected (random default, not "1234")
- REST + WebSocket API on port 5505, action names compatible with FreeShow's where behavior matches (next\_slide, clear\_all, index\_select\_slide...) so the existing Bitfocus Companion FreeShow module works day one; a dedicated Companion module later
- Everything the UI can do is an action; the API is the same dispatcher, which makes n8n automation (start meeting from a calendar event, post "meeting live" to Teams) trivial

### Google Meet integration

- Presenting: MCC renders program to the virtual display; the operator shares that screen in Meet. Nothing to install on the Meet side, works on any account.
- [Meet REST API](https://developers.google.com/meet/api) (GA): create and reuse meeting spaces, then pull conference records, participants and participant sessions (join and leave times per device), recordings, transcripts and transcript entries. MCC turns participant sessions into an attendance export, as CSV or pushed to Airtable through n8n.
- [Google Workspace Events API](https://developers.google.com/workspace/events): subscribe to a meeting space for push events (conference started, transcript file generated) so the operator console shows live joins without polling.
- Meet Media API (real-time audio/video over WebRTC) is Developer Preview only; park it for post-v1 ideas like in-app recording or live captions.
- Requirements: a Google Cloud project with OAuth consent and Meet read scopes; recording and transcript artifacts depend on the Workspace edition hosting the meeting.

## Roadmap

&#91;embedded content: roadmap: 5 phases, 4 gates\]

Each gate is a live demo, not a code review: the phase ends when the demo runs. Week counts assume an LLM coding agent doing implementation with part-time human review; compress or stretch freely.

**Phase 0: Fork & strip (weeks 1-2).** Fork ChurchApps/FreeShow and get it building locally (Node, Python 3.12 with setuptools, VS C++ workload on Windows). Map the codebase, then remove church modules one commit at a time: scripture, songs/chords/CCLI, Planning Center, draw mode, metronome. Rebrand to Meeting Control Center and define agenda items on top of FreeShow's show format. Exit demo: the stripped, rebranded app builds and presents a text slide on a second display.

**Phase 1: Document viewers (weeks 3-6).** The shared viewer interface, then PDF (PDF.js), XLSX (SheetJS plus grid), DOCX (docx-preview), and the LibreOffice sidecar with the PPTX-to-PDF pipeline and speaker-notes extraction. Thumbnails and background pre-render on import. Gate 1: drop one real file of each format, present each with next/prev and zoom, PPTX notes visible.

**Phase 2: Presenting core (weeks 7-9).** Multiple styled outputs, preview-then-take, branded templates and title cards, lower-third overlays with auto-hide, countdown/item/clock timers, blank/logo/freeze, full keyboard map. Gate 2: a 30-minute scripted mock meeting runs end to end on two displays without a restart.

**Phase 3: Meet & control (weeks 10-13).** Virtual display driver with virtual-camera fallback, Google Meet REST API client (spaces, participants, participant sessions, attendance export) plus a Workspace Events subscription for live joins, stage display and web remote verified post-strip, and FreeShow's existing Companion module confirmed against the fork. Gate 3: present into a live Google Meet through the virtual display while controlling from a Stream Deck, then export the attendance list.

**Phase 4: Hardening & release (weeks 14-16).** Installers for Windows/macOS/Linux, auto-update, crash recovery (reopen the last meeting state), settings UI, docs site, a bundled sample meeting. Gate 4: tagged v1.0 public beta with downloadable binaries.

Post-v1 backlog: attendee web view, recording, Collabora/ONLYOFFICE native rendering, dedicated Companion module, agenda import from Word/Outlook, multi-operator.

## Instructions for the LLM coding agent

How to run it: give the agent (Claude Code or similar) the kickoff prompt below as its first task, with this document attached as the spec. Work in small PRs, one roadmap task per session. Review each gate demo yourself before the next phase starts. Keep a `docs/decisions.md` log; when the agent makes an architectural choice, it records it there in two lines.

Conventions to enforce from commit one:

- TypeScript throughout, matching FreeShow's existing style; no `any` in new code without a why comment
- Every new action registers in FreeShow's existing action system so UI, keyboard, remote, API and Companion stay in sync
- Each viewer lives in its own folder under a new viewers directory and implements the shared `DocumentViewer` interface; no format-specific logic outside it
- Fork discipline: keep upstream ChurchApps/FreeShow as a git remote, avoid gratuitous reformatting, and prefer extending FreeShow's patterns over rewriting them
- Vitest unit tests for new code; Playwright smoke test that boots the app, loads the sample meeting and advances three items
- Conventional commits; CI (GitHub Actions) runs typecheck, tests and a packaged build on all three OSes

Kickoff prompt to paste into the agent:

```markdown
You are adapting FreeShow (github.com/ChurchApps/FreeShow) into Meeting
Control Center (MCC), a personal-use presenter for virtual/hybrid meetings
(spec attached). Milestone 0, in order:

1. Fork and clone ChurchApps/FreeShow; get `npm install` and `npm start`
   working (Node, Python 3.12 + setuptools; on Windows add the VS "Desktop
   development with C++" workload). Document setup in docs/dev-setup.md.
2. Write docs/codebase-map.md: where the main-process servers, stores,
   output windows, show/project format, drawer and settings live, and
   which modules are church-specific.
3. Strip church features one commit each, with the app building and
   presenting after every removal: scripture/Bibles, songs/chords/CCLI,
   Planning Center, draw mode, metronome.
4. Rebrand to Meeting Control Center: app name, window titles, placeholder
   icon. Keep or cleanly migrate FreeShow's settings and data locations.
5. Add an agenda concept on top of projects: ordered items with kinds
   slides | document | spreadsheet | media | timer | overlay.
6. Add the DocumentViewer interface and the PDF viewer (PDF.js): add a
   .pdf agenda item, page through it on the output, thumbnails in the
   operator UI.
7. Playwright smoke test covering 3-6; wire it into GitHub Actions CI.

Rules: one PR per numbered task with a short demo note; keep upstream as a
git remote and avoid gratuitous reformatting so merges stay possible; ask
before adding any dependency over 1 MB; record architecture choices in
docs/decisions.md. Definition of done for Milestone 0: the stripped,
rebranded app presents a PDF agenda item on a second display and reopens
the saved project.
```

After Milestone 0, feed the agent one roadmap phase at a time, restating the phase's gate as the definition of done. Phase 1 starts with the XLSX viewer (SheetJS) since it is pure JS, then DOCX, then the LibreOffice sidecar for PPTX, which carries the most platform risk and deserves a spike PR first.

### Managing tasks, subtasks and model spend

Run one orchestrator agent plus disposable workers, and route every task to the cheapest model that can pass its checks. Quality is enforced by gates (typecheck, tests, smoke test), not by always using the biggest model.

| Tier | Route here | Typical MCC tasks |
| --- | --- | --- |
| Frontier (Opus-class) | Decisions expensive to redo | Codebase map, DocumentViewer interface design, PPTX pipeline and virtual display spikes, debugging after two failed fixes |
| Mid (Sonnet-class) | Default for feature work | Each viewer, Meet API client, agenda model, strip commits touching shared code |
| Small (Haiku-class) | Mechanical, verifiable work | Rebranding renames, boilerplate, lint and type fixes, commit messages, docs updates, test scaffolds |

Working rules:

- Plan once, execute many: the orchestrator writes each task as a self-contained brief (goal, files in scope, definition of done) under docs/tasks/. Workers get the brief plus only the files it names, never the whole repo.
- Subtask sizing: one PR-sized task per worker, roughly 1 to 3 files or one removal commit. Anything bigger gets split in the plan; a worker that starts wandering is stopped and the brief fixed instead.
- Fresh session per task. Carryover lives in files (codebase-map.md, decisions.md, the task brief), not in chat history; a stable CLAUDE.md holds the conventions so it prompt-caches.
- Search before read: grep for the symbol, read only the matching files. Never paste files the task doesn't touch, and never have a worker re-explore what codebase-map.md already answers.
- Verify cheap, escalate on failure: every task ends with typecheck, tests and the smoke test. Small-model output that passes ships without review; two failed attempts at any tier bump the task up one tier with the failure log attached.
- Big-model review only where it pays: the orchestrator reviews diffs that touch shared state, the show format or the servers. Mechanical diffs are gated by CI alone.

## Risks & open decisions

- PPTX fidelity is the make-or-break risk. LibreOffice renders most decks well but mangles some fonts and SmartArt. Mitigation: spike it in week 3 with real PNGAS and board decks; if quality fails, pull the Collabora CODE option forward.
- Virtual displays are per-OS: Windows has solid open-source IddCx drivers (Virtual Display Driver), Linux has dummy outputs, macOS has no public headless-display API (an HDMI dummy plug is the cheap workaround). Mitigation: sharing the output window in Meet works everywhere on day one; the virtual display is an enhancement, not a blocker.
- LibreOffice bundling adds roughly 300 MB to installers. Decision needed: bundle it, or detect/download on first PPTX import (recommended).
- Google Meet REST API needs a Google Cloud project, OAuth consent and a Workspace-hosted meeting for artifacts; participant records can lag the meeting end by a few minutes. The Media API is preview-only, so no v1 feature should depend on it.
- Electron footprint: accepted trade-off for viewer-library access; revisit only if idle memory exceeds \~500 MB with a loaded meeting.
- GPL-3.0 rides along with the fork: a non-issue for personal use, but if MCC is ever distributed, source ships with it.

### Sources

- [FreeShow features](https://freeshow.app/features), [FreeShow API](https://freeshow.app/api), [FreeShow Companion docs](https://freeshow.app/docs/companion), [FreeShow GitHub (GPL-3.0)](https://github.com/ChurchApps/FreeShow)
- [PDF.js](https://mozilla.github.io/pdf.js/), [SheetJS](https://sheetjs.com/), [docx-preview](https://github.com/VolodymyrBaydalka/docxjs), [Collabora CODE](https://www.collaboraonline.com/code/)
