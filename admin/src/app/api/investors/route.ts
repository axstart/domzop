import { NextRequest, NextResponse } from "next/server";
import { createInvestorProfile, listInvestorProfiles } from "@/lib/db";

function checkAuth(request: NextRequest): boolean {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) return true;
  return request.headers.get("x-admin-secret") === secret;
}

export async function GET() {
  try {
    const profiles = await listInvestorProfiles();
    return NextResponse.json({ profiles });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const profile = await createInvestorProfile(body);
    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  }
}
