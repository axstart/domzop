import { NextRequest, NextResponse } from "next/server";
import { getPool, isDatabaseConfigured } from "@/lib/db";
import { upsertDomainAssetFromCandidate } from "@/lib/portfolio";
import { enqueuePurchase, isRedisConfigured } from "@/lib/redis";

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

    await getPool().query(
      `UPDATE candidates
       SET status = 'purchased', purchased_at = COALESCE(purchased_at, NOW())
       WHERE id = $1`,
      [params.id],
    );

    let assetId: string | null = null;
    try {
      assetId = await upsertDomainAssetFromCandidate(params.id);
    } catch (error) {
      console.error("portfolio upsert skipped", error);
    }

    let queued = false;
    if (isRedisConfigured()) {
      try {
        await enqueuePurchase(params.id, rows[0].com_domain);
        queued = true;
      } catch (error) {
        console.error("purchase queue skipped", error);
      }
    }

    return NextResponse.json({ purchased: true, queued, asset_id: assetId });
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
