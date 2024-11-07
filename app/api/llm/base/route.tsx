import { NextRequest } from "next/server";
import { LLM_Client_AI, LLM_CONFIG, LLMMessage } from "@/app/api/llms";
import { LLMUrlConfig } from "@/store/ragStore";
import PROMPTS from "../../prompts";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { getCompleteClient } from "../../clients";

export async function POST(request: NextRequest) {
    const body = await request.json();
    // console.log("api llm base body", body);
    const messages = body.messages as LLMMessage[];
    const aiSearch = body.aiSearch as string[];
    const { url, apiKey, model, embUrl, embApiKey, embModel } =
        body.llmUrlConfig as LLMUrlConfig;
    // console.log("api llm base", body.llmUrlConfig);

    let prePrompt: LLMMessage[] = [
        { role: "system", content: PROMPTS["base"] },
    ];
    if (aiSearch.length > 0) {
        prePrompt = prePrompt.concat([
            {
                role: "system",
                content: PROMPTS["withAISearch"].replace(
                    "{{aiSearch}}",
                    aiSearch.join(" ||| ")
                ),
            },
        ]);
    }
    const messagesWithPrompt = prePrompt.concat(messages) as LLMMessage[];

    console.log(`${url} - ${model} - messages`);

    // const result = await streamText({
    //     model: LLM_Client_AI[model as keyof typeof LLM_Client_AI](
    //         LLM_CONFIG[model as keyof typeof LLM_CONFIG].model
    //     ),
    //     messages: messagesWithPrompt,
    // });
    type ConfigType = {
        apiKey: string;
        baseURL?: string;
    };

    const modelClient = getCompleteClient({
        newUrl: url,
        newApiKey: apiKey,
        newModel: model,
    });
    const result = await streamText({
        model: modelClient,
        messages: messagesWithPrompt,
    });

    return result.toTextStreamResponse();
}
