import { streamText } from "ai";
import { LLM_Client_AI, LLM_CONFIG, LLMMessage } from "../llms";
import PROMPTS from "@/app/api/prompts";

export default async function streamReturn({
    request,
    model,
    action,
}: {
    request: Request;
    model: string;
    action: keyof typeof PROMPTS;
}) {
    const body = await request.json();
    console.log("streamReturn body", body);
    const messages = body.messages as LLMMessage[];
    const aiSearch = body.aiSearch as string[];
    let prePrompt: LLMMessage[] = [
        { role: "system", content: PROMPTS[action] },
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

    console.log(`${model} - ${action} messages`, messagesWithPrompt);
    const result = await streamText({
        model: LLM_Client_AI[model as keyof typeof LLM_Client_AI](
            LLM_CONFIG[model as keyof typeof LLM_CONFIG].model
        ),
        messages: messagesWithPrompt,
    });

    return result;
}
