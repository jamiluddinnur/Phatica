// POST /api/sessions/end?id=<sessionId> — akhiri sesi, jalankan Evaluation Agent, update memori.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getScenario } from "@/lib/scenarios";
import { scoreDimension, analyzeEvidence, composeVerdict, twoMinuteDrill, type ToolTrace } from "@/lib/ai";

export async function POST(req: Request) {
  let user; try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "ID sesi tidak ada." }, { status: 400 });
  const session = await prisma.practiceSession.findFirst({ where: { id, userId: user.id }, include: { messages: { orderBy: { createdAt: "asc" } }, evaluation: true } });
  if (!session) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 404 });
  if (session.evaluation) return NextResponse.json({ evaluation: session.evaluation });
  const scenario = getScenario(session.scenarioId);
  if (!scenario) return NextResponse.json({ error: "Skenario tidak ditemukan." }, { status: 404 });
  const userTexts = session.messages.filter((m: any) => m.role === "user").map((m: any) => m.content as string);
  const memory = await prisma.learnerMemory.findUnique({ where: { userId: user.id } });
  const prevSessions = await prisma.practiceSession.findMany({ where: { userId: user.id, status: "finished", id: { not: session.id } }, include: { evaluation: true }, orderBy: { updatedAt: "desc" }, take: 1 });
  const prevOverall = prevSessions[0]?.evaluation?.overall ?? null;

  // Evaluation Agent: SATU tool scoring per dimensi rubrik (bukan satu tebakan prompt).
  const trace: ToolTrace[] = [];
  const scores = scenario.rubric.map((r) => {
    const t0 = Date.now();
    const { score, note } = scoreDimension(r.key, userTexts);
    trace.push({ tool: `score_${r.key}`, input: { rubric: r.label, turns: userTexts.length }, output: { score, note }, durationMs: Date.now() - t0 });
    return { key: r.key, label: r.label, score, weight: r.weight };
  });
  const overall = Math.round(scores.reduce((a, s) => a + s.score * s.weight, 0));
  const t1 = Date.now();
  const memoryWeaknesses = (memory?.weaknesses || "").split("|").map((s) => s.trim()).filter(Boolean);
  const ev = analyzeEvidence(scenario, userTexts, memoryWeaknesses);
  trace.push({ tool: "extract_evidence_and_patterns", input: { turns: userTexts.length }, output: { quotes: ev.quotes, blindSpot: ev.blindSpot, patterns: ev.patterns }, durationMs: Date.now() - t1 });
  const t2 = Date.now();
  const verdict = composeVerdict(scenario, overall);
  const drill = twoMinuteDrill(scenario, ev.blindSpot);
  const comparison = prevOverall === null
    ? "Ini sesi pertamamu yang selesai — belum ada pembanding. Sesi berikutnya akan dibandingkan dengan skor total ini."
    : overall > prevOverall ? `Naik ${overall - prevOverall} poin dari sesi terakhirmu (${prevOverall} → ${overall}).`
    : overall < prevOverall ? `Turun ${prevOverall - overall} poin dari sesi terakhirmu (${prevOverall} → ${overall}) — fokus ke blind spot di atas.`
    : `Sama seperti sesi terakhirmu (${overall}) — belum ada perubahan, fokus ke blind spot di atas.`;
  trace.push({ tool: "compose_report", input: { verdictHint: scenario.verdictHint, mode: scenario.evaluatorMode }, output: { verdict, comparison }, durationMs: Date.now() - t2 });

  const evaluation = await prisma.evaluation.create({
    data: {
      sessionId: session.id, verdict, overall,
      scores: JSON.stringify(scores), quotes: JSON.stringify(ev.quotes),
      blindSpot: ev.blindSpot, alternative: ev.alternative, drill, comparison,
      patterns: ev.patterns.join(", "), recurring: ev.recurring.join(", "),
      toolTrace: JSON.stringify(trace),
    },
  });
  await prisma.practiceSession.update({ where: { id: session.id }, data: { status: "finished" } });

  // Update memori antar-sesi: gaya, kekuatan, kelemahan berulang (dengan hitungan), rekap terakhir.
  const counts: Record<string, number> = JSON.parse(memory?.weaknessCounts || "{}");
  const weakLabel = ev.blindSpot.split("—")[0].trim();
  counts[weakLabel] = (counts[weakLabel] || 0) + 1;
  const weaknesses = Object.entries(counts).map(([k, v]) => `${k} (${v}×)`).join(" | ");
  const strengths = scores.filter((s) => s.score >= 75).map((s) => s.label);
  const levels = JSON.parse(memory?.levels || "{}");
  levels[scenario.pillar] = session.level;
  await prisma.learnerMemory.upsert({
    where: { userId: user.id },
    update: {
      weaknesses, weaknessCounts: JSON.stringify(counts),
      strengths: strengths.join(", "),
      styleTraits: userTexts.join(" ").length > 200 ? "Jawaban cukup panjang dan terstruktur" : "Jawaban singkat, perlu contoh konkret",
      lastRecap: `${scenario.title}: ${verdict} (skor ${overall}). Blind spot: ${ev.blindSpot}`,
      lastScenario: scenario.title, totalSessions: { increment: 1 }, totalTurns: { increment: userTexts.length }, levels: JSON.stringify(levels),
    },
    create: { userId: user.id, weaknesses, weaknessCounts: JSON.stringify(counts), strengths: strengths.join(", "), lastRecap: `${scenario.title}: ${verdict} (skor ${overall}).`, lastScenario: scenario.title, totalSessions: 1, totalTurns: userTexts.length, levels: JSON.stringify(levels) },
  });
  return NextResponse.json({ evaluation: { ...evaluation, scores, quotes: ev.quotes, toolTrace: trace } });
}
