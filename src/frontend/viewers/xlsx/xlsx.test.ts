import { readFileSync } from "fs"
import { resolve } from "path"
import { describe, expect, it } from "vitest"
import * as XLSX from "xlsx"
import { MAX_ROWS, parseWorkbook, sheetToHtml, workbookInfo } from "./parse"

const file = resolve(__dirname, "../../../../config/testing/fixtures/budget.xlsx")

function load() {
    const buf = readFileSync(file)
    return parseWorkbook(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer)
}

describe("xlsx viewer parsing", () => {
    const workbook = load()

    it("lists sheets as units", () => {
        const info = workbookInfo(workbook, file)
        expect(info.kind).toBe("xlsx")
        expect(info.title).toBe("budget.xlsx")
        expect(info.units.map((u) => u.label)).toEqual(["Budget 2026", "Attendance"])
    })

    it("renders the expected rows and first cell", () => {
        const budget = sheetToHtml(workbook.Sheets["Budget 2026"])
        const attendance = sheetToHtml(workbook.Sheets["Attendance"])
        expect(budget.totalRows).toBe(7)
        expect(attendance.totalRows).toBe(6)
        expect(budget.truncated).toBe(false)
        expect((budget.html.match(/<tr/g) || []).length).toBe(7)
        expect(budget.html.startsWith("<table")).toBe(true)
        expect(budget.html).toContain("<colgroup>")
        const rows = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets["Budget 2026"], { header: 1 })
        expect(rows[0][0]).toBe("Line item")
        expect(budget.html).toContain("Line item")
    })

    it("caps large sheets", () => {
        const sheet = XLSX.utils.aoa_to_sheet(Array.from({ length: MAX_ROWS + 50 }, (_, i) => [i, "x"]))
        const result = sheetToHtml(sheet)
        expect(result.truncated).toBe(true)
        expect(result.shownRows).toBe(MAX_ROWS)
        expect((result.html.match(/<tr/g) || []).length).toBe(MAX_ROWS)
    })
})
