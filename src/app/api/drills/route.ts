// Latihan Lanjutan (Drill 2 menit) — in-app saja, belum ada pengingat email.
// GET: drill hari ini (pending) + yang sudah selesai.
// POST: { drillId, attempt } → simpan jawaban latihan dan tandai selesai.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let user; try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  const [pending, done] = await Promise.all([
    prisma.drill.findMany({ where: { userId: user.id, status: "pending" }, orderBy: { dueAt: "asc" }, take: 5, include: { session: { select: { id: true, scenarioId: true } } } }),
    prisma.drill.findMany({ where: { userId: user.id, status: "done" }, orderBy: { updatedAt: "desc" }, take: 5 }),
  ]);
  return NextResponse.json({ pending, done });
}

export async function POST(req: Request) {
  let user; try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  const { drillId, attempt } = await req.json().catch(() => ({}));
  if (!drillId) return NextResponse.json({ error: "ID latihan tidak ada." }, { status: 400 });
  const drill = await prisma.drill.findFirst({ where: { id: String(drillId), userId: user.id } });
  if (!drill) return NextResponse.json({ error: "Latihan tidak ditemukan." }, { status: 404 });
  if (drill.status === "done") return NextResponse.json({ drill });
  const updated = await prisma.drill.update({
    where: { id: drill.id },
    data: { status: "done", attempt: String(attempt || "").trim() },
  });
  return NextResponse.json({ drill: updated });
}
