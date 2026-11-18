// Logging error server yang terstruktur — tanpa stack trace atau rahasia
// di respons ke pengguna. Setiap error mendapat id pendek yang bisa
// dikutip pengguna saat melapor ("error id: xxxx"), supaya pemilik aplikasi
// bisa mencarinya di log Vercel.
import { randomBytes } from "crypto";

export function newErrorId(): string {
  return randomBytes(4).toString("hex");
}

/** Catat error server ke console (Vercel log) + kembalikan id-nya. */
export function logServerError(route: string, err: unknown): string {
  const id = newErrorId();
  const message = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ level: "error", route, errorId: id, at: new Date().toISOString(), message: message.slice(0, 500) }));
  return id;
}
