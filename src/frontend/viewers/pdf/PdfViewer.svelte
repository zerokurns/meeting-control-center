<script lang="ts">
    import type { RenderTask } from "pdfjs-dist"
    import { createEventDispatcher, onDestroy } from "svelte"
    import type { DocumentFit, DocumentInfo, DocumentViewState } from "../types"
    import { getPdfDocument, loadPdfInfo } from "./pdfCache"

    export let path: string
    export let unit = 0
    export let zoom = 1
    export let scrollY = 0
    export let fit: DocumentFit = "page"
    export let interactive = false
    export let background = ""

    const dispatch = createEventDispatcher<{ info: DocumentInfo; state: Partial<DocumentViewState>; error: string }>()

    const MIN_ZOOM = 0.25
    const MAX_ZOOM = 8
    const MAX_CANVAS_SIDE = 8192

    let scroller: HTMLDivElement | undefined
    let canvas: HTMLCanvasElement | undefined
    let width = 0
    let height = 0
    let pageCount = 0
    let error = ""

    let loadedPath = ""
    $: loadInfo(path)
    async function loadInfo(current: string) {
        if (!current || current === loadedPath) return
        loadedPath = current
        error = ""
        try {
            const info = await loadPdfInfo(current)
            if (current !== path) return
            pageCount = info.units.length
            dispatch("info", info)
        } catch (err) {
            if (current !== path) return
            fail(err)
        }
    }

    function fail(err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        error = message
        dispatch("error", message)
    }

    // render whenever what is shown changes; the latest request wins
    let token = 0
    let renderTask: RenderTask | null = null
    let rendered = 0 // bumped after each completed render so the scroll position can be applied
    $: render(path, unit, zoom, fit, width, height, canvas)

    async function render(currentPath: string, currentUnit: number, currentZoom: number, currentFit: DocumentFit, w: number, h: number, target: HTMLCanvasElement | undefined) {
        if (!currentPath || !target || w < 2 || h < 2) return

        const mine = ++token
        try {
            const doc = await getPdfDocument(currentPath)
            if (mine !== token) return
            const pageNumber = Math.min(Math.max(Math.round(currentUnit), 0), doc.numPages - 1) + 1
            const page = await doc.getPage(pageNumber)
            if (mine !== token) return

            const base = page.getViewport({ scale: 1 })
            const fitScale = currentFit === "width" ? w / base.width : Math.min(w / base.width, h / base.height)
            const scale = fitScale * Math.min(Math.max(currentZoom, MIN_ZOOM), MAX_ZOOM)

            const dpr = window.devicePixelRatio || 1
            const pixelScale = Math.min(scale * dpr, MAX_CANVAS_SIDE / Math.max(base.width, base.height))
            const viewport = page.getViewport({ scale: pixelScale })

            // draw offscreen first so the visible canvas never flashes blank between renders
            const buffer = document.createElement("canvas")
            buffer.width = Math.ceil(viewport.width)
            buffer.height = Math.ceil(viewport.height)
            const context = buffer.getContext("2d")
            if (!context) return

            renderTask?.cancel()
            const task = page.render({ canvas: buffer, canvasContext: context, viewport })
            renderTask = task
            try {
                await task.promise
            } catch (err) {
                if ((err as { name?: string })?.name === "RenderingCancelledException") return
                throw err
            }
            if (mine !== token) return

            target.width = buffer.width
            target.height = buffer.height
            target.style.width = Math.round(base.width * scale) + "px"
            target.style.height = Math.round(base.height * scale) + "px"
            target.getContext("2d")?.drawImage(buffer, 0, 0)
            rendered++
        } catch (err) {
            if (mine === token) fail(err)
        }
    }

    // scroll position: scrollY is the fraction of the overflow (only meaningful when the page is taller than the view)
    $: applyScroll(scrollY, rendered)
    function applyScroll(fraction: number, _rendered: number) {
        if (!scroller) return
        const overflowY = scroller.scrollHeight - scroller.clientHeight
        const overflowX = scroller.scrollWidth - scroller.clientWidth
        scroller.scrollTop = overflowY > 0 ? Math.min(Math.max(fraction, 0), 1) * overflowY : 0
        scroller.scrollLeft = overflowX > 0 ? overflowX / 2 : 0
    }

    function onScroll() {
        if (!interactive || !scroller) return
        const overflowY = scroller.scrollHeight - scroller.clientHeight
        if (overflowY <= 0) return
        const fraction = scroller.scrollTop / overflowY
        if (Math.abs(fraction - scrollY) > 0.002) dispatch("state", { scrollY: fraction })
    }

    function onWheel(e: WheelEvent) {
        if (!interactive || !(e.ctrlKey || e.metaKey)) return
        e.preventDefault()
        const next = Math.min(Math.max(zoom * Math.exp(-e.deltaY * 0.002), MIN_ZOOM), MAX_ZOOM)
        dispatch("state", { zoom: Math.round(next * 100) / 100 })
    }

    function onKeydown(e: KeyboardEvent) {
        if (!interactive || e.ctrlKey || e.metaKey || e.altKey) return

        let target = unit
        if (e.key === "ArrowRight" || e.key === "PageDown") target = unit + 1
        else if (e.key === "ArrowLeft" || e.key === "PageUp") target = unit - 1
        else if (e.key === "Home") target = 0
        else if (e.key === "End") target = pageCount - 1
        else return

        e.preventDefault()
        target = Math.min(Math.max(target, 0), Math.max(pageCount - 1, 0))
        if (target !== unit) dispatch("state", { unit: target, scrollY: 0 })
    }

    onDestroy(() => {
        token++
        renderTask?.cancel()
    })
</script>

<div class="viewer" class:interactive bind:clientWidth={width} bind:clientHeight={height} style={background ? `background: ${background};` : ""} tabindex={interactive ? 0 : -1} role="document" on:wheel={onWheel} on:keydown={onKeydown}>
    <div class="scroller" bind:this={scroller} on:scroll={onScroll}>
        <canvas bind:this={canvas} data-testid="pdf-canvas" />
    </div>

    {#if error}
        <p class="error">{error}</p>
    {/if}
</div>

<style>
    .viewer {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        outline: none;
    }

    .scroller {
        width: 100%;
        height: 100%;
        display: flex;
        overflow: hidden;
    }
    .interactive .scroller {
        overflow: auto;
    }

    canvas {
        flex: none;
        margin: auto;
        display: block;
        pointer-events: none;
    }

    .error {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        text-align: center;
        opacity: 0.7;
    }
</style>
