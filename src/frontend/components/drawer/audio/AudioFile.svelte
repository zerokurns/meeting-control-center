<script lang="ts">
    import { AudioPlayer } from "../../../audio/audioPlayer"
    import { addProjectItem } from "../../../converters/project"
    import { activeShow, media, outLocked, playingAudio } from "../../../stores"
    import Icon from "../../helpers/Icon.svelte"
    import { joinTime, secondsToTime } from "../../helpers/time"
    import Button from "../../inputs/Button.svelte"

    import SelectElem from "../../system/SelectElem.svelte"

    export let path: string
    export let name: string
    export let active: string | null = null
    export let fileOver = false

    $: audioKey = path
    $: outline = !!$playingAudio[audioKey]
</script>

<SelectElem id="audio" data={{ path, name, index: -1 }} {fileOver} borders="all" trigger={null} draggable>
    <Button
        class="context #audio_button"
        {outline}
        active={$activeShow?.id === path}
        border
        style="width: 100%;"
        title={path}
        bold={false}
        on:click={(e) => {
            if ($outLocked || e.ctrlKey || e.metaKey || e.shiftKey) return

            AudioPlayer.start(path, { name }, { playMultiple: e.altKey })
        }}
        on:dblclick={(e) => {
            if (e.ctrlKey || e.metaKey || e.shiftKey) return
            addProjectItem({ id: path, name, type: "audio" })
        }}
    >
        <span style="max-width: 90%;">
            {#await AudioPlayer.getDuration(path)}
                <Icon id="music" white right />
            {:then duration}
                <Icon id={$playingAudio[audioKey]?.paused === true ? "play" : $playingAudio[audioKey]?.paused === false ? "pause" : $media[path]?.favourite === true && active !== "favourites" ? "star" : AudioPlayer.getAudioType(path, duration)} white={$playingAudio[audioKey]?.paused === true || (!$playingAudio[audioKey] && ($media[path]?.favourite !== true || active === "favourites"))} right />
            {/await}
            <p>{name.slice(0, name.lastIndexOf("."))}</p>
        </span>
        <span style="opacity: 0.8;">
            {#await AudioPlayer.getDuration(path)}
                <p>00:00</p>
            {:then duration}
                <p>{joinTime(secondsToTime(duration))}</p>
            {/await}
        </span>
    </Button>
</SelectElem>

<style>
    span {
        display: flex;
        align-items: center;
        gap: 5px;
    }
</style>
