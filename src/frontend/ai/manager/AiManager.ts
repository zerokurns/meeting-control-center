export class AiManager {
    // the transcript chunks had a single consumer (auto detection), which has been removed
    // the LLM match detection (llmManager.detectMatch) is left unused until another match type is implemented
    static async processSTTChunk(chunk: { chunkWithOverlap: string; newWordsCount: number; confidence?: number }) {
        void chunk
    }
}
