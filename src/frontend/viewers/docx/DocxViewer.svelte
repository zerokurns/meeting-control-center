<script lang="ts">
    // Shows one page of a Word document rendered by docx-preview, scaled per fit/zoom and scrolled per scrollY.
    import { createEventDispatcher, onDestroy, onMount, tick } from "svelte"
    import type { DocumentFit, DocumentInfo, DocumentViewState } from "../types"
    import { clampUnit, computeScale, pageUnits, scrollOffset, titleFromPath } from "./helpers"
    import { getRenderedDocx } from "./render"

    export let path: string
    export let unit = 0
    export let zoom = 1
    export let scrollY = 0
    export let fit: DocumentFit = "page"
    export let interactive = false
    export let background = ""

    const dispatch = createEventDispatcher<{ info: DocumentInfo; state: Partial<DocumentViewState>; error: string }>()

    let viewport: HTMLDivElement
    let content: HTMLDivElement
    let pages = 0
    let loadedPath = ""
    let containerSize = { width: 0, height: 0 }
    let pageSize = { width: 0, height: 0 }
    let scale = 1
    let offsetY = 0
    let offsetX = 0
    let observer: ResizeObserver | null = null
    let mounted = false

    $: if (mounted && path !== loadedPath) loadDocument(path)

    async function loadDocument(file: string) {
        loadedPath = file
        pages = 0
        content.innerHTML = ""
        try {
            const rendered = await getRenderedDocx(file)
            if (file !== loadedPath) return
            content.innerHTML = rendered.html
            pages = rendered.pages
            dispatch("info", { kind: "docx", path: file, title: titleFromPath(file), units: pageUnits(rendered.pages) })
            await tick()
            layout()
        } catch (err) {
            if (file !== loadedPath) return
            dispatch("error", err instanceof Error ? err.message : String(err))
        }
    }

    function layout() {
        if (!content || !viewport || !pages) return
        const sections = Array.from(content.querySelectorAll<HTMLElement>("section.docx"))
        if (!sections.length) return
        const active = clampUnit(unit, sections.length)
        sections.forEach((section, i) => {
            section.style.display = i === active ? "" : "none"
            section.style.margin = "0"
        })

        const section = sections[active]
        // natural (unscaled) size: offset sizes ignore transforms
        pageSize = { width: section.offsetWidth, height: section.offsetHeight }
        containerSize = { width: viewport.clientWidth, height: viewport.clientHeight }

        scale = computeScale(fit, zoom, containerSize, pageSize)
        const scaledWidth = pageSize.width * scale
        const scaledHeight = pageSize.height * scale
        offsetX = (containerSize.width - scaledWidth) / 2
        offsetY = scaledHeight < containerSize.height ? (containerSize.height - scaledHeight) / 2 : scrollOffset(scrollY, scaledHeight, containerSize.height)
    }

    // re-layout whenever any contract prop changes
    $: if (pages) ([unit, zoom, scrollY, fit], layout())

    onMount(() => {
        observer = new ResizeObserver(() => layout())
        observer.observe(viewport)
        mounted = true
    })
    onDestroy(() => observer?.disconnect())

    function onWheel(e: WheelEvent) {
        if (!interactive) return
        e.preventDefault()
        if (e.ctrlKey) {
            const next = Math.min(5, Math.max(0.25, zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)))
            dispatch("state", { zoom: Math.round(next * 100) / 100 })
            return
        }
        const overflow = Math.max(0, pageSize.height * scale - containerSize.height)
        if (!overflow) return
        dispatch("state", { scrollY: Math.min(1, Math.max(0, scrollY + e.deltaY / overflow)) })
    }

    function onKeydown(e: KeyboardEvent) {
        if (!interactive || !pages) return
        let next = unit
        if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") next = unit - 1
        else if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown") next = unit + 1
        else return
        e.preventDefault()
        next = clampUnit(next, pages)
        if (next !== unit) dispatch("state", { unit: next, scrollY: 0 })
    }
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div class="viewport" data-testid="docx-viewer" style={background ? `background: ${background};` : ""} bind:this={viewport} on:wheel={onWheel} on:keydown={onKeydown} tabindex={interactive ? 0 : -1}>
    <div class="stage" style="width: {pageSize.width}px; height: {pageSize.height}px; transform: translate({offsetX}px, {offsetY}px) scale({scale});" bind:this={content} />
</div>

<style>
    .viewport {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        outline: none;
    }
    .stage {
        position: absolute;
        top: 0;
        left: 0;
        transform-origin: 0 0;
    }
    /* neutralise docx-preview's grey wrapper so only the page box shows */
    .stage :global(.docx-wrapper) {
        background: transparent !important;
        padding: 0 !important;
        display: block !important;
    }
    .stage :global(section.docx) {
        background: white;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.45);
        margin: 0 !important;
    }
</style>
