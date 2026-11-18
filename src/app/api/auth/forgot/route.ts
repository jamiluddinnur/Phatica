import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createPasswordResetToken,
  sendResetEmail,
  isEmailResetConfigured,
} from "@/lib/password-reset";
import { logServerError } from "@/lib/log";

// POST /api/auth/forgot — minta tautan reset password.
// SELALU mengembalikan pesan generik yang sama, baik email terdaftar maupun
// tidak — supaya tidak bisa dipakai menebak email siapa yang terdaftar.
// Bila RESEND_API_KEY + EMAIL_FROM dipasang, tautan dikirim lewat email.
// Bila tidak dipasang, token TIDAK PERNAH dikembalikan di respons — UI
// menampilkan pesan jujur "Layanan email belum dipasang — hubungi pemilik
// aplikasi untuk reset manual" (lihat field emailConfigured).
export async function POST(req: Request) {
  const generic = {
    message:
      "Kalau email itu terdaftar, tautan reset password sudah dikirim. Cek kotak masukmu (dan folder spam). Tautan berlaku 1 jam dan sekali pakai.",
    emailConfigured: isEmailResetConfigured(),
  };
  try {
    const { email } = await req.json().catch(() => ({}));
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail) return NextResponse.json(generic);
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    // Email tidak terdaftar → tetap balas generik, jangan beri tahu.
    if (!user) return NextResponse.json(generic);
    if (!isEmailResetConfigured()) return NextResponse.json(generic);
    const token = await createPasswordResetToken(user.id);
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "phatica.vercel.app";
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const resetUrl = `${proto}://${host}/reset?token=${token}`;
    const sent = await sendResetEmail(user.email, resetUrl);
    if (!sent) {
      // Email gagal terkirim — hapus token yang sudah dibuat supaya tidak
      // ada token menggantung yang tidak pernah sampai ke pengguna.
      const { hashResetToken } = await import("@/lib/password-reset");
      await prisma.passwordResetToken.deleteMany({ where: { tokenHash: hashResetToken(token) } });
    }
    return NextResponse.json(generic);
  } catch (err) {
    const errorId = logServerError("POST /api/auth/forgot", err);
    // Tetap balas generik — jangan bocorkan kondisi server ke penebak email.
    return NextResponse.json({ ...generic, errorId });
  }
}
