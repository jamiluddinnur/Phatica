import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getScenario } from "@/lib/scenarios";
import { pickOpeningVariant } from "@/lib/opening-variants";
import { PLANS, SUBSCRIPTIONS_ENABLED } from "@/lib/plans";
import { ensureUserRows } from "@/lib/ensure";
import { personaCardForCustomScenario, pillarLabelForKey, type Trait } from "@/lib/custom-library";

export async function GET() {
  let user; try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  const items = await prisma.practiceSession.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20, include: { evaluation: true, customRoleplay: true, customScenario: true } });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  let user; try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  const { scenarioId, customRoleplayId, customScenarioId, register } = await req.json().catch(() => ({}));
  const reg = register === "formal" ? "formal" : "santai";
  await ensureUserRows(user.id);
  // --- Skenarioku: mulai sesi dari skenario tersimpan milik akun ---
  if (customScenarioId) {
    const lib = await prisma.customScenario.findFirst({ where: { id: String(customScenarioId), userId: user.id } });
    if (!lib) return NextResponse.json({ error: "Skenario di Skenarioku tidak ditemukan." }, { status: 404 });
    const pillars = await prisma.customPillar.findMany({ where: { userId: user.id } });
    const card = personaCardForCustomScenario({ personaName: lib.personaName, personaRole: lib.personaRole, trait: lib.trait as Trait, situation: lib.situation, openingLine: lib.openingLine });
    const rubric = JSON.parse(lib.rubric);
    const session = await prisma.practiceSession.create({ data: { userId: user.id, scenarioId: null, customScenarioId: lib.id, pillar: "Skenarioku", level: lib.level, status: "active", register: reg } });
    await prisma.sessionMessage.create({ data: { sessionId: session.id, role: "persona", content: `${card.personaName}: ${card.opening}` } });
    await prisma.customScenario.update({ where: { id: lib.id }, data: { playCount: { increment: 1 } } });
    return NextResponse.json({ session: { id: session.id, scenarioId: null, customScenarioId: lib.id, level: lib.level, status: "active" }, opening: card.opening, customScenario: { ...lib, personaCard: card, rubric, pillarLabel: pillarLabelForKey(lib.pillarKey, pillars) } });
  }
  // --- Roleplay Bebas: mulai sesi dari Skenario Buatanmu ---
  if (customRoleplayId) {
    const custom = await prisma.customRoleplay.findFirst({ where: { id: String(customRoleplayId), userId: user.id } });
    if (!custom) return NextResponse.json({ error: "Skenario buatanmu tidak ditemukan." }, { status: 404 });
    const card = JSON.parse(custom.personaCard);
    const session = await prisma.practiceSession.create({ data: { userId: user.id, scenarioId: null, customRoleplayId: custom.id, pillar: "Roleplay Bebas", level: custom.level, status: "active", register: reg } });
    await prisma.sessionMessage.create({ data: { sessionId: session.id, role: "persona", content: `${card.personaName}: ${card.opening}` } });
    return NextResponse.json({ session: { id: session.id, scenarioId: null, customRoleplayId: custom.id, level: custom.level, status: "active" }, opening: card.opening, customRoleplay: { ...custom, personaCard: card, rubric: JSON.parse(custom.rubric) } });
  }
  const scenario = getScenario(scenarioId || "");
  if (!scenario) return NextResponse.json({ error: "Skenario tidak ditemukan." }, { status: 404 });
  const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
  const plan = (sub?.plan || "free") as keyof typeof PLANS;
  const info = PLANS[plan];
  if (SUBSCRIPTIONS_ENABLED && !info.pillars.includes(scenario.pillar as never)) {
    return NextResponse.json({ error: `Pilar ${scenario.pillar} hanya untuk paket Pro / Tim. Paketmu saat ini: ${info.name}. Upgrade di halaman Paket Langganan.` }, { status: 403 });
  }
  if (SUBSCRIPTIONS_ENABLED && info.limitMonthly !== Infinity) {
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const used = await prisma.practiceSession.count({ where: { userId: user.id, createdAt: { gte: startOfMonth } } });
    if (used >= info.limitMonthly) {
      return NextResponse.json({ error: `Batas Free sudah habis: ${used}/${info.limitMonthly} simulasi bulan ini. Upgrade ke Pro (Rp99.000/bulan) atau coba trial Pro 14 hari gratis di halaman Paket Langganan.` }, { status: 403 });
    }
  }
  const memory = await prisma.learnerMemory.findUnique({ where: { userId: user.id } });
  const levels = JSON.parse(memory?.levels || "{}");
  const level = Math.max(1, Math.min(5, levels[scenario.pillar] ?? scenario.baseDifficulty));
  // Varian pembuka: tiap sesi baru memakai kalimat pembuka asli atau salah
  // satu varian alternatif secara acak — replay tidak identik.
  const picked = pickOpeningVariant(scenario.id, scenario.opening);
  const session = await prisma.practiceSession.create({ data: { userId: user.id, scenarioId: scenario.id, pillar: scenario.pillar, level, status: "active", openingVariant: picked.index, register: reg } });
  await prisma.sessionMessage.create({ data: { sessionId: session.id, role: "persona", content: `${scenario.personaName}: ${picked.text}` } });
  return NextResponse.json({ session: { id: session.id, scenarioId: scenario.id, level, status: "active", openingVariant: picked.index }, opening: picked.text });
}
