import OpenAI from "openai";

const openaiClient = new OpenAI({
    baseURL: "http://localhost:11434/v1",
    apiKey: "ollama",
    timeout: 10000,
});


const embModel = "mxbai-embed-large:latest";

export { openaiClient, embModel };
