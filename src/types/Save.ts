import type { History, HistoryNew } from "./History"
import type { Media } from "./Main"
import type { Folders, Projects } from "./Projects"
import type { Themes } from "./Settings"
import type { Overlays, Shows, Templates, TrimmedShows } from "./Show"
import type { StageLayouts } from "./Stage"

export type SaveList = SaveListSettings | SaveListSyncedSettings | "themes" | "templates" | "overlays"

export type SaveListSyncedSettings = "categories" | "overlayCategories" | "templateCategories" | "styles" | "profiles" | "timers" | "variables" | "scenes" | "audioStreams" | "groups" | "midiIn" | "emitters" | "playerVideos" | "videoMarkers" | "mediaTags" | "playerTags" | "actionTags" | "variableTags" | "timerTags" | "customizedIcons" | "globalTags" | "globalRegexes" | "customMetadata" | "effects" | "deletedDefaults" | "syncedOutputs"

export type SaveListSettings =
    | "initialized"
    | "activeProject"
    | "audioFolders"
    | "autoOutput"
    | "autosave"
    | "timeFormat"
    | "lockedOverlays"
    | "activeScenes"
    | "drawer"
    | "drawerTabsData"
    | "groupNumbers"
    | "fullColors"
    | "formatNewShow"
    | "labelsDisabled"
    | "language"
    | "customFonts"
    | "maxConnections"
    | "mediaFolders"
    | "mediaOptions"
    | "openedFolders"
    | "outputs"
    | "sorted"
    | "outLocked"
    | "ports"
    | "disabledServers"
    | "serverData"
    | "resized"
    | "slidesOptions"
    | "splitLines"
    | "theme"
    | "transitionData"
    | "audioRouting"
    | "audioChannelsData"
    | "audioEffects"
    | "audioEffectPresets"
    | "effectsLibrary"
    | "special"
    | "timeline"
    | "timecode"
    | "contentProviderData"
    | "obsData"
    | "ai"

export interface SaveData {
    // SETTINGS
    SETTINGS: { [key in SaveListSettings]: any } | {}
    SYNCED_SETTINGS: { [key in SaveListSyncedSettings]: any } | {}
    // SHOWS
    SHOWS: TrimmedShows
    STAGE: StageLayouts
    // STORES
    PROJECTS: { projects: Projects; folders: Folders; projectTemplates: Projects }
    OVERLAYS: Overlays
    TEMPLATES: Templates
    MEDIA: Media
    THEMES: { [key: string]: Themes }
    // CACHES SAVED TO MULTIPLE FILES
    showsCache?: Shows
    deletedShows?: { name: string; id: string }[]
    renamedShows?: { id: string; name: string; oldName: string }[]
    // CACHES
    CACHE: { text: any }
    HISTORY: { undo: (History | HistoryNew)[]; redo: (History | HistoryNew)[] }
    USAGE: any
    // SAVE INFO DATA
    closeWhenFinished: boolean
    customTriggers: SaveActions
}
export type SaveActions = { backup?: boolean; isAutoBackup?: boolean; autosave?: boolean; reset?: boolean }
