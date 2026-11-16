import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { SCENARIOS } from "@/lib/scenarios";
export async function GET() {
  try { await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  return NextResponse.json({ scenarios: SCENARIOS, total: SCENARIOS.length });
}
