import path from "path"
import { describe, expect, it } from "vitest"
import { extractPptxNotes } from "./pptxNotes"

const fixtures = path.resolve(__dirname, "../../../config/testing/fixtures")

describe("extractPptxNotes", () => {
    it("returns the speaker notes of every slide in order", async () => {
        const notes = await extractPptxNotes(path.join(fixtures, "deck.pptx"))
        expect(Object.keys(notes)).toHaveLength(5)
        expect(notes[0].startsWith("Welcome")).toBe(true)
        for (let i = 0; i < 5; i++) expect(notes[i].length).toBeGreaterThan(0)
    })

    it("rejects for a file that is not a zip", async () => {
        await expect(extractPptxNotes(path.join(fixtures, "README.md"))).rejects.toBeTruthy()
    })
})
