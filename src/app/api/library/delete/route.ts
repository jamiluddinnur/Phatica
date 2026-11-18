// POST /api/library/delete?id=<scenarioId> (juga DELETE) — hapus skenario
// Skenarioku milik akun. Riwayat sesi TIDAK dihapus: sesi yang memakai
// skenario ini tetap ada, hanya tautannya dilepas (customScenarioId → null).
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function doDelete(req: Request) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "ID skenario tidak ada." }, { status: 400 });
  const existing = await prisma.customScenario.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Skenario tidak ditemukan." }, { status: 404 });
  // Lepas tautan sesi dulu (riwayat tetap tersimpan), baru hapus skenarionya.
  await prisma.practiceSession.updateMany({
    where: { userId: user.id, customScenarioId: existing.id },
    data: { customScenarioId: null },
  });
  await prisma.customScenario.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true, message: `Skenario "${existing.title}" dihapus. Riwayat sesimu yang memakai skenario ini tetap tersimpan.` });
}

export async function POST(req: Request) {
  return doDelete(req);
}

export async function DELETE(req: Request) {
  return doDelete(req);
}
