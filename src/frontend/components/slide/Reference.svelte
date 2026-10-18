<script lang="ts">
    import type { Show } from "../../../types/Show"
    import { syncCanvaShow } from "../../converters/canvaPresentation"
    import T from "../helpers/T.svelte"
    import MaterialButton from "../inputs/MaterialButton.svelte"

    export let showId: string
    export let show: Show

    $: data = show?.reference?.data || {}

    // Canva
    let syncingCanva = false
    async function refreshCanva() {
        if (syncingCanva) return

        syncingCanva = true
        await syncCanvaShow(showId)
        syncingCanva = false
    }
</script>

<div>
    {#if show?.reference?.type === "canva"}
        <p>
            Canva: {data.presentationName || show.name || ""}
        </p>

        <div class="divider" />

        <MaterialButton title="show.update" icon="refresh" disabled={syncingCanva} on:click={refreshCanva}>
            <T id="show.update" />
        </MaterialButton>
    {/if}
</div>

<style>
    div {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        overflow: hidden;
    }

    p {
        padding: 0 10px;
        opacity: 0.8;
    }
</style>
