import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";
import { ensureUserRows } from "@/lib/ensure";

export async function GET() {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  await ensureUserRows(user.id);
  const [memory, sub, brand, sessions] = await Promise.all([
    prisma.learnerMemory.findUnique({ where: { userId: user.id } }),
    prisma.subscription.findUnique({ where: { userId: user.id } }),
    prisma.brandProfile.findUnique({ where: { userId: user.id } }),
    prisma.practiceSession.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 10, include: { evaluation: true } }),
  ]);
  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
  const usedThisMonth = await prisma.practiceSession.count({ where: { userId: user.id, createdAt: { gte: startOfMonth } } });
  const plan = (sub?.plan || "free") as keyof typeof PLANS;
  const progress = sessions.filter((s) => s.evaluation).map((s) => ({ id: s.id, scenarioId: s.scenarioId, overall: (s.evaluation as any)?.overall ?? null, createdAt: s.createdAt }));
  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email },
    plan, subscription: sub,
    memory: memory ? { ...memory, weaknessCounts: JSON.parse(memory.weaknessCounts || "{}"), levels: JSON.parse(memory.levels || "{}") } : null,
    brandProfile: brand, usedThisMonth,
    limitMonthly: PLANS[plan].limitMonthly === Infinity ? null : PLANS[plan].limitMonthly,
    progress, recentSessions: sessions.map((s) => ({ id: s.id, scenarioId: s.scenarioId, pillar: s.pillar, status: s.status, level: s.level, createdAt: s.createdAt, overall: (s.evaluation as any)?.overall ?? null })),
  });
}
