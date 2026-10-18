// ----- Meeting Control Center -----
// Content Provider Helper Functions
// Handles access and settings for external content providers like Canva.

import type { ContentProviderId } from "../contentProviders/base/types"
import { _store } from "./store"

// ----- CONTENT PROVIDER HELPERS -----

export function getContentProviderAccess(providerId: ContentProviderId, scope: string) {
    const contentProviders = _store.ACCESS?.get("contentProviders") || {}
    const providerData = contentProviders[providerId] || {}

    return providerData[scope] || null
}

export function setContentProviderAccess(providerId: ContentProviderId, scope: string, data: any) {
    const contentProviders = _store.ACCESS?.get("contentProviders") || {}
    if (!contentProviders[providerId]) contentProviders[providerId] = {}
    contentProviders[providerId][scope] = data

    _store.ACCESS?.set("contentProviders", contentProviders)
}
