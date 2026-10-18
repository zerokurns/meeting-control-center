import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { describe, expect, it, vi } from "vitest"

// PDF.js runs in node through its legacy build (no DOM, fake worker)
vi.mock("pdfjs-dist", async () => await import("pdfjs-dist/legacy/build/pdf.mjs"))
vi.mock("./PdfViewer.svelte", () => ({ default: {} })) // vitest has no Svelte plugin
// the renderer's media helpers need the store/IPC layer; here a path is already a usable file
vi.mock("../../components/helpers/media", () => ({
    locateMediaFile: async (path: string) => ({ path }),
    encodeFilePath: (path: string) => pathToFileURL(path).href
}))

import pdfViewer from "./index"

const fixture = resolve(__dirname, "../../../../config/testing/fixtures/agenda.pdf")

describe("pdf viewer module", () => {
    it("lists one unit per page", async () => {
        const info = await pdfViewer.load(fixture)
        expect(info.kind).toBe("pdf")
        expect(info.title).toBe("agenda")
        expect(info.units.length).toBeGreaterThan(0)
        expect(info.units[0]).toEqual({ index: 0, label: "Page 1" })
        expect(info.units.map((u) => u.index)).toEqual(info.units.map((_u, i) => i))
    })

    it("has no thumbnail without a DOM", async () => {
        expect(await pdfViewer.thumbnail(fixture, 0, 160)).toBeNull()
    })
})
