# 03e — Remove the metronome

Branch: `strip/metronome`. Protocol: `docs/tasks/README.md`. Map: `docs/codebase-map.md` §9f.

## Goal
Remove the metronome tool, its slide item and its stage item.

## Delete
- `src/frontend/components/drawer/audio/Metronome.svelte`, `MetronomeInputs.svelte`,
  `MetronomeVisualizer.svelte`, `metronome.ts`
- `src/server/stage/items/MetronomeVisualizer.svelte`
- `public/assets/metronome/`

## Edit (remove only metronome lines)
- `src/types/Show.ts`: drop `"metronome"` from `ItemType`. `src/frontend/components/slide/SlideItems.svelte`,
  `components/edit/values/items.ts`, `components/stage/StageTools.svelte`,
  `src/server/stage/components/Stagebox.svelte`: the metronome item branches.
- `src/frontend/components/drawer/navigation/AudioTabs.svelte` and `drawer/audio/Audio.svelte`: the
  `metronome` sub-tab. `src/frontend/audio/` (three files reference it): remove the metronome hooks.
- `src/frontend/stores.ts`: remove `metronome`, `playingMetronome`, `metronomeTimer`. `src/types/Save.ts`:
  remove `metronome`. `src/electron/data/defaults.ts`: metronome defaults.
- `src/frontend/components/actions/api.ts` / `apiHelper.ts` / `actions/actionData.ts`: any metronome
  actions (report removed ids). `context/contextMenus.ts`, `utils/receivers.ts`, `listeners.ts`,
  `utils/sendData.ts` / `stageTalk.ts` (stage item payloads).
- Find the rest: `grep -rni "metronome" src --include=*.ts --include=*.svelte -l`.

## Keep
Everything else in `drawer/audio/` and `src/frontend/audio/` (player, mixers, effects, meters, routing).
