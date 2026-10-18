<script lang="ts">
    import type { OutSlide, Transition } from "../../../../types/Show"
    import { getViewer } from "../../../viewers"
    import { documentKindOf } from "../../../viewers/registry"
    import type { DocumentKind } from "../../../viewers/types"
    import OutputTransition from "../transitions/OutputTransition.svelte"

    export let slide: OutSlide
    export let transition: Transition

    // legacy pdf outputs (type "pdf", page/pages) are read as units
    $: path = slide.id
    $: kind = (slide.kind || documentKindOf(path) || "pdf") as DocumentKind
    $: viewer = getViewer(kind)
    $: unit = slide.unit ?? slide.page ?? 0

    // each unit transitions in; zoom and scroll changes update the mounted viewer in place
    $: unitKey = `${path}_${unit}`
    let update = 0
    let previousKey = ""
    $: if (previousKey !== unitKey) {
        previousKey = unitKey
        update++
    }
</script>

{#key update}
    <OutputTransition {transition} inTransition={transition.in} outTransition={transition.out}>
        {#if viewer}
            <svelte:component this={viewer.Component} {path} {unit} zoom={slide.zoom ?? 1} scrollY={slide.scrollY ?? 0} fit={slide.fit ?? "page"} />
        {/if}
    </OutputTransition>
{/key}
