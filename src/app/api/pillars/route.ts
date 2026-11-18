// GET /api/pillars — daftar Pilarku milik akun + daftar pilar bawaan.
// POST /api/pillars — buat pilar baru (maks 5 per akun).
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  BUILTIN_PILLARS,
  MAX_CUSTOM_PILLARS,
  PILLAR_LIMIT_MESSAGE,
  isPillarLimitReached,
  validateCustomPillar,
} from "@/lib/custom-library";
import { CUSTOM_CREATE_MAX_PER_HOUR, CUSTOM_CREATE_WINDOW_MS, checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";

export async function GET() {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  const items = await prisma.customPillar.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ items, builtin: BUILTIN_PILLARS, maxCustomPillars: MAX_CUSTOM_PILLARS });
}

export async function POST(req: Request) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  const limited = await checkRateLimit(`library-create:${user.id}`, CUSTOM_CREATE_MAX_PER_HOUR, CUSTOM_CREATE_WINDOW_MS);
  if (!limited.allowed) {
    return rateLimitedResponse("Terlalu banyak yang dibuat, coba lagi 1 jam lagi.", limited.retryAfterSec);
  }
  const body = await req.json().catch(() => ({}));
  const input = {
    name: String(body.name || ""),
    description: String(body.description || ""),
    color: String(body.color || ""),
    icon: String(body.icon || ""),
  };
  const err = validateCustomPillar(input);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const count = await prisma.customPillar.count({ where: { userId: user.id } });
  if (isPillarLimitReached(count)) return NextResponse.json({ error: PILLAR_LIMIT_MESSAGE }, { status: 429 });
  const existing = await prisma.customPillar.findFirst({ where: { userId: user.id, name: input.name.trim() } });
  if (existing) return NextResponse.json({ error: `Pilar "${input.name.trim()}" sudah ada — beri nama lain.` }, { status: 400 });
  const created = await prisma.customPillar.create({
    data: { userId: user.id, name: input.name.trim(), description: input.description.trim(), color: input.color, icon: input.icon },
  });
  return NextResponse.json({ pillar: created });
}
