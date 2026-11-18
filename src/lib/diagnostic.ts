// Tes Awal + Jalur Belajar.
// 3 situasi singkat → skor 4 dimensi dasar (pakai scoreDimension yang sama
// dengan evaluator) → 2 dimensi terlemah → jalur 3 skenario dari katalog
// yang rubriknya melatih dimensi itu. "Sudah bisa" = skor ≥75 pada dimensi
// terlemah di 2 sesi (aturan jujur, ditulis di UI — bukan janji lolos).

import { SCENARIOS, type Scenario } from "./scenarios";
import { diagnosticScores, type DiagnosticScore } from "./ai";

export const DIAGNOSTIC_PROMPTS = [
  {
    key: "perkenalan",
    title: "Perkenalkan dirimu",
    prompt: "Bayangkan kamu di depan pewawancara kerja. Perkenalkan dirimu dan ceritakan kenapa kamu layak dipilih — dalam 3–5 kalimat.",
  },
  {
    key: "menolak",
    title: "Tolak permintaan",
    prompt: "Seorang teman dekat minta kamu meminjamkan uang dalam jumlah besar, padahal kamu sedang tidak bisa. Tolak permintaannya tanpa merusak hubungan — tulis jawabanmu seperti kamu mengatakannya langsung.",
  },
  {
    key: "kecewa",
    title: "Tanggapi orang yang kecewa",
    prompt: "Seseorang yang kamu sayangi kecewa karena kamu membatalkan janji penting. Tanggapi kekecewaannya — tulis apa yang akan kamu katakan padanya.",
  },
];

export type PathItem = { scenarioId: string; title: string; dimension: string; done: boolean };

// Kunci rubrik yang melatih tiap dimensi dasar.
// Termasuk kunci penyampaian (hook, nada) dari Pilar V Public Speaking —
// skenario Public Speaking ikut jadi kandidat jalur belajar bila dimensi
// terlemahnya cocok dengan rubriknya.
const DIMENSION_KEYS: Record<string, string[]> = {
  bukti: ["bukti", "dasar_angka", "bukti_bisnis", "kredibilitas", "nilai_audiens"],
  struktur: ["struktur", "pembuka", "masalah_solusi", "posisi", "kejelasan", "hook", "nada"],
  empati: ["empati", "mendengarkan", "validasi"],
  ketegasan: ["ketegasan", "kejelasan_maksud", "ketenangan_tegas", "percaya_diri", "bertahan"],
};

export function scoreDiagnostic(answers: string[]): { scores: DiagnosticScore[]; weakest: string[] } {
  const scores = diagnosticScores(answers);
  const weakest = [...scores].sort((a, b) => a.score - b.score).slice(0, 2).map((s) => s.key);
  return { scores, weakest };
}

export function buildPath(weakest: string[]): PathItem[] {
  const picked: Scenario[] = [];
  const used = new Set<string>();
  // Urut: 2 skenario untuk dimensi terlemah, 1 untuk dimensi terlemah kedua.
  const order = [weakest[0], weakest[1], weakest[0]];
  for (const dim of order) {
    const keys = DIMENSION_KEYS[dim] || [];
    const match = SCENARIOS.find((sc) => !used.has(sc.id) && sc.rubric.some((r) => keys.includes(r.key)));
    if (match) {
      used.add(match.id);
      picked.push(match);
    }
  }
  // Pengaman: bila ada yang kosong (tidak mungkin dengan katalog sekarang),
  // isi dari skenario pertama yang belum dipakai.
  for (const sc of SCENARIOS) {
    if (picked.length >= 3) break;
    if (!used.has(sc.id)) { used.add(sc.id); picked.push(sc); }
  }
  const label: Record<string, string> = { bukti: "Bukti", struktur: "Struktur", empati: "Empati", ketegasan: "Ketegasan" };
  return picked.map((sc, i) => ({ scenarioId: sc.id, title: sc.title, dimension: label[order[i]] || "Struktur", done: false }));
}
