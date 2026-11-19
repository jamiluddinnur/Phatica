// Umpan balik pengguna — POST kirim (login, rate-limit 10/jam), GET baca.
// GET tanpa ?mine=1 HANYA untuk pemilik (email login == OWNER_EMAIL):
// tanpa OWNER_EMAIL atau email tidak cocok → 403. Komentar hanya terlihat
// oleh pemilik + pengirimnya sendiri — tidak pernah oleh pengguna lain.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, FEEDBACK_MAX_PER_HOUR, FEEDBACK_WINDOW_MS } from "@/lib/rate-limit";
import {
  FEEDBACK_MAX_COMMENT,
  isOwner,
  summarizeFeedback,
  validateFeedback,
} from "@/lib/feedback";

function sessionTitle(s: any): string {
  if (!s) return "";
  if (s.customScenario) return `Skenarioku: ${s.customScenario.title}`;
  if (s.customRoleplay?.sourceScenarioId)
    return `Disesuaikan olehmu: ${s.customRoleplay.personaName}`;
  if (s.customRoleplay) return `Roleplay Bebas: ${s.customRoleplay.personaName}`;
  return s.scenarioId || "Roleplay Bebas";
}

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 });
  }
  const rl = await checkRateLimit(`feedback:${user.id}`, FEEDBACK_MAX_PER_HOUR, FEEDBACK_WINDOW_MS);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak umpan balik — coba lagi satu jam lagi." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }
  const body = await req.json().catch(() => ({}));
  const err = validateFeedback(body);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const kind = body.kind === "sesi" ? "sesi" : "aplikasi";
  const sessionId = kind === "sesi" ? String(body.sessionId) : null;
  if (sessionId) {
    const s = await prisma.practiceSession.findFirst({
      where: { id: sessionId, userId: user.id },
    });
    if (!s) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 400 });
    const existing = await prisma.feedback.findFirst({
      where: { userId: user.id, sessionId },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Kamu sudah memberi penilaian untuk sesi ini." },
        { status: 409 }
      );
    }
  }
  const fb = await prisma.feedback.create({
    data: {
      userId: user.id,
      rating: body.rating,
      comment: String(body.comment || "").slice(0, FEEDBACK_MAX_COMMENT),
      kind,
      sessionId,
    },
  });
  return NextResponse.json({ feedback: fb, message: "Terima kasih atas umpan balikmu." });
}

export async function GET(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 });
  }
  const mine = new URL(req.url).searchParams.get("mine") === "1";
  if (mine) {
    const items = await prisma.feedback.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { session: { include: { customScenario: true, customRoleplay: true } } },
    });
    return NextResponse.json({
      items: items.map((f) => ({
        id: f.id,
        rating: f.rating,
        comment: f.comment,
        kind: f.kind,
        sessionId: f.sessionId,
        sessionTitle: f.session ? sessionTitle(f.session) : "",
        createdAt: f.createdAt,
      })),
    });
  }
  if (!isOwner(user.email)) {
    return NextResponse.json(
      { error: "Hanya pemilik aplikasi yang bisa melihat umpan balik pengguna." },
      { status: 403 }
    );
  }
  const items = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: true,
      session: { include: { customScenario: true, customRoleplay: true } },
    },
  });
  const summary = summarizeFeedback(items.map((f) => f.rating));
  return NextResponse.json({
    summary,
    items: items.map((f) => ({
      id: f.id,
      rating: f.rating,
      comment: f.comment,
      kind: f.kind,
      sessionId: f.sessionId,
      sessionTitle: f.session ? sessionTitle(f.session) : "",
      userName: f.user.name || "",
      userEmail: f.user.email,
      createdAt: f.createdAt,
    })),
  });
}
