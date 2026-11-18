// POST /api/library/manage?id=<scenarioId> — ubah skenario Skenarioku milik
// akun (field apa pun, validasi yang sama seperti saat membuat).
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildRubricFromSelections,
  isBuiltinPillarKey,
  personaCardForCustomScenario,
  validateCustomScenario,
  type Trait,
} from "@/lib/custom-library";
import { parseRubricJson, selectionsFromBody, serializeScenario } from "../helpers";

export async function POST(req: Request) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "ID skenario tidak ada." }, { status: 400 });
  const existing = await prisma.customScenario.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Skenario tidak ditemukan." }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const oldRubric = parseRubricJson(existing.rubric);
  const hasRubricInput = Array.isArray(body.rubric) || Array.isArray(body.rubricKeys) || typeof body.customDimension === "string";
  const rubricSels = hasRubricInput
    ? selectionsFromBody(body)
    : oldRubric.map((r) =>
        r.key.startsWith("custom_") ? { customLabel: r.label } : { key: r.key }
      );
  const input = {
    title: String(body.title ?? existing.title),
    personaName: String(body.personaName ?? existing.personaName),
    personaRole: String(body.personaRole ?? existing.personaRole),
    trait: String(body.trait ?? existing.trait),
    situation: String(body.situation ?? existing.situation),
    goal: String(body.goal ?? existing.goal),
    level: Number(body.level ?? existing.level),
    openingLine: String(body.openingLine ?? existing.openingLine),
    pillarKey: String(body.pillarKey ?? existing.pillarKey),
    rubric: rubricSels,
  };
  const err = validateCustomScenario(input);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  if (!isBuiltinPillarKey(input.pillarKey)) {
    const pillarId = input.pillarKey.slice("custom:".length);
    const pillar = await prisma.customPillar.findFirst({ where: { id: pillarId, userId: user.id } });
    if (!pillar) return NextResponse.json({ error: "Pilar yang dipilih tidak ditemukan." }, { status: 400 });
  }
  const rubric = buildRubricFromSelections(input.rubric);
  const updated = await prisma.customScenario.update({
    where: { id: existing.id },
    data: {
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
    },
  });
  const personaCard = personaCardForCustomScenario({
    personaName: updated.personaName, personaRole: updated.personaRole,
    trait: updated.trait as Trait, situation: updated.situation, openingLine: updated.openingLine,
  });
  return NextResponse.json({ scenario: serializeScenario(updated), personaCard, rubric });
}
