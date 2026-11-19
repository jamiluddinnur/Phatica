// Rate limiting + perlindungan penyalahgunaan — DB-backed (Prisma) supaya
// batas tetap berlaku di semua instance serverless Vercel. JANGAN mengandalkan
// Map di memori saja: tiap instance serverless punya memorinya sendiri.
//
// Konstanta (semua dalam hitungan yang mudah diubah di satu tempat):
// - LOGIN: maks 10 percobaan GAGAL per email+IP per 15 menit.
// - REGISTER: maks 5 pendaftaran per IP per jam.
// - MESSAGE / END: maks 30 request per pengguna per menit.
// - CUSTOM_CREATE: maks 10 pembuatan Roleplay Bebas per pengguna per jam.
// - TTS: maks 30 request suara cloud per pengguna per menit.
import { prisma } from "./prisma";

export const LOGIN_MAX_FAILED = 10;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 menit
export const REGISTER_MAX_PER_HOUR = 5;
export const REGISTER_WINDOW_MS = 60 * 60 * 1000; // 1 jam
export const MESSAGE_MAX_PER_MINUTE = 30;
export const MESSAGE_WINDOW_MS = 60 * 1000; // 1 menit
export const CUSTOM_CREATE_MAX_PER_HOUR = 10;
export const CUSTOM_CREATE_WINDOW_MS = 60 * 60 * 1000; // 1 jam
export const FEEDBACK_MAX_PER_HOUR = 10;
export const FEEDBACK_WINDOW_MS = 60 * 60 * 1000; // 1 jam
export const TTS_MAX_PER_MINUTE = 30;
export const TTS_WINDOW_MS = 60 * 1000; // 1 menit

export const LOGIN_BLOCKED_MESSAGE =
  "Terlalu banyak percobaan, coba lagi 15 menit lagi";

// --- Fungsi murni (tanpa DB) — bisa diuji unit tanpa database. ---

/** true bila jendela yang dimulai di windowStart sudah habis pada `now`. */
export function isWindowExpired(windowStart: Date, windowMs: number, now: Date = new Date()): boolean {
  return now.getTime() - new Date(windowStart).getTime() >= windowMs;
}

/** true bila jumlah hit dalam jendela sudah mencapai batas. */
export function isOverLimit(count: number, limit: number): boolean {
  return count >= limit;
}

/** Sisa detik sampai jendela berakhir (untuk header Retry-After). Minimal 1. */
export function retryAfterSeconds(windowStart: Date, windowMs: number, now: Date = new Date()): number {
  const remainingMs = new Date(windowStart).getTime() + windowMs - now.getTime();
  return Math.max(1, Math.ceil(remainingMs / 1000));
}

// --- Pembantu request ---

/** IP klien dari header x-forwarded-for (nilai pertama), fallback "unknown". */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}

// --- Operasi DB (fail-open: bila DB tidak terjangkau, izinkan request dan
// catat ke log — lebih baik daripada mengunci semua pengguna karena DB down;
// login tetap gagal sendiri bila DB down, jadi tidak ada celah bypass). ---

export type RateLimitResult = { allowed: boolean; retryAfterSec: number };

/**
 * Hitung satu request terhadap kunci ini. Kembalikan allowed=false bila
 * batas sudah tercapai dalam jendela berjalan. Jendela kedaluwarsa direset.
 */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  try {
    const now = new Date();
    const row = await prisma.rateLimit.findUnique({ where: { key } });
    if (!row || isWindowExpired(row.windowStart, windowMs, now)) {
      await prisma.rateLimit.upsert({
        where: { key },
        update: { count: 1, windowStart: now },
        create: { key, count: 1, windowStart: now },
      });
      return { allowed: true, retryAfterSec: 0 };
    }
    if (isOverLimit(row.count, limit)) {
      return { allowed: false, retryAfterSec: retryAfterSeconds(row.windowStart, windowMs, now) };
    }
    await prisma.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
    return { allowed: true, retryAfterSec: 0 };
  } catch (err) {
    console.error("[rate-limit] gagal memeriksa batas, fail-open", { key, err: String(err) });
    return { allowed: true, retryAfterSec: 0 };
  }
}

/** Cek saja (tanpa menghitung) apakah kunci ini sedang diblokir. */
export async function isRateLimited(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  try {
    const now = new Date();
    const row = await prisma.rateLimit.findUnique({ where: { key } });
    if (!row || isWindowExpired(row.windowStart, windowMs, now)) return { allowed: true, retryAfterSec: 0 };
    if (isOverLimit(row.count, limit)) {
      return { allowed: false, retryAfterSec: retryAfterSeconds(row.windowStart, windowMs, now) };
    }
    return { allowed: true, retryAfterSec: 0 };
  } catch {
    return { allowed: true, retryAfterSec: 0 };
  }
}

/** Catat satu percobaan gagal (dipakai login: hanya yang GAGAL yang dihitung). */
export async function recordFailedAttempt(key: string, windowMs: number): Promise<void> {
  try {
    const now = new Date();
    const row = await prisma.rateLimit.findUnique({ where: { key } });
    if (!row || isWindowExpired(row.windowStart, windowMs, now)) {
      await prisma.rateLimit.upsert({
        where: { key },
        update: { count: 1, windowStart: now },
        create: { key, count: 1, windowStart: now },
      });
    } else {
      await prisma.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
    }
  } catch (err) {
    console.error("[rate-limit] gagal mencatat percobaan gagal", { key, err: String(err) });
  }
}

/** Hapus kunci (dipakai login: login sukses mereset hitungan gagal). */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    await prisma.rateLimit.deleteMany({ where: { key } });
  } catch {
    // Abaikan — reset hanyalah kebersihan, bukan syarat login.
  }
}

/** Respons 429 standar dengan header Retry-After. */
export function rateLimitedResponse(message: string, retryAfterSec: number) {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: { "Content-Type": "application/json", "Retry-After": String(retryAfterSec) },
  });
}
