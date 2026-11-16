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

export async function POST(req: Request) {
  let user; try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  const body = await req.json().catch(() => ({}));
  const profile = await prisma.brandProfile.upsert({
    where: { userId: user.id },
    update: { niche: String(body.niche || ""), audience: String(body.audience || ""), values: String(body.values || ""), tone: String(body.tone || ""), credibility: String(body.credibility || "") },
    create: { userId: user.id, niche: String(body.niche || ""), audience: String(body.audience || ""), values: String(body.values || ""), tone: String(body.tone || ""), credibility: String(body.credibility || "") },
  });
  return NextResponse.json({ profile });
}
