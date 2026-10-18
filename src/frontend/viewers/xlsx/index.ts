// ----- Meeting Control Center -----
// XLSX viewer on SheetJS: units are sheets, rendered as a read-only HTML table (see README.md).
import { encodeFilePath } from "../../components/helpers/media"
import type { DocumentViewerModule } from "../types"
import { parseWorkbook, workbookInfo } from "./parse"
import XlsxViewer from "./XlsxViewer.svelte"

const xlsxViewer: DocumentViewerModule = {
    kind: "xlsx",
    extensions: ["xlsx", "xlsm", "xls", "csv"],
    async load(path) {
        const response = await fetch(encodeFilePath(path))
        if (!response.ok) throw new Error(`Could not read ${path} (${response.status})`)
        const workbook = parseWorkbook(await response.arrayBuffer())
        return workbookInfo(workbook, path)
    },
    async thumbnail() {
        return null
    },
    Component: XlsxViewer as any
}

export default xlsxViewer
