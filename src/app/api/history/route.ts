import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function DELETE() {
  let user; try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  await prisma.$transaction([
    prisma.evaluation.deleteMany({ where: { session: { userId: user.id } } }),
    prisma.adaptationEvent.deleteMany({ where: { session: { userId: user.id } } }),
    prisma.sessionMessage.deleteMany({ where: { session: { userId: user.id } } }),
    prisma.practiceSession.deleteMany({ where: { userId: user.id } }),
    prisma.customRoleplay.deleteMany({ where: { userId: user.id } }),
    prisma.customScenario.deleteMany({ where: { userId: user.id } }),
    prisma.customPillar.deleteMany({ where: { userId: user.id } }),
    prisma.brandAudit.deleteMany({ where: { userId: user.id } }),
    prisma.contentReview.deleteMany({ where: { userId: user.id } }),
    prisma.learnerMemory.deleteMany({ where: { userId: user.id } }),
    prisma.brandProfile.deleteMany({ where: { userId: user.id } }),
    prisma.drill.deleteMany({ where: { userId: user.id } }),
    prisma.diagnostic.deleteMany({ where: { userId: user.id } }),
  ]);
  return NextResponse.json({ ok: true });
}
