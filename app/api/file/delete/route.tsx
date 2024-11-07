import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import {sqliteDB, DELETE_NODE } from '@/app/api/db';

export async function POST(request: NextRequest) {
    const data = await request.json();
    const filePath = data.filePath;
    const fileName = filePath.split("/").pop();
    const sessionId = data.sessionId;

    console.log("Deleting file:", filePath);

    // 删除文件
    fs.unlinkSync(filePath);

    // 删除db中的记录
    const dbClient = sqliteDB();
    const stmt = dbClient.prepare(DELETE_NODE);
    stmt.run([sessionId, fileName]);
    console.log("Deleted file from db:", fileName);

    return NextResponse.json({ success: true });
}