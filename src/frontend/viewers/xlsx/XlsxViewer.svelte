<script lang="ts">
    // ----- Meeting Control Center -----
    // Renders one sheet of a workbook as a read-only HTML table. See README.md.
    import { createEventDispatcher, tick } from "svelte"
    import type * as XLSX from "xlsx"
    import { encodeFilePath } from "../../components/helpers/media"
    import type { DocumentFit } from "../types"
    import { MAX_ROWS, parseWorkbook, sheetToHtml, workbookInfo } from "./parse"

    export let path: string
    export let unit = 0
    export let zoom = 1
    export let scrollY = 0
    export let fit: DocumentFit = "page"
    export let interactive = false
    export let background = ""

    const dispatch = createEventDispatcher()

    let workbook: XLSX.WorkBook | null = null
    let loadedPath = ""
    let loadToken = 0

    async function loadFile(file: string) {
        const token = ++loadToken
        workbook = null
        loadedPath = ""
        if (!file) return
        try {
            const response = await fetch(encodeFilePath(file))
            if (!response.ok) throw new Error(`Could not read ${file} (${response.status})`)
            const parsed = parseWorkbook(await response.arrayBuffer())
            if (token !== loadToken) return
            workbook = parsed
            loadedPath = file
            dispatch("info", workbookInfo(parsed, file))
        } catch (err) {
            if (token !== loadToken) return
            dispatch("error", err instanceof Error ? err.message : String(err))
        }
    }

    $: loadFile(path)

    $: sheetCount = workbook?.SheetNames.length || 0
    $: sheetIndex = sheetCount ? Math.min(Math.max(Math.round(unit) || 0, 0), sheetCount - 1) : 0
    $: sheetName = workbook?.SheetNames[sheetIndex] || ""
    $: rendered = workbook ? sheetToHtml(workbook.Sheets[sheetName]) : null

    let viewport: HTMLDivElement | undefined
    let table: HTMLDivElement | undefined
    let viewWidth = 0
    let viewHeight = 0
    let naturalWidth = 0
    let naturalHeight = 0

    // measure the unscaled table after every new render
    $: if (rendered) measure()
    async function measure() {
        await tick()
        if (!table) return
        naturalWidth = table.offsetWidth
        naturalHeight = table.offsetHeight
        applyScroll()
    }

    $: baseScale = computeScale(fit, viewWidth, viewHeight, naturalWidth, naturalHeight)
    $: scale = Math.max(0.05, baseScale * (zoom > 0 ? zoom : 1))
    function computeScale(mode: DocumentFit, vw: number, vh: number, nw: number, nh: number) {
        if (!vw || !vh || !nw || !nh) return 1
        const byWidth = vw / nw
        return mode === "width" ? byWidth : Math.min(byWidth, vh / nh)
    }

    // external scroll position (fraction of the overflow)
    $: (scrollY, scale, applyScroll())
    let ignoreScroll = false
    function applyScroll() {
        if (!viewport) return
        const overflow = viewport.scrollHeight - viewport.clientHeight
        const top = overflow > 0 ? Math.min(Math.max(scrollY, 0), 1) * overflow : 0
        if (Math.abs(viewport.scrollTop - top) < 1) return
        ignoreScroll = true
        viewport.scrollTop = top
        requestAnimationFrame(() => (ignoreScroll = false))
    }

    function onScroll() {
        if (!interactive || ignoreScroll || !viewport) return
        const overflow = viewport.scrollHeight - viewport.clientHeight
        dispatch("state", { scrollY: overflow > 0 ? viewport.scrollTop / overflow : 0 })
    }

    function onWheel(e: WheelEvent) {
        if (!interactive || !e.ctrlKey) return
        e.preventDefault()
        const next = Math.min(Math.max(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), 0.25), 8)
        dispatch("state", { zoom: Math.round(next * 100) / 100 })
    }

    function onKeydown(e: KeyboardEvent) {
        if (!interactive || !sheetCount) return
        const target = e.target as HTMLElement | null
        if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return
        if (e.key === "ArrowRight" && sheetIndex < sheetCount - 1) dispatch("state", { unit: sheetIndex + 1, scrollY: 0 })
        else if (e.key === "ArrowLeft" && sheetIndex > 0) dispatch("state", { unit: sheetIndex - 1, scrollY: 0 })
        else return
        e.preventDefault()
    }
</script>

<svelte:window on:keydown={onKeydown} />

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="xlsx" style={background ? `background: ${background};` : ""} data-path={loadedPath}>
    <div class="viewport" class:interactive bind:this={viewport} bind:clientWidth={viewWidth} bind:clientHeight={viewHeight} on:scroll={onScroll} on:wheel={onWheel}>
        <div class="sizer" style="width: {naturalWidth * scale}px; height: {naturalHeight * scale}px;">
            <div class="sheet" bind:this={table} style="transform: scale({scale});">
                {#if rendered}{@html rendered.html}{/if}
            </div>
        </div>
        {#if rendered?.truncated}
            <p class="footer">showing first {MAX_ROWS.toLocaleString("en-US")} rows</p>
        {/if}
    </div>
</div>

<style>
    .xlsx {
        width: 100%;
        height: 100%;
        position: relative;
        background: #fff;
        color: #1b1b1b;
        overflow: hidden;
    }
    .viewport {
        width: 100%;
        height: 100%;
        overflow: hidden;
    }
    .viewport.interactive {
        overflow: auto;
    }
    .sizer {
        position: relative;
        overflow: hidden;
    }
    .sheet {
        position: absolute;
        top: 0;
        left: 0;
        width: max-content;
        transform-origin: 0 0;
        font-family: system-ui, sans-serif;
        font-size: 14px;
    }
    .footer {
        margin: 0;
        padding: 6px 10px;
        font-size: 12px;
        opacity: 0.7;
    }

    .sheet :global(table) {
        border-collapse: collapse;
        table-layout: auto;
    }
    .sheet :global(td),
    .sheet :global(th) {
        border: 1px solid #c8c8c8;
        padding: 4px 8px;
        vertical-align: top;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        text-align: left;
    }
    .sheet :global(tr:first-child td),
    .sheet :global(tr:first-child th) {
        font-weight: bold;
        background: #e8edf3;
    }
    .sheet :global(tr:nth-child(even):not(:first-child) td) {
        background: #f5f7fa;
    }
    .sheet :global(td[data-t="n"]),
    .sheet :global(td[data-t="d"]) {
        text-align: right;
        font-variant-numeric: tabular-nums;
    }
</style>
