// ----- Meeting Control Center -----
// The operator preview publishes which document unit it is showing, so that starting that document on the output
// (global next/previous shortcut) begins at the previewed unit instead of the first one.

import { writable } from "svelte/store"

export interface DocumentPreviewState {
    path: string
    unit: number
}

export const documentPreviewState = writable<DocumentPreviewState | null>(null)
