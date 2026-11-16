import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getScenario } from "@/lib/scenarios";
import { PLANS } from "@/lib/plans";
import { ensureUserRows } from "@/lib/ensure";

export async function GET() {
  let user; try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  const items = await prisma.practiceSession.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20, include: { evaluation: true } });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  let user; try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  const { scenarioId } = await req.json().catch(() => ({}));
  const scenario = getScenario(scenarioId || "");
  if (!scenario) return NextResponse.json({ error: "Skenario tidak ditemukan." }, { status: 404 });
  await ensureUserRows(user.id);
  const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
  const plan = (sub?.plan || "free") as keyof typeof PLANS;
  const info = PLANS[plan];
  if (!info.pillars.includes(scenario.pillar as never)) {
    return NextResponse.json({ error: `Pilar ${scenario.pillar} hanya untuk paket Pro / Tim. Paketmu saat ini: ${info.name}. Upgrade di halaman Paket Langganan.` }, { status: 403 });
  }
  if (info.limitMonthly !== Infinity) {
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const used = await prisma.practiceSession.count({ where: { userId: user.id, createdAt: { gte: startOfMonth } } });
    if (used >= info.limitMonthly) {
      return NextResponse.json({ error: `Batas Free sudah habis: ${used}/${info.limitMonthly} simulasi bulan ini. Upgrade ke Pro (Rp99.000/bulan) atau coba trial Pro 14 hari gratis di halaman Paket Langganan.` }, { status: 403 });
    }
  }
  const memory = await prisma.learnerMemory.findUnique({ where: { userId: user.id } });
  const levels = JSON.parse(memory?.levels || "{}");
  const level = Math.max(1, Math.min(5, levels[scenario.pillar] ?? scenario.baseDifficulty));
  const session = await prisma.practiceSession.create({ data: { userId: user.id, scenarioId: scenario.id, pillar: scenario.pillar, level, status: "active" } });
  await prisma.sessionMessage.create({ data: { sessionId: session.id, role: "persona", content: `${scenario.personaName}: ${scenario.opening}` } });
  return NextResponse.json({ session: { id: session.id, scenarioId: scenario.id, level, status: "active" }, opening: scenario.opening });
}
