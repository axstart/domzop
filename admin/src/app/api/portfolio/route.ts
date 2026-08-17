import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  createAsset,
  getPortfolioSummary,
  listAssets,
  type AssetStatus,
  type AssetType,
} from "@/lib/portfolio";

function checkAuth(request: NextRequest): boolean {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) return true;
  return request.headers.get("x-admin-secret") === secret;
}

export async function GET(request: NextRequest) {
  try {
    const assetType = request.nextUrl.searchParams.get("asset_type") as AssetType | null;
    const status = request.nextUrl.searchParams.get("status") as AssetStatus | null;
    const [assets, summary] = await Promise.all([
      listAssets({
        asset_type: assetType || undefined,
        status: status || undefined,
      }),
      getPortfolioSummary(),
    ]);
    return NextResponse.json({ assets, summary });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch portfolio" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }
  try {
    const body = await request.json();
    const asset = await createAsset(body);
    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    console.error(error);
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code === "23505") {
      return NextResponse.json({ error: "A holding with this domain already exists" }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Failed to create holding";
    const status = message.includes("required") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
