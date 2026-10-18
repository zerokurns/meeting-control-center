import type { Item, Show } from "../../../types/Show"
import { applyThemeColors, setError, translate } from "./helpers"
import { send } from "./socket"
import { _, _get, _set, _update, activeTimers, overlays, runningActions, timers } from "./stores"

export type ReceiverKey = keyof typeof receiver
export const receiver = {
    THEME_COLORS: (data: any) => {
        applyThemeColors(data)
    },
    PASSWORD: (data: any) => {
        if (data.dictionary) _set("dictionary", data.dictionary)
        let password: boolean = data.password
        _update("password", "required", password)
    },
    ERROR: (data: any) => {
        if (data === "wrongPass") {
            setError(translate("remote.wrong_password"))
            localStorage.removeItem("password")
            _update("password", "required", true)
        } else setError(data)
    },
    LANGUAGE: (data: any) => {
        _.dictionary.update((a) => {
            Object.keys(a).forEach((i) => {
                Object.keys(a[i] || {}).forEach((j) => {
                    if (data.strings[i]?.[j] && a[i]) a[i]![j] = data.strings[i][j]
                })
            })
            return a
        })
    },
    ACCESS: () => {
        const storedPwd = _get("password").stored
        if (storedPwd && storedPwd.length) localStorage.password = storedPwd
        _set("isConnected", true)

        // Request current output data
        send("API:get_output")
    },

    /////

    SHOWS: (data: any) => {
        const shows = Object.keys(data).map((id) => ({ id, ...data[id] }))
        _set("shows", shows)
        if (_get("quickPlay")) _set("activeTab", "shows")
    },
    // "SHOWS_CACHE": (data: any) => {
    //   showsCache = data
    //   },
    SHOW: (data: any) => {
        if (!_get("isConnected")) return

        if (!_get("activeShow") && !_get("quickPlay")) _set("activeTab", "show")
        // if (activeTab === "shows" || activeTab === "project" || activeTab === "projects") activeTab = "show"
        // shows[data.id] = data
        // activeShow = data.id

        _set("activeShow", data)
    },
    OUT: (data: any) => {
        if (!_get("isConnected")) return

        // temp slide
        if (data.id === "temp") {
            _set("outSlide", 0)
            _set("outLayout", "default")
            const show = getShowFromItems(data.tempItems, data.nextSlides[0])
            _set("outShow", show)

            _update("isCleared", "all", false)
            _update("isCleared", "slide", false)
            return
        }

        // clear
        if (data.slide === undefined) return

        _set("outSlide", data.slide)
        if (data.layout) _set("outLayout", data.layout)
        // if (data.styleRes) _set("styleRes", data.styleRes)
        if (_get("outSlide") === null) _set("outShow", null)
        else if (data.show) {
            _set("outShow", data.show)
            if (!_get("activeShow")) _set("activeTab", "slide")
            if (!_get("activeShow")) _set("activeShow", _get("outShow"))
        } else if (_get("outShow") === null && _get("activeShow")) {
            _set("outShow", _get("activeShow"))
        }
    },
    OUT_DATA: (data: any) => {
        _set("outData", data)
        send("API:get_cleared")
    },
    FOLDERS: (data: any) => {
        if (!_get("isConnected")) return

        _set("folders", data.folders)
        if (!_get("openedFolders").length) _set("openedFolders", data.opened)
        // console.log(folders)
    },
    PROJECTS: (data: any) => {
        if (!_get("isConnected")) return

        // Sort once before setting to avoid double store update
        const sortedProjects = [...data].sort((a: any, b: any) => b.created - a.created)
        _set("projects", sortedProjects)

        const project = sortedProjects.find((a: any) => a.id === _get("project"))
        if (project) _set("activeProject", project)
    },
    PROJECT: (data: any) => {
        if (!_get("project") && data && _get("isConnected")) {
            _set("project", data)

            const project = _get("projects").find((a: any) => a.id === data)
            if (project) _set("activeProject", project)

            if (!_get("activeShow") && !_get("quickPlay")) _set("activeTab", "project")
        }
    },
    CATEGORIES: (data: any) => {
        _.categories.set(data)
    },
    SEARCH_SHOWS: (data: any) => {
        if (data && data.results !== undefined) {
            _set("showSearchResults", data)
        }
    },
    OVERLAYS: (data: any) => {
        overlays.set(data)
    },
    OVERLAY_CATEGORIES: (data: any) => {
        _set("overlayCategories", data)
    },
    TEMPLATES: (data: any) => {
        _set("templates", data)
    },
    TEMPLATE_CATEGORIES: (data: any) => {
        _set("templateCategories", data)
    },
    ACTIONS: (data: any) => {
        _set("actions", data)
    },
    ACTION_TAGS: (data: any) => {
        _set("actionTags", data)
    },
    VARIABLES: (data: any) => {
        _set("variables", data)
    },
    VARIABLE_TAGS: (data: any) => {
        _set("variableTags", data)
    },
    TIMER_TAGS: (data: any) => {
        _set("timerTags", data)
    },
    TIMERS: (data: any) => {
        timers.set(data)
    },
    ACTIVE_TIMERS: (data: any) => {
        activeTimers.set(data)
    },
    RUNNING_ACTIONS: (data: any) => {
        runningActions.set(data)
    },

    GET_OVERLAYS: (data: any) => {
        overlays.set(data.overlays)
        _set("overlayCategories", data.categories)
    },
    GET_TEMPLATES: (data: any) => {
        _set("templates", data.templates)
        _set("templateCategories", data.categories)
    },
    GET_FUNCTIONS: (data: any) => {
        _set("actions", data.actions)
        _set("actionTags", data.actionTags)
        _set("variables", data.variables)
        _set("variableTags", data.variableTags)
        _set("timerTags", data.timerTags)
        timers.set(data.timers)
        activeTimers.set(data.activeTimers)
        runningActions.set(data.runningActions)
    },
    AUDIO_ROUTING: (data: any) => {
        _set("audioRouting", data)
    },
    AUDIO_CHANNELS_DATA: (data: any) => {
        _set("audioChannelsData", data || {})
    },
    GET_AUDIO_MIXER: (data: any) => {
        if (data.audioRouting !== undefined) _set("audioRouting", data.audioRouting)
        if (data.audioChannelsData !== undefined) _set("audioChannelsData", data.audioChannelsData || {})
    },
    GET_AUDIO: (data: any) => {
        _set("audio", data)
    },
    MEDIA: (data: any) => {
        if (!data) {
            _set("audio", {})
            return
        }

        const audioFiles: any = {}

        // Handle if data is an object of media items
        if (typeof data === "object" && !Array.isArray(data)) {
            Object.keys(data).forEach((id) => {
                const item = data[id]
                // Check various ways audio might be identified
                if (item && (item.type === "audio" || item.audioPath || item.path?.match(/\.(mp3|wav|ogg|m4a|flac|aac|wma)$/i))) {
                    audioFiles[id] = {
                        id,
                        name: item.name || item.path?.split(/[\/\\]/).pop() || id,
                        path: item.path || item.audioPath || id,
                        ...item
                    }
                }
            })
        }

        _set("audio", audioFiles)
    },

    /////

    "API:get_thumbnail": (data: any) => {
        if (!data.path || !data.thumbnail) return

        _update("mediaCache", data.path, data.thumbnail)
    },
    "API:get_plain_text": (data: any) => {
        _update("textCache", data.id, data.value)
    },
    "API:get_groups": (data: any) => {
        _update("groupsCache", data.id, data.value)
    },
    "API:get_cleared": (data: any) => {
        _set("isCleared", data)
    },

    "API:get_playing_audio_data": (data: any) => {
        _set("playingAudioData", data)
    },
    "API:get_playing_audio_time": (data: any) => {
        _set("playingAudioTime", data)
    },
    "API:get_playing_video_time": (data: any) => {
        _set("playingVideoTime", data || 0)
    },
    "API:get_playing_video_duration": (data: any) => {
        _set("playingVideoDuration", data || 0)
    },
    "API:get_playing_video_state": (data: any) => {
        if (!data) return
        if (data.duration !== undefined) _set("playingVideoDuration", data.duration || 0)
        if (data.time !== undefined) _set("playingVideoTime", data.time || 0)
        if (data.paused !== undefined) _set("playingVideoPaused", !!data.paused)
        if (data.loop !== undefined) _set("playingVideoLoop", !!data.loop)
        if (data.muted !== undefined) _set("playingVideoMuted", data.muted !== false)
    },

    "API:get_media_loop_state": (data: any) => {
        _set("playingVideoLoop", data !== false)
    },

    "API:toggle_media_loop": () => {
        // Refresh state after toggle
        send("API:get_playing_video_state")
    },

    "API:get_pdf_thumbnails": (data: { path: string; pages: string[] }) => {
        _update("pdfPages", data.path, data.pages)
    },

    "API:create_show": (data: { show: Show; id: string }) => {
        send("SHOW", data.id)
        _set("active", { id: data.id, type: "show" })
        _set("activeTab", "show")
    }
}

function getShowFromItems(items: Item[], nextSlideItems: Item[] | undefined) {
    const show: Show = {
        name: "",
        settings: {
            activeLayout: "default",
            template: null
        },
        category: null,
        timestamps: { created: 0, modified: null, used: null },
        meta: {},
        media: {},
        slides: {
            one: {
                group: "",
                color: "",
                settings: {},
                notes: "",
                items: items
            }
        },
        layouts: { default: { name: "", notes: "", slides: [{ id: "one" }] } }
    }

    if (nextSlideItems) {
        show.slides.two = {
            group: "",
            color: "",
            settings: {},
            notes: "",
            items: nextSlideItems
        }
        show.layouts.default.slides.push({ id: "two" })
    }

    return show
}
