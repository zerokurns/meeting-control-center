<script lang="ts">
    import { onDestroy } from "svelte"
    import { activePopup, outputs, popupData, styles, templates } from "../../../stores"
    import { translateText } from "../../../utils/language"
    import { formatSearch } from "../../../utils/search"
    import Card from "../../drawer/Card.svelte"
    import TemplateSlide from "../../drawer/pages/TemplateSlide.svelte"
    import { clone, keysToID, sortByName } from "../../helpers/array"
    import { getResolution } from "../../helpers/output"
    import T from "../../helpers/T.svelte"
    import MaterialButton from "../../inputs/MaterialButton.svelte"
    import MaterialTextInput from "../../inputs/MaterialTextInput.svelte"
    import Center from "../../system/Center.svelte"
    import Icon from "../../helpers/Icon.svelte"
    import { registerPopupSubmit } from "../../../utils/popup"

    registerPopupSubmit(() => {
        if (!searchValue.length || !searchedTemplates.length) return
        selectTemplate(searchedTemplates[0], true)
    })

    let revert = $popupData.revert
    let allowEmpty = !!$popupData.allowEmpty

    $: hideIds = $popupData.hideIds || []
    $: sortedTemplates = sortByName(keysToID($templates).filter((a) => !hideIds.includes(a.id) && a?.settings?.mode !== "text"))

    $: defaultTemplates = clone(sortedTemplates)
    $: if (defaultTemplates) search()

    $: active = $popupData.active || ""

    $: value = active

    let searchedTemplates = clone(defaultTemplates)
    let searchValue = ""
    // let previousSearchValue = ""
    function search(value: string | null = null) {
        searchValue = formatSearch(value || "")

        if (searchValue.length < 2) {
            searchedTemplates = clone(defaultTemplates)
            return
        }

        let currentTemplatesList = clone(defaultTemplates) // searchedTemplates
        searchedTemplates = currentTemplatesList.filter((a) => formatSearch(a.name || "").includes(searchValue))
    }

    function selectTemplate(template: any, keyboard = false) {
        let previousValue = value
        // update before closing
        value = template.id

        setTimeout(() => {
            if ($popupData.trigger) $popupData.trigger(value)

            if ($popupData.doubleClick && !keyboard && previousValue !== template.id) return

            if (!revert) setTimeout(() => popupData.set({}), 500) // revert after closing
            activePopup.set(revert || null)
        })
    }

    let resolution = getResolution(null, { $outputs, $styles })

    $: templatesList = searchedTemplates

    // lazy loader
    let lazyLoader = 0
    let timeout: NodeJS.Timeout | null = null
    let loaded = false

    onDestroy(() => {
        if (timeout) clearTimeout(timeout)
    })

    $: if (searchValue !== undefined) {
        loaded = false
        lazyLoader = 0
    }

    $: if (!loaded && templatesList?.length) {
        if (lazyLoader >= templatesList.length) {
            loaded = true
        } else {
            if (timeout) clearTimeout(timeout)
            timeout = setTimeout(() => {
                const batch = lazyLoader === 0 ? 4 : Math.min(32, lazyLoader * 2)
                lazyLoader += batch
            }, lazyLoader === 0 ? 60 : 30)
        }
    }

</script>

{#if revert}
    <MaterialButton class="popup-back" icon="back" iconSize={1.3} title="actions.back" on:click={() => activePopup.set(revert)} />
{/if}

<MaterialTextInput label="main.search" value="" on:input={(e) => search(e.detail)} autofocus />


<div style="position: relative;height: 100%;width: calc(100vw - (var(--navigation-width) + 20px) * 2);margin-top: 10px;overflow-y: auto;">
    {#if templatesList.length}
        <div class="grid">
            {#if allowEmpty}
                <Card active={!value} label={translateText(allowEmpty ? "main.none" : "example.default")} icon="templates" {resolution} on:click={() => selectTemplate("")}>
                    <Center faded>
                        <Icon id="close" size={2} white />
                    </Center>
                </Card>
            {/if}

            {#each templatesList as template, i (template.id)}
                <Card preview={!!(searchValue.length && i === 0)} active={value === template.id} label={template.name} color={template.color} {resolution} on:click={() => selectTemplate(template)}>
                    {#if loaded || i < lazyLoader}
                        <TemplateSlide templateId={template.id} {template} preview />
                    {/if}
                </Card>
            {/each}
        </div>
    {:else}
        <Center size={1.2} faded style="height: 100px;padding-top: 20px;">
            {#if sortedTemplates.length}
                <T id="empty.search" />
            {:else}
                <T id="empty.general" />
            {/if}
        </Center>
    {/if}
</div>

<style>
    .grid {
        display: flex;
        flex-wrap: wrap;
        flex: 1;
        padding: 5px;
        place-content: flex-start;
    }
</style>
