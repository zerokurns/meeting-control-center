// Stub: replaced by the real docx viewer (see docs/tasks). Keeps the registry and the build whole until then.
import Unsupported from "../Unsupported.svelte"
import type { DocumentViewerModule } from "../types"

const docxViewer: DocumentViewerModule = {
    kind: "docx",
    extensions: ["docx"],
    async load(path) {
        throw new Error("docx viewer not implemented: " + path)
    },
    async thumbnail() {
        return null
    },
    Component: Unsupported as any
}

export default docxViewer
