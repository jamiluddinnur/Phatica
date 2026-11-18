// POST /api/sessions/message?id=<sessionId> — kirim jawaban, terima balasan persona + adaptasi level.
// Berfungsi untuk skenario tetap maupun Roleplay Bebas (customRoleplayId).
// Balasan selalu menyertakan engine yang dipakai ("openai", "gemini", atau
// "rule-based (persona)") supaya UI menampilkannya dengan jujur.
// Engine adalah penyedia yang BENAR-BENAR menjawab (lihat src/lib/llm-provider.ts).
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getScenario } from "@/lib/scenarios";
import { adaptLevel, customRoleplayReply, customRoleplayReplyLLM, computeVoiceMetrics } from "@/lib/ai";
import { customStage, MAX_CUSTOM_TURNS, scenarioToPersonaCard, type PersonaCard } from "@/lib/custom-roleplay";
import { personaCardForCustomScenario, type Trait } from "@/lib/custom-library";
import { MESSAGE_MAX_PER_MINUTE, MESSAGE_WINDOW_MS, checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { LLM_LIMIT_MESSAGE, tryLlmReply } from "@/lib/llm-usage";

export async function POST(req: Request) {
  let user; try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  // Perlindungan: maks 30 pesan per pengguna per menit (termasuk akhiri sesi).
  const limited = await checkRateLimit(`message:${user.id}`, MESSAGE_MAX_PER_MINUTE, MESSAGE_WINDOW_MS);
  if (!limited.allowed) {
    return rateLimitedResponse("Terlalu banyak pesan, coba lagi sebentar lagi.", limited.retryAfterSec);
  }
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "ID sesi tidak ada." }, { status: 400 });
  const { content, voice } = await req.json().catch(() => ({}));
  // Metrik suara (opsional): hanya teks transkripsi + durasi dari browser.
  // Audio tidak pernah dikirim ke server.
  const voiceMetric = voice && voice.used && typeof voice.durationSec === "number"
    ? { ...computeVoiceMetrics(String(content).trim(), voice.durationSec), used: true }
    : null;
  if (!content || !String(content).trim()) return NextResponse.json({ error: "Tulis jawabanmu dulu." }, { status: 400 });
  const session = await prisma.practiceSession.findFirst({ where: { id: id, userId: user.id }, include: { messages: { orderBy: { createdAt: "asc" } }, customRoleplay: true, customScenario: true } });
  if (!session || session.status !== "active") return NextResponse.json({ error: "Sesi tidak aktif." }, { status: 404 });
  // Skenarioku: skenario tersimpan diperlakukan seperti Roleplay Bebas
  // (kartu persona + rubrik sendiri, tahap, batas 12 giliran).
  let customSource: any = null;
  if ((session as any).customScenarioId && (session as any).customScenario) {
    const lib = (session as any).customScenario;
    const card = personaCardForCustomScenario({ personaName: lib.personaName, personaRole: lib.personaRole, trait: lib.trait as Trait, situation: lib.situation, openingLine: lib.openingLine });
    customSource = { id: lib.id, personaCard: JSON.stringify(card), rubric: lib.rubric, situation: lib.situation, goal: lib.goal, level: lib.level, sourceScenarioId: lib.sourceScenarioId };
  }
  if (voiceMetric) {
    const prev = JSON.parse((session as any).voiceMetrics || "[]");
    await prisma.practiceSession.update({ where: { id: session.id }, data: { voiceMetrics: JSON.stringify([...prev, { ...voiceMetric, turn: prev.length + 1 }]) } });
  }
  const register = (session as any).register === "formal" ? "formal" as const : "santai" as const;
  const memory = await prisma.learnerMemory.findUnique({ where: { userId: user.id } });
  const memoryNote = memory ? `Gaya: ${memory.styleTraits || "-"}; Kelemahan berulang: ${memory.weaknesses || "-"}; Kekuatan: ${memory.strengths || "-"}` : "";
  const userTextsBefore = session.messages.filter((m: any) => m.role === "user").map((m: any) => m.content as string);

  // ---------- Roleplay Bebas / Skenarioku ----------
  if ((session.customRoleplayId && session.customRoleplay) || customSource) {
    const custom = session.customRoleplay ? (session.customRoleplay as any) : customSource;
    const userTurns = userTextsBefore.length + 1;
    if (userTurns > MAX_CUSTOM_TURNS) {
      return NextResponse.json({ error: `Batas ${MAX_CUSTOM_TURNS} giliran untuk skenario buatanmu sudah tercapai. Akhiri sesi ini untuk melihat evaluasimu, lalu buat skenario baru kalau mau lanjut.` }, { status: 403 });
    }
    const card = JSON.parse(custom.personaCard) as PersonaCard;
    await prisma.sessionMessage.create({ data: { sessionId: session.id, role: "user", content: String(content).trim() } });
    const history = [...session.messages.map((m: any) => ({ role: m.role, content: m.content })), { role: "user", content: String(content).trim() }];
    const userTexts = [...userTextsBefore, String(content).trim()];
    const t0 = Date.now();
    const llmAttempt = await tryLlmReply(user.id, () =>
      customRoleplayReplyLLM(card, session.level, history, memoryNote, custom.situation, custom.goal, userTurns, register)
    );
    const llm = llmAttempt.reply;
    const reply = llm ? llm.text : customRoleplayReply(card, session.level, history, custom.situation, userTurns, register);
    const engine = llm ? llm.engine : "rule-based (persona)";
    const llmLimitReached = llmAttempt.capped;
    const llmNotice = llmLimitReached ? LLM_LIMIT_MESSAGE : null;
    // Adaptasi level memakai mesin yang sama; personaName dari kartu.
    const adapt = adaptLevel({ personaName: card.personaName } as any, session.level, userTexts);
    let adaptation = null;
    if (adapt.level !== session.level) {
      adaptation = await prisma.adaptationEvent.create({ data: { sessionId: session.id, fromLevel: session.level, toLevel: adapt.level, signal: adapt.signal, reason: adapt.reason } });
      await prisma.practiceSession.update({ where: { id: session.id }, data: { level: adapt.level } });
    }
    await prisma.sessionMessage.create({ data: { sessionId: session.id, role: "persona", content: reply } });
    return NextResponse.json({ reply, engine, level: adapt.level, adaptation, adaptReason: adapt.reason, tookMs: Date.now() - t0, stage: customStage(userTurns), userTurns, maxTurns: MAX_CUSTOM_TURNS, maxReached: userTurns >= MAX_CUSTOM_TURNS, llmLimitReached, llmNotice });
  }

  // ---------- Skenario tetap (tidak disesuaikan) ----------
  // Sama seperti Roleplay Bebas: tahapan + bank keberatan per sifat
  // (kartu persona dibangun dari skenario + pemetaan sifatnya), supaya sesi
  // tidak lagi mengulang 3 kalimat generik yang sama. Bedanya dengan sesi
  // yang disesuaikan: TIDAK ada batas 12 giliran di sini.
  const scenario = getScenario(session.scenarioId || "");
  if (!scenario) return NextResponse.json({ error: "Skenario tidak ditemukan." }, { status: 404 });
  const userTurns = userTextsBefore.length + 1;
  const card = scenarioToPersonaCard(scenario);
  await prisma.sessionMessage.create({ data: { sessionId: session.id, role: "user", content: String(content).trim() } });
  const history = [...session.messages.map((m: any) => ({ role: m.role, content: m.content })), { role: "user", content: String(content).trim() }];
  const userTexts = history.filter((m) => m.role === "user").map((m) => m.content);
  const t0 = Date.now();
  const llmAttempt = await tryLlmReply(user.id, () =>
    customRoleplayReplyLLM(card, session.level, history, memoryNote, scenario.context, scenario.goal, userTurns, register)
  );
  const llm = llmAttempt.reply;
  const reply = llm ? llm.text : customRoleplayReply(card, session.level, history, scenario.context, userTurns, register);
  const engine = llm ? llm.engine : "rule-based (persona)";
  const llmLimitReached = llmAttempt.capped;
  const llmNotice = llmLimitReached ? LLM_LIMIT_MESSAGE : null;
  const adapt = adaptLevel(scenario, session.level, userTexts);
  let adaptation = null;
  if (adapt.level !== session.level) {
    adaptation = await prisma.adaptationEvent.create({ data: { sessionId: session.id, fromLevel: session.level, toLevel: adapt.level, signal: adapt.signal, reason: adapt.reason } });
    await prisma.practiceSession.update({ where: { id: session.id }, data: { level: adapt.level } });
  }
  await prisma.sessionMessage.create({ data: { sessionId: session.id, role: "persona", content: reply } });
  return NextResponse.json({ reply, engine, level: adapt.level, adaptation, adaptReason: adapt.reason, tookMs: Date.now() - t0, stage: customStage(userTurns), userTurns, llmLimitReached, llmNotice });
}
