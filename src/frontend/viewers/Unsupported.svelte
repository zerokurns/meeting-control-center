<script lang="ts">
    // Placeholder shown while a format has no viewer yet (or when a viewer failed to register).
    export let path: string
    export let unit = 0
    export let zoom = 1
    export let scrollY = 0
    export let fit: "page" | "width" = "page"
    export let interactive = false
    export let background = ""

    $: fileName = path?.split(/[\\/]/).pop() || ""
    // keep the contract props referenced so svelte-check does not flag them as unused
    $: void [unit, zoom, scrollY, fit, interactive]
</script>

<div class="unsupported" style={background ? `background: ${background};` : ""}>
    <p>{fileName}</p>
    <p class="hint">No viewer available for this file type yet.</p>
</div>

<style>
    .unsupported {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        opacity: 0.8;
    }
    .hint {
        font-size: 0.8em;
        opacity: 0.7;
    }
</style>
