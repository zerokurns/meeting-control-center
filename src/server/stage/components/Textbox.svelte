<script lang="ts">
    import { onDestroy, onMount } from "svelte"
    import type { Item } from "../../../types/Show"
    import Icon from "../../common/components/Icon.svelte"
    import autosize from "../../common/util/autosize"
    import { createVirtualBreaks } from "../../common/util/show"
    import { getStyles } from "../../common/util/style"
    import { getDynamicValue, replaceDynamicValues } from "../helpers/show"
    import Clock from "../items/Clock.svelte"
    import { send } from "../util/socket"
    import { variables } from "../util/stores"
    import { _getDynamicValue } from "../util/itemHelpers"
    import { getItemText } from "../helpers/textStyle"

    export let item: Item
    export let stageItem: any = {}
    export let style: boolean = true
    export let originalStyle: boolean = false // keep the slide item's own box/position/text styles ("Keep Style")
    export let autoStage: boolean = true
    export let fontSize: number = 0
    export let autoSize: boolean = true
    export let ratio: number = 1
    export let maxLines: number = 0 // stage next item preview
    export let customStyle: string = ""
    export let clickRevealed: boolean = false
    export let revealed = -1

    // dynamic resolution
    let resolution = { width: window.innerWidth, height: window.innerHeight }
    let itemStyle = item.style
    let itemStyles: any = getStyles(item.style, true)
    // custom dynamic size
    let newSizes = `;
    top: ${(itemStyles.top / 1080) * resolution.height}px;
    left: ${(itemStyles.left / 1920) * resolution.width}px;
    width: ${(itemStyles.width / 1920) * resolution.width}px;
    height: ${(itemStyles.height / 1080) * resolution.height}px;
  `
    // keep the item's original bounds when rendering inside a slide-resolution canvas ("Keep Style")
    if (autoStage && !originalStyle) itemStyle = itemStyle + newSizes

    $: lineGap = item?.specialStyle?.lineGap
    $: lineRadius = item?.specialStyle?.lineRadius || 0
    $: lineBg = item?.specialStyle?.lineBg
    $: lineStyleBox = lineGap ? `gap: ${lineGap}px;` : ""
    $: lineStyle = (lineRadius ? `border-radius: ${lineRadius}px;` : "") + (lineBg ? `background: ${lineBg};` : "")

    // AUTO SIZE

    let loaded = false
    onMount(() => {
        loaded = true

        // update on first load
        setTimeout(calculateAutosize, 400)
    })

    let alignElem: HTMLElement | undefined

    $: if (autoSize && loaded) calculateAutosize()
    $: if ($variables) setTimeout(calculateAutosize, 50)
    let loopStop: any = null
    function calculateAutosize() {
        if (loopStop || !alignElem || !autoSize) return
        loopStop = setTimeout(() => (loopStop = null), 200)

        let type = item?.textFit || "shrinkToFit"
        let defaultFontSize
        let maxFontSize

        if (stageItem?.type !== "text") type = stageItem?.textFit || "growToFit"
        let itemFontSize = Number(getStyles(stageItem?.style, true)?.["font-size"] || "") || 100
        defaultFontSize = itemFontSize
        if (type === "growToFit" && itemFontSize !== 100) maxFontSize = itemFontSize

        let textQuery = ""
        if ((item.type || "text") === "text") {
            // elem = elem.querySelector(".align")
            textQuery = ".lines .break span"
        } else {
            // type = "growToFit"
            if (item.type === "slide_tracker") textQuery = ".progress div"
        }

        fontSize = autosize(alignElem, { type, textQuery, defaultFontSize, maxFontSize })
    }

    function getCustomStyle(style: string) {
        if (!style) return

        // reset item styles (as it's set in parent item) - unless keeping the slide item's own layout
        if (!originalStyle) style += "display: contents;"

        return style
    }

    // UPDATE DYNAMIC VALUES e.g. {time_} EVERY SECOND
    // & update instantly when variables or item change
    $: slideText = getItemText(item)
    $: hasDynamicValues = slideText.includes("{")

    // only update if text contains dynamic values
    $: if (hasDynamicValues) startInterval()
    else stopInterval()
    let dynamicInterval: NodeJS.Timeout | null = null
    function startInterval() {
        stopInterval()
        dynamicInterval = setInterval(update, 1000)
    }
    function stopInterval() {
        if (dynamicInterval) clearInterval(dynamicInterval)
        dynamicInterval = null
    }

    let updateDynamic = 0
    $: if ($variables || item) setTimeout(update)
    function update() {
        if (!hasDynamicValues) return
        updateDynamic++
    }

    onDestroy(() => {
        stopInterval()
        if (eventTimeout) clearTimeout(eventTimeout)
        if (blockTimeout) clearTimeout(blockTimeout)
        clearInterval(cssInterval)
    })

    function press() {
        if (!item.button?.press) return
        send("RUN_ACTION", { id: item.button.press })
    }

    function release() {
        if (!item.button?.release) return
        send("RUN_ACTION", { id: item.button.release })
    }

    // Event deduplication variables
    let lastEventType: string = ""
    let eventTimeout: NodeJS.Timeout | null = null
    let isEventBlocked: boolean = false
    let blockTimeout: NodeJS.Timeout | null = null

    // Detect mobile browsers that fire both touch and pointer events
    const isMobileBrowser = typeof navigator !== "undefined" && (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || /SamsungBrowser/i.test(navigator.userAgent))

    function clearEventType() {
        lastEventType = ""
    }

    function setEventType(type: string) {
        lastEventType = type
        if (eventTimeout) clearTimeout(eventTimeout)
        // Clear the event type after a short delay to allow for proper event handling
        eventTimeout = setTimeout(clearEventType, 200)
    }

    function blockEvents() {
        isEventBlocked = true
        if (blockTimeout) clearTimeout(blockTimeout)
        // Block events for a shorter period - just enough to prevent double-firing
        blockTimeout = setTimeout(() => {
            isEventBlocked = false
        }, 100)
    }

    // Touch event handlers for mobile browsers (iOS Safari, Android Chrome, Samsung Internet, etc.)
    function handleTouchStart(e: TouchEvent) {
        // Block if events are currently blocked or wrong event type
        if (isEventBlocked || (lastEventType && lastEventType !== "touch")) return

        setEventType("touch")

        // Only handle press/release actions
        if (item.button?.press || item.button?.release) {
            // Prevent default only for press/release actions to stop ghost clicks
            if (isMobileBrowser) {
                e.preventDefault()
                e.stopPropagation()
            }
            blockEvents() // Block rapid-fire events
            press()
        }
        // For transpose/click actions, don't prevent default - let click events bubble
    }

    function handleTouchEnd(e: TouchEvent) {
        // Only handle if we're in a touch sequence
        if (lastEventType !== "touch") return

        // Only handle press/release actions
        if (item.button?.press || item.button?.release) {
            // Prevent default only for press/release actions
            if (isMobileBrowser) {
                e.preventDefault()
                e.stopPropagation()
            }
            release()
        }
        // For transpose/click actions, don't prevent default - let click events bubble
    }

    // Mouse event handlers for desktop compatibility (fallback for older browsers)
    function handleMouseDown() {
        // Skip on mobile or if wrong event type or events blocked
        if (isMobileBrowser || isEventBlocked || lastEventType === "pointer" || lastEventType === "touch") return

        setEventType("mouse")
        if (item.button?.press || item.button?.release) {
            blockEvents()
            press()
        }
    }

    function handleMouseUp() {
        // Only handle if we're in a mouse sequence and not mobile
        if (isMobileBrowser || lastEventType !== "mouse") return

        if (item.button?.press || item.button?.release) {
            release()
        }
    }

    // Pointer event handlers for modern browsers (preferred for desktop)
    function handlePointerDown(e: PointerEvent) {
        // Block if events are blocked
        if (isEventBlocked) return

        // On mobile, completely ignore pointer events if we have touch events
        if (isMobileBrowser) {
            if (e.pointerType === "touch") return // Touch events handle this
            // For non-touch pointer events on mobile (stylus, etc.)
            if (lastEventType === "touch") return
        }

        if (e.pointerType === "touch") {
            if (lastEventType === "touch") return
            setEventType("touch")
        } else {
            if (lastEventType === "mouse" || lastEventType === "touch") return
            setEventType("pointer")
        }

        if (item.button?.press || item.button?.release) {
            blockEvents()
            press()
        }
    }

    function handlePointerUp(e: PointerEvent) {
        // On mobile, ignore pointer events completely
        if (isMobileBrowser && e.pointerType === "touch") return

        if (e.pointerType === "touch" && lastEventType !== "touch") return
        if (e.pointerType !== "touch" && lastEventType !== "pointer") return

        if (item.button?.press || item.button?.release) {
            release()
        }
    }

    // Keyboard event handler for accessibility
    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            press()
        }
    }

    function handleKeyUp(e: KeyboardEvent) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            release()
        }
    }

    function getVariableNameId(name: string) {
        if (typeof name !== "string") return ""
        return name.toLowerCase().trim().replaceAll(" ", "_")
    }

    function createCSSVariables(variableUpdater: any, _updateTrigger: any = null) {
        if (!variableUpdater) return ""
        const numberVariables = Object.values(variableUpdater).filter((a: any) => a && (a.type === "number" || a.type === "random_number" || (a.type === "text" && a.text?.includes("{"))))
        let css = numberVariables.reduce((css: string, v: any) => (css += `--variable-${getVariableNameId(v.name)}: ${v.type === "text" ? _getDynamicValue(v.text || "") : (v.number ?? (v.default || 0))};`), "")

        css += `--slide-group-color: ${_getDynamicValue("slide_group_color")};`
        css += `--slide-group-next-color: ${_getDynamicValue("slide_group_next_color")};`
        css += `--slide-group-upcoming-color: ${_getDynamicValue("slide_group_upcoming_color")};`

        return css
    }

    let updateTrigger = 0
    const cssInterval = setInterval(() => updateTrigger++, 1000)

    $: cssVariables = createCSSVariables($variables, updateTrigger)
</script>

<!-- bind:offsetHeight={height} -->
<div
    class="item"
    class:clicked={item.button?.press || item.button?.release}
    style={style ? (getCustomStyle(itemStyle) || "") + cssVariables : null}
    class:clickable={item.button?.press || item.button?.release}
    class:reveal={item.clickReveal && !clickRevealed}
    on:keydown={handleKeyDown}
    on:keyup={handleKeyUp}
    on:pointerdown={handlePointerDown}
    on:pointerup={handlePointerUp}
    on:touchstart={handleTouchStart}
    on:touchend={handleTouchEnd}
    on:mousedown={handleMouseDown}
    on:mouseup={handleMouseUp}
    role="button"
    tabindex={item.button?.press || item.button?.release ? 0 : -1}
>
    {#if item.lines}
        <div class="align" style={style ? item.align : null} bind:this={alignElem}>
            <div class="lines" style="{style ? lineStyleBox : ''}">
                {#each createVirtualBreaks(item.lines) as line, i}
                    {#if !maxLines || i < maxLines}
                        <div class="break" class:reveal={item?.lineReveal && revealed < i} style="{style ? lineStyle : ''}{style ? line.align : ''}">
                            {#each line.text || [] as text}
                                {@const value = text.value?.replaceAll("\n", "<br>") || "<br>"}
                                {#key updateDynamic}
                                    {#await replaceDynamicValues(value)}
                                        <span style="{style ? text.style + (fontSize ? 'font-size: ' + fontSize + 'px;' : '') : 'font-size: ' + fontSize + 'px;'}{customStyle}">{@html getDynamicValue(value)}</span>
                                    {:then newValue}
                                        <span style="{style ? text.style + (fontSize ? 'font-size: ' + fontSize + 'px;' : '') : 'font-size: ' + fontSize + 'px;'}{customStyle}">{@html newValue}</span>
                                    {/await}
                                {/key}
                            {/each}
                        </div>
                    {/if}
                {/each}
            </div>
        </div>
        <!-- {:else if item?.type === "media"}
        {#if item.src}
            {#if getMediaType(getExtension(item.src)) === "video"}
                <video src={item.src} muted={true}>
                    <track kind="captions" />
                </video>
            {:else}
                <Image src={item.src} alt="" style="width: 100%;height: 100%;object-fit: {item.fit || 'contain'};filter: {item.filter};{item.flipped ? 'transform: scaleX(-1);' : ''}" />
            {/if}
        {/if} -->
        <!-- {:else if item?.type === "camera"} -->
        <!-- {:else if item?.type === "timer"}
        <Timer {item} id={item.timerId || ""} {today} style="font-size: {fontSize}px;" /> -->
    {:else if item?.type === "clock"}
        <Clock autoSize={fontSize} {...item.clock} />
        <!-- {:else if item?.type === "events"}
        <DynamicEvents {...item.events} /> -->
        <!-- {:else if item?.type === "variable"}
        <Variable {item} style="font-size: {fontSize}px;" /> -->
    {:else if item?.type === "icon"}
        {#if item.customSvg}
            <div class="customIcon">
                {@html item.customSvg}
            </div>
        {:else}
            <Icon style="zoom: {1 / ratio};" id={item.id || ""} fill white custom />
        {/if}
    {/if}
</div>

<style>
    /* default stage item */
    .item {
        color: white;
        /* font-size: 100px; */
        font-family: unset;
        line-height: 1.1;
        /* -webkit-text-stroke-color: #000000;
        paint-order: stroke fill;
        text-shadow: 2px 2px 10px #000000; */

        /* border-style: solid;
        border-width: 0px;
        border-color: #ffffff; */

        height: 150px;
        width: 400px;

        /* click event */
        pointer-events: initial;
    }

    .item.reveal {
        outline: 1px solid red;
        opacity: 0.6;
    }
    .item .break.reveal {
        outline: 1px solid red;
        outline-offset: -2px;
        opacity: 0.7;
    }

    .clickable {
        cursor: pointer;
        user-select: none;
        touch-action: manipulation; /* Optimizes touch interactions */
        -webkit-touch-callout: none; /* Prevents iOS callout menu */
        -webkit-user-select: none; /* Additional iOS user-select prevention */
    }
    .clickable:active {
        filter: brightness(0.8);
    }

    /* iOS Safari specific optimizations */
    @supports (-webkit-touch-callout: none) {
        .clickable {
            -webkit-tap-highlight-color: transparent; /* Removes tap highlight */
        }
    }

    .align {
        height: 100%;
        display: flex;
        text-align: center;
        align-items: center;
    }

    .lines {
        /* overflow-wrap: break-word;
    font-size: 0; */
        width: 100%;

        display: flex;
        flex-direction: column;
        text-align: center;
        justify-content: center;
    }

    .break {
        width: 100%;

        font-size: 0; /* auto size fix */
        /* height: 100%; */
        user-select: text;

        overflow-wrap: break-word;
        /* line-break: after-white-space;
    -webkit-line-break: after-white-space; */

        text-wrap: balance; /* balanced breaking, looks much cleaner */
        white-space: pre-wrap; /* preserve special spaces from Text edit */
    }

    /* span {
    display: inline;
    white-space: initial;
    color: white;
  } */

    .break :global(span) {
        font-size: 100px;
    }

    /* custom svg icon */

    .customIcon,
    .customIcon :global(svg) {
        width: 100%;
        height: 100%;
    }
</style>
