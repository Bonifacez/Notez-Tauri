import { createOpenAI } from "@ai-sdk/openai";
import OpenAI from "openai";

let url = "http://localhost:11434/v1";
let apiKey = "ollama";
let model = "llama3.1:8b";
let embUrl = "http://localhost:11434/v1";
let embApiKey = "ollama";
let embModel = "mxbai-embed-large:latest";

let completeClient = createOpenAI({
    apiKey: apiKey,
    baseURL: url,
})(model);

let embClient = new OpenAI({
    baseURL: embUrl,
    apiKey: embApiKey,
    timeout: 10000,
});

function getCompleteClient({
    newUrl,
    newApiKey,
    newModel,
}: {
    newUrl: string;
    newApiKey: string;
    newModel: string;
}) {
    console.log(
        "getCompleteClient",
        url,
        newUrl,
        apiKey,
        newApiKey,
        model,
        newModel
    );
    if (newUrl !== url || newApiKey !== apiKey || newModel !== model) {
        url = newUrl;
        apiKey = newApiKey;
        model = newModel;
        if (url === "OPENAI") {
            completeClient = createOpenAI({
                apiKey: apiKey,
            })(model);
        } else {
            completeClient = createOpenAI({
                apiKey: apiKey,
                baseURL: url,
            })(model);
        }
    }
    return completeClient;
}

function getEmbClient({
    newUrl,
    newApiKey,
    newModel,
}: {
    newUrl: string;
    newApiKey: string;
    newModel: string;
}) {
    // console.log(
    //     "getEmbClient",
    //     embUrl,
    //     newUrl,
    //     embApiKey,
    //     newApiKey,
    //     embModel,
    //     newModel
    // );
    if (newUrl !== embUrl || newApiKey !== embApiKey || newModel !== embModel) {
        embUrl = newUrl;
        embApiKey = newApiKey;
        embModel = newModel;
        if (embUrl === "OPENAI") {
            embClient = new OpenAI({
                apiKey: embApiKey,
                timeout: 10000,
            });
        } else {
            embClient = new OpenAI({
                baseURL: embUrl,
                apiKey: embApiKey,
                timeout: 10000,
            });
        }
    }
    return embClient;
}

export { getCompleteClient, getEmbClient };
