// POST /api/sessions/end?id=<sessionId> — akhiri sesi, jalankan Evaluation Agent, update memori.
// Berfungsi untuk skenario tetap maupun Roleplay Bebas: sesi custom memakai
// rubrik dinamis yang tersimpan di CustomRoleplay (bukan rubrik skenario tetap).
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getScenario, type Scenario } from "@/lib/scenarios";
import { scoreDimension, analyzeEvidence, composeVerdict, twoMinuteDrill, sharpenSentence, voiceNote, type ToolTrace } from "@/lib/ai";
import { MESSAGE_MAX_PER_MINUTE, MESSAGE_WINDOW_MS, checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";

export async function POST(req: Request) {
  let user; try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  // Perlindungan: maks 30 request per pengguna per menit (sama seperti kirim pesan).
  const limited = await checkRateLimit(`message:${user.id}`, MESSAGE_MAX_PER_MINUTE, MESSAGE_WINDOW_MS);
  if (!limited.allowed) {
    return rateLimitedResponse("Terlalu banyak permintaan, coba lagi sebentar lagi.", limited.retryAfterSec);
  }
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "ID sesi tidak ada." }, { status: 400 });
  const session = await prisma.practiceSession.findFirst({ where: { id, userId: user.id }, include: { messages: { orderBy: { createdAt: "asc" } }, evaluation: true, customRoleplay: true, customScenario: true } });
  if (!session) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 404 });
  if (session.evaluation) return NextResponse.json({ evaluation: session.evaluation });

  // Skenario tetap: dari katalog. Roleplay Bebas: dirangkai dari data custom.
  // Skenarioku: dirangkai dari CustomScenario (rubriknya sendiri).
  let scenario: Scenario;
  let displayTitle: string;
  if ((session as any).customScenarioId && (session as any).customScenario) {
    const lib = (session as any).customScenario;
    const rubric = JSON.parse(lib.rubric);
    scenario = {
      id: `library-${lib.id}`,
      title: `Skenarioku: ${lib.title}`,
      pillar: "Skenarioku",
      personaName: lib.personaName,
      personaRole: lib.personaRole,
      context: lib.situation,
      opening: lib.openingLine || "",
      goal: lib.goal,
      baseDifficulty: lib.level,
      durationLabel: "7–10 menit",
      evaluatorMode: "Seimbang",
      fourthLabel: rubric[0]?.label || "Kejelasan",
      rubric,
      verdictHint: "Putusan harus berbentuk satu kalimat: apakah tujuan pengguna tercapai, hampir tercapai, atau belum tercapai — dan kenapa.",
      modelAnswer: "",
      tip: "",
    };
    displayTitle = scenario.title;
  } else if (session.customRoleplayId && session.customRoleplay) {
    const custom = session.customRoleplay as any;
    const card = JSON.parse(custom.personaCard);
    const rubric = JSON.parse(custom.rubric);
    const sourceTitle = custom.sourceScenarioId ? getScenario(custom.sourceScenarioId)?.title : null;
    scenario = {
      id: `custom-${custom.id}`,
      title: custom.customized && sourceTitle
        ? `Disesuaikan olehmu: ${card.personaName} — ${card.personaRole} (dari ${sourceTitle})`
        : `Roleplay Bebas: ${card.personaName} — ${card.personaRole}`,
      pillar: "Roleplay Bebas",
      personaName: card.personaName,
      personaRole: card.personaRole,
      context: custom.situation,
      opening: card.opening,
      goal: custom.goal,
      baseDifficulty: custom.level,
      durationLabel: "7–10 menit",
      evaluatorMode: "Seimbang",
      fourthLabel: rubric[0]?.label || "Kejelasan",
      rubric,
      verdictHint: "Putusan harus berbentuk satu kalimat: apakah tujuan pengguna tercapai, hampir tercapai, atau belum tercapai — dan kenapa.",
      modelAnswer: "",
      tip: "",
    };
    displayTitle = scenario.title;
  } else {
    const found = getScenario(session.scenarioId || "");
    if (!found) return NextResponse.json({ error: "Skenario tidak ditemukan." }, { status: 404 });
    scenario = found;
    displayTitle = found.title;
  }

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

  // Status latihan 2 menit sebelumnya (dari sesi lain): ditagih di laporan ini.
  const prevDrill = await prisma.drill.findFirst({ where: { userId: user.id, sessionId: { not: session.id } }, orderBy: { createdAt: "desc" } });
  const drillStatus = !prevDrill ? "tidak ada" : prevDrill.status === "done" ? "selesai" : "belum";
  // Ringkasan suara — hanya bila ada jawaban suara (metrik dari transkripsi browser).
  const voiceTurns = JSON.parse((session as any).voiceMetrics || "[]");
  let voiceSummary = "";
  if (voiceTurns.length > 0) {
    const tot = voiceTurns.reduce((a: any, m: any) => ({ words: a.words + (m.words || 0), seconds: a.seconds + (m.durationSec || 0), fillers: a.fillers + (m.fillers || 0) }), { words: 0, seconds: 0, fillers: 0 });
    const pace = tot.seconds > 0 ? Math.round((tot.words / tot.seconds) * 60) : 0;
    voiceSummary = `Suara (${voiceTurns.length} jawaban suara): kecepatan ${pace} kata/menit, ${tot.fillers} kata pengisi. ${voiceNote({ paceWpm: pace, fillers: tot.fillers, words: tot.words })} Diukur dari transkripsi browser, bukan analisis audio.`;
  }
  // Kalimatmu vs Versi yang Lebih Tajam (dari kalimat terlemah pengguna).
  const weakestSentence = [...userTexts].sort((a, b) => a.split(/\s+/).length - b.split(/\s+/).length)[0] || "";
  const sharpened = sharpenSentence(weakestSentence);

  const evaluation = await prisma.evaluation.create({
    data: {
      sessionId: session.id, verdict, overall,
      scores: JSON.stringify(scores), quotes: JSON.stringify(ev.quotes),
      blindSpot: ev.blindSpot, alternative: ev.alternative, drill, comparison,
      patterns: ev.patterns.join(", "), recurring: ev.recurring.join(", "),
      voiceSummary, sharpened: JSON.stringify(sharpened), drillStatus,
      register: (session as any).register || "santai",
      toolTrace: JSON.stringify(trace),
    },
  });
  // Latihan lanjutan otomatis: drill 2 menit dari evaluasi ini, jatuh tempo besok.
  const dueAt = new Date(); dueAt.setDate(dueAt.getDate() + 1);
  await prisma.drill.create({ data: { userId: user.id, sessionId: session.id, text: drill, blindSpot: ev.blindSpot, dueAt } });
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
      lastRecap: `${displayTitle}: ${verdict} (skor ${overall}). Blind spot: ${ev.blindSpot}`,
      lastScenario: displayTitle, totalSessions: { increment: 1 }, totalTurns: { increment: userTexts.length }, levels: JSON.stringify(levels),
    },
    create: { userId: user.id, weaknesses, weaknessCounts: JSON.stringify(counts), strengths: strengths.join(", "), lastRecap: `${displayTitle}: ${verdict} (skor ${overall}).`, lastScenario: displayTitle, totalSessions: 1, totalTurns: userTexts.length, levels: JSON.stringify(levels) },
  });
  return NextResponse.json({ evaluation: { ...evaluation, scores, quotes: ev.quotes, toolTrace: trace, sharpened, voiceSummary, drillStatus } });
}
