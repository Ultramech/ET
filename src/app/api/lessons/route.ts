import { NextResponse } from "next/server";
import { deriveLessons } from "@/lib/lessons";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ lessons: deriveLessons() });
}
