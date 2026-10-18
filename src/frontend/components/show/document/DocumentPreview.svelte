<script lang="ts">
    import { onDestroy } from "svelte"
    import type { DocumentItemData } from "../../../agenda/agenda"
    import { activeProject, outLocked, outputs, projects } from "../../../stores"
    import { documentPreviewState, getViewer } from "../../../viewers"
    import type { DocumentFit, DocumentInfo, DocumentKind, DocumentViewState } from "../../../viewers/types"
    import { documentKindOf } from "../../../viewers/registry"
    import { getFileName, removeExtension } from "../../helpers/media"
    import { getActiveOutputs, setOutput, startFolderTimer } from "../../helpers/output"
    import MaterialButton from "../../inputs/MaterialButton.svelte"
    import { clearBackground } from "../../output/clear"

    export let show: { id: string; name?: string; type?: string; data?: DocumentItemData & { timer?: number } }
    export let index: number

    $: path = show.id
    $: data = ($projects[$activeProject || ""]?.shows?.[index]?.data || show.data || {}) as DocumentItemData & { timer?: number }
    $: kind = (data.kind || documentKindOf(path) || "pdf") as DocumentKind
    $: viewer = getViewer(kind)
    $: name = show.name || removeExtension(getFileName(path))

    const MIN_ZOOM = 0.25
    const MAX_ZOOM = 8

    let info: DocumentInfo | null = null
    let error = ""
    let view: DocumentViewState = { unit: 0, zoom: 1, scrollY: 0, fit: "page" }

    $: unitCount = info?.units.length || 0
    $: note = data.notes?.[view.unit] || ""

    // reload when the file changes
    let loadedKey = ""
    $: loadInfo(path, viewer)
    async function loadInfo(currentPath: string, currentViewer: typeof viewer) {
        const key = kind + "\n" + currentPath
        if (!currentPath || key === loadedKey) return
        loadedKey = key
        info = null
        error = ""
        view = { unit: 0, zoom: 1, scrollY: 0, fit: "page" }
        if (!currentViewer) {
            error = "No viewer available for this file type."
            return
        }

        try {
            const loaded = await currentViewer.load(currentPath)
            if (key === loadedKey) info = loaded
        } catch (err) {
            if (key === loadedKey) error = err instanceof Error ? err.message : String(err)
        }
    }

    // publish the previewed unit so the global shortcut can start this document at it
    $: if (path && info) documentPreviewState.set({ path, unit: view.unit })
    onDestroy(() => documentPreviewState.set(null))

    // OUTPUT STATE

    $: activeOutput = getActiveOutputs($outputs, false, true, true)[0]
    $: outSlide = $outputs[activeOutput]?.out?.slide
    $: isOut = (outSlide?.type === "document" || outSlide?.type === "pdf") && outSlide.id === path
    $: outUnit = isOut ? (outSlide?.unit ?? outSlide?.page ?? 0) : -1

    // follow the output when its unit changes (next/previous slide, API, timer)
    let lastOutUnit = -1
    $: if (outUnit !== lastOutUnit) {
        lastOutUnit = outUnit
        if (outUnit >= 0 && outUnit !== view.unit) view = { ...view, unit: outUnit, scrollY: 0 }
    }

    function clampUnit(unit: number) {
        return Math.min(Math.max(unit, 0), Math.max(unitCount - 1, 0))
    }

    function select(unit: number, take = false) {
        unit = clampUnit(unit)
        view = { ...view, unit, scrollY: 0 }
        if (take) takeToOutput()
    }

    function onThumbnailClick(e: MouseEvent, unit: number) {
        select(unit, !($outLocked || e.ctrlKey || e.metaKey || e.shiftKey))
    }

    function takeToOutput() {
        if ($outLocked || !info) return

        setOutput("slide", { id: path, type: "document", kind, unit: view.unit, units: unitCount, zoom: view.zoom, scrollY: view.scrollY, fit: view.fit, name, projectIndex: index })
        clearBackground()

        if (data.timer) startFolderTimer(path, { type: "pdf", path: "" })
    }

    function setZoom(zoom: number) {
        view = { ...view, zoom: Math.round(Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM) * 100) / 100 }
    }
    function toggleFit() {
        const fit: DocumentFit = view.fit === "page" ? "width" : "page"
        view = { ...view, fit, scrollY: 0 }
    }

    function onState(e: CustomEvent<Partial<DocumentViewState>>) {
        const next = { ...view, ...e.detail }
        if (e.detail.unit !== undefined) next.unit = clampUnit(e.detail.unit)
        view = next
    }

    // THUMBNAILS (loaded lazily when they scroll into view)

    const THUMB_WIDTH = 160
    let thumbnails: { [unit: number]: string | null } = {}
    $: if (path) thumbnails = {}

    let observer: IntersectionObserver | null = null
    function lazy(node: HTMLElement, unit: number) {
        observer ??= new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return
                    observer?.unobserve(entry.target)
                    loadThumbnail(Number((entry.target as HTMLElement).dataset.unit))
                })
            },
            { rootMargin: "200px" }
        )
        node.dataset.unit = String(unit)
        observer.observe(node)
        return {
            destroy() {
                observer?.unobserve(node)
            }
        }
    }
    async function loadThumbnail(unit: number) {
        if (!viewer || thumbnails[unit] !== undefined) return
        const currentPath = path
        let url: string | null = null
        try {
            url = await viewer.thumbnail(currentPath, unit, THUMB_WIDTH)
        } catch {}
        if (currentPath === path) thumbnails[unit] = url
    }
    onDestroy(() => observer?.disconnect())

    // keep the selected thumbnail visible
    let strip: HTMLDivElement | undefined
    $: if (strip && info) scrollToUnit(view.unit)
    function scrollToUnit(unit: number) {
        strip?.querySelector(`[data-unit="${unit}"]`)?.scrollIntoView({ block: "nearest" })
    }
</script>

<div class="document" data-testid="document-preview">
    <div class="strip" bind:this={strip} data-testid="document-thumbnails">
        {#each info?.units || [] as u (u.index)}
            <div class="thumb" class:selected={view.unit === u.index} class:out={outUnit === u.index} data-unit={u.index} use:lazy={u.index}>
                <button class="image" title={u.label} on:click={(e) => onThumbnailClick(e, u.index)}>
                    {#if thumbnails[u.index]}
                        <img src={thumbnails[u.index]} alt={u.label} draggable="false" />
                    {:else}
                        <span class="label">{u.label}</span>
                    {/if}
                </button>
                <span class="number">{u.index + 1}</span>
            </div>
        {/each}
    </div>

    <div class="main">
        <div class="toolbar">
            <MaterialButton icon="arrow_back_modern" title="media.previous" disabled={view.unit <= 0} on:click={() => select(view.unit - 1)} />
            <span class="count" data-testid="document-unit-indicator">{unitCount ? view.unit + 1 : 0} / {unitCount}</span>
            <MaterialButton icon="arrow_forward" title="media.next" disabled={view.unit >= unitCount - 1} on:click={() => select(view.unit + 1)} />

            <div class="divider"></div>

            <MaterialButton icon="remove" title="actions.zoomOut" disabled={view.zoom <= MIN_ZOOM} on:click={() => setZoom(view.zoom - 0.25)} />
            <button class="zoom" title="1x" on:click={() => setZoom(1)}>{Math.round(view.zoom * 100)}%</button>
            <MaterialButton icon="add" title="actions.zoomIn" disabled={view.zoom >= MAX_ZOOM} on:click={() => setZoom(view.zoom + 0.25)} />

            <div class="divider"></div>

            <MaterialButton icon={view.fit === "page" ? "expand" : "collapse"} title={view.fit === "page" ? "Fit page" : "Fit width"} on:click={toggleFit} />

            <span class="spacer"></span>

            <MaterialButton variant="contained" icon="play" disabled={$outLocked || !info} on:click={takeToOutput}>Take</MaterialButton>
        </div>

        <div class="viewer">
            {#if viewer && info}
                {#key kind + path}
                    <svelte:component this={viewer.Component} {path} unit={view.unit} zoom={view.zoom} scrollY={view.scrollY} fit={view.fit} interactive keyboard={false} on:state={onState} on:error={(e) => (error = e.detail)} />
                {/key}
            {/if}

            {#if error}
                <p class="message">{error}</p>
            {:else if !info}
                <p class="message">...</p>
            {/if}
        </div>

        {#if note}
            <div class="note" data-testid="document-note">{note}</div>
        {/if}
    </div>
</div>

<style>
    .document {
        display: flex;
        width: 100%;
        height: 100%;
        min-height: 0;
    }

    .strip {
        flex: none;
        width: 190px;
        overflow-y: auto;
        padding: 6px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        background-color: var(--primary-darker);
        border-inline-end: 1px solid var(--primary-lighter);
    }

    .thumb {
        position: relative;
        flex: none;
    }
    .thumb .image {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-height: 60px;
        padding: 0;
        background-color: var(--primary-darkest);
        outline-offset: -1px;
        overflow: hidden;
    }
    .thumb img {
        width: 100%;
        display: block;
        pointer-events: none;
    }
    .thumb .label {
        font-size: 0.8em;
        opacity: 0.6;
    }
    .thumb.selected .image {
        outline: 2px solid var(--secondary);
    }
    .thumb.out .image {
        outline: 2px solid var(--secondary);
        background-color: var(--secondary-opacity);
    }
    .thumb .number {
        position: absolute;
        bottom: 2px;
        inset-inline-start: 2px;
        padding: 0 5px;
        font-size: 0.7em;
        font-weight: bold;
        background-color: rgb(0 0 0 / 0.6);
        pointer-events: none;
    }

    .main {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
    }

    .toolbar {
        flex: none;
        display: flex;
        align-items: center;
        gap: 2px;
        padding: 2px 6px;
        background-color: var(--primary-darkest);
    }
    .toolbar .count {
        min-width: 56px;
        text-align: center;
        font-size: 0.9em;
        opacity: 0.8;
    }
    .toolbar .zoom {
        min-width: 50px;
        padding: 4px;
        font-size: 0.85em;
        background: none;
    }
    .toolbar .divider {
        width: 1px;
        align-self: stretch;
        margin: 6px 4px;
        background-color: var(--primary-lighter);
    }
    .toolbar .spacer {
        flex: 1;
    }

    .viewer {
        position: relative;
        flex: 1;
        min-height: 0;
        background-color: var(--primary-darkest);
    }
    .message {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        text-align: center;
        opacity: 0.6;
        pointer-events: none;
    }

    .note {
        flex: none;
        max-height: 25%;
        overflow-y: auto;
        padding: 8px 12px;
        font-size: 0.9em;
        white-space: pre-wrap;
        background-color: var(--primary-darker);
        border-top: 1px solid var(--primary-lighter);
    }
</style>
