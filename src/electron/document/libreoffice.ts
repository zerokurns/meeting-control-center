import { execFile } from "child_process"
import fs from "fs"
import path from "path"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

export const DEFAULT_SOFFICE_PATHS: Record<string, string[]> = {
    win32: [path.join(process.env.PROGRAMFILES || "C:\\Program Files", "LibreOffice", "program", "soffice.exe"), path.join(process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)", "LibreOffice", "program", "soffice.exe")],
    darwin: ["/Applications/LibreOffice.app/Contents/MacOS/soffice"],
    linux: ["/usr/bin/soffice", "/usr/bin/libreoffice"]
}

/** Path to the LibreOffice executable (default install locations, then PATH), or null when it is not installed. */
export function findLibreOffice(): string | null {
    const known = (DEFAULT_SOFFICE_PATHS[process.platform] || []).find((p) => fs.existsSync(p))
    if (known) return known

    const names = process.platform === "win32" ? ["soffice.exe"] : ["soffice", "libreoffice"]
    const folders = (process.env.PATH || "").split(path.delimiter).filter(Boolean)
    for (const folder of folders) {
        for (const name of names) {
            const candidate = path.join(folder, name)
            if (fs.existsSync(candidate)) return candidate
        }
    }
    return null
}

/** Converts a document to PDF with headless LibreOffice. Resolves to `<outDir>/<input name>.pdf`, or null on failure. */
export async function convertToPdf(input: string, outDir: string): Promise<string | null> {
    const soffice = findLibreOffice()
    if (!soffice) return null

    try {
        await execFileAsync(soffice, ["--headless", "--convert-to", "pdf", "--outdir", outDir, input], { timeout: 120000 })
        const output = path.join(outDir, path.basename(input, path.extname(input)) + ".pdf")
        return fs.existsSync(output) ? output : null
    } catch (err) {
        return null
    }
}
