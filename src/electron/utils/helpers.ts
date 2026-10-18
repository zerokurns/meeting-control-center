// clone objects
export function clone<T>(object: T): T {
    if (object === null || typeof object !== "object") return object

    try {
        return structuredClone(object)
    } catch {
        try {
            return JSON.parse(JSON.stringify(object))
        } catch {
            return object
        }
    }
}

// a few keys might not be placed in the same order in JS object vs store file
export function checkIfMatching(a: any, b: any): boolean {
    try {
        if (!a || !b || typeof a !== "object" || typeof b !== "object") return false
        return JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort())
    } catch (err) {
        console.warn("Failed to compare store data:", err)
        return false
    }
}

// async wait (instead of timeouts)
export function wait(ms: number) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve("ended")
        }, Number(ms))
    })
}

// wait until input value is true
export function waitUntilValueIsDefined(value: () => any, intervalTime = 50, timeoutValue = 5000) {
    return new Promise((resolve) => {
        let currentValue = value()
        if (currentValue) resolve(currentValue)

        const timeout = setTimeout(() => {
            exit()
            resolve(null)
        }, timeoutValue)

        const interval = setInterval(() => {
            currentValue = value()
            if (!currentValue) return

            exit()
            resolve(currentValue)
        }, intervalTime)

        function exit() {
            clearTimeout(timeout)
            clearInterval(interval)
        }
    })
}
