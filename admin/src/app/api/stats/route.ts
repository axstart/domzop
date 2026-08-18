import { NextResponse } from "next/server";
import { getStats, isDatabaseConfigured } from "@/lib/db";
import { DEMO_CANDIDATES } from "@/lib/demo-domains";

export async function GET() {
  try {
    if (isDatabaseConfigured()) {
      try {
        const stats = await getStats();
        if (Number(stats.total) > 0) {
          return NextResponse.json({ stats });
        }
      } catch (error) {
        console.error(error);
      }
    }
    const stats = {
      monitoring: DEMO_CANDIDATES.filter((c) => c.status === "monitoring").length,
      evaluated: DEMO_CANDIDATES.filter((c) => c.status === "evaluated").length,
      purchased: DEMO_CANDIDATES.filter((c) => c.status === "purchased").length,
      discarded: DEMO_CANDIDATES.filter((c) => c.status === "discarded").length,
      total: DEMO_CANDIDATES.length,
    };
    return NextResponse.json({ stats, source: "demo" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
