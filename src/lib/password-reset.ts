// Token reset password — token mentah dibuat di sini, disimpan HANYA sebagai
// hash SHA-256 di tabel PasswordResetToken. Token mentah tidak pernah
// ditulis ke log dan tidak pernah dikembalikan di respons API; ia hanya
// dikirim lewat email (bila layanan email dipasang) atau tidak ke mana-mana.
import { randomBytes, createHash } from "crypto";
import { prisma } from "./prisma";

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 jam

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Buat token reset untuk pengguna; kembalikan token MENTAH (untuk email saja). */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashResetToken(token),
      userId,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });
  return token;
}

/** Kirim email reset via Resend HTTP API. Kembalikan false bila tidak terpasang/gagal. */
export async function sendResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from,
        to,
        subject: "Reset password Phatica",
        html: `<p>Kamu meminta reset password Phatica. Klik tautan ini (berlaku 1 jam, sekali pakai):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Kalau kamu tidak meminta ini, abaikan email ini — passwordmu tidak berubah.</p>`,
        text: `Kamu meminta reset password Phatica. Buka tautan ini (berlaku 1 jam, sekali pakai): ${resetUrl}\n\nKalau kamu tidak meminta ini, abaikan email ini — passwordmu tidak berubah.`,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** true bila layanan email reset terpasang (Resend). Bukan rahasia — aman ditampilkan di UI. */
export function isEmailResetConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}
