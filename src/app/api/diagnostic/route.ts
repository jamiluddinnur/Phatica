// Tes Awal + Jalur Belajar.
// GET: Tes Awal terbaru + status jalur (skenario mana yang sudah selesai).
// POST: kirim 3 jawaban situasi → skor 4 dimensi + jalur 3 skenario.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scoreDiagnostic, buildPath, DIAGNOSTIC_PROMPTS } from "@/lib/diagnostic";

export async function GET() {
  let user; try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  const diag = await prisma.diagnostic.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  if (!diag) return NextResponse.json({ diagnostic: null, prompts: DIAGNOSTIC_PROMPTS });
  const path = JSON.parse(diag.path || "[]");
  const finished = await prisma.practiceSession.findMany({ where: { userId: user.id, status: "finished", scenarioId: { in: path.map((p: any) => p.scenarioId) } }, select: { scenarioId: true } });
  const doneIds = new Set(finished.map((f) => f.scenarioId));
  const pathWithDone = path.map((p: any) => ({ ...p, done: doneIds.has(p.scenarioId) }));
  const doneCount = pathWithDone.filter((p: any) => p.done).length;
  return NextResponse.json({
    diagnostic: { id: diag.id, scores: JSON.parse(diag.scores), weakest: JSON.parse(diag.weakest), path: pathWithDone, createdAt: diag.createdAt },
    doneCount, total: pathWithDone.length,
    prompts: DIAGNOSTIC_PROMPTS,
  });
}

export async function POST(req: Request) {
  let user; try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  const { answers } = await req.json().catch(() => ({}));
  if (!Array.isArray(answers) || answers.length !== 3 || answers.some((a) => !String(a || "").trim() || String(a).trim().length < 10)) {
    return NextResponse.json({ error: "Jawab ketiga situasi itu dulu — masing-masing minimal 10 karakter, tulis seperti kamu mengatakannya langsung." }, { status: 400 });
  }
  const { scores, weakest } = scoreDiagnostic(answers.map((a) => String(a)));
  const path = buildPath(weakest);
  const diag = await prisma.diagnostic.create({ data: { userId: user.id, scores: JSON.stringify(scores), weakest: JSON.stringify(weakest), path: JSON.stringify(path) } });
  return NextResponse.json({ diagnostic: { id: diag.id, scores, weakest, path, createdAt: diag.createdAt } });
}
