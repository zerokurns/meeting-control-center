import { get } from "svelte/store"
import type { ContentProviderId } from "../../electron/contentProviders/base/types"
import { OUTPUT, STARTUP } from "../../types/Channels"
import { Main } from "../../types/IPC/Main"
import { checkStartupActions } from "../components/actions/actions"
import { getTimeFromInterval } from "../components/helpers/time"
import { requestMain, requestMainMultiple, sendMain, sendMainMultiple } from "../IPC/main"
import { cameraManager } from "../media/cameraManager"
import { activePopup, activeProfile, cachePath, currentWindow, dataPath, deviceId, isDev, loaded, loadedState, os, profiles, providerConnections, shows, special, version, windowState } from "../stores"
import { startTracking } from "./analytics"
import { wait, waitUntilValueIsDefined } from "./common"
import { getDefaultElements } from "./createData"
import { setLanguage } from "./language"
import { storeSubscriber } from "./listeners"
import { autoOpenLastUsedProfile, openProfileByName } from "./profile"
import { receiveOUTPUTasOUTPUT, remoteListen, setupMainReceivers } from "./receivers"
import { destroy, receive, send } from "./request"
import { save, unsavedUpdater } from "./save"

let initialized = false
let startupProfile = ""

export async function startup() {
    if (!window.api) {
        // wait for window.api to be available (preload script might not be ready yet) - not likely
        await waitUntilValueIsDefined(() => window.api, 20, 5000)
        if (!window.api) return console.error("window.api is not available after waiting")
    }

    window.api.receive(
        STARTUP,
        (msg) => {
            if (initialized || msg.channel !== "TYPE") return
            initialized = true // only call this once per window
            destroy(STARTUP, "startup")

            const type = msg.data
            currentWindow.set(type)

            if (type) loaded.set(true)

            if (type === "pdf") return
            if (type === "output") {
                startupOutput()
                return
            }

            startupProfile = msg.autoProfile

            startupMain()
        },
        "startup"
    )

    window.api.send(STARTUP, { channel: "READY" })
}

async function startupMain() {
    setLanguage("", true)
    setupMainReceivers()
    getMainData()

    await wait(50)
    getStoredData()

    await waitUntilValueIsDefined(() => get(loaded), 50, 8000)

    if (startupProfile) openProfileByName(startupProfile)
    else autoOpenLastUsedProfile()

    storeSubscriber()
    remoteListen()

    const hasProfiles = Object.keys(get(profiles)).filter((a) => a !== "admin").length > 0
    if (!hasProfiles || get(activeProfile) !== null) checkStartupActions()

    startTracking()
    contentProviderSync(true)

    // custom alert
    // if (Math.random() < 0.01) {
    //     alertMessage.set("")
    //     activePopup.set("alert")
    // }

    await wait(2000)

    autoBackup()
    await wait(3000)

    unsavedUpdater()
    windowFocusListener()
    cameraManager.initializeCameraWarming()

    // CHECK LISTENERS
    // console.log(window.api.getListeners())

    // RAM MONITOR (every 10 minutes)
    setTimeout(() => checkRamUsage(), 10000)
    setInterval(() => checkRamUsage(), 600000)
}

// window focus state
function windowFocusListener() {
    if (typeof window === "undefined") return

    const updateFocus = () => {
        if (document.hasFocus()) document.body.classList.remove("unfocused")
        else document.body.classList.add("unfocused")
    }

    window.addEventListener("focus", updateFocus)
    window.addEventListener("blur", updateFocus)
    updateFocus()
}

async function checkRamUsage() {
    const ram = await requestMain(Main.CHECK_RAM_USAGE)
    if (ram && (ram.performanceMode ? ram.performanceMode !== get(special).optimizedMode : get(special).optimizedMode)) special.set({ ...get(special), optimizedMode: ram.performanceMode })
}

function autoBackup() {
    const interval = get(special).autoBackup || "weekly"
    if (interval === "never" || get(activePopup) === "initialize") return

    const now = Date.now()
    const lastBackup = get(special).autoBackupPrevious || 0
    const minTimeToBackup = getTimeFromInterval(interval)

    if (now - lastBackup > minTimeToBackup) {
        save(false, { backup: true, isAutoBackup: true })
    }
}

const lastProviderSyncs: Partial<Record<ContentProviderId, number>> = {}
export async function contentProviderSync(startup = false) {
    // on startup, wait until data is loaded
    if (!Object.keys(get(shows)).length) {
        await waitUntilValueIsDefined(() => get(loadedState).includes("synced_settings"), 200, 8000) // same await in getStoredData
        await waitUntilValueIsDefined(() => Object.keys(get(shows)).length, 50, 2000)
    }

    // none of the providers (Canva) need to load at startup, they connect when requested
    const providers: { providerId: ContentProviderId; scope: string; data?: any; autoSync?: boolean }[] = []

    providers.forEach(({ providerId, scope, data, autoSync }) => {
        if (startup && autoSync === false) return

        // make sure the same provider does not run multiple times at once
        const now = Date.now()
        const lastSync = lastProviderSyncs[providerId] || 0
        if (now - lastSync < 5000) return
        lastProviderSyncs[providerId] = now

        sendMain(Main.PROVIDER_STARTUP_LOAD, { providerId, scope, data })
    })
}

function getMainData() {
    requestMainMultiple({
        [Main.VERSION]: (a) => (a ? version.set(a) : null),
        [Main.IS_DEV]: (a) => isDev.set(a || false),
        [Main.GET_OS]: (a) => (a ? os.set(a) : null),
        [Main.GET_CACHE_PATH]: (a) => cachePath.set(a || ""),
        [Main.DEVICE_ID]: (a) => deviceId.set(a || ""),
        [Main.MAXIMIZED]: (a) => windowState.set({ ...get(windowState), maximized: a ?? false }),
        [Main.DATA_PATH]: (a) => (a ? dataPath.set(a) : null),
        // get connected providers, even before the first sync of the session
        [Main.PROVIDER_CONNECTIONS]: (a) => {
            if (!a) return
            providerConnections.update((c) => {
                Object.keys(a).forEach((providerId) => {
                    c[providerId as ContentProviderId] = true
                })
                return c
            })
        }
    })
}

async function getStoredData() {
    sendMainMultiple([Main.SYNCED_SETTINGS, Main.STAGE, Main.PROJECTS, Main.OVERLAYS, Main.TEMPLATES, Main.MEDIA, Main.THEMES, Main.HISTORY, Main.CACHE, Main.USAGE])

    await waitUntilValueIsDefined(() => get(loadedState).includes("synced_settings"), 200, 8000)
    sendMain(Main.SETTINGS)

    // LOAD SHOWS FROM FOLDER
    sendMain(Main.SHOWS)

    getDefaultElements()
}

async function startupOutput() {
    setLanguage() // this is only needed for the context menu (and stage display)
    receive(OUTPUT, receiveOUTPUTasOUTPUT)

    // wait a bit on slow computers
    await wait(200)

    send(OUTPUT, ["REQUEST_DATA_MAIN"])
}
