import { NextRequest, NextResponse } from "next/server";
import { getPool, isDatabaseConfigured } from "@/lib/db";
import { enqueuePurchase } from "@/lib/redis";

function authorize(request: NextRequest): boolean {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) return true;
  return request.headers.get("x-admin-secret") === secret;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  const body = await request.json();
  const action = body.action as string;

  if (action === "purchase") {
    const { rows } = await getPool().query(
      "SELECT com_domain FROM candidates WHERE id = $1",
      [params.id],
    );
    if (!rows.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await enqueuePurchase(params.id, rows[0].com_domain);
    return NextResponse.json({ queued: true });
  }

  if (action === "discard") {
    await getPool().query(
      `UPDATE candidates SET status = 'discarded', discard_reason = 'manual', discarded_at = NOW()
       WHERE id = $1`,
      [params.id],
    );
    return NextResponse.json({ discarded: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
