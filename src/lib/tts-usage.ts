// Batas pemakaian TTS (ElevenLabs) harian — penghemat kredit suara cloud.
// Batas: 3.000 karakter per pengguna per hari (WIB). Kredit paket gratis
// ElevenLabs hanya 10.000/bulan untuk SELURUH aplikasi, jadi tanpa penjaga
// ini satu pengguna aktif bisa menghabiskannya dalam hitungan hari.
// - Bila batas akan terlampaui: JANGAN panggil ElevenLabs sama sekali;
//   rute /api/tts menjawab fallback dan klien memakai suara browser.
// - Karakter dihitung HANYA untuk generasi yang berhasil (rute mencatat
//   setelah respons ElevenLabs sukses — generasi gagal tidak dihitung).
import { prisma } from "./prisma";
import { todayDateString } from "./llm-usage";

export const TTS_DAILY_CHAR_LIMIT = 3000;

/** Fungsi murni — true bila menambah addChars ke usedChars melewati batas. */
export function wouldExceedTtsCap(
  usedChars: number,
  addChars: number,
  limit: number = TTS_DAILY_CHAR_LIMIT
): boolean {
  return usedChars + addChars > limit;
}

/**
 * Penyimpanan hitungan pemakaian — diabstraksi supaya logika batas bisa
 * diuji dengan penyimpanan palsu di memori, tanpa database (pola yang
 * sama seperti tes fungsi murni llm-usage/rate-limit).
 */
export type TtsUsageStore = {
  getChars(userId: string, date: string): Promise<number>;
  addChars(userId: string, date: string, chars: number): Promise<void>;
};

const prismaStore: TtsUsageStore = {
  async getChars(userId, date) {
    const row = await prisma.ttsUsage.findUnique({
      where: { userId_date: { userId, date } },
    });
    return row?.chars ?? 0;
  },
  async addChars(userId, date, chars) {
    await prisma.ttsUsage.upsert({
      where: { userId_date: { userId, date } },
      update: { chars: { increment: chars } },
      create: { userId, date, chars },
    });
  },
};

/** Jumlah karakter TTS pengguna pada `date` (default: hari ini WIB). */
export async function getTtsChars(
  userId: string,
  opts: { store?: TtsUsageStore; date?: string } = {}
): Promise<number> {
  const store = opts.store ?? prismaStore;
  try {
    return await store.getChars(userId, opts.date ?? todayDateString());
  } catch {
    return 0;
  }
}

/** true bila generasi sebesar `chars` masih muat dalam batas hari ini. */
export async function checkTtsCap(
  userId: string,
  chars: number,
  opts: { store?: TtsUsageStore; date?: string; limit?: number } = {}
): Promise<boolean> {
  const used = await getTtsChars(userId, opts);
  return !wouldExceedTtsCap(used, chars, opts.limit ?? TTS_DAILY_CHAR_LIMIT);
}

/** Catat karakter dari satu generasi yang BERHASIL. */
export async function recordTtsUsage(
  userId: string,
  chars: number,
  opts: { store?: TtsUsageStore; date?: string } = {}
): Promise<void> {
  const store = opts.store ?? prismaStore;
  try {
    await store.addChars(userId, opts.date ?? todayDateString(), chars);
  } catch (err) {
    // Gagal mencatat bukan alasan menggagalkan suara yang sudah jadi.
    console.error("[tts-usage] gagal mencatat pemakaian TTS", { userId, err: String(err) });
  }
}

/**
 * Cek + catat dalam satu langkah: kembalikan false (dan jangan catat)
 * bila generasi sebesar `chars` akan melewati batas hari ini; selain itu
 * catat dan kembalikan true. Bucket terpisah per tanggal — hari baru,
 * hitungan baru.
 */
export async function checkAndRecordTtsUsage(
  userId: string,
  chars: number,
  opts: { store?: TtsUsageStore; date?: string; limit?: number } = {}
): Promise<boolean> {
  const allowed = await checkTtsCap(userId, chars, opts);
  if (!allowed) return false;
  await recordTtsUsage(userId, chars, opts);
  return true;
}
