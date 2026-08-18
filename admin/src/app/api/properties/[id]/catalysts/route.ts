import { NextRequest, NextResponse } from "next/server";
import { isAuthorized, unauthorized } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { createCatalyst, listCatalysts } from "@/lib/intelligence";
import { getAsset } from "@/lib/portfolio";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const asset = await getAsset(params.id);
    if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const catalysts = await listCatalysts(params.id);
    return NextResponse.json({ catalysts });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to list catalysts" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isAuthorized(request)) return unauthorized();
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }
  try {
    const asset = await getAsset(params.id);
    if (!asset || asset.asset_type !== "real_estate") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const catalyst = await createCatalyst(params.id, body);
    return NextResponse.json({ catalyst }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to add catalyst" }, { status: 500 });
  }
}
