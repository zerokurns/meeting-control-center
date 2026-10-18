import fs from "fs"
import os from "os"
import path from "path"
import { isWindows } from ".."
import type { DocumentItemData } from "../../frontend/agenda/agenda"
import { CONVERTED_EXTENSIONS, DOCUMENT_EXTENSIONS, type DocumentKind } from "../../frontend/viewers/types"
import type { Main, MainSendPayloads } from "../../types/IPC/Main"
import { ToMain } from "../../types/IPC/ToMain"
import { sendToMain } from "../IPC/main"
import { openURL } from "../IPC/responsesMain"
import { getDataFolderPath, sanitizeFileName, selectFilesDialog } from "../utils/files"
import { convertToPdf, findLibreOffice } from "./libreoffice"
import { extractPptxNotes } from "./pptxNotes"

type ImportItem = { id: string; name: string; type: "document"; data: DocumentItemData }
type ImportFailure = { path: string; reason: string }

function extensionOf(file: string): string {
    return path.extname(file).slice(1).toLowerCase()
}

function kindOfExtension(extension: string): DocumentKind | null {
    for (const [kind, extensions] of Object.entries(DOCUMENT_EXTENSIONS)) {
        if (extensions.includes(extension)) return kind as DocumentKind
    }
    return null
}

/** `folder/name.ext`, or `folder/name (2).ext`, `name (3).ext`, … when that name is taken. */
export function uniquePath(folder: string, fileName: string): string {
    const extension = path.extname(fileName)
    const base = path.basename(fileName, extension)

    let candidate = path.join(folder, fileName)
    for (let i = 2; fs.existsSync(candidate); i++) candidate = path.join(folder, `${base} (${i})${extension}`)
    return candidate
}

const LIBREOFFICE_MISSING = isWindows ? "LibreOffice is not installed or not found in default location.<br>Upon LibreOffice installation, it's recommended to enable the 'Add to PATH' option." : "LibreOffice is not installed or not found"

async function importFile(source: string, folder: string, extensions: string[]): Promise<ImportItem> {
    const extension = extensionOf(source)
    if (!extensions.includes(extension)) throw new Error("Unsupported file type: ." + extension)

    const stats = await fs.promises.stat(source).catch(() => null)
    if (!stats || !stats.isFile()) throw new Error("File does not exist")

    const baseName = sanitizeFileName(path.basename(source, path.extname(source))) || "document"
    const name = path.basename(source, path.extname(source))

    const nativeKind = kindOfExtension(extension)
    if (nativeKind) {
        const target = uniquePath(folder, `${baseName}.${extension}`)
        await fs.promises.copyFile(source, target)
        return { id: target, name, type: "document", data: { kind: nativeKind, sourcePath: source } }
    }

    if (!CONVERTED_EXTENSIONS.includes(extension)) throw new Error("Unsupported file type: ." + extension)
    if (!findLibreOffice()) throw new Error(LIBREOFFICE_MISSING)

    sendToMain(ToMain.TOAST, "agenda.converting: " + name)

    // convert in a scratch folder so an existing PDF with the same name is never overwritten
    const scratch = await fs.promises.mkdtemp(path.join(os.tmpdir(), "mcc-document-"))
    try {
        const input = path.join(scratch, `${baseName}.${extension}`)
        await fs.promises.copyFile(source, input)

        const converted = await convertToPdf(input, scratch)
        if (!converted) throw new Error("LibreOffice could not convert this file")

        const target = uniquePath(folder, `${baseName}.pdf`)
        await fs.promises.copyFile(converted, target)

        const data: DocumentItemData = { kind: "pdf", sourcePath: source, convertedFrom: extension }
        if (extension === "pptx") {
            try {
                const notes = await extractPptxNotes(source)
                if (Object.keys(notes).length) data.notes = notes
            } catch (err) {
                console.error("Could not read PowerPoint notes:", err)
            }
        }

        return { id: target, name, type: "document", data }
    } finally {
        fs.promises.rm(scratch, { recursive: true, force: true }).catch(() => null)
    }
}

export async function importDocuments(data: MainSendPayloads[Main.IMPORT_DOCUMENTS]) {
    const extensions = (data.extensions || []).map((a) => a.toLowerCase().replace(/^\./, ""))

    let paths = data.paths || []
    if (data.pick) paths = await selectFilesDialog("", { name: "Documents", extensions }, true)
    if (!paths.length) return

    const folder = getDataFolderPath("documents")
    const items: ImportItem[] = []
    const failed: ImportFailure[] = []

    // sequential: LibreOffice cannot run several headless conversions on the same profile at once
    for (const source of paths) {
        try {
            items.push(await importFile(source, folder, extensions))
        } catch (err) {
            failed.push({ path: source, reason: err instanceof Error ? err.message : String(err) })
        }
    }

    sendToMain(ToMain.DOCUMENTS_IMPORTED, { items, failed })

    if (failed.some((a) => a.reason === LIBREOFFICE_MISSING)) {
        sendToMain(ToMain.ALERT, LIBREOFFICE_MISSING)
        setTimeout(() => openURL("https://www.libreoffice.org/download/"), 500)
    }
}
