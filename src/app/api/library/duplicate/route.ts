// POST /api/library/duplicate?id=<scenarioId bawaan> (atau body { scenarioId })
// — buat salinan skenario bawaan yang bisa diedit di Skenarioku.
// Isi awal dari skenario aslinya (trait dipetakan, rubrik = rubrik asli +
// 1 slot kosong untuk dimensi pilihan pengguna; bila rubrik asli sudah
// 4 dimensi, rubrik dipertahankan 4 dan itu dicatat di respons).
// Salinan ini dihitung ke batas 20 — wizard "Duplikasi & Sesuaikan" di UI
// justru TIDAK memanggil rute ini sampai pengguna menekan Simpan, supaya
// duplikasi yang belum dikonfirmasi tidak memakan kuota.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getScenario } from "@/lib/scenarios";
import {
  SCENARIO_LIMIT_MESSAGE,
  buildRubricFromSelections,
  duplicatePrefillFromScenario,
  isScenarioLimitReached,
  personaCardForCustomScenario,
  pillarKeyFromPillarName,
} from "@/lib/custom-library";
import { CUSTOM_CREATE_MAX_PER_HOUR, CUSTOM_CREATE_WINDOW_MS, checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { serializeScenario } from "../helpers";

export async function POST(req: Request) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  const limited = await checkRateLimit(`library-create:${user.id}`, CUSTOM_CREATE_MAX_PER_HOUR, CUSTOM_CREATE_WINDOW_MS);
  if (!limited.allowed) {
    return rateLimitedResponse("Terlalu banyak skenario dibuat, coba lagi 1 jam lagi.", limited.retryAfterSec);
  }
  const body = await req.json().catch(() => ({}));
  const scenarioId = new URL(req.url).searchParams.get("id") || String(body.scenarioId || "");
  const scenario = getScenario(scenarioId);
  if (!scenario) return NextResponse.json({ error: "Skenario asal tidak ditemukan." }, { status: 404 });
  const count = await prisma.customScenario.count({ where: { userId: user.id } });
  if (isScenarioLimitReached(count)) return NextResponse.json({ error: SCENARIO_LIMIT_MESSAGE }, { status: 429 });
  const prefill = duplicatePrefillFromScenario(scenario);
  const rubric = buildRubricFromSelections(prefill.rubricKeys.map((k) => ({ key: k })));
  const created = await prisma.customScenario.create({
    data: {
      userId: user.id,
      pillarKey: pillarKeyFromPillarName(scenario.pillar),
      title: prefill.title,
      personaName: prefill.personaName,
      personaRole: prefill.personaRole,
      trait: prefill.trait,
      situation: prefill.situation,
      goal: prefill.goal,
      level: prefill.level,
      openingLine: prefill.openingLine,
      rubric: JSON.stringify(rubric),
      sourceScenarioId: scenario.id,
    },
  });
  const personaCard = personaCardForCustomScenario({
    personaName: created.personaName, personaRole: created.personaRole,
    trait: created.trait as any, situation: created.situation, openingLine: created.openingLine,
  });
  return NextResponse.json({
    scenario: serializeScenario(created),
    personaCard,
    rubric,
    prefill,
    note: prefill.rubricSlotFull
      ? "Rubrik skenario aslinya sudah 4 dimensi, jadi tidak ada slot kosong — hapus satu dimensi di wizard bila mau menambah dimensimu sendiri."
      : "Ada 1 slot kosong di rubrik — tambahkan 1 dimensi penilaian pilihanmu di wizard.",
  });
}
