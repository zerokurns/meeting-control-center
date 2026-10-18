// ----- Meeting Control Center -----
// PDF viewer module: PDF.js behind the shared DocumentViewerModule contract (see ../types.ts).
import type { DocumentViewerModule } from "../types"
import { loadPdfInfo, renderPdfThumbnail } from "./pdfCache"
import PdfViewer from "./PdfViewer.svelte"

const pdfViewer: DocumentViewerModule = {
    kind: "pdf",
    extensions: ["pdf"],
    load: loadPdfInfo,
    thumbnail: renderPdfThumbnail,
    Component: PdfViewer as unknown as DocumentViewerModule["Component"]
}

export default pdfViewer
