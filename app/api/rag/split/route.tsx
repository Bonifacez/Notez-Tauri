import { NextRequest, NextResponse } from "next/server";
import {
    Document,
    VectorStoreIndex,
    SummaryIndex,
    SentenceSplitter,
    Settings,
    Ollama,
    OllamaEmbedding,
    QueryEngineTool,
    RouterQueryEngine,
    LLMSingleSelector,
    TextNode,
} from "llamaindex";
import { SimpleDirectoryReader } from "llamaindex/readers/SimpleDirectoryReader";
import {
    sqliteDB,
    INSERT_NODE,
    SELECT_FILE_NAME_DUPLICATES,
} from "@/app/api/db";

export async function POST(request: NextRequest) {
    const dbClient = sqliteDB();
    const data = await request.json();
    const fileDir = data.fileDir;
    const sessionId = data.sessionId;

    const reader = new SimpleDirectoryReader();
    const document = await reader.loadData({
        directoryPath: fileDir,
    });
    const splitter = new SentenceSplitter({ chunkSize: 512 });
    const nodes = splitter.getNodesFromDocuments(document);
    // console.log("nodes:", nodes);
    console.log("nodes parsed");

    const insertedFileName = dbClient.prepare(SELECT_FILE_NAME_DUPLICATES);
    const fileNames = insertedFileName.all([sessionId]);

    // nodes 写入数据库
    const stmt = dbClient.prepare(INSERT_NODE);
    for (const node of nodes) {
        if (
            fileNames.some(
                (file: any) => file.fileName === node.metadata.file_name
            )
        ) {
            // console.log("continue", node.metadata.file_name);
            continue;
        }
        stmt.run([
            node.id_,
            sessionId,
            JSON.stringify(node.metadata),
            node.metadata.file_name,
            JSON.stringify(node.excludedEmbedMetadataKeys),
            JSON.stringify(node.excludedLlmMetadataKeys),
            JSON.stringify(node.relationships),
            JSON.stringify(node.embedding),
            node.text,
            node.textTemplate,
            node.metadataSeparator,
            node.startCharIdx,
            node.endCharIdx,
        ]);
    }
    dbClient.close();
    console.log("nodes inserted");

    return NextResponse.json({ success: true, message: "Hello World!" });
}
