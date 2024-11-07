import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { sqliteDB, DELETE_NODE, DELETE_NODE_SESSION } from "@/app/api/db";
import path from "path";

function deleteFolderRecursive(folderPath: string) {
    if (fs.existsSync(folderPath)) {
        fs.readdirSync(folderPath).forEach((file, index) => {
            const curPath = path.join(folderPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                // 递归删除子文件夹
                deleteFolderRecursive(curPath);
            } else {
                // 删除文件
                fs.unlinkSync(curPath);
            }
        });
        // 删除空文件夹
        fs.rmdirSync(folderPath);
        console.log(`Deleted folder: ${folderPath}`);
    }
}

export async function POST(request: NextRequest) {
    const data = await request.json();
    const sessionId = data.sessionId;

    // 删除文件夹
    // fs.unlinkSync(`files/uploads/${sessionId}`);
    deleteFolderRecursive(`files/uploads/${sessionId}`);

    // 删除db中的记录
    const dbClient = sqliteDB();
    const stmt = dbClient.prepare(DELETE_NODE_SESSION);
    stmt.run([sessionId]);
    console.log("Deleted Session from db:", sessionId);

    return NextResponse.json({ success: true });
}
