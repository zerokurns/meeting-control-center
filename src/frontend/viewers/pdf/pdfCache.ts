// ----- Meeting Control Center -----
// Shared PDF.js plumbing for the pdf viewer: one loaded document per path, info and thumbnails on top of it.

import { getDocument, GlobalWorkerOptions, type PDFDocumentLoadingTask, type PDFDocumentProxy } from "pdfjs-dist"
import type { DocumentInfo } from "../types"

// the worker only exists next to the renderer bundle; node (unit tests) uses PDF.js's fake worker instead
if (typeof window !== "undefined") GlobalWorkerOptions.workerSrc = "./assets/pdf.worker.min.mjs"

const MAX_CACHED = 4
interface CachedDocument {
    task: PDFDocumentLoadingTask | null
    promise: Promise<PDFDocumentProxy>
}
const documents = new Map<string, CachedDocument>()

/** Resolve moved/missing files and encode the path for PDF.js (same loading as the old pdf preview/output). */
async function resolveUrl(path: string): Promise<string> {
    const { encodeFilePath, locateMediaFile } = await import("../../components/helpers/media")
    const located = await locateMediaFile(path)
    return encodeFilePath(located?.path || path)
}

export function getPdfDocument(path: string): Promise<PDFDocumentProxy> {
    const cached = documents.get(path)
    if (cached) {
        // refresh recency
        documents.delete(path)
        documents.set(path, cached)
        return cached.promise
    }

    const entry: CachedDocument = { task: null, promise: Promise.resolve(null as unknown as PDFDocumentProxy) }
    entry.promise = resolveUrl(path).then((url) => {
        const loadingTask = getDocument(url)
        entry.task = loadingTask
        return loadingTask.promise
    })
    documents.set(path, entry)
    entry.promise.catch(() => documents.delete(path))

    while (documents.size > MAX_CACHED) {
        const oldest = documents.keys().next().value as string
        const old = documents.get(oldest)
        documents.delete(oldest)
        try {
            old?.task?.destroy()
        } catch {}
    }

    return entry.promise
}

export function fileTitle(path: string): string {
    const raw = path.split(/[?#]/)[0].split(/[\\/]/).pop() || ""
    let name = raw
    try {
        name = decodeURIComponent(raw)
    } catch {}
    return name.replace(/\.[^.]+$/, "")
}

export async function loadPdfInfo(path: string): Promise<DocumentInfo> {
    const doc = await getPdfDocument(path)
    const units = Array.from({ length: doc.numPages }, (_v, index) => ({ index, label: `Page ${index + 1}` }))
    return { kind: "pdf", path, title: fileTitle(path), units }
}

const thumbnails = new Map<string, string>()

export async function renderPdfThumbnail(path: string, unit: number, width: number): Promise<string | null> {
    if (typeof document === "undefined") return null

    const key = `${path}\n${unit}\n${Math.round(width)}`
    const cached = thumbnails.get(key)
    if (cached) return cached

    const doc = await getPdfDocument(path)
    if (unit < 0 || unit >= doc.numPages) return null

    const page = await doc.getPage(unit + 1)
    const base = page.getViewport({ scale: 1 })
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    const viewport = page.getViewport({ scale: (width * dpr) / base.width })

    const canvas = document.createElement("canvas")
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const context = canvas.getContext("2d")
    if (!context) return null

    await page.render({ canvas, canvasContext: context, viewport }).promise
    const url = canvas.toDataURL("image/jpeg", 0.85)

    thumbnails.set(key, url)
    if (thumbnails.size > 300) thumbnails.delete(thumbnails.keys().next().value as string)
    return url
}
