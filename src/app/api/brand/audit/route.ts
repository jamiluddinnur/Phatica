import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditBrand } from "@/lib/ai";
export async function POST(req: Request) {
  let user; try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  const { bio, posts } = await req.json().catch(() => ({}));
  if (!bio || !String(bio).trim()) return NextResponse.json({ error: "Tempel bio kamu dulu." }, { status: 400 });
  const postList = Array.isArray(posts) ? posts.filter(Boolean).slice(0, 3) : [];
  const result = auditBrand(String(bio), postList.map(String));
  const audit = await prisma.brandAudit.create({ data: { userId: user.id, bio: String(bio), posts: JSON.stringify(postList), scores: JSON.stringify(result.scores), rewrite: result.rewrite, toolTrace: JSON.stringify(result.trace) } });
  return NextResponse.json({ audit: { ...audit, scores: result.scores, toolTrace: result.trace } });
}
