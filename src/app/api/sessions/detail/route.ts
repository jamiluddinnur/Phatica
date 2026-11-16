import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/sessions/detail?id=<sessionId> — detail satu sesi latihan milik akun.
export async function GET(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 });
  }
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "ID sesi tidak ada." }, { status: 400 });
  const s = await prisma.practiceSession.findFirst({
    where: { id, userId: user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      adaptations: { orderBy: { createdAt: "asc" } },
      evaluation: true,
    },
  });
  if (!s) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ session: s });
}
