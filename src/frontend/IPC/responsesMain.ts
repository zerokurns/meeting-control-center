import { get } from "svelte/store"
import type { ToMainSendPayloads } from "../../types/IPC/ToMain"
import { ToMain } from "../../types/IPC/ToMain"
import { Transcript } from "../ai/stt/transcript"
import { API_ACTIONS, triggerAction } from "../components/actions/api"
import { receivedMidi } from "../components/actions/midi"
import { menuClick } from "../components/context/menuClick"
import { getCurrentTimerValue } from "../components/drawer/timers/timers"
import { _getVariableValue, getDynamicValue } from "../components/edit/scripts/itemHelpers"
import { clone } from "../components/helpers/array"
import { addDrawerFolder } from "../components/helpers/dropActions"
import { captureCanvas, getExtension, getFileName, removeExtension, setMediaTracks } from "../components/helpers/media"
import { getActiveOutputs } from "../components/helpers/output"
import { loadShows, saveTextCache } from "../components/helpers/setShow"
import { getLabelId } from "../components/helpers/show"
import { joinTimeBig } from "../components/helpers/time"
import { defaultThemes } from "../components/settings/tabs/defaultThemes"
import { processTimecodeFrame, updateTimelineStatus, updateTimelineTime } from "../components/timeline/timecode"
import { convertCSV } from "../converters/csv"
import { createImageShow } from "../converters/imageShow"
import { importAction, importOverlay, importShow, importSpecific, importStage, importTemplate } from "../converters/importHelpers"
import { convertPowerpoint } from "../converters/powerpoint/powerpointImporter"
import { addProjectItems, addToProject, importProject, updateRecentlyAddedFiles } from "../converters/project"
import { convertTexts } from "../converters/txt"
import { activeEdit, activePage, activePopup, activeShow, activeTimers, aiSttStatus, alertMessage, audioData, currentOutputSettings, dataPath, folders, icecastStatus, media, mediaDownloads, outputs, overlays, pdfImports, popupData, presentationData, projects, projectTemplates, providerConnections, recentFiles, redoHistory, rtmpStatus, shows, showsCache, spellcheck, stageShows, templates, textCache, theme, themes, timers, undoHistory, usageLog, variables, windowState } from "../stores"
import { newToast } from "../utils/common"
import { translateText } from "../utils/language"
import { initializeClosing, saveComplete } from "../utils/save"
import { invalidateSearchIndex } from "../utils/searchFast"
import { updateSettings, updateSyncedSettings, updateThemeValues } from "../utils/updateSettings"
import type { MainReturnPayloads } from "./../../types/IPC/Main"
import { Main } from "./../../types/IPC/Main"
import { sendMain } from "./main"

type MainHandler<ID extends Main | ToMain> = (data: ID extends keyof ToMainSendPayloads ? ToMainSendPayloads[ID] : ID extends keyof MainReturnPayloads ? Awaited<MainReturnPayloads[ID]> : undefined) => void
export type MainResponses = {
    [ID in Main | ToMain]?: MainHandler<ID>
}

export const mainResponses: MainResponses = {
    // STORES
    [ToMain.SAVE2]: (a) => saveComplete(a),
    [Main.SETTINGS]: (a) => updateSettings(a),
    [Main.SYNCED_SETTINGS]: (a) => updateSyncedSettings(a),
    [Main.SHOWS]: async (a) => {
        const difference = Object.keys(a).length - Object.keys(get(shows)).length
        if (difference < 15 && Object.keys(get(shows)).length && difference > 0) {
            // get new shows & cache their content
            const newShowIds = Object.keys(a).filter((id) => !get(shows)[id])
            await loadShows(newShowIds)
            newShowIds.forEach((id) => saveTextCache(id, get(showsCache)[id]))
        }

        shows.set(a)
    },
    [Main.STAGE]: (a) => stageShows.set(a),
    [Main.PROJECTS]: (a) => {
        const projectsList = a.projects || {}

        // remove "Mark as played" on startup
        Object.values(projectsList).forEach((project) => {
            project?.shows?.forEach((item) => {
                delete item.played
            })
        })

        projects.set(projectsList)
        folders.set(a.folders || {})
        projectTemplates.set(a.projectTemplates || {})
    },
    [Main.OVERLAYS]: (a) => overlays.set(a),
    [Main.TEMPLATES]: (a) => templates.set(a),
    [Main.MEDIA]: (a) => media.set(a),
    [Main.THEMES]: (a) => {
        themes.set(Object.keys(a).length ? a : clone(defaultThemes))

        // update if themes are loaded after settings
        if (get(theme) !== "default") updateThemeValues(get(themes)[get(theme)])
    },
    [Main.HISTORY]: (a) => {
        undoHistory.set(a.undo || [])
        redoHistory.set(a.redo || [])
    },
    [Main.CACHE]: (a) => {
        textCache.set(a.text || {})
        invalidateSearchIndex()
    },
    [Main.USAGE]: (a) => usageLog.set(a),

    // MAIN
    [ToMain.MENU]: (a) => menuClick(a),
    [ToMain.API]: async (a) => await API_ACTIONS[a.action]?.(a.data),
    [Main.DATA_PATH]: (a) => dataPath.set(a),
    [ToMain.ALERT]: (a) => {
        alertMessage.set(a || "")

        if (a === "error.display") {
            const outputIds = getActiveOutputs(get(outputs), false, true)
            currentOutputSettings.set(outputIds[0])
            popupData.set({ activateOutput: true })
            activePopup.set("choose_screen")
            return
        }

        activePopup.set("alert")
    },
    [ToMain.TOAST]: (a) => newToast(a),
    // GPU health degradation notice (electron utils/gpu.ts, ~20s after start): verbose alert with what
    // happened, the implications, and concrete remediation. Composed here so every string is i18n'd.
    [ToMain.GPU_HEALTH]: (a) => {
        const compositing = a.issue === "compositing"
        let html = `<h3>${translateText(compositing ? "gpu.no_acceleration" : "gpu.no_video_decode")}</h3><p>${translateText(compositing ? "gpu.no_acceleration_info" : "gpu.no_video_decode_info")}</p>`
        if (a.vaDriverMissing && a.packages?.length) {
            // Linux with no VA-API driver installed at all: name the exact package(s) for the GPU vendor
            html += `<p>${translateText("gpu.va_driver_missing")}</p><pre style="user-select: text;">sudo apt install ${a.packages.join(" ")}</pre>`
        } else {
            html += `<p>${translateText("gpu.update_drivers")}${a.vendorName ? ` (${a.vendorName})` : ""}</p>`
        }
        html += `<p style="opacity: 0.7;">${translateText("gpu.disable_hint")}</p>`
        alertMessage.set(html)
        activePopup.set("alert")
    },
    [ToMain.SPELL_CHECK]: (a) => spellcheck.set(a),
    [Main.CLOSE]: (a) => initializeClosing(a ?? false),
    [ToMain.RECEIVE_MIDI2]: (a) => receivedMidi(a),
    [Main.DELETE_SHOWS]: (a) => {
        if (!a.deleted.length) {
            newToast("toast.delete_shows_empty")
            return
        }

        alertMessage.set("<h3>Deleted " + a.deleted.length + " files</h3><br>● " + a.deleted.join("<br>● "))
        activePopup.set("alert")
    },
    [ToMain.REFRESH_SHOWS2]: (a) => {
        const oldCount = Object.keys(get(shows)).length
        const newCount = Object.keys(a).length

        shows.set(a)

        if (get(activePopup) || get(activePage) !== "settings") return
        alertMessage.set("<h3>Updated shows</h3><br>● Old shows: " + oldCount + "<br>● New shows: " + newCount)
        activePopup.set("alert")
    },
    [ToMain.BACKUP]: ({ finished, path }) => {
        if (!finished) return activePopup.set(null)

        console.info("Backed up to:", path)
        newToast("settings.backup_finished") // + ": " + path)
    },
    [ToMain.RESTORE2]: ({ finished, starting }) => {
        if (!finished) {
            if (get(activePopup) !== "initialize") activePopup.set(null)
            return
        }
        if (starting) return newToast("settings.restore_started")

        // close opened
        activeEdit.set({ items: [] })
        activeShow.set(null)
        activePage.set("show")
        if (get(activePopup) === "initialize") activePopup.set(null)

        newToast("settings.restore_finished")
    },
    [ToMain.RECENTLY_ADDED_FILES]: (data) => updateRecentlyAddedFiles(data.paths),
    [Main.MEDIA_TRACKS]: (data) => setMediaTracks(data),
    [ToMain.API_TRIGGER2]: (data) => triggerAction(data),
    [ToMain.PRESENTATION_STATE]: (data) => presentationData.set(data),
    // TOP BAR
    [Main.MAXIMIZED]: (data) => windowState.set({ ...windowState, maximized: data }),
    // MEDIA CACHE
    [ToMain.CAPTURE_CANVAS]: (data) => captureCanvas(data),
    [ToMain.IMAGES_TO_SHOW]: (data) => createImageShow(data),
    [ToMain.RTMP_STATUS]: (data) => rtmpStatus.update((a) => ({ ...a, [data.outputId]: data.destinations })),
    [ToMain.ICECAST_STATUS]: (data) => icecastStatus.set(data),
    [ToMain.MEDIA_DOWNLOAD_PROGRESS]: (data) => {
        mediaDownloads.update((downloads) => {
            const newDownloads = new Map(downloads)
            const total = Math.max(1, data.total || 0)
            const progress = data.status === "complete" ? total : Math.min(data.progress || 0, total)
            if (data.status === "complete" || data.status === "error") {
                // Remove completed/errored downloads after a short delay
                setTimeout(() => {
                    mediaDownloads.update((d) => {
                        const updated = new Map(d)
                        updated.delete(data.url)
                        return updated
                    })
                }, 2000)
            }
            newDownloads.set(data.url, { progress, total, status: data.status, name: data.name })
            return newDownloads
        })
    },
    [ToMain.PDF_IMPORT_PROGRESS]: (data) => {
        pdfImports.update((imports) => {
            const updated = new Map(imports)
            updated.set(data.filePath, {
                name: data.name,
                progress: data.progress,
                total: data.total,
                status: data.status,
                message: data.message
            })

            if (data.status === "complete" || data.status === "error") {
                setTimeout(
                    () => {
                        pdfImports.update((current) => {
                            const cleaned = new Map(current)
                            cleaned.delete(data.filePath)
                            return cleaned
                        })
                    },
                    data.status === "error" ? 7000 : 3000
                )
            }

            return updated
        })
    },
    [ToMain.AUDIO_METADATA]: (data) => {
        audioData.update((a) => {
            a[data.filePath] = { metadata: data.metadata }
            return a
        })
    },

    // Companion dynamic value variables
    [ToMain.GET_DYNAMIC_VALUES]: (data) => {
        const variableData: { [key: string]: string } = {}
        data.forEach((key) => {
            variableData[key] = getDynamicValue(key).replaceAll("<br>", "\n")
        })

        // get "actual" variables
        Object.entries(get(variables)).forEach(([id, a]) => {
            if (!a.name) return
            let val = _getVariableValue(id)
            if (Array.isArray(val)) val = val[0]
            variableData[`variable_${getLabelId(a.name, false)}`] = val
        })

        // get timers
        Object.entries(get(timers)).forEach(([id, a]) => {
            if (!a.name) return
            const labelId = getLabelId(a.name, false)
            const currentTime = getCurrentTimerValue(a, { id }, new Date())
            const timeValue = `${currentTime < 0 ? "-" : ""}${joinTimeBig(typeof currentTime === "number" ? currentTime : 0)}`
            variableData[`timer_${labelId}`] = timeValue
            variableData[`timer_${labelId}_seconds`] = currentTime.toString()
            const activeTimer = get(activeTimers).find((timer) => timer.id === id)
            let status = "Stopped"
            if (activeTimer) {
                status = activeTimer.paused ? "Paused" : "Playing"
            }
            variableData[`timer_${labelId}_status`] = status
        })

        // timer status
        const anyActiveTimers = !!get(activeTimers).length
        const anyPlaying = get(activeTimers).find((a) => !a.paused)
        variableData.timer_status = anyPlaying ? "Playing" : anyActiveTimers ? "Paused" : "Stopped"

        return variableData
    },

    // CONNECTION
    // UNIFIED PROVIDER CALLBACKS
    [ToMain.PROVIDER_CONNECT]: (data) => {
        if (!data?.success) return

        providerConnections.update((c) => {
            c[data.providerId] = true
            return c
        })

        if (data.isFirstConnection) {
            newToast("main.finished")
        }
    },
    [ToMain.OPEN_FOLDER2]: (a) => {
        const receiveFOLDER = {
            MEDIA: () => addDrawerFolder(a, "media"), // menuClick
            AUDIO: () => addDrawerFolder(a, "audio") // menuClick
        }

        if (!receiveFOLDER[a.channel]) return
        receiveFOLDER[a.channel]()
    },
    [ToMain.DOCUMENTS_IMPORTED]: (a) => {
        addProjectItems(a.items.map((item) => ({ id: item.id, name: item.name, type: item.type, data: item.data })))

        // a missing LibreOffice is reported by its own alert
        a.failed.filter((file) => !file.reason.startsWith("LibreOffice is not installed")).forEach((file) => newToast(`${translateText("agenda.import_failed")}: ${getFileName(file.path)} (${file.reason})`))
    },
    [ToMain.IMPORT2]: (a) => {
        const mainData = a.data

        const receiveFilePathIMPORT = {
            // Media
            pdf: () => {
                const paths = mainData as string[]
                paths.forEach((path) => sendMain(Main.PDF_TO_IMAGE, { filePath: path }))

                // remove any PDFs with the same name from the Recommended project items list
                const importedNames = paths.map((p) => removeExtension(getFileName(p)).toLowerCase())
                recentFiles.update((a) => {
                    const toClear = a.all.filter((p) => getExtension(p) === "pdf" && importedNames.includes(removeExtension(getFileName(p)).toLowerCase()))
                    if (toClear.length) a.cleared = [...a.cleared, ...toClear]
                    return a
                })
                updateRecentlyAddedFiles()
            },
            powerkey: () => addToProject("ppt", mainData as string[])
        }
        if (mainData.find((dataValue) => typeof dataValue === "string")) {
            if (!receiveFilePathIMPORT[a.channel]) return
            receiveFilePathIMPORT[a.channel]()
            return
        }

        const data = mainData as { content: string; name?: string; extension?: string }[]

        const receiveIMPORT = {
            // Meeting Control Center
            freeshow: () => importShow(data),
            freeshow_project: () => importProject(data),
            freeshow_template: () => importTemplate(data),
            freeshow_overlay: () => importOverlay(data),
            freeshow_theme: () => importSpecific(data, themes),
            freeshow_action: () => importAction(data),
            freeshow_stage: () => importStage(data),
            // Text
            txt: () => convertTexts(data),
            csv: () => convertCSV(data),
            powerpoint: () => convertPowerpoint(data),
            word: () => convertTexts(data)
            // Media
            // Other
        }

        if (!receiveIMPORT[a.channel]) return
        receiveIMPORT[a.channel]()
    },
    // Timecode
    [Main.TIMECODE_VALUE]: (data) => updateTimelineTime(data!),
    [Main.TIMECODE_STATUS]: (data) => updateTimelineStatus(data!),
    [Main.TIMECODE_AUDIO_DATA]: (data) => processTimecodeFrame(data!),

    // AI
    [ToMain.AI_STATUS]: (data) => aiSttStatus.set(data),
    [ToMain.AI_TRANSCRIPT]: (data) => Transcript.push(data)
}
