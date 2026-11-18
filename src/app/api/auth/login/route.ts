import { NextResponse } from "next/server";
import { loginWithEmail } from "@/lib/auth";
import {
  LOGIN_MAX_FAILED,
  LOGIN_WINDOW_MS,
  LOGIN_BLOCKED_MESSAGE,
  getClientIp,
  isRateLimited,
  recordFailedAttempt,
  resetRateLimit,
  rateLimitedResponse,
} from "@/lib/rate-limit";

// POST /api/auth/login — masuk dengan email + password.
// Password salah atau email tidak terdaftar → 401.
// Perlindungan: maks 10 percobaan GAGAL per email+IP per 15 menit → 429.
// Login sukses mereset hitungan gagal.
export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPassword = String(password || "");
  if (!cleanEmail || !cleanPassword) {
    return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
  }
  const key = `login:${cleanEmail}:${getClientIp(req)}`;
  const blocked = await isRateLimited(key, LOGIN_MAX_FAILED, LOGIN_WINDOW_MS);
  if (!blocked.allowed) {
    return rateLimitedResponse(LOGIN_BLOCKED_MESSAGE, blocked.retryAfterSec);
  }
  const user = await loginWithEmail(cleanEmail, cleanPassword);
  if (!user) {
    await recordFailedAttempt(key, LOGIN_WINDOW_MS);
    return NextResponse.json({ error: "Email atau password salah. Coba lagi." }, { status: 401 });
  }
  await resetRateLimit(key);
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
}
