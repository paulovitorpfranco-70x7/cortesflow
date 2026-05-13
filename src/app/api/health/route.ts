import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "cortesflow",
    timestamp: new Date().toISOString(),
  });
}
