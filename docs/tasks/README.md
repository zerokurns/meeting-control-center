# Worker protocol for task briefs

Every file in this folder is a self-contained brief for one PR-sized task. A worker gets the brief, the
files it names, and nothing else. This page is the shared part of every brief.

## Environment

- You are in a **dedicated git worktree** of the Meeting Control Center repo (a fork of FreeShow). The main
  checkout is `/home/ekearns/projects/pngas/meeting-command-center`; never edit files there.
- Create your branch from the current HEAD first: `git checkout -b <branch named in the brief>`.
- Do **not** run `npm install`. Reuse the main checkout's dependencies:
  `ln -s /home/ekearns/projects/pngas/meeting-command-center/node_modules node_modules`
- Use Node 24 **by absolute path**, never via the nvm wrapper: the worktree guard refuses any command line that
  sources a script (`source …`, `. "$NVM_DIR/nvm.sh"`). Run `/home/ekearns/.nvm/versions/node/v24.15.0/bin/npm run build`,
  and prefix `PATH=/home/ekearns/.nvm/versions/node/v24.15.0/bin:$PATH` on single commands that need `node` on PATH.
- The worktree is created on upstream's `main`, not on the task branch. Your first git command is a plain
  standalone `git checkout -b <branch> <base-sha>` (the brief names both); if that is refused, run
  `git branch <branch> <base-sha>` and then `git switch <branch>` as two separate commands. Never `cd` out of the
  worktree, and if the harness ever reports the worktree is gone, stop and report instead of working elsewhere.
- Read `docs/codebase-map.md` (only the section the brief cites) and the "Build and check" section of
  `docs/dev-setup.md`. Find the rest with `grep -rn` on the identifiers the brief lists; do not browse.

## Editing rules

- Delete whole files and directories where the brief says so. In surviving files remove only the lines
  that reference the removed feature; keep upstream formatting (4-space indent, no semicolons, double
  quotes). Never run Prettier on whole files, never reorder imports, never rename unrelated things.
- Do not add `any`. If removing something forces a wider change, prefer the smallest stub and report it.
- Do not edit `package.json` dependencies or `package-lock.json`; the orchestrator prunes npm deps once.
- `npm run test:format` must not flag files it did not flag before your change; if you edit a flagged line, run
  Prettier on that file only (`npx prettier --config config/formatting/.prettierrc.yaml --write <file>`).
- Do not edit `public/lang/*.json` except `en.json`, and `en.json` only to rename or add a key the brief
  mentions. Dead strings are pruned later in one mechanical commit.
- Do not edit anything under `docs/`.
- Stay inside the brief's feature. Other workers are removing other features in parallel; when you edit a
  shared file (`src/frontend/stores.ts`, `src/types/Save.ts`, `src/types/Show.ts`, `src/types/Tabs.ts`,
  `src/electron/data/defaults.ts`, `src/frontend/components/actions/api.ts`, `apiHelper.ts`,
  `src/frontend/components/context/contextMenus.ts`, `menuClick.ts`, `src/frontend/components/main/Popup.svelte`)
  touch only your own lines so the commits cherry-pick cleanly.

## Definition of done (all of it, in this order)

1. `grep -rniE "<feature identifiers from the brief>" src --include=*.ts --include=*.svelte` shows no
   remaining references except those the brief says to keep.
2. `npm run build` exits 0 (this type-checks the Electron main process and bundles renderer + servers).
3. `npm run test:svelte 2>&1 | tail -3` reports **no more errors than the current baseline** in `docs/dev-setup.md`
   (151 after task 4). Record the number.
4. `npm run test:unit 2>&1 | tail -6` reports **no more failures than the current baseline** in `docs/dev-setup.md`
   (1 after task 4: `src/electron/streaming/RtmpStreamer.integration.test.ts`). Record the numbers.
5. `xvfb-run --auto-servernum --server-args="-screen 0 1280x960x24" -- npm run test:playwright` passes
   (boots the production build, completes first-run setup, creates a project and a show, saves). If it
   fails on a timeout, rerun once before investigating. Record the result.
6. `node scripts/cleanBuilds.js` (restores `public/index.html`), then `git status --short` lists only
   intended changes.
7. Exactly **one commit** on your branch. Subject `refactor(strip): remove <feature>`; body: bullet list
   of what was removed and any stub left behind; last line
   `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Do not push.

If step 2 to 5 fails twice for the same reason, stop and report the failure log instead of widening scope.

## Report back (this is all the orchestrator sees)

Branch name and commit SHA; paths deleted (dirs may be summarized); shared files edited with one line each
on what was removed there; the svelte-check error count, unit pass/fail counts and Playwright result;
anything surprising: couplings the brief did not list, stubs left, action ids removed from the API, decisions
you had to make.
