# 03b — Remove song machinery: chords, CCLI, lyric search, auto-sections, church importers

Branch: `strip/songs`. Protocol: `docs/tasks/README.md`. Map: `docs/codebase-map.md` §9b.

## Goal
Shows stay (they become agenda slides later), but everything that exists only for songs goes: chord
editing and transposition, CCLI/song attribution, Genius lyric search, automatic verse/chorus labelling
and the importers for church presentation software. The plain "paste text, get slides" creator stays and
is relabelled "Quick text".

## Delete
- Chords: `src/frontend/utils/chordTranspose.ts`, `src/frontend/converters/chordpro.ts`,
  `src/frontend/components/main/popups/ChooseChord.svelte`, `src/server/common/util/transpose.ts`,
  anything under `components/edit/` or `components/slide/` that exists only for the chords edit mode.
- Lyrics search: `src/electron/utils/LyricSearch.ts`, `src/frontend/components/main/popups/createShow/WebSearch.svelte`,
  `src/server/remote/components/pages/Lyrics.svelte` (and its route).
- Auto-sections: `src/frontend/converters/txtAutoSections.ts` (explicit `[Name]` section markers in
  `converters/txt.ts` stay).
- Church importers: `src/frontend/converters/easyworship.ts`, `propresenter.ts`, `openlp.ts`,
  `opensong.ts`, `quelea.ts`, `songbeamer.ts`, `videopsalm.ts`, `verseview.ts`, `softprojector.ts`,
  `easyslides.ts`, `mediashout.ts`; in `src/electron/data/import.ts` the `sqlite` and `mdb` importers and
  the ProPresenter protobuf path; `public/proto/` (ProPresenter schemas); matching logos in
  `public/import-logos/`; their entries in `main/popups/Import.svelte` and the `ToMain.IMPORT2` dispatch in
  `src/frontend/IPC/responsesMain.ts`.

## Edit (remove only song lines)
- `src/types/Tabs.ts`: drop `"chords"` from `EditMode`. `src/types/Show.ts`: remove `Chords` and the
  `chords` field on `Line`, and CCLI-specific metadata fields; keep the generic `meta` record.
- `src/frontend/stores.ts`: remove `storedChordsData`. `src/frontend/components/actions/api.ts` /
  `apiHelper.ts`: remove `transpose_show_up`, `transpose_show_down` (report removed ids).
- `src/frontend/components/show/tools/Metadata.svelte`, `helpers/show.ts`, `setShow.ts`,
  `showActions.ts`, `stage/stage.ts`, `stage/tools/BoxStyle.svelte`, `quicksearch/quicksearch.ts`,
  `utils/search.ts`: remove CCLI handling; keep other metadata fields.
- `main/popups/createShow/CreateShow.svelte`: remove the web-search import and `updateLyrics`; rename the
  text tab and textarea label from `create_show.quick_lyrics` to `create_show.quick_text` (add the key to
  `public/lang/en.json`, value "Quick text", and `quick_text_tip`; leave other languages alone).
- `config/testing/start.test.ts`: change `getByText("Quick Lyrics")` to `getByText("Quick text")`. The
  `[Verse]`/`[Chorus]` text and the group change in the test still work because explicit section markers
  and the default groups in `src/electron/data/defaults.ts` stay (groups get renamed in a later task).
- Find the rest: `grep -rniE "chord|ccli|lyric|transpose|easyworship|propresenter|openlp|opensong|quelea|songbeamer|videopsalm|verseview|softprojector|easyslides|mediashout|autoSections" src config --include=*.ts --include=*.svelte -l`.

## Keep
`converters/txt.ts` (minus auto-sections), `csv.ts`, `xml.ts`, `project.ts`, `imageShow.ts`,
`canvaPresentation.ts`, `powerpoint/`, the Word importer in `data/import.ts`, groups and categories,
templates, `popups/ManageGroups.svelte`, the `Metadata.svelte` panel with its non-CCLI fields.
