# 03d — Remove draw / spotlight mode

Branch: `strip/draw`. Protocol: `docs/tasks/README.md`. Map: `docs/codebase-map.md` §9e.

## Goal
Remove the "Draw" top-level page (paint, fill, spotlight, zoom, particles) and its output layer.

## Delete
- `src/frontend/components/draw/` (whole dir), `src/types/Draw.ts`

## Edit (remove only draw lines)
- `src/frontend/MainLayout.svelte`: the `page === "draw"` branches. `src/frontend/components/main/Top.svelte`:
  the draw `TopButton`. `src/types/Tabs.ts`: drop `"draw"` from `TopViews`.
- `src/frontend/components/output/Output.svelte`: the `Draw` layer import and markup.
  `components/output/clear.ts`, `components/slide/Zoomed.svelte`, `utils/receivers.ts`,
  `utils/listeners.ts`: draw store usage.
- `src/frontend/stores.ts`: remove `drawTool`, `draw`, `paintCache`, `paintCacheSlide`, `drawSettings`.
  `src/types/Save.ts`: remove `drawSettings`. `src/electron/data/defaults.ts`: draw defaults.
  `src/types/History.ts`, `src/types/Effects.ts`: draw entries.
- `src/frontend/components/actions/api.ts` / `apiHelper.ts`: remove `clear_drawing` (report it; the
  Companion module may reference it). `context/contextMenus.ts` / `menuClick.ts`, `utils/shortcuts.ts`,
  `quicksearch/`, settings or popups that expose draw settings.
- Find the rest: `grep -rniE "\bdraw(ing|Tool|Settings)?\b|paintCache|spotlight" src --include=*.ts --include=*.svelte -l`
  and discard hits that are about `drawer` (the bottom panel) or canvas `drawImage`.

## Keep
The drawer (bottom panel) is unrelated despite the name. Keep `components/system/`, output transitions and
effects.
