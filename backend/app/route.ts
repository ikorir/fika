import { NextResponse } from "next/server";

// Liveness check for the deployment.
export function GET() {
  return NextResponse.json({ ok: true });
}
