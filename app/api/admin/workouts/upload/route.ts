import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { requireAdmin } from "@/lib/auth";

const ALLOWED_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "image/gif",
];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "No file or empty file" },
        { status: 400 },
      );
    }
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(mp4|webm|mov|gif)$/i)) {
      return NextResponse.json(
        { error: "Only GIF or video (MP4, WebM, MOV) allowed" },
        { status: 400 },
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 50MB)" },
        { status: 400 },
      );
    }

    const ext = path.extname(file.name) || (file.type === "image/gif" ? ".gif" : ".mp4");
    const fileName = `workout-demo-${Date.now()}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "workouts");
    await fs.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const url = `/uploads/workouts/${fileName}`;
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 },
    );
  }
}
