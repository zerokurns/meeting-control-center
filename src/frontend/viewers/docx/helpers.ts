// ----- Meeting Control Center -----
// Pure helpers for the DOCX viewer. No DOM access, so they run under vitest in node.

import type { DocumentFit, DocumentUnit } from "../types"

/** Number of rendered pages (`<section class="docx">`) in docx-preview output. Always at least 1. */
export function countPagesFromHtml(html: string, className = "docx"): number {
    if (!html) return 1
    const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const regex = new RegExp(`<section\\b[^>]*\\bclass\\s*=\\s*["']([^"']*)["']`, "gi")
    const classMatcher = new RegExp(`(^|\\s)${escaped}(\\s|$)`)
    let count = 0
    for (const match of html.matchAll(regex)) {
        if (classMatcher.test(match[1])) count++
    }
    return Math.max(1, count)
}

/** Units "Page 1..n" for a page count (n is clamped to at least 1). */
export function pageUnits(count: number): DocumentUnit[] {
    const total = Math.max(1, Math.floor(count) || 1)
    return Array.from({ length: total }, (_, index) => ({ index, label: `Page ${index + 1}` }))
}

/** File name without directory and extension. */
export function titleFromPath(path: string): string {
    const name = (path.split(/[?#]/)[0].split(/[\\/]/).pop() || "").trim()
    const dot = name.lastIndexOf(".")
    const base = dot > 0 ? name.slice(0, dot) : name
    try {
        return decodeURIComponent(base)
    } catch {
        return base
    }
}

export function clampUnit(unit: number, count: number): number {
    if (!Number.isFinite(unit)) return 0
    return Math.min(Math.max(0, Math.round(unit)), Math.max(0, count - 1))
}

/** Scale that fits a page box of `page` size into `container`, multiplied by `zoom`. */
export function computeScale(fit: DocumentFit, zoom: number, container: { width: number; height: number }, page: { width: number; height: number }): number {
    if (!page.width || !page.height || !container.width || !container.height) return 1
    const byWidth = container.width / page.width
    const base = fit === "width" ? byWidth : Math.min(byWidth, container.height / page.height)
    const z = Number.isFinite(zoom) && zoom > 0 ? zoom : 1
    return base * z
}

/** Vertical offset (in px, <= 0) for a scroll fraction 0..1 when the scaled page is taller than the container. */
export function scrollOffset(scrollY: number, scaledHeight: number, containerHeight: number): number {
    const overflow = scaledHeight - containerHeight
    if (overflow <= 0) return 0
    const fraction = Math.min(1, Math.max(0, Number.isFinite(scrollY) ? scrollY : 0))
    return -fraction * overflow
}
