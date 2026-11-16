// Password hashing — scrypt (Node crypto bawaan, tanpa dependency tambahan).
// Format simpanan: "saltHex:hashHex". Password TIDAK PERNAH disimpan sebagai teks biasa.
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hashHex] = stored.split(":");
    if (!salt || !hashHex) return false;
    const hash = Buffer.from(hashHex, "hex");
    const attempt = scryptSync(password, salt, 64);
    return attempt.length === hash.length && timingSafeEqual(attempt, hash);
  } catch {
    return false;
  }
}
