import { NextResponse, NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
    const data = await request.formData();
    const files = data.getAll("files") as File[];
    const sessionId = data.get("sessionId") as string;

    if (!files.length) {
        return NextResponse.json({
            success: false,
            message: "Please choose any file.",
        });
    }

    if (!sessionId) {
        return NextResponse.json({
            success: false,
            message: "Session ID is required.",
        });
    }

    const sessionDir = path.join(process.cwd(), "files", "uploads", sessionId);

    try {
        // Create the session directory if it doesn't exist
        await mkdir(sessionDir, { recursive: true });

        const uploadResults = await Promise.all(
            files.map(async (file) => {
                const bytes = await file.arrayBuffer();
                const buffer = Buffer.from(bytes);

                const filePath = path.join(sessionDir, file.name);
                await writeFile(filePath, buffer);

                return { name: file.name, size: file.size };
            })
        );

        return NextResponse.json({ success: true, files: uploadResults });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({
            success: false,
            message: "An error occurred during upload.",
        });
    }
}
