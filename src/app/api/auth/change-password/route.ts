import { NextResponse } from "next/server";
import { requireUser, destroyOtherSessions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { logServerError } from "@/lib/log";

// POST /api/auth/change-password — ganti password untuk pengguna yang sudah masuk.
// Perlu password lama yang benar + password baru minimal 8 karakter.
// Sukses → sesi di perangkat LAIN dihapus (harus masuk lagi); sesi di
// perangkat ini tetap jalan, jadi pengguna tidak langsung terlempar keluar.
export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 });
  }
  try {
    const { currentPassword, newPassword } = await req.json().catch(() => ({}));
    const current = String(currentPassword || "");
    const next = String(newPassword || "");
    if (!current || !next) {
      return NextResponse.json({ error: "Password lama dan password baru wajib diisi." }, { status: 400 });
    }
    if (next.length < 8) {
      return NextResponse.json({ error: "Password baru minimal 8 karakter." }, { status: 400 });
    }
    if (!verifyPassword(current, user.passwordHash)) {
      return NextResponse.json({ error: "Password lama salah." }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(next) },
    });
    await destroyOtherSessions(user.id);
    return NextResponse.json({
      message: "Password berhasil diubah. Sesi di perangkat lain sudah diakhiri.",
    });
  } catch (err) {
    const errorId = logServerError("POST /api/auth/change-password", err);
    return NextResponse.json(
      { error: `Ada yang tidak beres — coba lagi nanti. (error id: ${errorId})` },
      { status: 500 }
    );
  }
}
