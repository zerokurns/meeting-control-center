import { get } from "svelte/store"
import type { Item, Template } from "../../types/Show"
import { getItemText } from "../components/edit/scripts/textStyle"
import { clone } from "../components/helpers/array"
import { templates } from "../stores"
import { runAction } from "../components/actions/actions"

const DEFAULT_TEMPLATE: Template = { name: "", color: null, category: null, items: [] }

export class TemplateHelper {
    template: Template

    constructor(templateId: string) {
        this.template = clone(get(templates)[templateId])
        if (!this.template) this.template = clone(DEFAULT_TEMPLATE)
    }

    getItems() {
        return clone(this.template?.items || [])
    }

    getPlainText() {
        return this.getItems().reduce((value, item) => (value += getItemText(item)), "")
    }

    getTextboxItems() {
        return this.getItems().filter((a) => {
            if (getItemText(a).includes("{")) return false
            return a.lines
        })
    }
    getNonTextboxItems() {
        return this.getItems().filter((a) => {
            if (getItemText(a).includes("{")) return true
            return !a.lines && a.type !== "text"
        })
    }

    getItemStyle() {
        const textbox = this.getTextboxItems()[0]
        return textbox?.style || ""
    }
    getTextStyle() {
        const textbox = this.getTextboxItems()[0]
        return textbox?.lines?.[0]?.text?.[0]?.style || ""
    }

    getSetting<K extends keyof NonNullable<Template["settings"]>>(key: K): NonNullable<Template["settings"]>[K] | undefined {
        return this.template.settings?.[key]
    }

    runActions() {
        const actions = this.template.settings?.actions || []
        actions.forEach((a) => runAction(a, { source: "template" }))
    }
}
