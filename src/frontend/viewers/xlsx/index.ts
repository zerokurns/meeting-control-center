// Stub: replaced by the real xlsx viewer (see docs/tasks). Keeps the registry and the build whole until then.
import Unsupported from "../Unsupported.svelte"
import type { DocumentViewerModule } from "../types"

const xlsxViewer: DocumentViewerModule = {
    kind: "xlsx",
    extensions: ["xlsx", "xlsm", "xls", "csv"],
    async load(path) {
        throw new Error("xlsx viewer not implemented: " + path)
    },
    async thumbnail() {
        return null
    },
    Component: Unsupported as any
}

export default xlsxViewer
