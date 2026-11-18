// POST /api/pillars/manage?id=<pillarId> — ubah nama/deskripsi/warna/ikon Pilarku.
// DELETE /api/pillars/manage?id=<pillarId>&fallback=<pillarKey> — hapus pilar.
// Menghapus pilar TIDAK menghapus skenarionya: semua skenario di pilar itu
// dipindah ke pilar bawaan pilihan pengguna (default "interpersonal").
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customPillarKey, isBuiltinPillarKey, validateCustomPillar } from "@/lib/custom-library";

async function getPillar(req: Request) {
  const user = await requireUser();
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return { error: NextResponse.json({ error: "ID pilar tidak ada." }, { status: 400 }) };
  const pillar = await prisma.customPillar.findFirst({ where: { id, userId: user.id } });
  if (!pillar) return { error: NextResponse.json({ error: "Pilar tidak ditemukan." }, { status: 404 }) };
  return { user, pillar };
}

export async function POST(req: Request) {
  let found;
  try { found = await getPillar(req); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  if (found.error) return found.error;
  const { user, pillar } = found;
  const body = await req.json().catch(() => ({}));
  const input = {
    name: String(body.name ?? pillar.name),
    description: String(body.description ?? pillar.description),
    color: String(body.color ?? pillar.color),
    icon: String(body.icon ?? pillar.icon),
  };
  const err = validateCustomPillar(input);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const clash = await prisma.customPillar.findFirst({ where: { userId: user.id, name: input.name.trim(), id: { not: pillar.id } } });
  if (clash) return NextResponse.json({ error: `Pilar "${input.name.trim()}" sudah ada — beri nama lain.` }, { status: 400 });
  const updated = await prisma.customPillar.update({
    where: { id: pillar.id },
    data: { name: input.name.trim(), description: input.description.trim(), color: input.color, icon: input.icon },
  });
  return NextResponse.json({ pillar: updated });
}

export async function DELETE(req: Request) {
  let found;
  try { found = await getPillar(req); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  if (found.error) return found.error;
  const { user, pillar } = found;
  const params = new URL(req.url).searchParams;
  const fallback = params.get("fallback") || "interpersonal";
  if (!isBuiltinPillarKey(fallback)) {
    return NextResponse.json({ error: "Pilih pilar bawaan tujuan pemindahan skenario (mis. interpersonal)." }, { status: 400 });
  }
  // Skenario TIDAK dihapus — dipindah ke pilar bawaan pilihan pengguna.
  const moved = await prisma.customScenario.updateMany({
    where: { userId: user.id, pillarKey: customPillarKey(pillar.id) },
    data: { pillarKey: fallback },
  });
  await prisma.customPillar.delete({ where: { id: pillar.id } });
  return NextResponse.json({
    ok: true,
    movedScenarios: moved.count,
    message: `Pilar "${pillar.name}" dihapus. ${moved.count} skenario dipindah ke pilar ${fallback} — tidak ada skenario yang hilang.`,
  });
}
