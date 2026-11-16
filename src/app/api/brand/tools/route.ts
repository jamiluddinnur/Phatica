import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUserRows } from "@/lib/ensure";
export async function GET() {
  let user; try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  await ensureUserRows(user.id);
  const [profile, audits, reviews] = await Promise.all([
    prisma.brandProfile.findUnique({ where: { userId: user.id } }),
    prisma.brandAudit.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.contentReview.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  return NextResponse.json({ profile, audits, reviews });
}
