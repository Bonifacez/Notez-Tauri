import OpenAI from "openai";
import { createOpenAI } from "@ai-sdk/openai";


const LLM_CONFIG = {
    deepseek: {
        url: "https://api.deepseek.com",
        model: "deepseek-chat",
    },
    openai: {
        model: "gpt-4o-mini",
    },
    ollama: {
        url: "http://localhost:11434/v1",
        model: "llama3.1:8b",
    },
};

const LLM_Client = {
    deepseek: new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: LLM_CONFIG.deepseek.url,
    }),
    openai: new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    }),
    ollama: new OpenAI({
        apiKey: "ollama",
        baseURL: LLM_CONFIG.ollama.url,
    }),
};

const LLM_Client_AI = {
    deepseek: createOpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: LLM_CONFIG.deepseek.url,
    }),
    openai: createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    }),
    ollama: createOpenAI({
        apiKey: "ollama",
        baseURL: LLM_CONFIG.ollama.url,
    }),
};

type LLMModels = keyof typeof LLM_Client;
type LLMModelsAI = keyof typeof LLM_Client_AI;

interface LLMMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

async function LLMChat(model: LLMModels, messages: LLMMessage[]) {
    return LLM_Client[model].chat.completions.create({
        model: LLM_CONFIG[model].model,
        messages,
    });
}

// 暂时不用，有他妈现成的streamText
async function* LLMChatStream(model: LLMModels, messages: LLMMessage[]) {
    const stream = await LLM_Client[model].chat.completions.create({
        model: LLM_CONFIG[model].model,
        messages,
        stream: true,
    });
    for await (const chunk of stream) {
        yield chunk.choices[0]?.delta?.content || "";
    }
}

export { LLMChat, LLMChatStream };

export { LLM_CONFIG, LLM_Client, LLM_Client_AI };

export type { LLMModels, LLMMessage };
