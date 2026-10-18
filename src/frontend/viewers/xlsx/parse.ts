// ----- Meeting Control Center -----
// Pure SheetJS helpers for the XLSX viewer. Kept free of renderer imports so unit tests can load them directly.

import * as XLSX from "xlsx"
import type { DocumentInfo } from "../types"

export const MAX_ROWS = 2000

export function parseWorkbook(buffer: ArrayBuffer): XLSX.WorkBook {
    return XLSX.read(buffer, { type: "array", cellDates: true })
}

export function fileTitle(path: string): string {
    return path.split(/[?#]/)[0].split(/[\\/]/).pop() || path
}

export function workbookInfo(workbook: XLSX.WorkBook, path: string): DocumentInfo {
    return {
        kind: "xlsx",
        path,
        title: fileTitle(path),
        units: workbook.SheetNames.map((label, index) => ({ index, label }))
    }
}

export interface SheetHtml {
    html: string
    totalRows: number
    shownRows: number
    truncated: boolean
}

/** Builds the <table> markup for one sheet, capped at MAX_ROWS rows, with <col> widths from "!cols". */
export function sheetToHtml(sheet: XLSX.WorkSheet | undefined, maxRows = MAX_ROWS): SheetHtml {
    if (!sheet || !sheet["!ref"]) return { html: "<table></table>", totalRows: 0, shownRows: 0, truncated: false }

    const range = XLSX.utils.decode_range(sheet["!ref"])
    const totalRows = range.e.r - range.s.r + 1
    const truncated = totalRows > maxRows
    let target = sheet
    if (truncated) {
        const limited = { s: range.s, e: { r: range.s.r + maxRows - 1, c: range.e.c } }
        target = { ...sheet, "!ref": XLSX.utils.encode_range(limited) }
    }

    let html = XLSX.utils.sheet_to_html(target, { editable: false, header: "", footer: "" })
    const tableStart = html.indexOf("<table")
    if (tableStart > 0) html = html.slice(tableStart)

    const cols = sheet["!cols"] || []
    let colgroup = "<colgroup>"
    for (let c = range.s.c; c <= range.e.c; c++) {
        const col = cols[c]
        let px = 0
        if (col && !col.hidden) px = col.wpx || (col.wch ? Math.round(col.wch * 7 + 5) : 0)
        colgroup += px ? `<col style="width:${px}px">` : "<col>"
    }
    colgroup += "</colgroup>"
    html = html.replace(/<table[^>]*>/, (open) => open + colgroup)

    return { html, totalRows, shownRows: truncated ? maxRows : totalRows, truncated }
}
