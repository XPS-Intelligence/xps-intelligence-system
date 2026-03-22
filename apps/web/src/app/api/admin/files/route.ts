import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listEditableFiles } from "@/lib/admin-editor";

export async function GET() {
  const cookieStore = await cookies();
  if (cookieStore.get("xps_session")?.value !== "1" || cookieStore.get("xps_role")?.value !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const items = await listEditableFiles();
  return NextResponse.json({ items });
}
