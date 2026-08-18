import { NextRequest, NextResponse } from "next/server";
import { isAuthorized, unauthorized } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { getIntelligence } from "@/lib/intelligence";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
    }
    const refresh = request.nextUrl.searchParams.get("refresh") === "1";
    const data = await getIntelligence(params.id, refresh);
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load intelligence" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isAuthorized(request)) return unauthorized();
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
    }
    const data = await getIntelligence(params.id, true);
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to recompute intelligence" }, { status: 500 });
  }
}
