# 03g — Remove audio playlists and the Spotify bridge

Branch: `strip/audio-playlists`. Protocol: `docs/tasks/README.md`. Map: `docs/codebase-map.md` §9g.
Runs after 03a–03e are integrated (03e already edited `drawer/audio/` and `frontend/audio/`).

## Goal
Remove background-music playlists and the Spotify now-playing controller. Single audio files, audio
streams, the mixer, effects, meters and routing stay; they are the media audio engine.

## Delete
- `src/frontend/audio/audioPlaylist.ts`
- `src/electron/utils/spotify.ts`
- `src/frontend/components/output/preview/SpotifyController.svelte`, `SpotifyManager.ts`
- Any `drawer/audio/` component that exists only for playlists (check `Audio.svelte` imports)

## Edit (remove only playlist/Spotify lines)
- `src/frontend/stores.ts`: `audioPlaylists`, `activePlaylist`. `src/types/Save.ts`: `audioPlaylists`.
  `src/electron/data/defaults.ts`. `src/types/Main.ts` / `src/types/Audio.ts` playlist types.
- `src/frontend/components/drawer/audio/Audio.svelte`, `drawer/navigation/AudioTabs.svelte`,
  `drawer/info/AudioInfo.svelte`: playlist sub-tab, create-playlist buttons, drag-to-playlist.
- `src/frontend/audio/audioPlayer.ts` and neighbours: "play next in playlist" hooks; keep crossfade/fading.
- `src/frontend/components/actions/api.ts` / `apiHelper.ts` / `actionData.ts`: playlist actions such as
  `start_playlist`, `playlist_next`, `toggle_playlist` (report removed ids). `context/contextMenus.ts`,
  `menuClick.ts`, `helpers/drop*.ts` (drop onto playlist), `utils/receivers.ts`, `listeners.ts`,
  `quicksearch/`, `src/server/remote/` if it lists playlists.
- Spotify: `src/electron/IPC/responsesMain.ts`, `src/types/IPC/Main.ts` ids, `utils/keys.ts` if any, the
  settings/connection UI that enables it, `output/preview/Preview.svelte` where the controller is mounted.
- Find the rest: `grep -rniE "playlist|spotify" src --include=*.ts --include=*.svelte -l`.

## Keep
`audioStreams`, `audioFolders`, `audioChannelsData`, `audioRouting`, effects and presets, `nowPlaying`
(used by Icecast metadata) unless it only served Spotify.
