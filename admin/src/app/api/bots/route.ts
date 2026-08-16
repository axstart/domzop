import { NextResponse } from "next/server";
import { getBotStatus } from "@/lib/db";
import { getQueueDepths } from "@/lib/redis";

export async function GET() {
  try {
    const [bots, queues] = await Promise.all([getBotStatus(), getQueueDepths()]);
    return NextResponse.json({ bots, queues });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch bot status" }, { status: 500 });
  }
}
