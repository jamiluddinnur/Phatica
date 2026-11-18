import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { destroyAllSessions } from "@/lib/auth";
import { hashResetToken } from "@/lib/password-reset";
import { logServerError } from "@/lib/log";

// POST /api/auth/reset — pakai token dari email untuk ganti password.
// Token sekali pakai (usedAt) dan berlaku 1 jam. Sukses → SEMUA sesi
// pengguna dihapus, jadi semua perangkat harus masuk lagi dengan
// password baru.
export async function POST(req: Request) {
  try {
    const { token, password } = await req.json().catch(() => ({}));
    const rawToken = String(token || "").trim();
    const newPassword = String(password || "");
    if (!rawToken || !newPassword) {
      return NextResponse.json({ error: "Token dan password baru wajib diisi." }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password minimal 8 karakter." }, { status: 400 });
    }
    const row = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashResetToken(rawToken) },
    });
    if (!row || row.usedAt || row.expiresAt.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru di halaman Lupa Password." },
        { status: 400 }
      );
    }
    await prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    });
    await prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash: hashPassword(newPassword) },
    });
    await destroyAllSessions(row.userId);
    return NextResponse.json({
      message: "Password berhasil diubah. Silakan masuk dengan password barumu.",
    });
  } catch (err) {
    const errorId = logServerError("POST /api/auth/reset", err);
    return NextResponse.json(
      { error: `Ada yang tidak beres — coba lagi nanti. (error id: ${errorId})` },
      { status: 500 }
    );
  }
}
