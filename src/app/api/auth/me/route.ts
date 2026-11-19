import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isOwner } from "@/lib/feedback";
export async function GET() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ user: null, isOwner: false });
  const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
  // isOwner: apakah akun ini pemilik aplikasi (email == OWNER_EMAIL).
  // Nilainya boolean saja — nilai OWNER_EMAIL TIDAK PERNAH dikirim ke klien.
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email }, isOwner: isOwner(user.email), plan: sub?.plan || "free", subscription: sub || null });
}
