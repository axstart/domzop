import { NextResponse } from "next/server";
import { demoDomainIntelligence, isDemoDomainId } from "@/lib/demo-domains";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    if (!isDemoDomainId(params.id) && !params.id.startsWith("demo-dom-")) {
      // Non-demo: still try demo builder from id if present, else 404 for now
    }
    const data = demoDomainIntelligence(params.id);
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load domain intelligence" }, { status: 500 });
  }
}
