import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { listAvailableProperties } from "@/lib/intelligence";

export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ properties: [] });
    }
    const includeOwned = request.nextUrl.searchParams.get("include_owned") === "1";
    const status = request.nextUrl.searchParams.get("status") ?? undefined;
    const properties = await listAvailableProperties({ includeOwned, status });
    return NextResponse.json({ properties });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to list properties" }, { status: 500 });
  }
}
