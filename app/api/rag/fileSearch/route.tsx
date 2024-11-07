import { NextRequest, NextResponse } from "next/server";
import { SELECT_VEC, sqliteDB, sqliteVEC } from "@/app/api/db";
import { embModel, openaiClient } from "@/app/api/embs";

export async function POST(request: NextRequest) {
    const data = await request.json();
    const sessionId = data.sessionId;
    const text = data.text;
    console.log("/api/rag/fileSearch", sessionId);

    const dbVEC = sqliteVEC();
    const dbClient = sqliteDB();

    const postEmbRes = await openaiClient.embeddings.create({
        model: embModel,
        input: text,
    });
    const postEmb = new Float32Array(postEmbRes.data[0].embedding);

    const vecLikeId = `%${sessionId}%`;
    const queryRes = dbVEC.prepare(SELECT_VEC).all([postEmb, vecLikeId]);
    const queryResWithCleanId = queryRes.map((item: any) => {
        return {
            id: item.id.split("_vec_")[0],
            distance: item.distance,
        };
    });
    // console.log("queryResWithCleanId", queryResWithCleanId);

    const ids = queryResWithCleanId.map((item: any) => item.id);
    // console.log("ids", ids);
    const placeholders = ids.map(() => '?').join(',');
    const SELECT_IDs = `SELECT id, text_ FROM nodes WHERE id IN (${placeholders});`;
    const queryText = dbClient.prepare(SELECT_IDs).all(ids);

    // console.log("queryText", queryText);
    const searchRes = queryText.map((item: any) => {
        return {
            id: item.id,
            text: item.text_,
            distance: queryResWithCleanId.find((resItem: any) => resItem.id === item.id)!.distance,
        };
    }).sort((a: any, b: any) => a.distance - b.distance);
    // console.log("searchRes", searchRes);
    const searchList = searchRes.map((item: any) => item.text);
    console.log("searchList", searchList.length);

    const responseData = {
        searchList,
    };

    return new NextResponse(JSON.stringify(responseData), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
        },
    });
}
