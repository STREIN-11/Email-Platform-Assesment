import { NextRequest, NextResponse } from "next/server";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (!files.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const attachments = [];

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type not allowed. Allowed: PDF, CSV, JPEG, PNG, GIF, WEBP` },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File ${file.name} exceeds 10MB limit` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    attachments.push({
      filename: file.name,
      content: buffer.toString("base64"),
      contentType: file.type,
    });
  }

  return NextResponse.json({ attachments });
}
