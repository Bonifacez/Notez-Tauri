import { create } from "zustand";
import { persist } from "zustand/middleware";

interface EmbData {
    id: string;
    text: string;
    embedding: string;
}

interface ITextEmbStatue {
    [sessionId: string]: {
        total: number;
        finished: number;
    };
}
interface LLMUrlConfig {
    url: string;
    apiKey: string;
    model: string;
    embUrl: string;
    embApiKey: string;
    embModel: string;
}

function LLMUrlConfigInit(): LLMUrlConfig {
    return {
        url: "http://localhost:11434/v1",
        apiKey: "ollama",
        model: "llama3.1:8b",
        embUrl: "http://localhost:11434/v1",
        embApiKey: "ollama",
        embModel: "mxbai-embed-large:latest",
    };
}

interface RagStore {
    textEmbStatue: ITextEmbStatue;
    setTextEmbStatue: (
        sessionId: string,
        status: { total: number; finished: number }
    ) => void;
    getTextEmbStatue: () => ITextEmbStatue;

    isCompleteWithEmb: boolean;
    setIsCompleteWithEmb: (isComplete: boolean) => void;
    getIsCompleteWithEmb: () => boolean;
    llmConfig: LLMUrlConfig;
    setLlmConfig: (config: LLMUrlConfig) => void;
    getLlmConfig: () => LLMUrlConfig;
    resetConfig: () => void;
}

const useRagStore = create<RagStore>()(
    persist(
        (set, get) => ({
            textEmbStatue: {},
            llmConfig: LLMUrlConfigInit(),
            setLlmConfig: (config) => {
                set({ llmConfig: config });
            },
            getLlmConfig: () => get().llmConfig,
            resetConfig: () => {
                set({
                    llmConfig: LLMUrlConfigInit(),
                });
            },
            setTextEmbStatue: (
                sessionId: string,
                status: { total: number; finished: number }
            ) => {
                set((state) => {
                    const newTextEmbStatue = { ...state.textEmbStatue };
                    newTextEmbStatue[sessionId] = status;
                    return { textEmbStatue: newTextEmbStatue };
                });
            },
            getTextEmbStatue: () => get().textEmbStatue,
            isCompleteWithEmb: true,
            setIsCompleteWithEmb: (isComplete: boolean) => {
                set({ isCompleteWithEmb: isComplete });
            },
            getIsCompleteWithEmb: () => get().isCompleteWithEmb,
        }),
        {
            name: "ragStore",
        }
    )
);

export default useRagStore;

export { LLMUrlConfigInit };

export type { EmbData, LLMUrlConfig };
