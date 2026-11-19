// Laporan Perkembangan — semua dari data nyata pengguna.
// Baseline (Tes Awal) vs sekarang per dimensi, total sesi, tren 3 skor
// terakhir, kekuatan + kelemahan berulang dari memori, progres jalur belajar,
// ringkasan suara. Kosong = jujur "belum ada data".
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let user; try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  const [diag, memory, sessions] = await Promise.all([
    prisma.diagnostic.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.learnerMemory.findUnique({ where: { userId: user.id } }),
    prisma.practiceSession.findMany({ where: { userId: user.id, status: "finished" }, orderBy: { updatedAt: "desc" }, take: 10, include: { evaluation: true } }),
  ]);
  const finished = sessions.filter((s) => s.evaluation);
  const trend = finished.slice(0, 3).reverse().map((s) => ({
    title: s.scenarioId || "Roleplay Bebas", overall: (s.evaluation as any).overall, date: s.updatedAt,
  }));
  // Skor per dimensi "sekarang": rata-rata dari 3 evaluasi terakhir.
  const byDim: Record<string, number[]> = {};
  for (const s of finished.slice(0, 3)) {
    const scores = JSON.parse((s.evaluation as any).scores || "[]");
    for (const sc of scores) { (byDim[sc.key] = byDim[sc.key] || []).push(sc.score); }
  }
  const now: Record<string, number> = {};
  for (const [k, v] of Object.entries(byDim)) now[k] = Math.round(v.reduce((a, b) => a + b, 0) / v.length);
  // Ringkasan suara dari semua sesi yang memakai mikrofon.
  let voiceTotal = { turns: 0, words: 0, seconds: 0, fillers: 0 };
  for (const s of finished) {
    const vm = JSON.parse((s as any).voiceMetrics || "[]");
    for (const m of vm) { voiceTotal.turns += 1; voiceTotal.words += m.words || 0; voiceTotal.seconds += m.durationSec || 0; voiceTotal.fillers += m.fillers || 0; }
  }
  const voice = voiceTotal.turns > 0
    ? { turns: voiceTotal.turns, paceWpm: voiceTotal.seconds > 0 ? Math.round((voiceTotal.words / voiceTotal.seconds) * 60) : 0, fillers: voiceTotal.fillers, seconds: Math.round(voiceTotal.seconds), fillersPerMin: voiceTotal.seconds > 0 ? Math.round((voiceTotal.fillers / (voiceTotal.seconds / 60)) * 10) / 10 : 0 }
    : null;
  const baseline = diag ? JSON.parse(diag.scores) : null;
  const path = diag ? JSON.parse(diag.path || "[]") : [];
  const pathDone = diag ? (await prisma.practiceSession.count({ where: { userId: user.id, status: "finished", scenarioId: { in: path.map((p: any) => p.scenarioId) } } })) : 0;
  return NextResponse.json({
    hasData: finished.length > 0 || !!diag,
    baseline,
    now,
    totalSessions: finished.length,
    trend,
    strengths: memory?.strengths || "",
    weaknesses: memory?.weaknesses || "",
    lastRecap: memory?.lastRecap || "",
    path: path.map((p: any) => ({ ...p })),
    pathDone, pathTotal: path.length,
    voice,
    generatedAt: new Date().toISOString(),
  });
}
