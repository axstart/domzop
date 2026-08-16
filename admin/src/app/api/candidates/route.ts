import { NextRequest, NextResponse } from "next/server";
import { listCandidates } from "@/lib/db";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  try {
    const candidates = await listCandidates(status as Parameters<typeof listCandidates>[0]);
    return NextResponse.json({ candidates });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch candidates" }, { status: 500 });
  }
}
