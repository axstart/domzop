import { NextRequest, NextResponse } from "next/server";

export function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) return true;
  return request.headers.get("x-admin-secret") === secret;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
