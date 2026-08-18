import { NextRequest, NextResponse } from "next/server";
import { isAuthorized, unauthorized } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { deleteCatalyst, updateCatalyst } from "@/lib/intelligence";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { catalystId: string } },
) {
  if (!isAuthorized(request)) return unauthorized();
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }
  try {
    const body = await request.json();
    const catalyst = await updateCatalyst(params.catalystId, body);
    if (!catalyst) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ catalyst });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update catalyst" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { catalystId: string } },
) {
  if (!isAuthorized(request)) return unauthorized();
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }
  try {
    const ok = await deleteCatalyst(params.catalystId);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete catalyst" }, { status: 500 });
  }
}
