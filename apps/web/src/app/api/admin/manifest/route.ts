import { NextResponse } from "next/server";
import { buildEditorManifest } from "@/lib/admin-editor";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  const session = request.headers.get("cookie") || "";
  if (!session.includes("xps_session=1") || !session.includes("xps_role=admin")) {
    return unauthorized();
  }

  try {
    const manifest = await buildEditorManifest();
    return NextResponse.json(manifest);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
