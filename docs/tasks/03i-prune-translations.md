# 03i — Prune dead translation strings

Branch: `strip/prune-translations`. Protocol: `docs/tasks/README.md`. Runs after every strip commit is on the
task branch (base your branch on the commit the orchestrator names).

## Goal
The eight strip commits deliberately left `public/lang/*.json` alone. Remove the keys that no code references
any more, identically in all 31 language files, with a script you commit under `scripts/` so the prune can be
repeated after future strips. Nothing else changes.

## Algorithm (implement exactly this; it is conservative on purpose)
1. Load `public/lang/en.json`. Keys are two-level: `group.key`.
2. Collect every `.ts`, `.svelte`, `.js`, `.mjs` file under `src/` and `scripts/` and `config/` into one text blob
   (skip `node_modules`, `build`, `public`).
3. A group is **dynamically referenced** if the blob contains any of: `` `GROUP.${ ``, `"GROUP." +`, `'GROUP.' +`,
   `` `GROUP.` ``, `"GROUP"` passed where a group id is built (search `GROUP + "."`). Keep every key of such a
   group, except the explicit list in step 5.
4. For every other key `GROUP.KEY`: it is **dead** if the exact substring `GROUP.KEY` does not occur in the blob
   (match it inside any quotes, also as `id="GROUP.KEY"` and in comments; a comment hit counts as a reference,
   stay conservative).
5. Also dead, regardless of group: `actions.<id>` for these removed action ids: `start_metronome`,
   `clear_drawing`, `change_draw_zoom`, `transpose_show_up`, `transpose_show_down`, `start_scripture`,
   `scripture_next`, `scripture_previous`, `start_playlist`, `name_start_playlist`, `playlist_next`,
   `get_playlists`, `get_playlist`, `spotify_play`, `spotify_pause`, `spotify_fade_out`, `spotify_next`,
   `spotify_previous`; plus the `create_show.quick_lyrics`, `create_show.quick_lyrics_tip` and
   `create_show.quick_lyrics_example_*` keys (replaced by `quick_text`).
6. Delete the dead keys from `en.json` and from every other `public/lang/*.json` (ignore keys the other
   languages have that `en.json` lacks). Delete a group entirely when it becomes empty. Preserve each file's
   key order and 4-space JSON indentation (`JSON.stringify(obj, null, 4)` + trailing newline matches upstream;
   confirm with `git diff --stat` that unchanged files stay unchanged).
7. Print a summary: keys before/after, groups removed, per-file counts.

Expected whole groups to disappear: `scripture`, `draw`, `cloud`, `chat`. Expected to survive untouched:
`actions` (dynamic), `tabs` (dynamic), `calendar` (still used by weather, restore and history code), `timer`.
If a group you expected to survive disappears, stop and report instead of committing.

## Deliverables
- `scripts/pruneTranslations.js` (plain Node, no new dependencies, runnable as `node scripts/pruneTranslations.js`
  with `--dry-run` support).
- The pruned `public/lang/*.json` files.
- One commit: `chore(i18n): prune translation keys left dead by the church-feature strip`.

## Definition of done
Protocol steps 2 to 7 (build, svelte-check not above the number the orchestrator gives you, unit tests not worse,
Playwright smoke test, cleanBuilds, single commit). Additionally: `node scripts/pruneTranslations.js --dry-run`
run a second time reports zero further deletions.
