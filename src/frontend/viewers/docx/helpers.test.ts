import { describe, expect, test } from "vitest"
import { clampUnit, computeScale, countPagesFromHtml, pageUnits, scrollOffset, titleFromPath } from "./helpers"

const html = '<style>.docx{}</style><div class="docx-wrapper"><section class="docx" style="a:b"><article>1</article></section><section class="docx"><article>2</article></section><section class="docx-other"></section></div>'

describe("docx helpers", () => {
    test("counts pages", () => {
        expect(countPagesFromHtml(html)).toBe(2)
        expect(countPagesFromHtml("")).toBe(1)
        expect(countPagesFromHtml("<div></div>")).toBe(1)
    })
    test("units", () => {
        expect(pageUnits(2)).toEqual([
            { index: 0, label: "Page 1" },
            { index: 1, label: "Page 2" }
        ])
        expect(pageUnits(0)).toHaveLength(1)
    })
    test("title and clamp", () => {
        expect(titleFromPath("/a/b/My%20Doc.docx")).toBe("My Doc")
        expect(clampUnit(9, 3)).toBe(2)
        expect(clampUnit(-1, 3)).toBe(0)
    })
    test("scale and scroll", () => {
        const page = { width: 800, height: 1000 }
        expect(computeScale("page", 1, { width: 400, height: 1000 }, page)).toBe(0.5)
        expect(computeScale("width", 2, { width: 400, height: 100 }, page)).toBe(1)
        expect(scrollOffset(0.5, 1000, 600)).toBe(-200)
        expect(scrollOffset(1, 500, 600)).toBe(0)
    })
})
