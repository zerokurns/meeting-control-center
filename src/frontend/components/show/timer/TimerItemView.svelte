<script lang="ts">
    import { activeProject, activeTimers, projects, timers } from "../../../stores"
    import { getCurrentTimerValue, playPauseGlobal, resetTimer } from "../../drawer/timers/timers"
    import T from "../../helpers/T.svelte"
    import { joinTimeBig } from "../../helpers/time"
    import MaterialButton from "../../inputs/MaterialButton.svelte"
    import Center from "../../system/Center.svelte"

    export let show: { id: string; name?: string; index?: number }

    $: timer = $timers[show.id]
    $: itemName = timer?.name || show.name || $projects[$activeProject || ""]?.shows?.[show.index ?? -1]?.name || ""

    $: active = $activeTimers.find((a) => a.id === show.id)
    $: isRunning = !!active && !active.paused
    $: isCounter = timer?.type === "counter"

    // remaining time, updates whenever the active timers tick
    $: current = timer ? getCurrentTimerValue(timer, { id: show.id }, new Date(), $activeTimers) : 0
    $: display = joinTimeBig(typeof current === "number" ? Math.abs(current) : 0, true)
    $: overtime = typeof current === "number" && current < 0

    function toggle() {
        playPauseGlobal(show.id, timer)
    }

    function reset() {
        resetTimer(show.id)
    }
</script>

{#if timer}
    <div class="timer-item">
        <h2>{itemName}</h2>

        <p class="time" class:overtime class:running={isRunning}>{overtime ? "-" : ""}{display}</p>

        {#if isCounter}
            <div class="buttons">
                <MaterialButton variant="outlined" icon={isRunning ? "pause" : "play"} on:click={toggle}>
                    <T id={isRunning ? "media.pause" : "media.play"} />
                </MaterialButton>
                <MaterialButton variant="outlined" icon="reset" on:click={reset}>
                    <T id="actions.reset" />
                </MaterialButton>
            </div>
        {/if}
    </div>
{:else}
    <Center faded>
        <T id="empty.timers" />
    </Center>
{/if}

<style>
    .timer-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 20px;
        height: 100%;
        padding: 20px;
    }

    h2 {
        margin: 0;
        text-align: center;
    }

    .time {
        margin: 0;
        font-size: 6em;
        font-weight: bold;
        font-variant-numeric: tabular-nums;
        opacity: 0.7;
    }

    .time.running {
        opacity: 1;
    }

    .time.overtime {
        color: var(--secondary);
    }

    .buttons {
        display: flex;
        gap: 10px;
    }
</style>
