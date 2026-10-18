import { get } from "svelte/store"
import { STAGE } from "../../../types/Channels"
import { activeTimers, timers } from "../../stores"
import { isMainWindow } from "../../utils/common"
import { send } from "../../utils/request"
import { customActionActivation } from "../actions/actions"
import { sortByClosestMatch } from "../actions/apiHelper"
import { getCurrentTimerValue, getTimerDynamicValue, playPauseGlobal } from "../drawer/timers/timers"
import { getDynamicValue } from "../edit/scripts/itemHelpers"
import { clone, keysToID } from "./array"
import { checkNextAfterMedia } from "./showActions"

const INTERVAL = 1000

let timeout: NodeJS.Timeout | null = null
let customInterval = INTERVAL
export function startTimer() {
    if (!isMainWindow()) return
    // if (!get(activeTimers).length || timeout) return
    if (!get(activeTimers).filter((a) => a.paused !== true).length || timeout) return

    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
        activeTimers.update((timers) => clone(timers).map(increment))

        // send(OUTPUT, ["ACTIVE_TIMERS"], get(activeTimers))
        send(STAGE, ["ACTIVE_TIMERS"], get(activeTimers))

        timeout = null
        startTimer()
    }, customInterval)
}

export function startTimerByName(name: string) {
    if (name.includes("{")) name = getDynamicValue(name)
    const timersList = sortByClosestMatch(keysToID(get(timers)), name)
    const timerId = timersList[0]?.id
    if (!timerId) return

    startTimerById(timerId)
}

export function startTimerById(id: string) {
    const timer = get(timers)[id]
    if (!timer) return

    playPauseGlobal(id, timer, true)
}

export function stopTimers() {
    // timeout so timer_end action don't clear at the same time as next timer tick starts
    setTimeout(() => {
        activeTimers.set([])
        customInterval = INTERVAL
    }, 50)
}

function increment(timer: { id: string; start: number; end: number; [key: string]: any }, i: number) {
    if (timer.paused) {
        // has ended
        // if (timer.currentTime === timer.end && !timer.overflow) {
        //     // stop timers that have ended and is not outputted
        //     if (!isTimerOutputted(timer.id)) stopTimerById(timer.id)
        // }

        return timer
    }

    const startTime = timer.startDynamic !== undefined ? (getTimerDynamicValue(timer.startDynamic) ?? 0) : timer.start || 0
    const endTime = timer.endDynamic !== undefined ? (getTimerDynamicValue(timer.endDynamic) ?? 0) : timer.end || 0

    if (startTime < endTime ? timer.currentTime >= endTime && timer.currentTime < endTime + 1 : timer.currentTime <= endTime && timer.currentTime > endTime - 1) {
        if (!timer.overflow) timer.paused = true

        // ended
        checkNextAfterMedia(timer.id, "timer")
        customActionActivation("timer_end", timer.id)
    }

    if (timer.currentTime === endTime && !timer.overflow) return timer

    const currentTime = Date.now()
    // store timer start time (for accuracy)
    if (!timer.startTime) {
        const timerIs = timer.currentTime - startTime
        const timerStartShouldBe = timerIs * 1000 // - 1
        if (startTime < endTime) timer.startTime = currentTime - timerStartShouldBe
        else timer.startTime = currentTime + timerStartShouldBe
    }

    const difference = currentTime - timer.startTime
    const timerShouldBe = Math.floor(difference / 1000) + 1

    // prevent interval time increasing more and more
    if (i === 0) {
        const preciseTime = (timerShouldBe - 1) * 1000
        const differenceMs = difference - preciseTime
        customInterval = Math.max(500, INTERVAL - differenceMs)
    }

    if (startTime < endTime) timer.currentTime = startTime + timerShouldBe
    else timer.currentTime = startTime - timerShouldBe

    return timer
}

// auto stop any timer that is no longer in use
// function isTimerOutputted(timerId: string) {
//     const outputs = getAllActiveOutputs()
//     const outputSlideHasTimer =
//         outputs.some((output) => {
//             const outSlide = output.out?.slide
//             const outShow = get(showsCache)[outSlide?.id || ""]
//             if (!outShow) return false

//             const ref = getLayoutRef(outSlide?.id)
//             const slide = outShow.slides[ref[outSlide?.index ?? -1]?.id]
//             if (!slide) return false

//             const hasTimer = slide.items.some((item) => item.type === "timer" && item.timerId === timerId)
//             return hasTimer
//         })
//     if (outputSlideHasTimer) return true

//     // check stage

//     // might be in use by a dynamic value?

//     return false
// }

// TOWARDS A TIME/EVENT

let timerCheckTimeout: NodeJS.Timeout | null = null
export function checkTimers() {
    if (timerCheckTimeout) clearTimeout(timerCheckTimeout)

    Object.entries(get(timers)).forEach(([id, timer]) => {
        if (timer.type === "counter") return

        const time = getCurrentTimerValue({ ...timer, overflow: true }, {}, new Date())

        if (time < 0 && time >= -1) {
            checkNextAfterMedia(id, "timer")
            customActionActivation("timer_end", id)
        }
    })

    timerCheckTimeout = setTimeout(() => {
        timerCheckTimeout = null
        checkTimers()
    }, 1000)
}
