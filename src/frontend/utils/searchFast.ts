import { get } from "svelte/store"
import { ShowList } from "../../types/Show"
import { textCache } from "../stores"
import { formatSearch, tokenize } from "./search"

// https://github.com/ChurchApps/FreeShow/pull/2790

// ==========================================
// INVERTED INDEX FOR O(1) WORD LOOKUPS
// ==========================================

interface IndexEntry {
    showId: string
    field: "name" | "content"
    frequency: number // How many times word appears
}

interface SearchIndex {
    wordIndex: Map<string, IndexEntry[]> // word -> [showId, field, freq]
    phraseIndex: Map<string, Set<string>> // 2-gram phrase -> Set<showId>
    showData: Map<string, { name: string; content: string }>
    lastBuildTime: number
}

let searchIndex: SearchIndex | null = null
let indexVersion = 0

/**
 * Build/rebuild the search index from shows and textCache
 * Call this when shows or textCache changes
 */
export function buildSearchIndex(shows: ShowList[]) {
    const wordIndex = new Map<string, IndexEntry[]>()
    const phraseIndex = new Map<string, Set<string>>()
    const showData = new Map<string, { name: string; content: string }>()
    const cache = get(textCache)

    for (const show of shows) {
        if (!show.id) continue

        const name = formatSearch(show.name || "", false)
        const content = formatSearch(cache[show.id] || "", false)
        showData.set(show.id, { name, content })

        // Index name words
        const nameWords = tokenize(name)
        indexWords(wordIndex, show.id, nameWords, "name")
        indexPhrases(phraseIndex, show.id, nameWords)

        // Index content words
        const contentWords = tokenize(content)
        indexWords(wordIndex, show.id, contentWords, "content")
        indexPhrases(phraseIndex, show.id, contentWords)
    }

    searchIndex = {
        wordIndex,
        phraseIndex,
        showData,
        lastBuildTime: Date.now()
    }
    indexVersion++

    return searchIndex
}

function indexWords(index: Map<string, IndexEntry[]>, showId: string, words: string[], field: "name" | "content") {
    const wordFreq = new Map<string, number>()
    for (const word of words) {
        if (word.length < 2) continue // Skip very short words
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
    }

    for (const [word, freq] of wordFreq) {
        if (!index.has(word)) {
            index.set(word, [])
        }
        index.get(word)!.push({ showId, field, frequency: freq })
    }
}

function indexPhrases(index: Map<string, Set<string>>, showId: string, words: string[]) {
    // Index n-grams (2 to 5 words) for phrase matching
    for (let i = 0; i < words.length - 1; i++) {
        let phrase = words[i]
        for (let size = 2; size <= 5; size++) {
            if (i + size - 1 < words.length) {
                phrase += " " + words[i + size - 1]
                if (!index.has(phrase)) index.set(phrase, new Set())
                index.get(phrase)!.add(showId)
            } else {
                break
            }
        }
    }
}

/**
 * Generate all search terms from query words
 * For "valley of dry bones" generates:
 * - Full phrase: "valley of dry bones" (weight: 1.0)
 * - Subphrases: "valley of dry", "of dry bones", "valley of", "dry bones" (weight: 0.8)
 * - Individual words: "valley", "dry", "bones" (weight: 0.5), skip "of" (too short)
 */
function generateSearchTerms(words: string[], minWordLength = 3): { term: string; weight: number; isPhrase: boolean }[] {
    const terms: { term: string; weight: number; isPhrase: boolean }[] = []
    const n = words.length

    if (n === 0) return terms

    // Full phrase (highest weight)
    if (n >= 2) {
        terms.push({ term: words.join(" "), weight: 1.0, isPhrase: true })
    }

    // Contiguous subphrases (sliding window)
    for (let windowSize = Math.min(n - 1, 5); windowSize >= 2; windowSize--) {
        for (let i = 0; i <= n - windowSize; i++) {
            const subphrase = words.slice(i, i + windowSize).join(" ")
            // Weight decreases as subphrase gets shorter
            const weight = 0.6 + (windowSize / n) * 0.2
            terms.push({ term: subphrase, weight, isPhrase: true })
        }
    }

    // Individual words (filter out very short ones)
    for (const word of words) {
        if (word.length >= minWordLength) {
            terms.push({ term: word, weight: 0.5, isPhrase: false })
        }
    }

    return terms
}

// invalidate search index when text cache changes
export function invalidateSearchIndex() {
    searchIndex = null
}
