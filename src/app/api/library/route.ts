// GET /api/library — daftar skenario Skenarioku milik akun (dengan playCount,
// dikelompokkan klien berdasarkan pillarKey) + daftar Pilarku.
// POST /api/library — buat skenario baru (maks 20 per akun, validasi penuh).
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  MAX_CUSTOM_SCENARIOS,
  SCENARIO_LIMIT_MESSAGE,
  buildRubricFromSelections,
  customPillarKey,
  isBuiltinPillarKey,
  isScenarioLimitReached,
  personaCardForCustomScenario,
  validateCustomScenario,
  type Trait,
} from "@/lib/custom-library";
import { CUSTOM_CREATE_MAX_PER_HOUR, CUSTOM_CREATE_WINDOW_MS, checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { selectionsFromBody, serializeScenario } from "./helpers";

export async function GET() {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  const [items, pillars] = await Promise.all([
    prisma.customScenario.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } }),
    prisma.customPillar.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
  ]);
  return NextResponse.json({ items: items.map(serializeScenario), pillars, maxCustomScenarios: MAX_CUSTOM_SCENARIOS });
}

export async function POST(req: Request) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  const limited = await checkRateLimit(`library-create:${user.id}`, CUSTOM_CREATE_MAX_PER_HOUR, CUSTOM_CREATE_WINDOW_MS);
  if (!limited.allowed) {
    return rateLimitedResponse("Terlalu banyak skenario dibuat, coba lagi 1 jam lagi.", limited.retryAfterSec);
  }
  const body = await req.json().catch(() => ({}));
  const input = {
    title: String(body.title || ""),
    personaName: String(body.personaName || ""),
    personaRole: String(body.personaRole || ""),
    trait: String(body.trait || ""),
    situation: String(body.situation || ""),
    goal: String(body.goal || ""),
    level: Number(body.level ?? 3),
    openingLine: String(body.openingLine || ""),
    pillarKey: String(body.pillarKey || "interpersonal"),
    rubric: selectionsFromBody(body),
  };
  const err = validateCustomScenario(input);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  // Pilar custom harus milik akun ini.
  if (!isBuiltinPillarKey(input.pillarKey)) {
    const pillarId = input.pillarKey.slice("custom:".length);
    const pillar = await prisma.customPillar.findFirst({ where: { id: pillarId, userId: user.id } });
    if (!pillar) return NextResponse.json({ error: "Pilar yang dipilih tidak ditemukan." }, { status: 400 });
  }
  const count = await prisma.customScenario.count({ where: { userId: user.id } });
  if (isScenarioLimitReached(count)) return NextResponse.json({ error: SCENARIO_LIMIT_MESSAGE }, { status: 429 });
  const rubric = buildRubricFromSelections(input.rubric);
  const created = await prisma.customScenario.create({
    data: {
      userId: user.id,
      pillarKey: input.pillarKey,
      title: input.title.trim(),
      personaName: input.personaName.trim(),
      personaRole: input.personaRole.trim(),
      trait: input.trait,
      situation: input.situation.trim(),
      goal: input.goal.trim(),
      level: input.level,
      openingLine: input.openingLine.trim(),
      rubric: JSON.stringify(rubric),
      sourceScenarioId: typeof body.sourceScenarioId === "string" && body.sourceScenarioId ? body.sourceScenarioId : null,
      sourceCustomRoleplayId: typeof body.sourceCustomRoleplayId === "string" && body.sourceCustomRoleplayId ? body.sourceCustomRoleplayId : null,
    },
  });
  const personaCard = personaCardForCustomScenario({
    personaName: created.personaName, personaRole: created.personaRole,
    trait: created.trait as Trait, situation: created.situation, openingLine: created.openingLine,
  });
  return NextResponse.json({ scenario: serializeScenario(created), personaCard, rubric });
}
