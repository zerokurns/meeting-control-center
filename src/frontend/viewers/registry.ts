import { CONVERTED_EXTENSIONS, DOCUMENT_EXTENSIONS, type DocumentKind, type DocumentViewerModule } from "./types"

const modules: Partial<Record<DocumentKind, DocumentViewerModule>> = {}

export function registerViewer(module: DocumentViewerModule) {
    modules[module.kind] = module
}

export function getViewer(kind: DocumentKind): DocumentViewerModule | undefined {
    return modules[kind]
}

export function getExtension(path: string): string {
    return (path.split(/[?#]/)[0].split(".").pop() || "").toLowerCase()
}

/** Kind a path opens as natively, or null when it is not a document (or needs conversion first). */
export function documentKindOf(path: string): DocumentKind | null {
    const ext = getExtension(path)
    for (const [kind, extensions] of Object.entries(DOCUMENT_EXTENSIONS)) {
        if (extensions.includes(ext)) return kind as DocumentKind
    }
    return null
}

export function getViewerForPath(path: string): DocumentViewerModule | undefined {
    const kind = documentKindOf(path)
    return kind ? modules[kind] : undefined
}

export function isDocumentPath(path: string): boolean {
    return documentKindOf(path) !== null
}

export function needsConversion(path: string): boolean {
    return CONVERTED_EXTENSIONS.includes(getExtension(path))
}

/** Every extension the "add document" picker and file drop should accept. */
export function acceptedDocumentExtensions(): string[] {
    return [...Object.values(DOCUMENT_EXTENSIONS).flat(), ...CONVERTED_EXTENSIONS]
}
