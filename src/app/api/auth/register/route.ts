import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { ensureUserRows } from "@/lib/ensure";
import { createSession } from "@/lib/auth";
import {
  REGISTER_MAX_PER_HOUR,
  REGISTER_WINDOW_MS,
  checkRateLimit,
  getClientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";

// POST /api/auth/register — daftar dengan email + password.
// Password minimal 8 karakter, disimpan HANYA sebagai hash scrypt.
// Email duplikat ditolak (409). Tidak ada akun demo, tidak ada auto-login:
// setelah daftar, sesi langsung dibuat (auto-login) — frontend cukup memuat ulang data.
// Perlindungan: maks 5 pendaftaran per IP per jam → 429.
export async function POST(req: Request) {
  const limited = await checkRateLimit(
    `register:${getClientIp(req)}`,
    REGISTER_MAX_PER_HOUR,
    REGISTER_WINDOW_MS
  );
  if (!limited.allowed) {
    return rateLimitedResponse("Terlalu banyak pendaftaran dari alamat ini, coba lagi 1 jam lagi.", limited.retryAfterSec);
  }
  const { name, email, password } = await req.json().catch(() => ({}));
  const cleanName = String(name || "").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPassword = String(password || "");
  if (cleanName.length < 2) {
    return NextResponse.json({ error: "Nama minimal 2 karakter." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return NextResponse.json({ error: "Format email tidak valid." }, { status: 400 });
  }
  if (cleanPassword.length < 8) {
    return NextResponse.json({ error: "Password minimal 8 karakter." }, { status: 400 });
  }
  const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (existing) {
    return NextResponse.json({ error: "Email sudah terdaftar. Silakan masuk." }, { status: 409 });
  }
  const user = await prisma.user.create({
    data: { name: cleanName, email: cleanEmail, passwordHash: hashPassword(cleanPassword) },
  });
  await ensureUserRows(user.id);
  await createSession(user.id);
  return NextResponse.json(
    { user: { id: user.id, name: user.name, email: user.email } },
    { status: 201 }
  );
}
