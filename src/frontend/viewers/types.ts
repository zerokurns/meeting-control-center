// ----- Meeting Control Center -----
// Shared contract for document viewers. Every format (PDF, Word, Excel; PowerPoint arrives as PDF after
// conversion) implements DocumentViewerModule and is registered in ./index.ts. The agenda, the operator
// preview, the output window and the action API only talk to this contract, never to a format directly.

import type { SvelteComponentTyped } from "svelte"

export type DocumentKind = "pdf" | "docx" | "xlsx"

/** What an agenda item is, regardless of the underlying project item type. */
export type AgendaKind = "slides" | "document" | "spreadsheet" | "media" | "timer" | "overlay" | "section" | "other"

/** One navigable unit of a document: a page (PDF, DOCX) or a sheet (XLSX). Index is 0-based. */
export interface DocumentUnit {
    index: number
    label: string
}

export interface DocumentInfo {
    kind: DocumentKind
    path: string
    title: string
    units: DocumentUnit[]
    /** Speaker notes per unit index (PPTX notes survive conversion to PDF through the import step). */
    notes?: { [unit: number]: string }
}

export type DocumentFit = "page" | "width"

/** The part of the view that is shared between operator preview, output and the API. */
export interface DocumentViewState {
    unit: number
    zoom: number // 1 = fit (per `fit`), 2 = 200 %
    scrollY: number // 0..1 fraction of the overflow, only meaningful when the unit is taller than the viewport
    fit: DocumentFit
}

export const DEFAULT_VIEW_STATE: DocumentViewState = { unit: 0, zoom: 1, scrollY: 0, fit: "page" }

/**
 * Props every viewer component accepts. The component renders exactly `unit` of `path` with the given zoom,
 * scroll and fit, filling its parent element. It dispatches:
 *   - "info"  with DocumentInfo once the file is loaded (and again if the file changes)
 *   - "state" with Partial<DocumentViewState> when the user changes unit/zoom/scroll interactively
 *   - "error" with a message when the file cannot be rendered
 * `interactive` is true in the operator preview (clicks, wheel zoom, scrolling) and false on outputs.
 * `keyboard` (default true) lets the viewer handle unit-navigation keys itself (arrows, PageUp/Down, Home/End).
 * The operator preview passes false: those keys are handled by the global shortcut, which drives the output,
 * and the preview follows the output. Wheel scrolling and ctrl+wheel zoom are not affected.
 */
export interface DocumentViewerProps extends DocumentViewState {
    path: string
    interactive?: boolean
    keyboard?: boolean
    background?: string
}

export interface DocumentViewerModule {
    kind: DocumentKind
    /** Lower-case extensions this viewer opens directly (no conversion). */
    extensions: string[]
    load(path: string): Promise<DocumentInfo>
    /** PNG/JPEG data URL of one unit at roughly `width` CSS pixels, or null if the format has no cheap thumbnail. */
    thumbnail(path: string, unit: number, width: number): Promise<string | null>
    Component: typeof SvelteComponentTyped<DocumentViewerProps>
}

/** Extensions opened natively per kind. */
export const DOCUMENT_EXTENSIONS: { [kind in DocumentKind]: string[] } = {
    pdf: ["pdf"],
    docx: ["docx"],
    xlsx: ["xlsx", "xlsm", "xls", "csv"]
}

/** Extensions the import step converts with LibreOffice before they become a document item (result: PDF). */
export const CONVERTED_EXTENSIONS = ["ppt", "pptx", "odp", "key", "doc", "odt", "rtf", "ods"]
