<script lang="ts">
    import { onDestroy, onMount } from "svelte"
    import { Main } from "../../../../types/IPC/Main"
    import { sendMain } from "../../../IPC/main"
    import { activePopup, autosave, dataPath, saved, special } from "../../../stores"
    import { previousAutosave, startAutosave, wait } from "../../../utils/common"
    import { translateText } from "../../../utils/language"
    import { save } from "../../../utils/save"
    import { convertAutosave } from "../../../values/autosave"
    import { getTimeFromInterval, joinTimeBig } from "../../helpers/time"
    import MaterialDropdown from "../../inputs/MaterialDropdown.svelte"
    import MaterialFolderPicker from "../../inputs/MaterialFolderPicker.svelte"

    function updateSpecial(value, key) {
        special.update((a) => {
            if (!value) delete a[key]
            else a[key] = value

            return a
        })
    }

    const autosaveList = [
        { value: "never", label: translateText("settings.never") },
        { value: "2min", label: translateText("2 settings.minutes") },
        { value: "5min", label: translateText("5 settings.minutes") },
        { value: "10min", label: translateText("10 settings.minutes") },
        { value: "15min", label: translateText("15 settings.minutes") },
        { value: "30min", label: translateText("30 settings.minutes") },
        { value: "60min", label: translateText("60 settings.minutes") },
        { value: "120min", label: translateText("120 settings.minutes") }
    ]

    // NOTE: monthly is misspelled as "mothly"
    const autobackupList = [
        { value: "never", label: translateText("settings.never") },
        { value: "daily", label: translateText("interval.daily") },
        { value: "weekly", label: translateText("interval.weekly") },
        { value: "mothly", label: translateText("interval.mothly") }
    ]

    // RESET

    // function reset() {
    //     const customLocation = !!$special.customUserDataLocation
    //     if (customLocation) save(false, { backup: true, isAutoBackup: true })

    //     autosave.set("15min")
    //     special.update((a) => {
    //         delete a.autoBackup
    //         delete a.customUserDataLocation
    //         return a
    //     })

    //     requestMain(Main.DATA_PATH, undefined, (path) => {
    //         dataPath.set(path)
    //     })
    // }

    // get times
    let nextAutosave = 0
    let nextAutobackup = 0

    let updater: NodeJS.Timeout | null = null
    onMount(() => {
        checkTimes()
        updater = setInterval(checkTimes, 1000)
    })
    onDestroy(() => {
        if (updater) clearInterval(updater)
    })
    function checkTimes() {
        const now = Date.now()

        // autosave
        const as = $autosave || "15min"
        if (previousAutosave && as !== "never") {
            const saveInterval = convertAutosave[as]
            nextAutosave = now - previousAutosave - saveInterval
        } else {
            nextAutosave = 0
        }

        // auto backup
        const interval = $special.autoBackup || "weekly"
        if (interval === "never" || $activePopup === "initialize") {
            nextAutobackup = 0
            return
        }
        if (nextAutobackup < 0) return
        const lastBackup = $special.autoBackupPrevious || 0
        const minTimeToBackup = getTimeFromInterval(interval)
        nextAutobackup = minTimeToBackup - (now - lastBackup)
        if (nextAutobackup < 0) nextAutobackup = -1
    }

    function updateAutosave(e) {
        autosave.set(e.detail)
        startAutosave()
    }

    const infoStyle = "color: var(--text);opacity: 0.5;font-weight: normal;font-size: 0.8em;margin-left: 10px;"
    $: autosaveInfo = nextAutosave ? `<span style="${infoStyle}">${joinTimeBig(nextAutosave / 1000)}<span>` : ""
    $: autoBackupInfo = nextAutobackup ? `<span style="${infoStyle}">${joinTimeBig(nextAutobackup < 0 ? 0 : nextAutobackup / 1000)}<span>` : ""
    $: autoBackup = $special.autoBackup || "weekly"

    async function updateDataPath(e: any) {
        if (!$saved) {
            // save files first and backup just in case
            save(false, { backup: true, isAutoBackup: true })
            await wait(1500)
        }

        const oldPath = $dataPath
        const newPath = e.detail

        sendMain(Main.UPDATE_DATA_PATH, { newPath, oldPath })
        dataPath.set(newPath)

        sendMain(Main.REFRESH_SHOWS)
    }
</script>

<MaterialDropdown label="settings.autosave{autosaveInfo}" value={$autosave} defaultValue="15min" options={autosaveList} on:change={updateAutosave} />
<MaterialDropdown label="settings.auto_backup{autoBackupInfo}" value={autoBackup} defaultValue="weekly" options={autobackupList} on:change={(e) => updateSpecial(e.detail, "autoBackup")} />

<MaterialFolderPicker label="settings.data_location" value={$dataPath} on:change={updateDataPath} />

<!-- {#key refreshInput}
    <MaterialToggleSwitch label="settings.user_data_location" disabled={!$dataPath} checked={$special.customUserDataLocation || false} defaultValue={false} on:change={(e) => toggle(e.detail, "customUserDataLocation")} />
{/key} -->
