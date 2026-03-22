import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readEditableFile, writeEditableFile } from "@/lib/admin-editor";

async function assertAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get("xps_session")?.value === "1" && cookieStore.get("xps_role")?.value === "admin";
}

export async function GET(request: NextRequest) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const relativePath = request.nextUrl.searchParams.get("path");
  if (!relativePath) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  const content = await readEditableFile(relativePath);
  return NextResponse.json({ path: relativePath, content });
}

export async function POST(request: NextRequest) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = (await request.json()) as { path?: string; content?: string };
  if (!body.path || typeof body.content !== "string") {
    return NextResponse.json({ error: "path and content are required" }, { status: 400 });
  }

  await writeEditableFile(body.path, body.content);
  return NextResponse.json({ status: "saved", path: body.path });
}
