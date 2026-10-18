import type { Stats } from "fs"
import type { Cropping } from "./Settings"

export interface Config {
    loaded: boolean
    maximized: boolean
    bounds: Electron.Rectangle
    dataPath: string | null
    disableHardwareAcceleration: boolean | null
    graphicsDevice: string | null
    mediaFolderPath?: string
}

export interface OS {
    platform: NodeJS.Platform
    name: string
    arch: string
}

export interface Option {
    name: string
    extra?: string
    extraInfo?: string
    data?: any
    id?: string | null
    icon?: string
    style?: string // css style for the item
}

export interface NumberObject {
    [key: string]: number
}
export interface StringObject {
    [key: string]: string
}

export interface Time {
    ms: string
    s: string
    m: string
    h: string
    d: number
}

export interface ClickEvent {
    detail: {
        ctrl: boolean
        shift: boolean
        alt: boolean
        doubleClick: boolean
        target: EventTarget
    }
}

export type SelectIds =
    | "files"
    | "urls"
    | "slide"
    | "slide_icon"
    | "group"
    | "global_group"
    | "layout"
    | "show"
    | "show_drawer"
    | "project"
    | "folder"
    | "category_shows"
    | "category_media"
    | "category_overlays"
    | "category_audio"
    | "category_templates"
    | "category_player"
    | "category_live"
    | "category_web"
    | "stage"
    | "media"
    | "audio"
    | "audio_effect"
    | "overlay"
    | "template"
    | "action"
    | "effect"
    | "screen"
    | "ndi"
    | "omt"
    | "blackmagic"
    | "camera"
    | "microphone"
    | "player"
    | "timer"
    | "global_timer"
    | "variable"
    | "scene"
    | "scene_overlay"
    | "audio_stream"
    | "midi"
    | "theme"
    | "style"
    | "output"
    | "profile"
    | "audio_channel"
    | "tag"

export interface Selected {
    id: null | SelectIds
    data: any[]
    showId?: string
    hoverActive?: boolean
}
export interface DropData {
    id: string
    data: any
    trigger?: string
    center: boolean
    index?: number
}

export interface Clipboard {
    id: string | null
    data?: any // []
}
// export interface ClipboardData {
//     index?: number

//     // ActiveEdit
//     type?: string
//     id?: string
//     slide?: null | number
//     items?: number[]
//     showId?: string

//     // [key: string]: any
// }

export interface SlidesOptions {
    columns: number
    mode: "grid" | "simple" | "groups" | "list" | "lyrics" | "text"
}
export interface MediaOptions {
    columns: number
    mode: "grid" | "list"
    view?: "all" | "image" | "video" | "folder"
}

export interface ActiveEdit {
    // id?: string
    type?: "show" | "media" | "camera" | "overlay" | "template" | "effect" | "audio" | "scene"
    id?: string
    slide?: null | number
    items: number[]
    showId?: string // only used to reset to slide 0 if changed ($activeShow.id is actually used)
    data?: any // camera data
}

export type FileFolder = { isFolder: false; path: string; name: string; thumbnailPath?: string; stats: Stats } | { isFolder: true; path: string; name: string; files: string[]; noMedia?: boolean }

export type MediaFit = "contain" | "cover" | "fill" | "blur"
export interface Media {
    [key: string]: MediaStyle
}
export interface MediaStyle {
    creationTime?: number // used for checking valid media thumbnail cache
    filter?: string
    flipped?: boolean
    flippedY?: boolean
    blend?: string
    fit?: MediaFit | ""
    fitOptions?: any
    speed?: string
    fromTime?: number
    toTime?: number
    softLoop?: number
    videoType?: string // default | "background" | "foreground"
    audioType?: AudioType // default | "music" | "effect"
    favourite?: boolean
    audio?: boolean
    loop?: boolean // audio
    volume?: number // audio
    pitch?: number // audio
    tempo?: number // audio
    rendering?: string // image rendering
    info?: any // cached codec/mime data
    tracks?: Subtitle[]
    subtitle?: string
    tags?: string[] // media tags
    name?: string // display name for content provider media (encrypted videos)
    contentFile?: any // ContentFile from content provider (imported type would create circular dependency)
    licenseExpiresAt?: number // unix ms; content provider license is valid while Date.now() < licenseExpiresAt
    pingbackUrl?: string // URL for sending pingback after playback
    cropping?: Partial<Cropping>
    style?: string // used to transfer styles from main item to cropped part (like border radius)

    ignoreLayer?: boolean // foreground background type
}

export type AudioType = "music" | "effect"

// media codec
export interface MediaCodecInfo {
    path: string
    codecs: string[]
    mimeType: string
    mimeCodec: string
}

// subtitles/captions
export interface Subtitle {
    lang: string // id
    name: string
    vtt: string // WebVTT format
    embedded?: boolean // extracted from the video
}

export interface MainFilePaths {
    // documents: string
    pictures: string
    videos: string
    music: string
}

export interface Variable {
    id?: string
    name: string
    type: "number" | "random_number" | "text" | "text_set"
    tags?: string[]

    // number
    number?: number
    step?: number
    default?: number
    minValue?: number
    maxValue?: number

    // random number
    animate?: boolean
    animateTowardsResult?: boolean
    animationDuration?: number
    eachNumberOnce?: boolean
    sets?: { name: string; minValue?: number; maxValue?: number }[]
    setName?: string // chosen random set
    setLog?: { name: string; number: string }[]

    // text
    text?: string
    enabled?: boolean

    // text set
    activeTextSet?: number
    textSetKeys?: string[]
    textSets?: { [key: string]: string }[]
}

export interface Trigger {
    name: string
    type: "http"
    value: string
}

export interface FileData {
    path: string
    stat: Stats
    extension: string
    folder: boolean
    name: string
    thumbnailPath?: string
}

export interface Profiles {
    [key: string]: Profile
}
export interface Profile {
    name: string
    color: string
    password?: string // currently admin only
    autoOpenLastUsed?: boolean // admin only
    image: string
    access: { [key: string]: { [key: string]: AccessType } }
    action?: string // action that triggers each time this profile is selected
}
export type AccessType = "none" | "read" | "write"

export interface ErrorLog {
    time: Date
    os: string
    version: string
    type: string
    source: string
    message: string
    stack: string
    dev?: boolean
}

export type Popups =
    | "initialize"
    | "confirm"
    | "custom_text"
    | "import"
    | "export"
    | "show"
    | "delete_show"
    | "select_show"
    | "select_template"
    | "select_style"
    | "select_overlay"
    | "select_stage_layout"
    | "delete_duplicated_shows"
    | "icon"
    | "manage_groups"
    | "manage_fonts"
    | "manage_icons"
    | "manage_colors"
    | "manage_metadata"
    | "manage_dynamic_values"
    | "player"
    | "template_style_overrides"
    | "regex_manager"
    | "rename"
    | "color"
    | "color_gradient"
    | "find_replace"
    | "timer"
    | "variable"
    | "audio_stream"
    | "audio_effect"
    | "add_audio_effect"
    | "now_playing"
    | "aspect_ratio"
    | "max_lines"
    | "transition"
    | "media_fit"
    | "metadata_display"
    | "edit_chart"
    | "choose_screen"
    | "choose_media_input"
    | "choose_output_input"
    | "choose_output_type"
    | "choose_style"
    | "change_output_values"
    | "output_selector"
    | "set_time"
    | "assign_shortcut"
    | "dynamic_values"
    | "conditions"
    | "translate"
    | "next_timer"
    | "display_duration"
    | "manage_tags"
    | "about"
    | "shortcuts"
    | "unsaved"
    | "restore"
    | "reset_all"
    | "alert"
    | "history"
    | "action_history"
    | "manage_emitters"
    | "action"
    | "category_action"
    | "custom_action"
    | "slide_midi"
    | "connect"
    | "effect_items"
    | "timeline"
    | "timecode"
    | "template_info"
    | "cleaning_utility"
    | "node_options"
    | "ai_model_manager"
    | "ai_chat"

export type DefaultProjectNames = "date" | "today" | "sunday" | "week" | "custom" | "blank"

// export type DropIds = "slide" | "slide_group" | "show" | "show_drawer" | "project" | "folder" | "file"
// export interface Drop {
//   id: null | SelectIds
//   data: null | number
// }
