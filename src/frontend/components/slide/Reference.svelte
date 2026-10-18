<script lang="ts">
    import type { Show } from "../../../types/Show"
    import { syncCanvaShow } from "../../converters/canvaPresentation"
    import { activeDrawerTab, activeShow, drawer, labelsDisabled, openedInteractionId, shows } from "../../stores"
    import { createSlides, getDateString, getSelectedEvents, sortDays } from "../drawer/calendar/calendar"
    import { history } from "../helpers/history"
    import { setDrawerTabData } from "../helpers/historyHelpers"
    import Icon from "../helpers/Icon.svelte"
    import T from "../helpers/T.svelte"
    import MaterialButton from "../inputs/MaterialButton.svelte"

    export let showId: string
    export let show: Show

    $: data = show?.reference?.data || {}

    async function updateCalendar() {
        let currentEvents = getSelectedEvents(data.days)

        let showId: string = $activeShow?.id || ""
        let slidesData = await createSlides(currentEvents, showId)

        history({ id: "UPDATE", newData: { data: slidesData.show }, oldData: { id: showId }, location: { page: "show", id: "show_key" } })
    }

    function getDaysString() {
        let { sortedDays, from, to } = sortDays(data.days)
        let string = getDateString(from)
        if (sortedDays[0] - sortedDays[1] < 0) string += " - " + getDateString(to)
        return string
    }

    function openInteraction() {
        openedInteractionId.set(data.id)

        setDrawerTabData("functions", "interactions")
        activeDrawerTab.set("functions")

        // open drawer if closed
        if ($drawer.height <= 40) drawer.set({ height: $drawer.stored || 300, stored: null })
    }

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
    {#if show?.reference?.type === "calendar"}
        <p>
            <T id="menu.calendar" />: {getDaysString()}
            {#if data.show && $shows[data.show]}
                {" + "}{$shows[show.reference.data.show].name}
            {/if}
        </p>

        <div class="divider" />

        <MaterialButton on:click={updateCalendar} style="white-space: nowrap;min-width: 100px;">
            <Icon id="calendar" />
            {#if !$labelsDisabled}<T id="show.update" />{/if}
        </MaterialButton>
    {:else if show?.reference?.type === "canva"}
        <p>
            Canva: {data.presentationName || show.name || ""}
        </p>

        <div class="divider" />

        <MaterialButton title="show.update" icon="refresh" disabled={syncingCanva} on:click={refreshCanva}>
            <T id="show.update" />
        </MaterialButton>
    {:else if show?.reference?.type === "interaction"}
        <p>
            <T id="tabs.interactions" />: {data.name || ""}
        </p>

        <div class="divider" />

        <MaterialButton title="main.open" on:click={openInteraction}>
            <Icon id="game" />
            {#if !$labelsDisabled}<T id="main.open" />{/if}
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
