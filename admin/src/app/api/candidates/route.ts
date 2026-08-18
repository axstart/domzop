import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured, listCandidates } from "@/lib/db";
import { filterDemoCandidates } from "@/lib/demo-domains";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  try {
    if (isDatabaseConfigured()) {
      try {
        const candidates = await listCandidates(status as Parameters<typeof listCandidates>[0]);
        if (candidates.length) {
          return NextResponse.json({ candidates, source: "db" });
        }
      } catch (error) {
        console.error(error);
      }
    }
    return NextResponse.json({
      candidates: filterDemoCandidates(status),
      source: "demo",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch candidates" }, { status: 500 });
  }
}
