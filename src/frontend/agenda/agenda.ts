// ----- Meeting Control Center -----
// An agenda is a project; an agenda item is a project item (ProjectShowRef). This module maps the underlying
// project item types onto the meeting vocabulary used by the UI, the stage display and the API.

import type { ShowRef } from "../../types/Projects"
import type { ShowType } from "../../types/Show"
import { documentKindOf } from "../viewers/registry"
import type { AgendaKind, DocumentKind } from "../viewers/types"

/** Project item `data` for `type: "document"`. `id` of the item is the path of the copied file. */
export interface DocumentItemData {
    kind: DocumentKind
    sourcePath?: string // where the file was imported from (informational)
    convertedFrom?: string // original extension when LibreOffice converted it (e.g. "pptx")
    notes?: { [unit: number]: string }
    units?: number
}

/** Project item `data` for `type: "timer"`. `id` of the item is the id in the `timers` store. */
export interface TimerItemData {
    autoStart?: boolean // start the timer when the item is activated (default true)
}

const MEDIA_TYPES: ShowType[] = ["image", "video", "audio", "player"]

export function agendaKindOf(ref: Pick<ShowRef, "id" | "type">): AgendaKind {
    const type: ShowType = ref.type || "show"
    if (type === "document" || type === "pdf") return documentKindOf(ref.id) === "xlsx" ? "spreadsheet" : "document"
    if (type === "show") return "slides"
    if (MEDIA_TYPES.includes(type)) return "media"
    if (type === "timer") return "timer"
    if (type === "overlay") return "overlay"
    if (type === "section") return "section"
    return "other"
}

export function isDocumentItem(ref: Pick<ShowRef, "id" | "type">): boolean {
    return ref.type === "document" || ref.type === "pdf"
}

/** Icon ids from values/icons.ts per agenda kind. */
export const AGENDA_KIND_ICONS: { [kind in AgendaKind]: string } = {
    slides: "slide",
    document: "document",
    spreadsheet: "table",
    media: "media",
    timer: "timer",
    overlay: "overlays",
    section: "section",
    other: "show"
}
