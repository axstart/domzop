import { NextResponse } from "next/server";
import { getCandidateDetail } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const detail = await getCandidateDetail(params.id);
    if (!detail) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch candidate" }, { status: 500 });
  }
}
