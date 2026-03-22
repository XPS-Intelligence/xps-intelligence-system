import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPrefixes = [
  "/dashboard",
  "/leads",
  "/ai-assistant",
  "/crm",
  "/research",
  "/scraper",
  "/analytics",
  "/outreach",
  "/proposals",
  "/knowledge",
  "/competition",
  "/intelligence",
  "/connectors",
  "/admin",
  "/manager",
  "/owner",
  "/settings",
  "/sales-staff",
  "/sales-flow",
];

const roleRoutes: Record<string, Array<"employee" | "manager" | "owner" | "admin">> = {
  "/admin": ["admin"],
  "/manager": ["manager", "owner", "admin"],
  "/owner": ["owner", "admin"],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.get("xps_session")?.value === "1";
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = (request.cookies.get("xps_role")?.value || "employee") as "employee" | "manager" | "owner" | "admin";
  const roleGate = Object.entries(roleRoutes).find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (roleGate && !roleGate[1].includes(role)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
