// ----- Meeting Control Center -----
// Renders a .docx once with docx-preview and caches the resulting HTML per path.

import { renderAsync } from "docx-preview"
import { encodeFilePath } from "../../components/helpers/media"
import { countPagesFromHtml } from "./helpers"

export interface RenderedDocx {
    html: string
    pages: number
}

const cache = new Map<string, Promise<RenderedDocx>>()

async function render(path: string): Promise<RenderedDocx> {
    const response = await fetch(encodeFilePath(path))
    if (!response.ok) throw new Error(`Could not read ${path} (${response.status})`)
    const buffer = await response.arrayBuffer()

    const container = document.createElement("div")
    await renderAsync(buffer, container, undefined, { breakPages: true, ignoreWidth: false, inWrapper: true, useBase64URL: true })

    const html = container.innerHTML
    return { html, pages: countPagesFromHtml(html) }
}

export function getRenderedDocx(path: string): Promise<RenderedDocx> {
    let entry = cache.get(path)
    if (!entry) {
        entry = render(path)
        // do not keep failures, the file may be fixed or appear later
        entry.catch(() => cache.delete(path))
        cache.set(path, entry)
    }
    return entry
}

export function clearRenderedDocx(path?: string) {
    if (path) cache.delete(path)
    else cache.clear()
}
