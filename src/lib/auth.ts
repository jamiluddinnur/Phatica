// Auth email + password SAJA — sistem sesi custom (tanpa library auth eksternal).
// Sesi 30 hari: token acak disimpan sebagai hash SHA-256 di tabel Session,
// dikirim sebagai cookie httpOnly "phatica_session". Tidak ada provider
// login pihak ketiga, tidak ada OAuth.
import { cookies } from "next/headers";
import { randomBytes, createHash } from "crypto";
import { prisma } from "./prisma";
import { verifyPassword } from "./password";

const COOKIE_NAME = "phatica_session";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function getSessionSecret(): string {
  return process.env.SESSION_SECRET || "";
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS);
  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });
  const store = cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });
  return token;
}

export async function destroySession() {
  try {
    const token = cookies().get(COOKIE_NAME)?.value;
    if (token) {
      await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
    }
  } catch {
    // Abaikan — logout tetap berhasil walau database tidak terjangkau.
  }
  const store = cookies();
  store.set(COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function destroyAllSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}

/** Hapus semua sesi pengguna KECUALI sesi yang sedang dipakai (dari cookie saat ini).
 * Dipakai setelah ganti password: perangkat lain harus masuk lagi,
 * sesi di perangkat ini tetap jalan. */
export async function destroyOtherSessions(userId: string) {
  try {
    const token = cookies().get(COOKIE_NAME)?.value;
    if (!token) {
      await destroyAllSessions(userId);
      return;
    }
    await prisma.session.deleteMany({
      where: { userId, tokenHash: { not: hashToken(token) } },
    });
  } catch {
    // Abaikan — ganti password tetap berhasil walau sesi lain tidak terhapus.
  }
}

export async function getServerUser() {
  try {
    const token = cookies().get(COOKIE_NAME)?.value;
    if (!token) return null;
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (!session || session.expiresAt.getTime() <= Date.now()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      }
      return null;
    }
    return session.user;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getServerUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function loginWithEmail(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (!user || !user.passwordHash) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  await createSession(user.id);
  return user;
}
