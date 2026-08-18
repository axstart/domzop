import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { filterDemoProperties } from "@/lib/demo-properties";
import { listAvailableProperties } from "@/lib/intelligence";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const includeOwned = sp.get("include_owned") === "1";
    const status = sp.get("status") ?? undefined;
    const country = sp.get("country") ?? undefined;
    const city = sp.get("city") ?? undefined;
    const minPrice = sp.get("min_price") ? Number(sp.get("min_price")) : undefined;
    const maxPrice = sp.get("max_price") ? Number(sp.get("max_price")) : undefined;
    const forceDemo = sp.get("demo") === "1";

    let properties = forceDemo
      ? []
      : isDatabaseConfigured()
        ? await listAvailableProperties({
            includeOwned,
            status,
            country,
            city,
            minPrice,
            maxPrice,
          })
        : [];

    if (!properties.length) {
      properties = filterDemoProperties({ country, city, minPrice, maxPrice });
    }

    return NextResponse.json({ properties, source: properties[0]?.asset.id.startsWith("demo-") ? "demo" : "db" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to list properties" }, { status: 500 });
  }
}
