import { uid } from "uid"
import type { Bible, Book, Chapter, Verse } from "json-bible/lib/Bible"
import { formatToFileName } from "../components/helpers/show"
import { scriptures, scripturesCache } from "./../stores"
import { setActiveScripture } from "./bible"

export function convertOpenSongBible(data: any[]) {
    data.forEach((bible) => {
        const obj = XMLtoBible(bible.content)
        obj.name = bible.name || ""
        obj.name = formatToFileName(obj.name)

        const id = uid()
        // create folder & file
        scripturesCache.update((a) => {
            a[id] = obj
            return a
        })

        scriptures.update((a) => {
            a[id] = { name: obj.name, id }
            return a
        })

        setActiveScripture(id)
    })
}

function XMLtoBible(xml: string) {
    const parser = new DOMParser()
    // remove first line (standalone attribute): <?xml version="1.0"?>
    xml = xml.split("\n").slice(1, xml.split("\n").length).join("\n")
    const xmlDoc = parser.parseFromString(xml, "text/xml").children[0]

    const booksObj = getChildren(xmlDoc, "b")
    const books: Book[] = []

    ;[...booksObj].forEach((book: any, i: number) => {
        let length = 0
        const name = book.getAttribute("n")
        const number = i + 1
        const chapters: Chapter[] = []

        ;[...getChildren(book, "c")].forEach((chapter: any) => {
            const chapterNumber = chapter.getAttribute("n")
            const verses: Verse[] = []

            ;[...getChildren(chapter, "v")].forEach((verse: any) => {
                const text = verse.innerHTML
                    .toString()
                    .replace(/\[\d+\] /g, "") // remove [1], not [text]
                    .trim()
                length += text.length
                if (text.length) verses.push({ number: verse.getAttribute("n"), text })
            })

            chapters.push({ number: chapterNumber, verses })
        })

        if (length) books.push({ name, number, chapters })
    })

    return { name: "", metadata: { copyright: "" }, books } as Bible
}

const getChildren = (parent: any, name: string) => parent.getElementsByTagName(name)
