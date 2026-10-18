export interface AudioChannelData {
    volume?: number
    isMuted?: boolean
    delay?: number // delay in ms
    fadeDuration?: number // fade duration in ms
    dB?: number
}

export interface AudioChannel {
    dB: {
        value: number
        min?: number
        max?: number
    }
}

export interface AudioStream {
    name: string
    value: string
}

