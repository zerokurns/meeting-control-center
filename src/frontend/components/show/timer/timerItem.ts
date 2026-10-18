// ----- Meeting Control Center -----
// Agenda timer items: a project item `{ type: "timer", id: <timers store id>, data?: TimerItemData }`.

import type { TimerItemData } from "../../../agenda/agenda"
import { startTimerById } from "../../helpers/timerTick"

/** Called when an agenda item becomes the active one. Starts the referenced timer unless `data.autoStart === false`. */
export function activateTimerItem(ref: { id: string; type?: string; data?: TimerItemData } | undefined | null) {
    if (!ref || ref.type !== "timer") return
    if (ref.data?.autoStart === false) return

    startTimerById(ref.id)
}
