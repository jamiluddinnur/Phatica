// Batas pemakaian LLM harian — penghemat biaya LLM (berlaku sama untuk
// OpenAI maupun Gemini: SATU batas, satu hitungan, bukan satu batas per penyedia).
// Batas: 30 giliran LLM per pengguna per hari (WIB). Bila tercapai, sesi
// lanjut dengan mesin rule-based (tanpa batas) dan UI menampilkan pesan jujur.
// Giliran rule-based TIDAK dihitung. Satu giliran dihitung HANYA bila
// panggilan LLM benar-benar berhasil (increment setelah respons sukses).
import { prisma } from "./prisma";
import { hasAnyLlmKey } from "./llm-provider";

export const LLM_DAILY_TURN_LIMIT = 30;
export const LLM_LIMIT_MESSAGE =
  "Batas AI hari ini tercapai — lanjut dengan mode latihan dasar, besok kembali normal";

/** Tanggal hari ini (yyyy-mm-dd) dalam WIB. */
export function todayDateString(now: Date = new Date()): string {
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 10);
}

/** Fungsi murni — bisa diuji tanpa database. */
export function isDailyCapReached(turns: number, limit: number = LLM_DAILY_TURN_LIMIT): boolean {
  return turns >= limit;
}

/** Jumlah giliran LLM pengguna hari ini (0 bila belum ada baris). */
export async function getTodayLlmTurns(userId: string): Promise<number> {
  try {
    const row = await prisma.llmUsage.findUnique({
      where: { userId_date: { userId, date: todayDateString() } },
    });
    return row?.turns ?? 0;
  } catch {
    return 0;
  }
}

/** true bila pengguna sudah mencapai batas LLM hari ini. */
export async function isLlmCapReached(userId: string): Promise<boolean> {
  return isDailyCapReached(await getTodayLlmTurns(userId));
}

/** Tambah 1 giliran LLM hari ini — panggil HANYA setelah panggilan LLM sukses. */
export async function incrementLlmTurn(userId: string): Promise<void> {
  try {
    const date = todayDateString();
    await prisma.llmUsage.upsert({
      where: { userId_date: { userId, date } },
      update: { turns: { increment: 1 } },
      create: { userId, date, turns: 1 },
    });
  } catch (err) {
    // Gagal mencatat pemakaian bukan alasan menggagalkan sesi — catat saja.
    console.error("[llm-usage] gagal mencatat giliran LLM", { userId, err: String(err) });
  }
}

export type LlmAttemptResult<T = string> = { reply: T | null; capped: boolean };

/**
 * Jalankan satu panggilan LLM dengan penjaga batas harian.
 * - Tanpa kunci LLM apa pun (OpenAI maupun Gemini): kembalikan
 *   { reply: null, capped: false } (pemanggil lalu memakai rule-based
 *   seperti biasa).
 * - Batas tercapai: jangan panggil LLM sama sekali, capped: true.
 * - LLM sukses: hitung 1 giliran (penyedia apa pun — batasnya satu),
 *   kembalikan balasannya.
 * - LLM gagal/null: capped: false, reply null (pemanggil memakai rule-based,
 *   tanpa menghitung giliran).
 */
export async function tryLlmReply<T>(
  userId: string,
  call: () => Promise<T | null>
): Promise<LlmAttemptResult<T>> {
  if (!hasAnyLlmKey()) return { reply: null, capped: false };
  if (await isLlmCapReached(userId)) return { reply: null, capped: true };
  const reply = await call();
  if (reply) await incrementLlmTurn(userId);
  return { reply, capped: false };
}
