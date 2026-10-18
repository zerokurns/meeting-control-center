<script lang="ts">
    import { onMount } from "svelte"
    import type { TabsObj } from "../../../types/Tabs"
    import { activeEdit, activePopup, activeShow, drawer, drawerOpenedInEdit, editMode, focusMode, refreshEditSlide, showsCache, slideNotesActive, special } from "../../stores"
    import { getAccess } from "../../utils/profile"
    import Icon from "../helpers/Icon.svelte"
    import { getLayoutRef } from "../helpers/show"
    import FloatingInputs from "../input/FloatingInputs.svelte"
    import MaterialButton from "../inputs/MaterialButton.svelte"
    import Splash from "../main/Splash.svelte"
    import Tabs from "../main/Tabs.svelte"
    import TextEditor from "../show/TextEditor.svelte"
    import AudioEditor from "./editors/AudioEditor.svelte"
    import CameraEditor from "./editors/CameraEditor.svelte"
    import EffectEditor from "./editors/EffectEditor.svelte"
    import MediaEditor from "./editors/MediaEditor.svelte"
    import OverlayEditor from "./editors/OverlayEditor.svelte"
    import SceneEditor from "./editors/SceneEditor.svelte"
    import SlideEditor from "./editors/SlideEditor.svelte"
    import TemplateEditor from "./editors/TemplateEditor.svelte"
    import ItemAddMenu from "./ItemAddMenu.svelte"

    $: currentShowId = $activeShow?.id || $activeEdit.showId || ""
    $: currentShow = $showsCache[currentShowId]
    $: ref = getLayoutRef(currentShowId, currentShow)
    $: Slide = currentShow?.slides && $activeEdit.slide != null ? currentShow.slides[ref[$activeEdit.slide]?.id] : null

    $: profile = getAccess("shows")
    $: isLocked = currentShow?.locked || Slide?.locked || profile.global === "read" || profile[currentShow?.category || ""] === "read"

    $: if ($refreshEditSlide) {
        setTimeout(() => refreshEditSlide.set(false), 100)
    }

    // TODO: could add more tabs, like to edit slide layers (like background media)
    $: editTabs = {
        default: { name: "tools.slide", icon: "slide" }, // example.default
        text_edit: { name: "show.text", tooltip: "show.text [Ctrl+Shift+T]", icon: "text_edit" }
    } as TabsObj

    onMount(() => {
        // close drawer
        if (!$drawerOpenedInEdit) {
            const minHeight = 40
            if ($drawer.height > minHeight) drawer.set({ height: minHeight, stored: $drawer.height, autoclosed: true })
        }

        // mainly for overlay preview
        if ($activeShow?.id && ($activeShow.type || "show") !== "show" && (!$activeEdit.id || $activeEdit.type === $activeShow.type)) {
            activeEdit.set({ id: $activeShow.id, type: $activeShow.type, items: [] } as any)
        }
    })
</script>

<div class="editor">
    {#key $refreshEditSlide}
        {#if $activeEdit.type === "overlay"}
            <OverlayEditor />

            <ItemAddMenu />
        {:else if $activeEdit.type === "template"}
            <TemplateEditor />

            <ItemAddMenu />
        {:else if $activeEdit.type === "scene"}
            <SceneEditor />
        {:else if $activeEdit.type === "effect"}
            <EffectEditor />

            <FloatingInputs gradient style="width: 50px;height: 50px;border: none;">
                <MaterialButton
                    class="addButton"
                    title="edit.add_items"
                    style="width: 50px;height: 50px;"
                    on:click={() => {
                        activePopup.set("effect_items")
                        // const currentEffect = $effects[$activeEdit.id || ""] || {}
                        // const nextIndex = currentEffect?.items?.length || 0
                        // if (!openedMenus[nextIndex]) openedMenus[nextIndex] = true
                    }}
                >
                    <Icon id="add" size={1.5} white />
                </MaterialButton>
            </FloatingInputs>
        {:else if $activeEdit.type === "media"}
            <MediaEditor />
        {:else if $activeEdit.type === "camera"}
            {#key $activeEdit.id}
                <CameraEditor />
            {/key}
        {:else if $activeEdit.type === "audio"}
            <AudioEditor />
        {:else if $activeEdit.slide !== undefined}
            {#if !$focusMode}
                <Tabs tabs={editTabs} bind:active={$editMode} />
            {/if}

            <div class="content">
                {#if $editMode === "text_edit" && !$focusMode}
                    <TextEditor currentShow={$showsCache[$activeShow?.id || ""]} />
                {:else}
                    <SlideEditor />

                    {#if $editMode === "default" && !$slideNotesActive && !$special.slideTimelineActive && !$focusMode}
                        <ItemAddMenu {isLocked} />
                    {/if}
                {/if}
            </div>
        {:else}
            <Splash />
        {/if}
    {/key}
</div>

<style>
    .editor {
        position: relative;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .content {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
    }
</style>
