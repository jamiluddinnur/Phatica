import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { coachContent } from "@/lib/ai";
export async function POST(req: Request) {
  let user; try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  const { draft, platform } = await req.json().catch(() => ({}));
  if (!draft || !String(draft).trim()) return NextResponse.json({ error: "Tempel draf kontenmu dulu." }, { status: 400 });
  const result = coachContent(String(draft));
  const review = await prisma.contentReview.create({ data: { userId: user.id, draft: String(draft), platform: String(platform || "Threads"), scores: JSON.stringify(result.scores), hooks: JSON.stringify(result.hooks), toolTrace: JSON.stringify(result.trace) } });
  return NextResponse.json({ review: { ...review, scores: result.scores, hooks: result.hooks, toolTrace: result.trace } });
}
