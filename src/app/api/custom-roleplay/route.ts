// GET /api/custom-roleplay — daftar Skenario Buatanmu milik akun ini saja.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  const items = await prisma.customRoleplay.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({
    items: items.map((c) => ({ ...c, personaCard: JSON.parse(c.personaCard), rubric: JSON.parse(c.rubric) })),
  });
}
