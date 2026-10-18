import fs from "fs"
import path from "path"
import { Readable } from "stream"
import { ToMain } from "../../types/IPC/ToMain"
import { ContentProviderFactory } from "../contentProviders/base/ContentProvider"
import { sendToMain } from "../IPC/main"
import { doesPathExist, getDataFolderPath, getMimeType } from "../utils/files"
import { encryptFile, getProtectedPath, registerProtectedMediaFile } from "./protected"
import { filePathHashCode } from "./thumbnails"

// Shared streaming downloader
async function streamDownload(url: string, outputPath: string, onData?: (chunk: any) => void) {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Status code: ${response.status}`)
    if (!response.body) throw new Error("Response body is empty")

    const fileStream = fs.createWriteStream(outputPath)
    const body = Readable.fromWeb(response.body as any)

    if (onData) body.on("data", onData)
    body.pipe(fileStream)

    return new Promise<void>((resolve, reject) => {
        body.on("error", (err) => {
            fileStream.close()
            reject(err)
        })
        fileStream.on("error", (err) => {
            fs.unlink(outputPath, () => {})
            reject(err)
        })
        fileStream.on("finish", () => {
            fileStream.close()
            resolve()
        })
    })
}

/// //

const downloading = new Set<string>()
export async function downloadMedia({ url, contentFile }: { url: string; contentFile?: any }) {
    if (!url?.startsWith("http") || url?.startsWith("blob:")) return

    if (downloading.has(url)) return
    downloading.add(url)

    const removeFromDownloading = () => downloading.delete(url)

    console.info("Downloading online media: " + url)

    const outputPath = getMediaThumbnailPath(url, contentFile)

    // Check if provider-based encryption is needed
    if (contentFile?.providerId) {
        const provider = ContentProviderFactory.getProvider(contentFile.providerId)
        if (provider?.shouldEncrypt?.(url, contentFile.pingbackUrl)) {
            const encryptionKey = provider.getEncryptionKey?.()
            if (!encryptionKey) {
                console.error(`Provider ${contentFile.providerId} requires encryption but did not provide an encryption key`)
                removeFromDownloading()
                return
            }
            encryptFile(url, outputPath, encryptionKey).finally(removeFromDownloading)
            return
        }
    }

    try {
        let downloadedSize = 0
        const totalSize = 0

        await streamDownload(url, outputPath, (chunk) => {
            downloadedSize += chunk.length
            if (totalSize > 0) sendToMain(ToMain.MEDIA_DOWNLOAD_PROGRESS, { url, progress: downloadedSize, total: totalSize, status: "downloading" })
        })

        removeFromDownloading()
        console.info(`Finished downloading file: ${url}`)
        sendToMain(ToMain.MEDIA_DOWNLOAD_PROGRESS, { url, progress: totalSize, total: totalSize, status: "complete" })
    } catch (err: any) {
        console.error(`Request error: ${err.message}`)
        sendToMain(ToMain.MEDIA_DOWNLOAD_PROGRESS, { url, progress: 0, total: 0, status: "error" })
        removeFromDownloading()
    }
}

export async function checkIfMediaDownloaded({ url, contentFile }: { url: string; contentFile?: any }) {
    if (!url?.startsWith("http")) return null
    if (downloading.has(url)) return { path: url, buffer: null, isDownloading: true }

    const outputPath = getMediaThumbnailPath(url, contentFile)
    if (!doesPathExist(outputPath)) return null

    if (contentFile?.providerId) {
        const provider = ContentProviderFactory.getProvider(contentFile.providerId)
        if (provider?.shouldEncrypt?.(url, contentFile.pingbackUrl)) {
            try {
                const protectedUrl = registerProtectedMediaFile({
                    filePath: outputPath,
                    providerId: contentFile.providerId,
                    mimeType: getMimeTypeFromContentFile(contentFile, outputPath)
                })
                return protectedUrl ? { path: outputPath, buffer: null, protectedUrl } : null
            } catch (err) {
                console.error(`Failed to prepare protected media: ${url}`, err)
                return null
            }
        }
    }

    return { path: outputPath, buffer: null }
}

function getMediaThumbnailPath(url: string, contentFile?: any) {
    // Check if provider-based encryption is needed
    if (contentFile?.providerId) {
        const provider = ContentProviderFactory.getProvider(contentFile.providerId)
        if (provider?.shouldEncrypt?.(url, contentFile.pingbackUrl)) return getProtectedPath(url)
    }

    const urlWithoutQuery = url.split("?")[0]
    const extension = path.extname(urlWithoutQuery)
    const fileName = `${filePathHashCode(url)}${extension}`
    const outputFolder = getDataFolderPath("onlineMedia")

    return path.join(outputFolder, fileName)
}

function getMimeTypeFromContentFile(contentFile: any, fallbackPath: string) {
    if (typeof contentFile?.mimeType === "string") return contentFile.mimeType
    if (contentFile?.type === "image") return "image/jpeg"
    if (contentFile?.type === "video") return "video/mp4"
    return getMimeType(fallbackPath) || "application/octet-stream"
}
