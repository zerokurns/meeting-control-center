// Stub: replaced by the real pdf viewer (see docs/tasks). Keeps the registry and the build whole until then.
import Unsupported from "../Unsupported.svelte"
import type { DocumentViewerModule } from "../types"

const pdfViewer: DocumentViewerModule = {
    kind: "pdf",
    extensions: ["pdf"],
    async load(path) {
        throw new Error("pdf viewer not implemented: " + path)
    },
    async thumbnail() {
        return null
    },
    Component: Unsupported as any
}

export default pdfViewer
