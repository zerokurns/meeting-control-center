# Meeting Control Center

A personal-use presenter for virtual and hybrid meetings: one operator console drives the in-room screens and
the Google Meet feed from a single run-of-show, with native viewing of PowerPoint, PDF, Word and Excel files.

Meeting Control Center (MCC) is a fork of [FreeShow](https://github.com/ChurchApps/FreeShow) (GPL-3.0) with the
church-specific features removed and meeting features added on top. It is early: see the roadmap below.

## Status

| Phase | State |
| --- | --- |
| 0 — Fork, strip, rebrand | in progress (fork builds, church features and telemetry removed, rebranded) |
| 1 — Document viewers (PDF, XLSX, DOCX, PPTX) | not started |
| 2 — Presenting core | not started |
| 3 — Google Meet and control surfaces | not started |
| 4 — Hardening and release | not started |

## Develop

```sh
git clone https://github.com/zerokurns/meeting-control-center.git
cd meeting-control-center
npm install
npm start
```

Prerequisites, platform notes, the check commands and the current baseline are in
[`docs/dev-setup.md`](docs/dev-setup.md). The codebase is mapped in
[`docs/codebase-map.md`](docs/codebase-map.md); architecture decisions are logged in
[`docs/decisions.md`](docs/decisions.md); the product spec and roadmap are in [`docs/spec.md`](docs/spec.md).

## Credits and license

Built on FreeShow by ChurchApps and its contributors. Licensed under the GNU General Public License v3.0; see
[`LICENSE`](LICENSE).
