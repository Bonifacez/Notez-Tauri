import { BASE_URL } from "@/app/config";
import { LLMUrlConfig } from "@/store/ragStore";

const llmUrlDict = {
    base: `${BASE_URL}/api/llm/base`,
};

type Message = {
    role: "user" | "assistant" | "system";
    date: string;
    streaming?: boolean;
    content: string;
};

const makeRequestParam = (
    messages: Message[],
    options?: {
        filterBot?: boolean;
        stream?: boolean;
        aiSearch: string[]; // Add the 'aiSearch' property
        llmUrlConfig: LLMUrlConfig;
    }
) => {
    let sendMessages = messages.map((v) => ({
        role: v.role,
        content: v.content,
    }));

    if (options?.filterBot) {
        sendMessages = sendMessages.filter((m) => m.role !== "assistant");
    }
    return {
        messages: sendMessages,
        stream: options?.stream,
        aiSearch: options?.aiSearch,
        llmUrlConfig: options?.llmUrlConfig,
    };
};

async function AsyncFetchLlmStreamNextWeb(
    messages: Message[],
    config: LLMUrlConfig,
    options?: {
        filterBot?: boolean;
        model?: string;
        aiSearch?: string[];
        onAccMessage?: (message: string, done: boolean) => void;
        onAloneMessage?: (message: string, done: boolean) => void;
        onError: (error: Error) => void;
    }
) {
    const req = makeRequestParam(messages, {
        stream: true,
        filterBot: options?.filterBot,
        aiSearch: options?.aiSearch || [],
        llmUrlConfig: config,
    });

    let llmUrl = llmUrlDict["base"];
    const TIME_OUT_MS = 30000;

    const controller = new AbortController();
    const reqTimeoutId = setTimeout(() => controller.abort(), TIME_OUT_MS);
    const res = await fetch(llmUrl, {
        method: "POST",
        mode: "cors",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(req),
        signal: controller.signal,
    });

    clearTimeout(reqTimeoutId);

    let responseText = "";

    const finish = () => {
        if (options?.onAccMessage) {
            options.onAccMessage(responseText, true);
        }
        controller.abort();
    };
    const timeGap = 60;
    try {
        if (res.ok) {
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const resTimeoutId = setTimeout(() => finish(), TIME_OUT_MS);
                const content = await reader?.read();
                clearTimeout(resTimeoutId);
                const text = decoder.decode(content?.value, { stream: true });
                const done = !content || content.done;

                if (options?.onAloneMessage) {
                    options.onAloneMessage(text, done);
                    // 暂停ms，等待渲染
                    await new Promise((resolve) =>
                        setTimeout(resolve, timeGap)
                    );
                }

                responseText += text;
                if (options?.onAccMessage) {
                    options.onAccMessage(responseText, false);
                    await new Promise((resolve) =>
                        setTimeout(resolve, timeGap)
                    );
                }

                if (done) {
                    break;
                }
            }
            finish();
        } else {
            console.error("Stream Error");
            options?.onError(new Error("Stream Error"));
        }
    } catch (err) {
        console.error("NetWork Error", err);
        options?.onError(new Error("NetWork Error"));
    }
}

export { AsyncFetchLlmStreamNextWeb };

export type { Message };
