<script lang="ts">
    import { addProjectItem } from "../../../converters/project"
    import { activePopup, timers } from "../../../stores"
    import { getSortedTimers } from "../../drawer/timers/timers"
    import T from "../../helpers/T.svelte"
    import MaterialButton from "../../inputs/MaterialButton.svelte"
    import Center from "../../system/Center.svelte"

    $: timersList = getSortedTimers($timers, { showHours: true })

    function pick(id: string, name: string) {
        addProjectItem({ id, type: "timer", name })
        activePopup.set(null)
    }

    function createNew() {
        // the timer popup creates a new timer in the timers store, pick it here afterwards
        activePopup.set("timer")
    }
</script>

<div class="list">
    {#if timersList.length}
        {#each timersList as timer}
            <MaterialButton class="timer-option" icon="timer" on:click={() => pick(timer.id, timer.name)}>
                <span class="name">{timer.name || "—"}</span>
                <span class="time">{timer.extraInfo}</span>
            </MaterialButton>
        {/each}
    {:else}
        <Center size={1.2} faded style="height: 100px;">
            <T id="empty.timers" />
        </Center>
    {/if}
</div>

<MaterialButton variant="outlined" icon="add" style="width: 100%;margin-top: 10px;" on:click={createNew}>
    <T id="new.timer" />
</MaterialButton>

<style>
    .list {
        display: flex;
        flex-direction: column;
        min-width: 360px;
        max-height: 50vh;
        overflow-y: auto;
    }

    .name {
        flex: 1;
        text-align: start;
    }

    .time {
        opacity: 0.6;
        font-variant-numeric: tabular-nums;
    }
</style>
