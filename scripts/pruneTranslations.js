// Removes translation keys from public/lang/*.json that no code references any more.
// Usage: node scripts/pruneTranslations.js [--dry-run]
// Conservative on purpose: a key is only removed when the exact text "group.key" appears nowhere in the code.

const fs = require("fs")
const path = require("path")

const ROOT = path.join(__dirname, "..")
const LANG_DIR = path.join(ROOT, "public", "lang")
const SOURCE_DIRS = ["src", "scripts", "config"]
const EXTENSIONS = [".ts", ".svelte", ".js", ".mjs"]
const SKIP_DIRS = ["node_modules", "build", "public"]
const THIS_FILE = path.resolve(__filename)
const DRY_RUN = process.argv.includes("--dry-run")

// keys that are dead regardless of the code scan (features that were removed)
const REMOVED_ACTIONS = [
    "start_metronome", "clear_drawing", "change_draw_zoom", "transpose_show_up", "transpose_show_down",
    "start_scripture", "scripture_next", "scripture_previous", "start_playlist", "name_start_playlist",
    "playlist_next", "get_playlists", "get_playlist", "spotify_play", "spotify_pause", "spotify_fade_out",
    "spotify_next", "spotify_previous",
]
function isForcedDead(group, key) {
    if (group === "actions" && REMOVED_ACTIONS.includes(key)) return true
    if (group === "create_show" && (key === "quick_lyrics" || key === "quick_lyrics_tip" || key.startsWith("quick_lyrics_example_"))) return true
    return false
}

function collectFiles(dir, out) {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (!SKIP_DIRS.includes(entry.name)) collectFiles(path.join(dir, entry.name), out)
        } else if (EXTENSIONS.includes(path.extname(entry.name)) && path.resolve(dir, entry.name) !== THIS_FILE) {
            out.push(path.join(dir, entry.name))
        }
    }
}

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, "utf8"))
}

const files = []
SOURCE_DIRS.forEach((d) => collectFiles(path.join(ROOT, d), files))
const blob = files.map((f) => fs.readFileSync(f, "utf8")).join("\n")

function isDynamicGroup(group) {
    return [`\`${group}.\${`, `${group}." +`, `${group}.' +`, `\`${group}.\``, `${group} + "."`].some((p) => blob.includes(p))
}

const en = readJson(path.join(LANG_DIR, "en.json"))
const dead = new Set()
const dynamicGroups = []
let keysBefore = 0

for (const [group, keys] of Object.entries(en)) {
    const dynamic = isDynamicGroup(group)
    if (dynamic) dynamicGroups.push(group)
    for (const key of Object.keys(keys)) {
        keysBefore++
        const id = group + "." + key
        if (isForcedDead(group, key) || (!dynamic && !blob.includes(id))) dead.add(id)
    }
}

const langFiles = fs.readdirSync(LANG_DIR).filter((f) => f.endsWith(".json")).sort()
const perFile = {}
const removedGroups = []

for (const file of langFiles) {
    const full = path.join(LANG_DIR, file)
    const data = readJson(full)
    let count = 0
    for (const id of dead) {
        const dot = id.indexOf(".")
        const group = id.slice(0, dot)
        const key = id.slice(dot + 1)
        if (data[group] && Object.prototype.hasOwnProperty.call(data[group], key)) {
            delete data[group][key]
            count++
        }
    }
    for (const group of Object.keys(data)) {
        if (data[group] && typeof data[group] === "object" && Object.keys(data[group]).length === 0) {
            delete data[group]
            if (file === "en.json") removedGroups.push(group)
        }
    }
    perFile[file] = count
    if (count > 0 && !DRY_RUN) fs.writeFileSync(full, JSON.stringify(data, null, 4) + "\n")
}

console.log(`${DRY_RUN ? "[dry run] " : ""}scanned ${files.length} source files`)
console.log(`keys before: ${keysBefore}, after: ${keysBefore - dead.size}, dead: ${dead.size}`)
console.log(`dynamic groups kept whole: ${dynamicGroups.join(", ")}`)
console.log(`groups removed: ${removedGroups.join(", ") || "none"}`)
console.log("per-file deletions:")
for (const [file, count] of Object.entries(perFile)) console.log(`  ${file}: ${count}`)
