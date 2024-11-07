import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// 测试接口
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url, apiKey, model, embUrl, embApiKey, embModel } = body;
        console.log('api llm', body);

        if (!url || !apiKey || !model || !embModel) {
            return new NextResponse(JSON.stringify({ error: '缺少必要参数' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const openaiClient = new OpenAI({
            baseURL: url,
            apiKey: apiKey,
        });

        // 测试chat
        let chatSuccess = false;
        let chatError = null;
        try {
            const chatResponse = await openaiClient.chat.completions.create({
                model: model,
                messages: [
                    {
                        role: "user",
                        content: "This is a test, please respond「SUCCESS」, only 「SUCCESS」",
                    },
                ],
                max_tokens: 100,
            });
            chatSuccess = chatResponse.choices[0]?.message?.content?.trim() === 'SUCCESS';
        } catch (error) {
            chatError = (error as Error).message;
        }

        // 测试emb
        const embClient = new OpenAI({
            baseURL: embUrl,
            apiKey: embApiKey,
        });
        let embSuccess = false;
        let embError = null;
        try {
            const embResponse = await embClient.embeddings.create({
                model: embModel,
                input: ["Hello, world"],
            });
            embSuccess = embResponse.data && embResponse.data.length > 0;
        } catch (error) {
            embError = (error as Error).message;
        }

        const responseData = {
            chatModel: {
                success: chatSuccess,
                error: chatError,
            },
            embModel: {
                success: embSuccess,
                error: embError,
            },
        };

        return new NextResponse(JSON.stringify(responseData), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error) {
        return new NextResponse(JSON.stringify({ error: '服务器内部错误' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}