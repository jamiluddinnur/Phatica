// POST /api/library/save-from-roleplay — ubah satu Roleplay Bebas yang sudah
// selesai (CustomRoleplay milik akun) menjadi skenario tersimpan di Skenarioku.
// Judul disarankan otomatis dari situasi; pengguna bisa mengganti judulnya
// di wizard setelahnya. Idempotent: bila sudah pernah disimpan, kembalikan
// skenario yang sudah ada (tidak membuat duplikat, tidak memakan kuota).
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  SCENARIO_LIMIT_MESSAGE,
  buildRubricFromSelections,
  isScenarioLimitReached,
  personaCardForCustomScenario,
  suggestTitleFromSituation,
  type Trait,
} from "@/lib/custom-library";
import { CUSTOM_CREATE_MAX_PER_HOUR, CUSTOM_CREATE_WINDOW_MS, checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { parseRubricJson, serializeScenario } from "../helpers";

export async function POST(req: Request) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  const limited = await checkRateLimit(`library-create:${user.id}`, CUSTOM_CREATE_MAX_PER_HOUR, CUSTOM_CREATE_WINDOW_MS);
  if (!limited.allowed) {
    return rateLimitedResponse("Terlalu banyak skenario dibuat, coba lagi 1 jam lagi.", limited.retryAfterSec);
  }
  const body = await req.json().catch(() => ({}));
  const customRoleplayId = String(body.customRoleplayId || "");
  if (!customRoleplayId) return NextResponse.json({ error: "ID Roleplay Bebas tidak ada." }, { status: 400 });
  const custom = await prisma.customRoleplay.findFirst({ where: { id: customRoleplayId, userId: user.id } });
  if (!custom) return NextResponse.json({ error: "Roleplay Bebas tidak ditemukan." }, { status: 404 });
  const already = await prisma.customScenario.findFirst({ where: { userId: user.id, sourceCustomRoleplayId: custom.id } });
  if (already) {
    return NextResponse.json({ scenario: serializeScenario(already), alreadySaved: true, message: `Skenario "${already.title}" sudah ada di Skenarioku.` });
  }
  const count = await prisma.customScenario.count({ where: { userId: user.id } });
  if (isScenarioLimitReached(count)) return NextResponse.json({ error: SCENARIO_LIMIT_MESSAGE }, { status: 429 });
  // Rubrik Roleplay Bebas dipakai ulang: kunci yang dikenal dipertahankan,
  // kunci custom (custom_...) jadi dimensi tulisan sendiri.
  const oldRubric = parseRubricJson(custom.rubric);
  const sels = oldRubric.map((r) =>
    r.key.startsWith("custom_") ? { customLabel: r.label } : { key: r.key }
  );
  const rubric = buildRubricFromSelections(sels.length >= 2 ? sels : [{ key: "kejelasan" }, { key: "struktur" }]);
  const card = JSON.parse(custom.personaCard);
  const created = await prisma.customScenario.create({
    data: {
      userId: user.id,
      pillarKey: "interpersonal",
      title: suggestTitleFromSituation(custom.situation),
      personaName: custom.personaName,
      personaRole: custom.personaRole,
      trait: custom.trait,
      situation: custom.situation,
      goal: custom.goal,
      level: custom.level,
      openingLine: card.opening || "",
      rubric: JSON.stringify(rubric),
      sourceScenarioId: custom.sourceScenarioId,
      sourceCustomRoleplayId: custom.id,
    },
  });
  const personaCard = personaCardForCustomScenario({
    personaName: created.personaName, personaRole: created.personaRole,
    trait: created.trait as Trait, situation: created.situation, openingLine: created.openingLine,
  });
  return NextResponse.json({
    scenario: serializeScenario(created),
    personaCard,
    rubric,
    alreadySaved: false,
    message: `Tersimpan sebagai "${created.title}" di Skenarioku — kamu bisa mengganti judul dan pilarnya di wizard.`,
  });
}
