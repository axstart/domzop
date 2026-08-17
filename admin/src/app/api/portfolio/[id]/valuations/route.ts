import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { addValuation, getAsset } from "@/lib/portfolio";

function checkAuth(request: NextRequest): boolean {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) return true;
  return request.headers.get("x-admin-secret") === secret;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }
  try {
    const existing = await getAsset(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = await request.json();
    const value = Number(body.value);
    if (!Number.isFinite(value)) {
      return NextResponse.json({ error: "value is required" }, { status: 400 });
    }
    const valuation = await addValuation(params.id, {
      value,
      source: body.source,
      notes: body.notes,
      valued_at: body.valued_at,
    });
    return NextResponse.json({ valuation }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to add valuation" }, { status: 500 });
  }
}
