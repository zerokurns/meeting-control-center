<script lang="ts">
    import { onDestroy } from "svelte"
    import { uid } from "uid"
    import { Main } from "../../../../types/IPC/Main"
    import { ToMain } from "../../../../types/IPC/ToMain"
    import { destroyMain, receiveToMain, requestMain, sendMain } from "../../../IPC/main"
    import { audioFolders, drawerTabsData, effectsLibrary, labelsDisabled, media } from "../../../stores"
    import { getAccess } from "../../../utils/profile"
    import { keysToID, sortObject } from "../../helpers/array"
    import { addDrawerFolder } from "../../helpers/dropActions"
    import Icon from "../../helpers/Icon.svelte"
    import { countFolderMediaItems } from "../../helpers/media"
    import T from "../../helpers/T.svelte"
    import MaterialButton from "../../inputs/MaterialButton.svelte"
    import NavigationSections from "./NavigationSections.svelte"

    const profile = getAccess("audio")
    $: readOnly = profile.global === "read"

    $: activeSubTab = $drawerTabsData.audio?.activeSubTab || ""

    $: foldersList = keysToID($audioFolders)
    $: favoritesListLength = Object.values($media).filter((a) => a.audio && a.favourite).length
    $: effectsLength = $effectsLibrary.length

    let allCount = 0
    let folderLengths: { [key: string]: number } = {}
    $: if (foldersList.length) getCounts()
    async function getCounts() {
        const folderPaths = foldersList.map((a) => a.path || "")
        const data = keysToID((await requestMain(Main.READ_FOLDER, { path: folderPaths })) || {})
        const newFolderLengths: { [key: string]: number } = {}
        allCount = 0

        folderPaths.forEach((folderPath) => {
            const count = countFolderMediaItems(folderPath, data)
            newFolderLengths[folderPath] = count.folder + count.audio
            allCount += count.audio
        })

        folderLengths = newFolderLengths
    }

    let sections: any[] = []
    $: sections = [
        [
            { id: "all", label: "category.all", icon: "all", count: allCount },
            { id: "favourites", label: "category.favourites", icon: "star", count: favoritesListLength, hidden: !favoritesListLength && activeSubTab !== "favourites" }
        ],
        [{ id: "inputs", label: "emitters.inputs", icon: "input" }],
        [{ id: "effects_library", label: "category.sound_effects", icon: "effect", count: effectsLength, hidden: !effectsLength && activeSubTab !== "effects_library" }],
        [{ id: "TITLE", label: "media.folders" }, ...convertToButton(foldersList, folderLengths)]
    ]

    function convertToButton(categories: any[], lengths: { [key: string]: number }) {
        return sortObject(categories, "name").map((a) => {
            return { id: a.id, label: a.name, icon: a.icon || "folder", count: lengths[a.path], boxedIcon: true }
        })
    }

    const PICK_ID = uid()
    function addFolder() {
        sendMain(Main.OPEN_FOLDER, { channel: PICK_ID })
    }
    let listenerId = receiveToMain(ToMain.OPEN_FOLDER2, (data) => {
        if (data.channel !== PICK_ID || !data.path) return
        addDrawerFolder(data, "audio")
    })
    onDestroy(() => destroyMain(listenerId))

    function updateName(e: any) {
        const { id, value } = e.detail

        audioFolders.update((a) => {
            if (a[id].default) delete a[id].default
            a[id].name = value
            return a
        })
    }
</script>

<NavigationSections {sections} active={activeSubTab} on:rename={updateName}>
    <div slot="section_3" style="padding: 8px;{foldersList.length ? 'padding-top: 12px;' : ''}">
        <MaterialButton style="width: 100%;" title="new.system_folder" variant="outlined" disabled={readOnly} on:click={addFolder} small>
            <Icon id="add" size={$labelsDisabled ? 0.9 : 1} white={$labelsDisabled} />
            {#if !$labelsDisabled}<T id="new.system_folder" />{/if}
        </MaterialButton>
    </div>
</NavigationSections>
