<script lang="ts">
    import Textarea from "../../../common/components/Textarea.svelte"
    import { send } from "../../util/socket"
    import { activeShow } from "../../util/stores"

    export let value: string

    $: id = $activeShow?.id
    $: if (id) getText()
    function getText() {
        send("API:get_plain_text", { id })
    }
</script>

<div class="editor-container">
    <Textarea bind:value />
</div>

<style>
    .editor-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        flex: 1;
        position: relative;
        z-index: 1;
    }

    .editor-container :global(textarea) {
        border-radius: 8px 8px 0 0;
    }
</style>
