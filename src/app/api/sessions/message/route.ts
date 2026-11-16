// POST /api/sessions/message?id=<sessionId> — kirim jawaban, terima balasan persona + adaptasi level.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getScenario } from "@/lib/scenarios";
import { roleplayReply, roleplayReplyLLM, adaptLevel } from "@/lib/ai";

export async function POST(req: Request) {
  let user; try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "ID sesi tidak ada." }, { status: 400 });
  const { content } = await req.json().catch(() => ({}));
  if (!content || !String(content).trim()) return NextResponse.json({ error: "Tulis jawabanmu dulu." }, { status: 400 });
  const session = await prisma.practiceSession.findFirst({ where: { id: id, userId: user.id }, include: { messages: { orderBy: { createdAt: "asc" } } } });
  if (!session || session.status !== "active") return NextResponse.json({ error: "Sesi tidak aktif." }, { status: 404 });
  const scenario = getScenario(session.scenarioId);
  if (!scenario) return NextResponse.json({ error: "Skenario tidak ditemukan." }, { status: 404 });
  await prisma.sessionMessage.create({ data: { sessionId: session.id, role: "user", content: String(content).trim() } });
  const history = [...session.messages.map((m: any) => ({ role: m.role, content: m.content })), { role: "user", content: String(content).trim() }];
  const memory = await prisma.learnerMemory.findUnique({ where: { userId: user.id } });
  const memoryNote = memory ? `Gaya: ${memory.styleTraits || "-"}; Kelemahan berulang: ${memory.weaknesses || "-"}; Kekuatan: ${memory.strengths || "-"}` : "";
  const userTexts = history.filter((m) => m.role === "user").map((m) => m.content);
  const t0 = Date.now();
  const llm = await roleplayReplyLLM(scenario, session.level, history, memoryNote);
  const reply = llm || roleplayReply(scenario, session.level, history, memoryNote);
  const adapt = adaptLevel(scenario, session.level, userTexts);
  let adaptation = null;
  if (adapt.level !== session.level) {
    adaptation = await prisma.adaptationEvent.create({ data: { sessionId: session.id, fromLevel: session.level, toLevel: adapt.level, signal: adapt.signal, reason: adapt.reason } });
    await prisma.practiceSession.update({ where: { id: session.id }, data: { level: adapt.level } });
  }
  await prisma.sessionMessage.create({ data: { sessionId: session.id, role: "persona", content: reply } });
  return NextResponse.json({ reply, engine: llm ? "openai" : "rule-based", level: adapt.level, adaptation, adaptReason: adapt.reason, tookMs: Date.now() - t0 });
}
