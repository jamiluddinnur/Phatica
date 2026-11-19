// Umpan balik pengguna — validasi + ringkasan + cek pemilik.
// Fungsi murni (tanpa DB) supaya bisa diuji unit. OWNER_EMAIL hanya dibaca
// di server (route API / auth/me) — TIDAK PERNAH dikirim ke klien.
export const FEEDBACK_MAX_COMMENT = 1000;
export const FEEDBACK_MAX_PER_HOUR = 10;
export const FEEDBACK_WINDOW_MS = 60 * 60 * 1000; // 1 jam

export const RATING_LABELS = [
  "Sangat kurang",
  "Kurang",
  "Cukup",
  "Membantu",
  "Sangat membantu",
] as const;

export type FeedbackKind = "sesi" | "aplikasi";

export function ratingLabel(rating: number): string {
  return RATING_LABELS[rating - 1] || "";
}

/** Validasi input umpan balik. Kembalikan pesan error (Indonesia) atau null bila valid. */
export function validateFeedback(input: {
  rating: unknown;
  comment?: unknown;
  kind?: unknown;
  sessionId?: unknown;
}): string | null {
  const rating = input.rating;
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return "Rating harus angka 1 sampai 5.";
  }
  const kind = input.kind === undefined ? "aplikasi" : input.kind;
  if (kind !== "sesi" && kind !== "aplikasi") {
    return "Jenis umpan balik tidak dikenal.";
  }
  const comment = input.comment === undefined ? "" : input.comment;
  if (typeof comment !== "string") {
    return "Komentar harus berupa teks.";
  }
  if (comment.length > FEEDBACK_MAX_COMMENT) {
    return `Komentar maksimal ${FEEDBACK_MAX_COMMENT} karakter.`;
  }
  const sessionId = input.sessionId === undefined ? null : input.sessionId;
  if (kind === "sesi" && (typeof sessionId !== "string" || !sessionId.trim())) {
    return "Umpan balik sesi harus menunjuk ke satu sesi.";
  }
  if (sessionId !== null && typeof sessionId !== "string") {
    return "Sesi tidak dikenal.";
  }
  return null;
}

/** true bila email ini adalah email pemilik (OWNER_EMAIL). Perbandingan
 *  tidak peka huruf besar/kecil; OWNER_EMAIL kosong = tidak ada pemilik. */
export function isOwnerEmail(email: string | null | undefined, ownerEmail?: string | null): boolean {
  if (!email || !ownerEmail) return false;
  return email.trim().toLowerCase() === ownerEmail.trim().toLowerCase();
}

export function isOwner(email: string | null | undefined): boolean {
  return isOwnerEmail(email, process.env.OWNER_EMAIL);
}

export type FeedbackSummary = {
  total: number;
  average: number | null;
  distribution: Record<number, number>;
};

/** Ringkasan dari daftar rating: rata-rata (1 desimal) + jumlah per bintang. */
export function summarizeFeedback(ratings: number[]): FeedbackSummary {
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of ratings) {
    if (r >= 1 && r <= 5) distribution[r] += 1;
  }
  const total = ratings.length;
  const average =
    total === 0 ? null : Math.round((ratings.reduce((a, b) => a + b, 0) / total) * 10) / 10;
  return { total, average, distribution };
}
