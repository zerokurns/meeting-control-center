// ----- Meeting Control Center -----
// DOCX viewer built on docx-preview. See README.md for limits.
import type { DocumentInfo, DocumentViewerModule } from "../types"
import DocxViewer from "./DocxViewer.svelte"
import { pageUnits, titleFromPath } from "./helpers"
import { getRenderedDocx } from "./render"

const docxViewer: DocumentViewerModule = {
    kind: "docx",
    extensions: ["docx"],
    async load(path): Promise<DocumentInfo> {
        const { pages } = await getRenderedDocx(path)
        return { kind: "docx", path, title: titleFromPath(path), units: pageUnits(pages) }
    },
    async thumbnail() {
        return null
    },
    Component: DocxViewer as unknown as DocumentViewerModule["Component"]
}

export default docxViewer
