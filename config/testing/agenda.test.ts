import { execFileSync } from "child_process"
import fs from "fs"
import path from "path"
import { _electron as electron, type ElectronApplication, type Locator, type Page } from "playwright"
import { expect, test } from "@playwright/test"
import tmp from "tmp"

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const fixture = (name: string) => path.resolve(__dirname, "fixtures", name)

function hasSoffice() {
    try {
        execFileSync("which", ["soffice"], { stdio: "ignore" })
        return true
    } catch {
        return false
    }
}

// the mocked open dialog returns whatever this list holds at the time of the call
async function setDialogPaths(app: ElectronApplication, paths: string[]) {
    await app.evaluate((_electron, p) => {
        ;(globalThis as unknown as { __mockPaths: string[] }).__mockPaths = p
    }, paths)
}

async function launch(settingsFolder: string, dataFolder: string) {
    const app = await electron.launch({
        args: [".", "--no-sandbox"],
        env: { ...process.env, NODE_ENV: "production", FS_MOCK_STORE_PATH: settingsFolder }
    })

    await app.evaluate(
        async ({ dialog }, initial) => {
            const g = globalThis as unknown as { __mockPaths: string[] }
            g.__mockPaths = initial
            dialog.showOpenDialog = async (): Promise<any> => ({ canceled: false, filePaths: g.__mockPaths })
        },
        [dataFolder]
    )

    await app.waitForEvent("window")
    await delay(5_000)

    let window: Page | undefined = app.windows().find((w) => w.url().includes("index.html"))
    for (let i = 0; i < 20 && !window; i++) {
        await delay(500)
        window = app.windows().find((w) => w.url().includes("index.html"))
    }
    if (!window) window = await app.firstWindow()
    window.on("console", (msg) => console.log("[renderer]", msg.text()))
    return { app, window }
}

async function closeApp(app: ElectronApplication) {
    const proc = app.process()
    await Promise.race([app.close(), delay(5_000)]).catch(() => {})
    try {
        if (proc?.pid && !proc.killed) proc.kill("SIGKILL")
    } catch {
        // already exited
    }
    await delay(1_000)
}

// machines without a GPU video driver show a blocking "graphics acceleration unavailable" popup at some point
async function dismissNotices(window: Page) {
    const notice = window.locator(".popup").getByText("Graphics acceleration is unavailable")
    if ((await notice.count()) > 0) {
        await window.locator(".popup button").last().click()
        await delay(500)
    }
}

async function save(window: Page) {
    await window.keyboard.press("Escape")
    await window.keyboard.press("Control+s")
    await delay(3_000)
}

async function openAddMenu(window: Page) {
    // the "+" button toggles the menu; only click when the menu is closed
    if ((await window.locator(".addMenu").count()) === 0) {
        const button = window.locator(".addButton").first()
        await expect(button).toBeVisible({ timeout: 20_000 })
        await expect(button).toBeEnabled({ timeout: 20_000 })
        await button.click()
    }
    await expect(window.locator(".addMenu")).toBeVisible({ timeout: 20_000 })
}

function findFile(dir: string, name: string): string | undefined {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isFile() && entry.name === name) return full
        if (entry.isDirectory()) {
            const found = findFile(full, name)
            if (found) return found
        }
    }
    return undefined
}

const rowOf = (window: Page, name: string) =>
    window
        .locator("button")
        .filter({ hasText: new RegExp("^\\s*" + name) })
        .first()

test("Agenda documents and timers: import, present, save, reopen", async () => {
    test.setTimeout(240_000)

    const settings = tmp.dirSync({ unsafeCleanup: true })
    const dataFolder = tmp.dirSync({ unsafeCleanup: true })
    const { app, window } = await launch(settings.name, dataFolder.name)

    // the GPU notice arrives ~20 s after start and blocks the keyboard, so keep dismissing it in the background
    const noticeTimer = setInterval(() => void dismissNotices(window).catch(() => {}), 1_000)

    try {
        // a. first-run setup (language, data folder via the mocked dialog), skip guide
        await window.locator(".popup button.start, .top").first().waitFor({ timeout: 20_000 })
        const setupStart = window.locator(".popup button.start")
        let didSetup = false
        if ((await setupStart.count()) > 0) {
            const setupPopup = window.locator(".popup")
            await setupPopup.locator(".dropdown-trigger").first().click()
            await setupPopup.locator("li[role=option]").filter({ hasText: "English" }).first().click()
            await setupPopup.locator(".button-trigger").first().click()
            await setupStart.click()
            didSetup = true
        }
        const skipGuide = window.locator("#guideButtons").getByText("Skip")
        if (didSetup) await skipGuide.waitFor({ timeout: 10_000 })
        if ((await skipGuide.count()) > 0) await skipGuide.click()

        // b. new project named "Smoke meeting" (a new project starts in rename mode)
        await window.getByText("New project").first().click()
        // the splash button opens the project directly; go back to the list and hold the name to rename it
        await window.locator(".header .left button").first().click()
        const projectName = window
            .locator("#projectsArea p._rename")
            .filter({ hasText: /^\d+\/\d+\/\d+$/ })
            .first()
        await expect(projectName).toBeVisible()
        const box = (await projectName.boundingBox())!
        await window.mouse.move(box.x + 10, box.y + box.height / 2)
        await window.mouse.down()
        await delay(1_000)
        await window.mouse.up()
        const renameInput = window.locator("input.edit._rename")
        await expect(renameInput).toBeVisible()
        await renameInput.fill("Smoke meeting")
        await renameInput.press("Enter")
        await expect(window.getByText("Smoke meeting").first()).toBeVisible()
        await delay(500)
        await dismissNotices(window)
        // open the project (the list may still be showing)
        if ((await window.locator("#projectsArea").count()) > 0) await window.locator("#projectsArea").getByText("Smoke meeting").first().click()
        await expect(window.getByText("Nothing here").first()).toBeVisible()

        // c. import PDF, XLSX and DOCX through the document picker
        await setDialogPaths(app, [fixture("agenda.pdf"), fixture("budget.xlsx"), fixture("minutes.docx")])
        await openAddMenu(window)
        await window.locator(".addMenu").getByText("Document", { exact: true }).click()
        for (const name of ["agenda", "budget", "minutes"]) {
            await expect(rowOf(window, name)).toBeVisible({ timeout: 20_000 })
        }

        // d. PPTX conversion (needs LibreOffice)
        if (hasSoffice()) {
            await setDialogPaths(app, [fixture("deck.pptx")])
            await openAddMenu(window)
            await window.locator(".addMenu").getByText("Document", { exact: true }).click()
            await expect(rowOf(window, "deck")).toBeVisible({ timeout: 90_000 })
            await save(window)
            const projectsFile = findFile(settings.name, "projects.json") || findFile(dataFolder.name, "projects.json")
            expect(projectsFile, "projects.json should exist after save").toBeTruthy()
            const json = fs.readFileSync(projectsFile as string, "utf-8")
            expect(json).toContain('"notes"')
        } else {
            console.log("SKIP step d: soffice not found on PATH, PPTX conversion not tested")
        }

        // e. viewers
        await dismissNotices(window)
        await rowOf(window, "agenda").click()
        await expect(window.getByTestId("document-preview")).toBeVisible()
        await expect(window.getByTestId("pdf-canvas")).toBeVisible({ timeout: 20_000 })
        await expect(window.getByTestId("document-unit-indicator")).toHaveText("1 / 5", { timeout: 20_000 })
        // the popup shows up once the first item reaches the output
        await window
            .locator(".popup")
            .getByText("Graphics acceleration is unavailable")
            .waitFor({ timeout: 5_000 })
            .catch(() => {})
        await dismissNotices(window)
        await window.locator("[data-testid=document-preview] .viewer [tabindex='0']").first().focus()
        await window.keyboard.press("ArrowRight")
        // the global shortcut drives the output and the preview follows it
        // (the first press starts the not-yet-presented document on the output at the previewed unit, page 1)
        const indicator = window.getByTestId("document-unit-indicator")
        await expect(window.locator("[data-testid=document-thumbnails] .thumb.out")).toHaveCount(1, { timeout: 10_000 })
        await window.keyboard.press("ArrowRight")
        await expect(indicator).toHaveText("2 / 5")
        await window.keyboard.press("ArrowRight")
        await expect(indicator).toHaveText("3 / 5")

        await rowOf(window, "budget").click()
        await expect(window.getByTestId("xlsx-viewer")).toBeVisible({ timeout: 20_000 })
        await expect(window.getByTestId("xlsx-viewer").getByText("Line item").first()).toBeVisible()
        await dismissNotices(window)
        // the first press starts the not-yet-presented sheet on the output at the previewed sheet; the next one advances
        await expect(async () => {
            await window.keyboard.press("ArrowRight")
            await expect(window.getByTestId("xlsx-viewer").getByText("Meeting").first()).toBeVisible({ timeout: 2_000 })
        }).toPass({ timeout: 20_000 })

        await rowOf(window, "minutes").click()
        await expect(window.getByTestId("docx-viewer")).toBeVisible({ timeout: 20_000 })
        await expect(window.getByTestId("docx-viewer").getByText("Minutes").first()).toBeAttached({ timeout: 20_000 })

        // f. timer item: create a timer in the timer popup, then pick it
        // every step waits for its target explicitly (generous timeout) so a busy CPU cannot make a click time out
        const ready = async (locator: Locator) => {
            await expect(locator).toBeVisible({ timeout: 20_000 })
            await expect(locator).toBeEnabled({ timeout: 20_000 })
            return locator
        }
        const timerMenuItem = () => window.locator(".addMenu").getByText("Timer", { exact: true })
        await openAddMenu(window)
        await (await ready(timerMenuItem())).click()
        await (await ready(window.locator(".popup").getByText("New timer").first())).click()
        await (
            await ready(
                window
                    .locator(".popup")
                    .getByText(/From.*to/i)
                    .first()
            )
        ).click()
        const nameInput = await ready(window.locator(".popup input").first())
        await nameInput.fill("Smoke timer")
        await nameInput.press("Enter")
        await delay(500)
        await window.keyboard.press("Escape")
        await expect(window.locator(".popup input").first()).toBeHidden({ timeout: 20_000 })
        await openAddMenu(window)
        await (await ready(timerMenuItem())).click()
        await (await ready(window.locator(".popup").getByText("Smoke timer").first())).click()
        await expect(rowOf(window, "Smoke timer")).toBeVisible({ timeout: 20_000 })
        await (await ready(rowOf(window, "Smoke timer"))).click()
        await expect(window.getByTestId("timer-item-view")).toBeVisible()
        await expect(window.getByTestId("timer-item-time")).toHaveText(/\d+:\d\d/)

        // g. save, close, relaunch
        await save(window)
    } catch (ex) {
        fs.mkdirSync("test-output/screenshots", { recursive: true })
        await window.screenshot({ path: "test-output/screenshots/agenda-failed.png" }).catch(() => {})
        throw ex
    } finally {
        clearInterval(noticeTimer)
        await closeApp(app)
    }

    try {
        const relaunchedTimers: NodeJS.Timeout[] = []
        const relaunched = await launch(settings.name, dataFolder.name)
        const w2 = relaunched.window
        try {
            const noticeTimer2 = setInterval(() => void dismissNotices(w2).catch(() => {}), 1_000)
            relaunchedTimers.push(noticeTimer2)
            await w2.locator(".top").first().waitFor({ timeout: 20_000 })
            await expect(w2.getByText("Smoke meeting").first()).toBeVisible({ timeout: 20_000 })
            await w2.getByText("Smoke meeting").first().click()
            for (const name of ["agenda", "budget", "minutes", "Smoke timer"]) {
                await expect(rowOf(w2, name)).toBeVisible({ timeout: 20_000 })
            }
            await rowOf(w2, "agenda").click()
            await expect(w2.getByTestId("pdf-canvas")).toBeVisible({ timeout: 20_000 })
            await expect(w2.getByTestId("document-unit-indicator")).toHaveText("1 / 5", { timeout: 20_000 })
        } catch (ex) {
            fs.mkdirSync("test-output/screenshots", { recursive: true })
            await w2.screenshot({ path: "test-output/screenshots/agenda-relaunch-failed.png" }).catch(() => {})
            throw ex
        } finally {
            relaunchedTimers.forEach(clearInterval)
            await closeApp(relaunched.app)
        }
    } finally {
        dataFolder.removeCallback()
        settings.removeCallback()
    }
})
