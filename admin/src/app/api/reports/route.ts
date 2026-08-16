import { NextRequest, NextResponse } from "next/server";
import { getReport, listReports } from "@/lib/db";
import { enqueueReport } from "@/lib/redis";

function checkAuth(request: NextRequest): boolean {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) return true;
  return request.headers.get("x-admin-secret") === secret;
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  try {
    if (id) {
      const report = await getReport(id);
      if (!report) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ report });
    }
    const reports = await listReports();
    return NextResponse.json({ reports });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    await enqueueReport(body.investor_profile_id);
    return NextResponse.json({ queued: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to queue report" }, { status: 500 });
  }
}
