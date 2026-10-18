# Architecture decisions

Two lines per entry: what was decided, and why. Newest at the bottom.

- **2026-10-18 — Fork lives at the repo root, upstream as a remote.** The GitHub fork is `zerokurns/meeting-control-center`; `origin` points at it and `upstream` at `ChurchApps/FreeShow`. Keeping upstream history intact (no squash, no reformat) keeps future `git merge upstream/main` cheap.
- **2026-10-18 — Develop on Node 24 LTS (nvm default), not upstream's Node 22.** Electron bundles its own Node at runtime, so the host version only affects tooling; 24 is this workstation's default and `engines` only requires `>=22.12`.
- **2026-10-18 — npm 12 security defaults are opted into per project, not bypassed.** `.npmrc` sets `allow-git=all` (upstream pins seven addons to GitHub commits, one of them transitive) and `allow-scripts-pin=false`; install scripts are approved by name in `package.json` `allowScripts` instead of `dangerously-allow-all-scripts`, so a new upstream dep with an install script still needs an explicit review.
- **2026-10-18 — GitHub git deps are fetched over HTTPS.** npm resolves `github:` shorthands to `git+ssh://` URLs; a user-level `url.https://github.com/.insteadOf ssh://git@github.com/` rewrite avoids needing a registered SSH key just to install.
- **2026-10-18 — The product spec lives in the repo at `docs/spec.md`.** Worker sessions get carryover from files, not chat, so the roadmap and kickoff prompt are versioned next to `decisions.md` and `dev-setup.md`.
- **2026-10-18 — Upstream's failing checks are recorded as a baseline, not fixed in the setup task.** 3 unit tests, 40 Prettier files and 195 svelte-check errors fail on untouched upstream code; fixing them now would create a large diff against upstream for no MCC value, so the rule is "don't make it worse" until the church-feature strip removes most of the affected files anyway.
