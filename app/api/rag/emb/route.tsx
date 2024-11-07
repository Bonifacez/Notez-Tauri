import { EmbData, LLMUrlConfig } from "@/store/ragStore";
import { NextRequest, NextResponse } from "next/server";
import {
    sqliteDB,
    SELECT_ID_TEXT,
    UPDATE_EMBEDDING,
    middlewareDB,
    SELECT_MIDDLEWARE_ID,
    INSERT_MIDDLEWARE,
    SELECT_MIDDLEWARE,
    sqliteVEC,
    INSET_VEC_EMBEDDING,
} from "@/app/api/db";
import OpenAI from "openai";
import { getEmbClient } from "../../clients";

interface embSessionData {
    sessionId: string;
    data: EmbData[];
}

let embStack: embSessionData[] = [];
let embeddingIng = false;

// generate embeddings for the text in the database
export async function POST(request: NextRequest) {
    const body = await request.json();
    const sessionId = body.sessionId;
    const { url, apiKey, model, embUrl, embApiKey, embModel } =
        body.llmUrlConfig as LLMUrlConfig;

    const dbClient = sqliteDB();
    const dbVEC = sqliteVEC();
    const middlewareDBClient = middlewareDB();
    const stmt = dbClient.prepare(SELECT_ID_TEXT);
    const dbData = stmt.all([sessionId]);
    const embData = dbData.map((item: any) => ({
        id: item.id,
        text: item.text_,
        embedding: item.embedding,
    }));

    // console.log("sessionId", sessionId);

    const lengthText = embData.length;
    let finished = embData.filter((item) => item.embedding).length;

    // 如果有embStack中，没有sessionId，就push进去
    const index = embStack.findIndex((item) => item.sessionId === sessionId);
    if (index === -1) {
        embStack.push({ sessionId: sessionId, data: embData });
    } else {
        embStack[index].data = embData;
    }
    // 从embStack中取出sessionId对应的数据，进行embedding
    const sessionData = embStack.find((item) => item.sessionId === sessionId);

    if (embeddingIng === true) {
        console.log("embeddingIng1", embeddingIng);
        return new NextResponse(
            JSON.stringify({ total: lengthText, finished }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    }

    // const openaiClient = new OpenAI({
    //     baseURL: embUrl,
    //     apiKey: embApiKey,
    //     timeout: 10000,
    // });
    const openaiClient = getEmbClient({
        newUrl: embUrl,
        newApiKey: embApiKey,
        newModel: embModel,
    });

    for (const item of sessionData?.data!) {
        if (item.embedding) {
            // console.log("embeddingIng3", embeddingIng);
            continue;
        }
        // console.log("embeddingIng2", embeddingIng);
        embeddingIng = true;
        const itemEmbeded = middlewareDBClient
            .prepare(SELECT_MIDDLEWARE_ID)
            .get([item.id]);
        // console.log("itemEmbeded", itemEmbeded);

        if (!itemEmbeded) {
            const text = item.text;
            // console.log("openaiClient running", sessionId, item.id);

            const res = await openaiClient.embeddings.create({
                model: embModel,
                input: [text],
            });

            const embeddings = res.data[0].embedding.slice(0, 1024);
            // 如果embedding的长度不够1024，就补0
            if (embeddings.length < 1024) {
                embeddings.push(...Array(1024 - embeddings.length).fill(0));
            }
            const stmt = dbClient.prepare(UPDATE_EMBEDDING);
            stmt.run([JSON.stringify(embeddings), item.id]);
            finished += 1;

            middlewareDBClient
                .prepare(INSERT_MIDDLEWARE)
                .run([item.id, "done"]);
            const dbEmbedding = new Float32Array(embeddings);
            const vecId = item.id + "_vec_" + sessionId;
            dbVEC.prepare(INSET_VEC_EMBEDDING).run([vecId, dbEmbedding]);
            console.log("openaiClient done", sessionId, item.id);
        }
    }
    embeddingIng = false;

    // 清空embStack中的sessionId对应的数据
    const newStack = embStack.filter((item) => item.sessionId !== sessionId);
    embStack = newStack;

    const responseData = {
        total: lengthText,
        finished: finished,
    };
    return new NextResponse(JSON.stringify(responseData), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
        },
    });
}
