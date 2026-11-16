import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUserRows } from "@/lib/ensure";
export async function GET() {
  let user; try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  await ensureUserRows(user.id);
  const [memory, brand] = await Promise.all([
    prisma.learnerMemory.findUnique({ where: { userId: user.id } }),
    prisma.brandProfile.findUnique({ where: { userId: user.id } }),
  ]);
  return NextResponse.json({ memory, brandProfile: brand });
}
