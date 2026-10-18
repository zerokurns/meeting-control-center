<script lang="ts">
    import { EXPORT } from "../../../types/Channels"
    import type { Show } from "../../../types/Show"
    import { currentWindow } from "../../stores"
    import { send } from "../../utils/request"
    import Textbox from "../slide/Textbox.svelte"
    import MediaItem from "../slide/views/MediaItem.svelte"
    import Zoomed from "../slide/Zoomed.svelte"

    export let shows: any[] = []
    export let options: any = {}
    export let path = ""

    window.api.receive(EXPORT, (a: any) => {
        if (a.channel === "PDF") {
            shows = a.data.shows
            options = a.data.options
            path = a.data.path
        } else if (a.channel === "NEXT") {
            if (options.oneFile) {
                send(EXPORT, ["DONE"], { name: options.name || shows[0]?.name || "Export" })
            } else {
                index++
                if (shows.length > index) exportPDF()
                else send(EXPORT, ["DONE"], { name: shows[index - 1]?.name || "" })
            }
        }
    })

    let layoutSlides: any = {}

    $: if (shows.length) getRefs()

    // WIP get ref...
    function getRefs() {
        shows.forEach((show: any) => {
            let a: any[] = []

            show.layouts?.[show.settings?.activeLayout]?.slides?.forEach((layoutSlide: any) => {
                let slide = show.slides[layoutSlide.id]
                if (!slide) return

                slide.data = layoutSlide
                a.push(slide)
                if (!slide.children) return

                slide.children.forEach((childId: string) => {
                    let slide = show.slides[childId]
                    slide.data = layoutSlide
                    a.push(slide)
                })
            })

            layoutSlides[show.id!] = a

            // Create a display string for metadata while preserving the original object
            const metaDisplay = Object.values((show.meta || {}) as { [key: string]: string })
                .filter((a) => a.length)
                .join("; ")

            // Preserve original meta object and add display string
            show.metaDisplay = metaDisplay
        })

        if ($currentWindow === "pdf") exportPDF()
    }

    function getPagesForShow(show: any, showOptions: any) {
        if (show && show.type === "section") return 1
        if (!show || !layoutSlides[show.id!]) return 0
        const slides = layoutSlides[show.id!]
        if (!slides.length) return 0

        const type = showOptions.type || "default"

        if (type === "media") return slides.length

        const grid1 = showOptions.grid?.[1] || 6
        const grid0 = showOptions.grid?.[0] || 3
        const divider = type === "default" ? 1 : type !== "text" ? grid0 : 1.5
        return Math.ceil(slides.length / grid1 / divider)
    }

    let index = 0
    function exportPDF() {
        const name = options.oneFile ? options.name || shows[0]?.name || "Export" : shows[index]?.name || ""
        const pagesCount = options.oneFile ? shows.reduce((sum, s) => sum + getPagesForShow(s, options), 0) : getPagesForShow(shows[index], options)
        // give time for any media to load as well
        setTimeout(() => send(EXPORT, ["EXPORT"], { type: "pdf", name, options: { type: options.type } }), 20 * (pagesCount + 1) + 1000)
    }

    $: renderedShows = options.oneFile ? shows : shows[index] ? [shows[index]] : []

    // dynamic counter
    function getGroupName(show: Show, group: string, slideID: string) {
        let name = group
        if (name) {
            let added: any = {}
            Object.entries(show.slides).forEach(([id, a]: any) => {
                if (added[a.group]) {
                    added[a.group]++
                    if (id === slideID) name += " #" + added[a.group]
                } else added[a.group] = 1
            })
        }
        return name
    }
</script>

<main class:flow={options.type === "slides"}>
    {#if shows.length}
        {#if options.type === "media"}
            {#each renderedShows as show}
                {#if show.type === "section"}
                    <div class="media-page" style="width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; page-break-after: always; background: {show.color || 'linear-gradient(135deg, #1e293b, #0f172a)'};">
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: white; padding: 40px; box-sizing: border-box; width: 100%; height: 100%;">
                            <div class="section-accent" style="width: 120px; height: 6px; background-color: rgba(255, 255, 255, 0.8); margin-bottom: 40px; border-radius: 3px;"></div>
                            <h1 style="font-size: 130px; font-weight: 800; text-transform: uppercase; letter-spacing: -3px; margin: 0 0 30px 0; text-shadow: 0 8px 24px rgba(0,0,0,0.4); color: white; font-family: sans-serif; line-height: 1.1;">{show.name}</h1>
                            {#if show.notes}
                                <div style="width: 300px; height: 2px; background-color: rgba(255,255,255,0.25); margin: 30px 0;"></div>
                                <p style="font-size: 50px; font-style: italic; color: rgba(255, 255, 255, 0.9); max-width: 80%; margin: 0; line-height: 1.5; text-shadow: 0 4px 12px rgba(0,0,0,0.3);">{show.notes}</p>
                            {/if}
                            {#if show.data?.time}
                                <div style="margin-top: 50px; font-size: 32px; background: rgba(255,255,255,0.15); color: #ffffff; padding: 12px 36px; border-radius: 40px; font-weight: 600; text-transform: uppercase; letter-spacing: 3px; border: 2px solid rgba(255,255,255,0.25); text-shadow: 0 4px 8px rgba(0,0,0,0.2);">{show.data.time}</div>
                            {/if}
                        </div>
                    </div>
                {:else}
                    {#each layoutSlides[show.id || ""] as slide}
                        <div class="media-page" style="width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; page-break-after: always;">
                            <Zoomed style="display: flex;justify-content: center;width: 100%; height: 100%;" let:ratio>
                                {#if show.media?.[slide.data?.background]?.path}
                                    <div class="media" style="height: 100%;zoom: {1 / ratio};">
                                        <!-- {filter} {flipped} {fit} -->
                                        <MediaItem item={{ style: "", type: "media", src: show.media[slide.data.background].path }} preview />
                                    </div>
                                {/if}

                                {#if slide.items}
                                    {#each slide.items as item}
                                        <Textbox {item} ref={{ showId: show.id, id: slide.id }} mirror />
                                    {/each}
                                {/if}
                            </Zoomed>
                        </div>
                    {/each}
                {/if}
            {/each}
        {:else}
            <!-- Normal PDF Export -->
            {#each renderedShows as show}
                {@const showPages = getPagesForShow(show, options)}
                <div class="show-container" class:flow={options.type === "slides" && show.type !== "section"} style="position: relative; {options.type !== 'text' || show.type === 'section' ? `height: calc(100vh * ${showPages});` : ''} page-break-after: always;">
                    {#if show.type === "section"}
                        <div class="section-page" style="background: {show.color ? show.color : 'linear-gradient(135deg, #1e293b, #0f172a)'};">
                            <!-- Premium decorative elements -->
                            <div class="section-accent" style="width: 80px; height: 4px; background-color: #ffffff; margin-bottom: 30px; border-radius: 2px; opacity: 0.8;"></div>
                            <h1 style="font-size: 54pt; font-weight: 800; text-transform: uppercase; letter-spacing: -2px; margin: 0 0 20px 0; color: #ffffff; text-shadow: 0 4px 12px rgba(0,0,0,0.3); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.1;">{show.name}</h1>
                            {#if show.notes}
                                <div style="width: 200px; height: 1px; background-color: rgba(255,255,255,0.25); margin: 25px 0;"></div>
                                <p style="font-size: 20pt; font-style: italic; color: rgba(255, 255, 255, 0.85); max-width: 80%; margin: 0; line-height: 1.5; text-shadow: 0 2px 6px rgba(0,0,0,0.2); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">{show.notes}</p>
                            {/if}
                            {#if show.data?.time}
                                <div style="margin-top: 40px; font-size: 14pt; background: rgba(255,255,255,0.15); color: #ffffff; padding: 8px 24px; border-radius: 30px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; border: 1px solid rgba(255,255,255,0.25); text-shadow: 0 2px 4px rgba(0,0,0,0.15);">{show.data.time}</div>
                            {/if}
                        </div>
                    {:else}
                        {#if options.title}
                            <div style="position: absolute;width: 100%;">
                                <h1>{show.name}</h1>
                            </div>
                        {/if}
                        {#each layoutSlides[show.id || ""] as slide, i}
                            <div class="slide" class:padding={options.type === "text" ? true : options.type !== "slides" ? i === 0 : i < options.grid[0]} class:no-break={options.type === "text"} style={options.type !== "text" ? `height: calc(100vh / ${options.grid[1]} - 0.1px);` + (options.type !== "slides" ? "" : `width: calc(100% / ${options.grid[0]});`) : ""}>
                                <!-- TODO: different slide heights! -->
                                <!-- style={settings.slides ? `height: calc(842pt / ${settings.grid[1]});` : "" + settings.text ? "" : `width: calc(100% / ${settings.grid[0]});`} -->
                                {#if options.groups}
                                    <p class="group" style={options.type !== "text" ? "" : "padding: 0 60px;margin-top: -6px;"}>
                                        {slide.group ? getGroupName(show, slide.group, slide.id) : ""}
                                    </p>
                                {/if}
                                {#if options.numbers}
                                    <p class="number" style={options.type !== "text" ? "" : "padding: 0 60px;margin-top: -6px;"}>
                                        {i + 1}
                                    </p>
                                {/if}
                                {#if options.type !== "text"}
                                    <div class="slides" class:invert={options.invert}>
                                        <Zoomed style="display: flex;justify-content: center;width: 100%;" let:ratio>
                                            {#if show.media?.[slide.data?.background]?.path}
                                                <div class="media" style="height: 100%;zoom: {1 / ratio};">
                                                    <!-- {filter} {flipped} {fit} -->
                                                    <!-- <Media path={show.media[slide.data.background].path || ""} mirror /> -->
                                                    <MediaItem item={{ style: "", type: "media", src: show.media[slide.data.background].path }} preview />
                                                </div>
                                            {/if}

                                            {#if slide.items}
                                                {#each slide.items as item}
                                                    <Textbox {item} ref={{ showId: show.id, id: slide.id }} mirror />
                                                {/each}
                                            {/if}
                                        </Zoomed>
                                    </div>
                                {/if}
                                {#if options.type !== "slides"}
                                    <div class="text" class:margin={options.type === "text"}>
                                        <div style="position: relative;display: flex;flex-direction: column;align-items: center;justify-content: center;flex: 1;">
                                            {#if slide.items}
                                                {#each slide.items as item}
                                                    {#if item.type === undefined || item.type === "text" || item.type === "timer"}
                                                        <Textbox {item} ref={{ showId: show.id, id: slide.id }} customFontSize={options.originalTextSize ? null : options.textSize} style={false} />
                                                    {/if}
                                                {/each}
                                            {/if}

                                            {#if options.notes && slide.notes}
                                                <p class="notes">{slide.notes}</p>
                                            {/if}
                                        </div>
                                    </div>
                                {/if}
                            </div>
                            {#if options.pageNumbers && i > 0 && i % options.grid[0] === 0 && i / options.grid[0] < showPages}
                                <div class="page" style="top: calc(100vh * {i / options.grid[0] - 0.012} - 30px)">
                                    {i / options.grid[0]}/{showPages}
                                </div>
                            {/if}
                        {/each}
                        {#if options.pageNumbers && (layoutSlides[show.id || ""].length - 1) / (options.type !== "slides" ? 1 : options.grid[0]) / showPages < showPages}
                            <div class="page" style="top: calc(100vh * {showPages - 0.012} - 30px);">
                                {showPages}/{showPages}
                            </div>
                        {/if}
                    {/if}
                    {#if options.metadata}
                        {#if options.type === "text"}
                            <!-- text export flows freely, so its real height isn't a multiple of 100vh - render in normal flow instead of guessing an absolute offset -->
                            <p style="text-align: center;font-size: 12px;opacity: 0.8;margin: 20px 0 0;">
                                {show.metaDisplay}
                            </p>
                        {:else}
                            <div style="position: absolute;top: calc(100vh * {showPages} - 25px);width: 100%;">
                                <p style="text-align: center;font-size: 12px;opacity: 0.8;">
                                    <!-- metaDisplay is only used here temporarily -->
                                    {show.metaDisplay}
                                </p>
                            </div>
                        {/if}
                    {/if}
                </div>
            {/each}
        {/if}
    {/if}
</main>

<style>
    main {
        display: block;
        position: relative;
        background-color: white;
        color: black;
        width: 100%;
        height: auto;
        min-height: 100%;
        margin: 0;
        padding: 0;
    }

    main.flow {
        display: block;
    }

    .media-page {
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
        page-break-inside: avoid;
        margin: 0;
        padding: 0;
        flex-shrink: 0;
    }

    .show-container {
        width: 100%;
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
        page-break-after: always;
        page-break-inside: avoid;
        margin: 0;
        padding: 0;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
    }

    .show-container.flow {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-content: flex-start;
    }

    h1 {
        zoom: 0.5;
        margin: 20px;
        text-align: center;
        color: black;
    }

    .slide {
        display: flex;
        position: relative;
        /* page-break-before: always; */
    }
    .slide.padding {
        padding-top: 30px;
    }
    .slide.no-break {
        break-inside: avoid;
        page-break-inside: avoid;
    }

    .slide .group {
        position: absolute;
        font-weight: bold;
        padding: 0 10px;
    }
    .slide .number {
        position: absolute;
        inset-inline-end: 0px;
        padding: 0 10px;
    }

    .slides {
        display: flex;
        align-self: center;
        justify-content: center;
        flex: 1;
        margin: 10px;
    }
    .flow .slides {
        margin: 40px 10px;
    }
    .slides.invert {
        filter: invert(1);
    }

    .text {
        display: flex;
        flex: 2;
        margin: 10px;
        zoom: 0.2;
    }
    .text :global(.align) {
        text-align: start;
    }

    .text.margin {
        margin: 50px 200px;
        zoom: 0.3;
    }

    /* @page {
    size: 595pt 842pt;
  } */

    .page {
        position: absolute;
        inset-inline-end: 10px;
        /* transform: translateY(-30px); */
    }

    .section-page {
        width: 100%;
        height: 100%;
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        box-sizing: border-box;
        padding: 60px;
        position: relative;
        overflow: hidden;
    }
</style>
