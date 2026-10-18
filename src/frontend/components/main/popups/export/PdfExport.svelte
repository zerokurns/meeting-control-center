<script lang="ts">
    import type { Show } from "../../../../../types/Show"
    import { translateText } from "../../../../utils/language"
    import Pdf from "../../../export/Pdf.svelte"
    import MaterialButton from "../../../inputs/MaterialButton.svelte"
    import MaterialCheckbox from "../../../inputs/MaterialCheckbox.svelte"
    import MaterialDropdown from "../../../inputs/MaterialDropdown.svelte"
    import MaterialNumberInput from "../../../inputs/MaterialNumberInput.svelte"

    export let pdfOptions: any
    export let previewShow: Show | null
    export let showCount = 1
    export let exportType = ""

    let paper: any = null

    if (!Object.keys(pdfOptions).length) {
        pdfOptions = {
            type: "default",

            title: true,
            metadata: true,
            pageNumbers: true,
            groups: true,
            numbers: true,
            notes: false,
            invert: false,

            grid: [3, 6],
            oneFile: exportType === "project",
            originalTextSize: true,
            textSize: 80
        }
    }

    // always one file if project type
    $: pdfOptions.oneFile = exportType === "project"
    console.log("Shows:", showCount)

    $: pdfTypeOptions = [{ value: "default", label: translateText("example.default") }, { value: "text", label: translateText("export.text") }, { value: "slides", label: translateText("export.slides") }, { value: "media", label: translateText("items.media") }]

    function updatePdfOptions(e: any, key: string) {
        pdfOptions[key] = e.detail
    }
</script>

<!-- min-width: 42vw; -->
<div style="display: flex;gap: 15px;">
    <div class="options" style="flex: 0 0 300px;">
        <MaterialDropdown label="clock.type" style="margin-bottom: 10px;" options={pdfTypeOptions} value={pdfOptions.type || "default"} on:change={(e) => (pdfOptions.type = e.detail)} />

        <!-- {#if showCount > 1}
            <MaterialCheckbox label="export.oneFile" style="margin-bottom: 10px;" checked={pdfOptions.oneFile} disabled={exportType === "project"} on:change={(e) => updatePdfOptions(e, "oneFile")} />
        {/if} -->

        <!-- <MaterialCheckbox label="export.title" checked={pdfOptions.title} on:change={(e) => updatePdfOptions(e, "title")} /> -->

        {#if pdfOptions.type === "media"}
            <!-- no options needed -->
        {:else}
            <MaterialCheckbox label="export.metadata" checked={pdfOptions.metadata} on:change={(e) => updatePdfOptions(e, "metadata")} />
            <MaterialCheckbox label="export.page_numbers" checked={pdfOptions.pageNumbers} on:change={(e) => updatePdfOptions(e, "pageNumbers")} />
            <MaterialCheckbox label="export.groups" checked={pdfOptions.groups} on:change={(e) => updatePdfOptions(e, "groups")} />
            <MaterialCheckbox label="export.numbers" checked={pdfOptions.numbers} on:change={(e) => updatePdfOptions(e, "numbers")} />
            {#if pdfOptions.type === "default" || pdfOptions.type === "text"}
                <MaterialCheckbox label="tools.notes" checked={pdfOptions.notes} on:change={(e) => updatePdfOptions(e, "notes")} />
            {/if}
            <MaterialCheckbox label="export.invert" disabled={pdfOptions.type === "text"} checked={pdfOptions.invert} on:change={(e) => updatePdfOptions(e, "invert")} />

            <MaterialCheckbox label="export.original_text_size" style="margin-top: 10px;" disabled={pdfOptions.type === "slides"} checked={pdfOptions.originalTextSize !== false} on:change={(e) => updatePdfOptions(e, "originalTextSize")} />
            <MaterialNumberInput label="settings.font_size" disabled={pdfOptions.type === "slides" || pdfOptions.originalTextSize !== false} value={pdfOptions.textSize} on:change={(e) => (pdfOptions.textSize = e.detail)} />

            {#if pdfOptions.type !== "text"}
                <MaterialNumberInput label="export.rows" style="margin-top: 10px;" value={pdfOptions.grid[1]} min={1} max={7} on:change={(e) => (pdfOptions.grid[1] = e.detail)} />
                <MaterialNumberInput label="export.columns" disabled={pdfOptions.type !== "slides"} value={pdfOptions.grid[0]} min={1} max={6} on:change={(e) => (pdfOptions.grid[0] = e.detail)} />
            {/if}
        {/if}
    </div>

    <div class="previewBox">
        <div style="flex: 1;display: flex;flex-direction: column;margin: 10px;border-radius: 4px;overflow: hidden;">
            <!-- <h4 style="text-align: center;"><T id="export.preview" /></h4> -->
            <!-- <div class="label">{translateText("export.preview")}</div> -->

            <div class="paper" bind:this={paper} style="--paper-aspect-ratio: {pdfOptions.type === 'media' ? '1920/1080' : '210/297'};">
                <Pdf shows={previewShow ? [previewShow] : []} options={pdfOptions} />
            </div>
        </div>
        <div style="display: flex;flex-direction: column;height: 100%;background-color: var(--primary-darkest);">
            <!-- aspect-ratio: 1/1.4142; -->
            <MaterialButton style="flex: 1;" icon="up" on:click={() => paper.scrollBy(0, -paper.offsetHeight + 9.6)} />
            <MaterialButton style="flex: 1;" icon="down" on:click={() => paper.scrollBy(0, paper.offsetHeight - 7.001)} />
        </div>
    </div>
</div>

<style>
    .previewBox {
        background-color: var(--primary-darker);
        border: 1px solid var(--primary-lighter);
        border-radius: 8px;
        overflow: hidden;

        display: flex;
        align-items: center;
        flex: 1;

        position: relative;
    }

    /* .label {
        position: absolute;
        left: 0.75rem;
        top: 0.25rem;

        font-size: 0.75rem;
        font-weight: 500;
        color: var(--secondary);

        pointer-events: none;
        z-index: 1;
    } */

    .paper {
        background-color: white;
        width: 100%;
        height: auto;
        min-width: 200px;
        max-width: 900px;
        zoom: 0.4;
        overflow: auto;
        aspect-ratio: var(--paper-aspect-ratio, 210/297);
        align-self: center;
    }

    .paper::-webkit-scrollbar-track,
    .paper::-webkit-scrollbar-corner {
        background: rgb(0 0 0 / 0.05);
    }
    .paper::-webkit-scrollbar-thumb {
        background: rgb(0 0 0 / 0.3);
    }
    .paper::-webkit-scrollbar-thumb:hover {
        background: rgb(0 0 0 / 0.5);
    }

    .options {
        display: flex;
        flex-direction: column;
    }
</style>
