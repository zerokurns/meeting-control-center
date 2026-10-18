import { XMLParser } from "fast-xml-parser"
import path from "path"
import yauzl from "yauzl"

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", trimValues: false })

const WANTED = /^ppt\/(presentation\.xml|_rels\/presentation\.xml\.rels|slides\/_rels\/[^/]+\.rels|notesSlides\/[^/]+\.xml)$/

type Relationships = { [id: string]: { target: string; type: string } }

/** Reads only the XML parts needed for notes (never the embedded media). */
function readParts(file: string): Promise<{ [name: string]: string }> {
    return new Promise((resolve, reject) => {
        yauzl.open(file, { lazyEntries: true }, (err, zipfile) => {
            if (err || !zipfile) return reject(err || new Error("Failed to open zip"))

            const parts: { [name: string]: string } = {}
            zipfile.on("error", reject)
            zipfile.on("end", () => resolve(parts))
            zipfile.on("entry", (entry: yauzl.Entry) => {
                if (!WANTED.test(entry.fileName)) return zipfile.readEntry()

                zipfile.openReadStream(entry, (streamErr, stream) => {
                    if (streamErr || !stream) return reject(streamErr || new Error("Failed to read " + entry.fileName))
                    const chunks: Buffer[] = []
                    stream.on("data", (chunk: Buffer) => chunks.push(chunk))
                    stream.on("error", reject)
                    stream.on("end", () => {
                        parts[entry.fileName] = Buffer.concat(chunks).toString("utf8")
                        zipfile.readEntry()
                    })
                })
            })
            zipfile.readEntry()
        })
    })
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
    if (value === undefined || value === null) return []
    return Array.isArray(value) ? value : [value]
}

function relationships(xml: string | undefined): Relationships {
    const result: Relationships = {}
    if (!xml) return result
    const rels = asArray(parser.parse(xml)?.Relationships?.Relationship)
    for (const rel of rels) result[rel["@_Id"]] = { target: rel["@_Target"] || "", type: rel["@_Type"] || "" }
    return result
}

/** Resolves a relationship target (relative to `fromDir`, or absolute inside the package) to a zip entry name. */
function resolveTarget(fromDir: string, target: string): string {
    return target.startsWith("/") ? target.slice(1) : path.posix.normalize(path.posix.join(fromDir, target))
}

function collectText(node: unknown, runs: string[] = []): string[] {
    if (Array.isArray(node)) node.forEach((n) => collectText(n, runs))
    else if (node && typeof node === "object") {
        for (const [key, value] of Object.entries(node as { [k: string]: unknown })) {
            if (key === "a:t") asArray(value).forEach((v) => runs.push(typeof v === "object" && v !== null ? String((v as { [k: string]: unknown })["#text"] ?? "") : String(v)))
            else collectText(value, runs)
        }
    }
    return runs
}

function notesText(xml: string): string {
    const doc = parser.parse(xml)
    const shapes = asArray(doc?.["p:notes"]?.["p:cSld"]?.["p:spTree"]?.["p:sp"])
    const lines: string[] = []
    for (const shape of shapes) {
        // only the notes body placeholder (not the slide image or slide number)
        const placeholder = shape?.["p:nvSpPr"]?.["p:nvPr"]?.["p:ph"]
        if (placeholder?.["@_type"] !== "body") continue
        for (const paragraph of asArray(shape?.["p:txBody"]?.["a:p"])) lines.push(collectText(paragraph).join(""))
    }
    return lines.join("\n").trim()
}

/** Speaker notes of a .pptx per 0-based slide index (slides without notes are left out). */
export async function extractPptxNotes(pptxPath: string): Promise<{ [slideIndex: number]: string }> {
    const parts = await readParts(pptxPath)

    const presentationRels = relationships(parts["ppt/_rels/presentation.xml.rels"])
    const presentation = parser.parse(parts["ppt/presentation.xml"] || "")
    const slideIds = asArray(presentation?.["p:presentation"]?.["p:sldIdLst"]?.["p:sldId"])

    const notes: { [slideIndex: number]: string } = {}
    slideIds.forEach((slideId, index) => {
        const rel = presentationRels[slideId["@_r:id"]]
        if (!rel) return

        const slidePath = resolveTarget("ppt", rel.target)
        const relsPath = path.posix.join(path.posix.dirname(slidePath), "_rels", path.posix.basename(slidePath) + ".rels")
        const notesRel = Object.values(relationships(parts[relsPath])).find((r) => r.type.endsWith("/notesSlide"))
        if (!notesRel) return

        const xml = parts[resolveTarget(path.posix.dirname(slidePath), notesRel.target)]
        if (!xml) return

        const text = notesText(xml)
        if (text) notes[index] = text
    })

    return notes
}
