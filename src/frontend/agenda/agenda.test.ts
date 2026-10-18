import { describe, expect, it } from "vitest"
import { agendaKindOf, AGENDA_KIND_ICONS, isDocumentItem } from "./agenda"

describe("agendaKindOf", () => {
    it("maps project item types onto agenda kinds", () => {
        expect(agendaKindOf({ id: "abc" })).toBe("slides")
        expect(agendaKindOf({ id: "abc", type: "show" })).toBe("slides")
        expect(agendaKindOf({ id: "/a/b.mp4", type: "video" })).toBe("media")
        expect(agendaKindOf({ id: "/a/b.png", type: "image" })).toBe("media")
        expect(agendaKindOf({ id: "timer-1", type: "timer" })).toBe("timer")
        expect(agendaKindOf({ id: "o", type: "overlay" })).toBe("overlay")
        expect(agendaKindOf({ id: "s", type: "section" })).toBe("section")
        expect(agendaKindOf({ id: "c", type: "camera" })).toBe("other")
    })

    it("tells documents and spreadsheets apart by extension", () => {
        expect(agendaKindOf({ id: "/docs/agenda.pdf", type: "document" })).toBe("document")
        expect(agendaKindOf({ id: "/docs/minutes.docx", type: "document" })).toBe("document")
        expect(agendaKindOf({ id: "/docs/budget.xlsx", type: "document" })).toBe("spreadsheet")
        expect(agendaKindOf({ id: "/docs/data.CSV", type: "document" })).toBe("spreadsheet")
    })

    it("treats legacy pdf items as documents", () => {
        expect(agendaKindOf({ id: "/docs/old.pdf", type: "pdf" })).toBe("document")
        expect(isDocumentItem({ id: "/docs/old.pdf", type: "pdf" })).toBe(true)
        expect(isDocumentItem({ id: "x", type: "timer" })).toBe(false)
    })

    it("has an icon for every kind", () => {
        for (const kind of ["slides", "document", "spreadsheet", "media", "timer", "overlay", "section", "other"] as const) {
            expect(AGENDA_KIND_ICONS[kind]).toBeTruthy()
        }
    })
})
