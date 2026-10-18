import { get } from "svelte/store"
import { Main } from "../../../types/IPC/Main"
import type { FileFolder } from "../../../types/Main"
import type { ShowList } from "../../../types/Show"
import { requestMain } from "../../IPC/main"
import { textCache } from "../../stores"
import { getTextSnippet } from "./searchHighlight"
import { sortByClosestMatch } from "../actions/apiHelper"
import { getExtension, getMediaType } from "../helpers/media"

export function showResult(show: ShowList, rawSearchValue: string) {
    return { ...show, description: getTextSnippet(get(textCache)[show.id] || "", rawSearchValue) }
}

let mediaCache = new Map<string, any>()
export async function getMediaResults(searchValue: string, folderPaths: string[]) {
    if (!searchValue || searchValue.length < 2) return []

    const key = `${folderPaths[0]}_${folderPaths.length}`
    let data: { [key: string]: FileFolder } = mediaCache.get(key)
    if (!data) {
        data = (await requestMain(Main.READ_FOLDER, { path: folderPaths })) || {}
        mediaCache.set(key, data)
    }
    const matches: any[] = []

    for (const [path, item] of Object.entries(data)) {
        if (item.name?.toLowerCase().includes(searchValue)) {
            const type = getMediaType(getExtension(path))

            matches.push({
                id: path,
                name: item.name,
                icon: type === "audio" ? "music" : type === "video" ? "movie" : "image",
                data: {
                    name: item.name,
                    type
                }
            })
        }
    }

    return sortByClosestMatch(matches, searchValue)
}
