// POST /api/custom-roleplay/create — buat Skenario Buatanmu (Roleplay Bebas)
// atau turunan skenario tetap yang disesuaikan (dulu "Sesuaikan & Mainkan", kini "Duplikasi & Sesuaikan" via Skenarioku).
// Validasi + blokir kata di server, lalu bangun persona card + rubrik dinamis
// (template + kata kunci, tanpa LLM) dan simpan per akun.
// Bila sourceScenarioId diisi: rubrik dasar = rubrik skenario asli, ditambah/
// disesuaikan 1 dimensi dari tujuan baru pengguna; simpan sourceScenarioId
// + customized=true supaya riwayat bisa menandainya "Disesuaikan olehmu".
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getScenario } from "@/lib/scenarios";
import { buildPersonaCard, buildRubric, buildCustomizedRubric, validateCustomInput, type Trait } from "@/lib/custom-roleplay";
import { CUSTOM_CREATE_MAX_PER_HOUR, CUSTOM_CREATE_WINDOW_MS, checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";

export async function POST(req: Request) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  // Perlindungan: maks 10 pembuatan Roleplay Bebas per pengguna per jam.
  const limited = await checkRateLimit(`custom-create:${user.id}`, CUSTOM_CREATE_MAX_PER_HOUR, CUSTOM_CREATE_WINDOW_MS);
  if (!limited.allowed) {
    return rateLimitedResponse("Terlalu banyak skenario dibuat, coba lagi 1 jam lagi.", limited.retryAfterSec);
  }
  const body = await req.json().catch(() => ({}));
  const input = {
    personaName: String(body.personaName || ""),
    personaRole: String(body.personaRole || ""),
    trait: String(body.trait || ""),
    situation: String(body.situation || ""),
    goal: String(body.goal || ""),
    level: Number(body.level ?? 3),
  };
  const err = validateCustomInput(input);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const sourceScenarioId = typeof body.sourceScenarioId === "string" ? body.sourceScenarioId : "";
  let sourceScenario = null;
  if (sourceScenarioId) {
    sourceScenario = getScenario(sourceScenarioId);
    if (!sourceScenario) return NextResponse.json({ error: "Skenario asal tidak ditemukan." }, { status: 404 });
  }
  const personaCard = buildPersonaCard({ ...input, trait: input.trait as Trait });
  const rubric = sourceScenario
    ? buildCustomizedRubric(sourceScenario.rubric, input.goal, input.situation)
    : buildRubric(input.goal, input.situation);
  const created = await prisma.customRoleplay.create({
    data: {
      userId: user.id,
      personaName: personaCard.personaName,
      personaRole: personaCard.personaRole,
      trait: input.trait,
      situation: input.situation.trim(),
      goal: input.goal.trim(),
      level: input.level,
      personaCard: JSON.stringify(personaCard),
      rubric: JSON.stringify(rubric),
      sourceScenarioId: sourceScenario ? sourceScenario.id : null,
      customized: !!sourceScenario,
    },
  });
  return NextResponse.json({
    customRoleplay: { ...created, personaCard, rubric, sourceTitle: sourceScenario?.title || null },
    personaCard,
    rubric,
    sourceScenarioId: sourceScenario?.id || null,
    sourceTitle: sourceScenario?.title || null,
  });
}
