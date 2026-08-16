import { NextRequest, NextResponse } from "next/server";
import { getInvestorProfile, updateInvestorProfile } from "@/lib/db";

function checkAuth(request: NextRequest): boolean {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) return true;
  return request.headers.get("x-admin-secret") === secret;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const profile = await getInvestorProfile(params.id);
    if (!profile) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ profile });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const profile = await updateInvestorProfile(params.id, body);
    if (!profile) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ profile });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
