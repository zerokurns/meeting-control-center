import path from "path"
import upath from "upath"
// @ts-ignore
import WordExtractor from "word-extractor"
import { ToMain } from "../../types/IPC/ToMain"
import { sendToMain } from "../IPC/main"
import { pptToShow } from "../output/ppt/pptToShow"
import { asyncPool, doesPathExist, getDataFolderPath, getExtension, readFileAsync } from "../utils/files"
import { detectFileType } from "./bibleDetecter"
import { filePathHashCode } from "./thumbnails"
import { decompressZip, decompressZipStream, isZip } from "./zip"

type FileData = { content: Buffer | string | object; path?: string; name?: string; extension?: string }

const specialImports = {
    powerpoint: async (files: string[]) => {
        sendToMain(ToMain.ALERT, "popup.importing")

        const data: FileData[] = []
        for await (const filePath of files) {
            const json = await pptToShow(filePath)
            if (json) data.push({ name: getFileName(filePath), content: json })
        }

        return data
    },
    word: async (files: string[]) => {
        const data: FileData[] = []

        // https://www.npmjs.com/package/word-extractor
        const extractor = new WordExtractor()
        for await (const filePath of files) {
            const extracted = await extractor.extract(filePath)
            data.push({ name: getFileName(filePath), content: extracted.getBody() })
        }

        return data
    },
    pdf: (files: string[]) => files,
    powerkey: (files: string[]) => files
}

export async function importShow(id: string, files: string[] | null) {
    if (!files?.length) return

    let importId = id
    let data: (FileData | string)[] = []

    if (id === "freeshow_project") {
        await importProject(files)
        return
    }
    if (id === "freeshow_template") {
        await importTemplate(files)
        return
    }
    if (id === "freeshow_overlay") {
        await importOverlay(files)
        return
    }

    const zip = ["zip", "probundle", "vpc", "qsp"]
    const zipFiles = files.filter((a) => zip.includes(a.slice(a.lastIndexOf(".") + 1).toLowerCase()))
    if (zipFiles.length) {
        data = await decompressZip(zipFiles)
        if (data.length) {
            sendToMain(ToMain.IMPORT2, { channel: id, data })
        }
        return
    }

    if (importId in specialImports) data = await specialImports[importId as keyof typeof specialImports](files)
    else {
        // TXT | FreeShow | XML Bible
        await asyncPool(20, files, async (file) => {
            const batchData = await readFile(file, "utf8")
            data.push(batchData)
        })
    }

    if (!data.length) return

    // auto detect version
    if (id === "BIBLE") {
        data = (data as FileData[]).map((file) => ({ ...file, type: detectFileType(file.content as string) }))
    }

    sendToMain(ToMain.IMPORT2, { channel: id, data })
}

async function readFile(filePath: string, encoding: BufferEncoding = "utf8") {
    let content = ""

    const name: string = getFileName(filePath) || ""
    const extension: string = getExtension(filePath)

    try {
        content = await readFileAsync(filePath, encoding)
    } catch (err) {
        console.error("Error reading file:", (err as Error).stack)
    }

    return { content, path: filePath, name, extension }
}

const getFileName = (filePath: string) => path.basename(filePath).slice(0, path.basename(filePath).lastIndexOf("."))

// PROJECT

async function importProject(files: string[]) {
    sendToMain(ToMain.ALERT, "popup.importing")

    // some .project files are plain JSON and others are zip
    const zipFiles: string[] = []
    const jsonFiles: string[] = []
    await asyncPool(20, files, async (file) => {
        const zip = await isZip(file)
        if (zip) zipFiles.push(file)
        else jsonFiles.push(file)
    })

    const data: FileData[] = []
    await asyncPool(20, jsonFiles, async (file) => {
        data.push(await readFile(file))
    })

    const importFolder = getDataFolderPath("imports", "Projects")

    for (const zipFile of zipFiles) {
        const dataFile = await extractZipDataAndMedia(zipFile, importFolder)
        if (dataFile) data.push(dataFile)
    }

    // remove folder if no files stored
    // if (!readFolder(importFolder).length) deleteFolder(importFolder)

    // might have alerted an error, so just return if there is no data
    if (!data.length) return

    sendToMain(ToMain.IMPORT2, { channel: "freeshow_project", data })
}

// TEMPLATE

async function importTemplate(files: string[]) {
    sendToMain(ToMain.ALERT, "popup.importing")

    // some .fstemplate files are plain JSON and others are zip
    const zipFiles: string[] = []
    const jsonFiles: string[] = []
    await asyncPool(20, files, async (file) => {
        const zip = await isZip(file)
        if (zip) zipFiles.push(file)
        else jsonFiles.push(file)
    })

    const data: FileData[] = []
    await asyncPool(20, jsonFiles, async (file) => {
        data.push(await readFile(file))
    })

    const importFolder = getDataFolderPath("imports", "Templates")

    for (const zipFile of zipFiles) {
        const dataFile = await extractZipDataAndMedia(zipFile, importFolder)
        if (dataFile) data.push(dataFile)
    }

    sendToMain(ToMain.IMPORT2, { channel: "freeshow_template", data })
}

// OVERLAY

async function importOverlay(files: string[]) {
    sendToMain(ToMain.ALERT, "popup.importing")

    // some .fsoverlay files are plain JSON and others are zip
    const zipFiles: string[] = []
    const jsonFiles: string[] = []
    await asyncPool(20, files, async (file) => {
        const zip = await isZip(file)
        if (zip) zipFiles.push(file)
        else jsonFiles.push(file)
    })

    const data: FileData[] = []
    await asyncPool(20, jsonFiles, async (file) => {
        data.push(await readFile(file))
    })

    const importFolder = getDataFolderPath("imports", "Overlays")

    for (const zipFile of zipFiles) {
        const dataFile = await extractZipDataAndMedia(zipFile, importFolder)
        if (dataFile) data.push(dataFile)
    }

    sendToMain(ToMain.IMPORT2, { channel: "freeshow_overlay", data })
}

/// ZIP ///

async function extractZipDataAndMedia(filePath: string, importFolder: string) {
    const initialData = await decompressZip([filePath])
    const dataFile = initialData.find((a) => a.name === "data.json")
    if (!dataFile) return

    let content = dataFile.content as string
    const dataContent = JSON.parse(content)

    const filePathMap = new Map<string, string>()
    const replacedMedia: { [key: string]: string } = {}

    dataContent.files?.forEach((rawPath: string) => {
        if (!rawPath || typeof rawPath !== "string") return
        if (rawPath.startsWith("data:") || rawPath.startsWith("http://") || rawPath.startsWith("https://") || rawPath.startsWith("blob:") || rawPath.startsWith("freeshow-protected://")) return

        // check if path already exists on the system
        if (doesPathExist(rawPath)) return

        const extension = upath.extname(rawPath)
        const fileName = upath.basename(rawPath)
        const hashedFileName = `${upath.basename(rawPath, extension)}__${filePathHashCode(rawPath)}${extension}`

        // get file path hash to prevent the same file importing multiple times
        // this also ensures files with the same name don't get overwritten
        const ext = upath.extname(fileName)
        const pathHash = `${upath.basename(rawPath, ext)}_${filePathHashCode(upath.toUnix(rawPath))}${ext}`
        const newMediaPath = upath.join(importFolder, pathHash)

        replacedMedia[rawPath] = newMediaPath

        if (doesPathExist(newMediaPath)) return

        // map input name to output path for file extraction
        filePathMap.set(hashedFileName, newMediaPath)
        filePathMap.set(fileName, newMediaPath)
    })

    // extract files directly to their final paths
    await decompressZipStream(filePath, true, {
        getOutputPath: (fileName: string) => filePathMap.get(fileName)
    })

    // replace files
    const escapeJSON = (value: string) => value.replace(/\\/g, "\\\\")
    Object.entries(replacedMedia).forEach(([oldPath, newPath]) => {
        const windowsPath = oldPath.replace(/\//g, "\\")
        const unixPath = oldPath.replace(/\\/g, "/")
        const escapedWindowsPath = escapeJSON(windowsPath)

        const pathVariants = [oldPath, windowsPath, unixPath, escapedWindowsPath]

        pathVariants.forEach((variant) => {
            // convert \ to \\
            const escapedPattern = variant.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")
            const replacementPath = escapeJSON(newPath)
            const regex = new RegExp(escapedPattern, "g")
            content = content.replace(regex, replacementPath)
        })
    })

    dataFile.content = content
    return dataFile
}
