// Skenarioku + Pilarku — logika murni perpustakaan latihan milik pengguna.
// Semua fungsi di sini tanpa database / tanpa I/O, jadi bisa diuji unit
// (lihat tests/library.test.ts). Aturan yang ditegakkan server memakai
// konstanta dan validator yang sama dengan yang dipakai UI (wizard).
import { TRAITS, buildPersonaCard, findBlockedTerm, traitForScenario, type Trait } from "./custom-roleplay";
export type { Trait } from "./custom-roleplay";
import type { RubricItem } from "./custom-roleplay";
import type { Scenario } from "./scenarios";

// --- Batas (konstanta bernama, ditegakkan server-side) ---
export const MAX_CUSTOM_PILLARS = 5;
export const MAX_CUSTOM_SCENARIOS = 20;
export const PILLAR_LIMIT_MESSAGE =
  "Kamu sudah punya 5 pilar — hapus satu dulu sebelum membuat yang baru.";
export const SCENARIO_LIMIT_MESSAGE =
  "Kamu sudah punya 20 skenario — hapus satu dulu sebelum membuat yang baru.";

export function isPillarLimitReached(count: number): boolean {
  return count >= MAX_CUSTOM_PILLARS;
}
export function isScenarioLimitReached(count: number): boolean {
  return count >= MAX_CUSTOM_SCENARIOS;
}

// --- Pilarku: palet warna & ikon tetap (pilihan pengguna, tanpa teks bebas) ---
export const PILLAR_COLORS = ["#14B8A6", "#191641", "#D97706", "#DC2626", "#2563EB", "#7C3AED"] as const;
export const PILLAR_ICONS = ["chat", "briefcase", "family", "target", "mic", "star", "shield", "heart"] as const;
export type PillarColor = (typeof PILLAR_COLORS)[number];
export type PillarIcon = (typeof PILLAR_ICONS)[number];

export function isPillarColor(v: string): v is PillarColor {
  return (PILLAR_COLORS as readonly string[]).includes(v);
}
export function isPillarIcon(v: string): v is PillarIcon {
  return (PILLAR_ICONS as readonly string[]).includes(v);
}

export function validateCustomPillar(input: { name: string; description?: string; color: string; icon: string }): string | null {
  const name = (input.name || "").trim();
  if (name.length < 2) return "Nama pilar minimal 2 karakter.";
  if (name.length > 40) return "Nama pilar maksimal 40 karakter.";
  if ((input.description || "").trim().length > 200) return "Deskripsi pilar maksimal 200 karakter.";
  if (!isPillarColor(input.color)) return "Pilih warna pilar dari pilihan yang tersedia.";
  if (!isPillarIcon(input.icon)) return "Pilih ikon pilar dari pilihan yang tersedia.";
  return null;
}

// --- Pilar bawaan (slug ↔ nama) ---
export const BUILTIN_PILLARS = [
  { key: "interpersonal", name: "Interpersonal" },
  { key: "pr-krisis", name: "PR / Krisis" },
  { key: "marketing-sales", name: "Marketing & Sales" },
  { key: "personal-branding", name: "Personal Branding" },
  { key: "public-speaking", name: "Public Speaking" },
] as const;
export type BuiltinPillarKey = (typeof BUILTIN_PILLARS)[number]["key"];

export function isBuiltinPillarKey(v: string): v is BuiltinPillarKey {
  return BUILTIN_PILLARS.some((p) => p.key === v);
}
export function builtinPillarName(key: string): string | null {
  return BUILTIN_PILLARS.find((p) => p.key === key)?.name ?? null;
}
export function customPillarKey(pillarId: string): string {
  return `custom:${pillarId}`;
}
export function pillarKeyFromPillarName(name: string): string {
  // Nama pilar bawaan → slug; nama lain dianggap bukan pilar bawaan.
  return BUILTIN_PILLARS.find((p) => p.name === name)?.key ?? "interpersonal";
}
/** Label pilar untuk ditampilkan, dari pillarKey + daftar Pilarku milik pengguna. */
export function pillarLabelForKey(pillarKey: string, customPillars: Array<{ id: string; name: string }>): string {
  const builtin = builtinPillarName(pillarKey);
  if (builtin) return builtin;
  if (pillarKey.startsWith("custom:")) {
    const found = customPillars.find((p) => p.id === pillarKey.slice("custom:".length));
    if (found) return found.name;
  }
  return "Interpersonal";
}

// --- Pustaka dimensi rubrik (dipakai ulang dari evaluator/diagnostik) ---
// Setiap dimensi: kunci yang sudah dikenal scoreDimension di ai.ts
// (jadi penilaiannya jalan dengan fungsi scoring yang sama), label,
// dan contoh satu baris dalam bahasa sehari-hari.
export type RubricDimension = { key: string; label: string; example: string };
export const RUBRIC_DIMENSION_LIBRARY: RubricDimension[] = [
  { key: "bukti", label: "Bukti & Angka", example: "Ada contoh nyata dan angka — bukan cuma bilang 'saya bisa'." },
  { key: "struktur", label: "Struktur", example: "Jawaban mengalir jelas: situasi, alasan, lalu langkah berikutnya." },
  { key: "empati", label: "Empati & Validasi", example: "Mengakui dulu perasaan lawan bicara sebelum menjelaskan." },
  { key: "ketegasan", label: "Ketegasan yang Sopan", example: "Batas disampaikan jelas dan berani, tanpa agresif dan tanpa menghindar." },
  { key: "kejelasan", label: "Kejelasan", example: "Maksudmu langsung bisa dipahami dalam kalimat sederhana." },
  { key: "mendengarkan", label: "Mendengarkan Aktif", example: "Membiarkan lawan bicara selesai dan menanggapi isi ucapannya." },
  { key: "validasi", label: "Mengakui Perasaan", example: "Perasaan lawan bicara diakui dengan kata-katamu sendiri." },
  { key: "fakta", label: "Ketepatan Fakta", example: "Hanya menyampaikan yang sudah pasti — berani bilang 'sedang saya cek'." },
  { key: "ketenangan", label: "Ketenangan", example: "Nada tetap tenang saat diserang, tidak terpancing emosi." },
  { key: "konsistensi", label: "Konsistensi Pesan", example: "Pesan utamamu sama dari awal sampai akhir, tidak berubah-ubah." },
  { key: "penggalian", label: "Penggalian Kebutuhan", example: "Bertanya dan menggali dulu kebutuhan sebenarnya sebelum menawarkan." },
  { key: "keberatan_harga", label: "Menangani Keberatan Harga", example: "Keberatan harga dijawab dengan nilai dan angka, bukan sekadar diskon." },
  { key: "ajakan", label: "Ajakan Bertindak yang Jelas", example: "Ditutup dengan langkah berikutnya yang spesifik dan mudah dilakukan." },
  { key: "negosiasi", label: "Negosiasi Tanpa Menutup Pintu", example: "Tawaran yang kurang cocok ditolak dengan alternatif yang masuk akal." },
  { key: "percaya_diri", label: "Kepercayaan Diri", example: "Jawaban terdengar yakin dan tenang, tanpa merendahkan diri." },
  { key: "relevansi", label: "Nyambung dengan Konteks", example: "Jawaban menghubungkan pengalamanmu dengan kebutuhan lawan bicara." },
  { key: "motivasi", label: "Kejelasan Motivasi", example: "Alasanmu spesifik dan personal — bukan jawaban umum tanpa isi." },
  { key: "kontribusi", label: "Rencana Kontribusi", example: "Rencana setelahnya konkret: bidang, pihak yang dibantu, langkah pertama." },
  { key: "usulan", label: "Usulan yang Jelas", example: "Ditutup dengan usulan langkah berikutnya yang bisa diputuskan saat itu juga." },
  { key: "pembuka", label: "Pembuka yang Kuat", example: "Kalimat pertama langsung menyampaikan inti — bukan pemanasan panjang." },
  { key: "bertahan", label: "Bertahan Saat Dipotong", example: "Tetap sopan tapi berhasil menyelesaikan maksudmu saat dipotong." },
  { key: "masalah_solusi", label: "Kejelasan Masalah & Solusi", example: "Masalah terasa nyata dan solusinya bisa dipahami sekali dengar." },
  { key: "posisi", label: "Kejelasan Posisi", example: "Lawan bicara langsung paham kamu siapa dan ahli di bidang apa." },
  { key: "keaslian", label: "Keaslian", example: "Terdengar seperti dirimu sendiri, bukan meniru gaya orang lain." },
  { key: "nada", label: "Konsistensi Nada", example: "Nada bicaramu konsisten dengan citra yang ingin kamu bangun." },
  { key: "hook", label: "Daya Tarik Pembuka", example: "Kalimat pembuka membuat orang berhenti dan ingin dengar lanjutannya." },
  { key: "kredibilitas", label: "Kredibilitas", example: "Ada bukti nyata (pengalaman, hasil, karya) di balik klaim keahlianmu." },
  { key: "nilai_audiens", label: "Bukti Nilai Audiens", example: "Ada bukti konkret nilai audiens: jumlah, kecocokan, contoh hasil." },
  { key: "dasar_angka", label: "Dasar & Angka yang Masuk Akal", example: "Ada dasar konkret: data kontribusi, standar pasar, atau rincian hak." },
  { key: "bukti_bisnis", label: "Bukti & Angka Bisnis", example: "Ada angka nyata: pelanggan, penjualan, atau pertumbuhan." },
  { key: "kejelasan_maksud", label: "Kejelasan Maksud", example: "Yang diminta atau ditolak disampaikan jelas sejak awal." },
  { key: "ketenangan_tegas", label: "Tenang tapi Tegas", example: "Tetap tenang, tidak menyetujui apa pun karena panik, berani menunda." },
  { key: "percaya_diri_harga", label: "Berani Menyebut Harga", example: "Harga disebut jelas tanpa minta maaf berlebihan." },
];

export function rubricDimensionByKey(key: string): RubricDimension | undefined {
  return RUBRIC_DIMENSION_LIBRARY.find((d) => d.key === key);
}

// Satu item rubrik pilihan pengguna: kunci dari pustaka, ATAU satu dimensi
// tulisan sendiri (maks 40 karakter, maks 1 per skenario).
export type RubricSelection = { key?: string; customLabel?: string };

/** Validasi rubrik: 2–4 dimensi, kunci harus dari pustaka, maks 1 dimensi custom (maks 40 karakter), tanpa duplikat. */
export function validateRubricSelections(sels: RubricSelection[]): string | null {
  if (!Array.isArray(sels) || sels.length < 2) return "Pilih minimal 2 cara penilaian (dimensi rubrik).";
  if (sels.length > 4) return "Maksimal 4 cara penilaian (dimensi rubrik).";
  const customs = sels.filter((s) => s.customLabel && s.customLabel.trim());
  if (customs.length > 1) return "Dimensi penilaian tulisan sendiri maksimal 1.";
  if (customs.some((s) => (s.customLabel || "").trim().length > 40)) return "Dimensi penilaian tulisan sendiri maksimal 40 karakter.";
  const seen = new Set<string>();
  for (const s of sels) {
    if (s.customLabel && s.customLabel.trim()) {
      if (seen.has(`custom:${s.customLabel.trim().toLowerCase()}`)) return "Ada dimensi penilaian yang dipilih dua kali.";
      seen.add(`custom:${s.customLabel.trim().toLowerCase()}`);
      continue;
    }
    if (!s.key || !rubricDimensionByKey(s.key)) return "Ada cara penilaian yang tidak dikenal — pilih dari daftar yang tersedia.";
    if (seen.has(s.key)) return "Ada dimensi penilaian yang dipilih dua kali.";
    seen.add(s.key);
  }
  return null;
}

/** Ubah pilihan rubrik menjadi RubricItem[] siap disimpan (bobot dibagi rata, total 1). */
export function buildRubricFromSelections(sels: RubricSelection[]): RubricItem[] {
  const n = sels.length || 1;
  const w = Math.round((1 / n) * 100) / 100;
  const items = sels.map((s) => {
    if (s.customLabel && s.customLabel.trim()) {
      const label = s.customLabel.trim();
      return { key: `custom_${label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "buatanmu"}`, label, rubric: `apakah jawabanmu menunjukkan "${label}" dengan contoh yang bisa dilihat lawan bicara — bukan sekadar klaim`, weight: w };
    }
    const dim = rubricDimensionByKey(s.key!)!;
    return { key: dim.key, label: dim.label, rubric: dim.example, weight: w };
  });
  // Perbaiki selisih pembulatan pada item terakhir supaya total tepat 1.
  const sum = items.reduce((a, d) => a + d.weight, 0);
  if (items.length) items[items.length - 1].weight = Math.round((items[items.length - 1].weight + (1 - sum)) * 100) / 100;
  return items;
}

// --- Validasi skenario (server + wizard memakai yang sama) ---
export type CustomScenarioInput = {
  title: string; personaName: string; personaRole: string; trait: string;
  situation: string; goal: string; level: number; openingLine?: string;
  pillarKey: string; rubric: RubricSelection[];
};

export function validateCustomScenario(input: CustomScenarioInput): string | null {
  const title = (input.title || "").trim();
  if (title.length < 3) return "Judul skenario minimal 3 karakter.";
  if (title.length > 80) return "Judul skenario maksimal 80 karakter.";
  if (!(input.personaName || "").trim() || (input.personaName || "").trim().length < 2) return "Isi nama lawan bicaramu (mis. 'Atasan saya', 'Bu Ratna').";
  if ((input.personaName || "").trim().length > 100) return "Nama lawan bicara terlalu panjang (maks 100 karakter).";
  if (!(input.personaRole || "").trim() || (input.personaRole || "").trim().length < 2) return "Isi peran/hubungannya (mis. atasan, calon mertua, klien kecewa).";
  if (!(TRAITS as readonly string[]).includes(input.trait)) return "Pilih sifat lawan bicaramu.";
  if ((input.situation || "").trim().length < 20) return "Ceritakan situasinya minimal 20 karakter (2–3 kalimat).";
  if ((input.goal || "").trim().length < 10) return "Tulis tujuanmu — apa yang ingin kamu capai di akhir percakapan (minimal 10 karakter).";
  if (!Number.isInteger(input.level) || input.level < 1 || input.level > 5) return "Level tekanan harus 1–5.";
  if ((input.openingLine || "").trim().length > 300) return "Kalimat pembuka maksimal 300 karakter.";
  if (!input.pillarKey || typeof input.pillarKey !== "string") return "Pilih pilar untuk skenario ini.";
  if (!isBuiltinPillarKey(input.pillarKey) && !input.pillarKey.startsWith("custom:")) return "Pilar yang dipilih tidak dikenal.";
  const rubricErr = validateRubricSelections(input.rubric || []);
  if (rubricErr) return rubricErr;
  const blocked = findBlockedTerm(`${input.title} ${input.personaName} ${input.personaRole} ${input.situation} ${input.goal} ${input.openingLine || ""}`);
  if (blocked) return "Maaf, skenario ini tidak bisa dibuat — ada kata yang tidak diperbolehkan. Coba ubah dengan bahasa yang sopan.";
  return null;
}

// --- Wizard 3 langkah: validasi per langkah (dipakai UI sebelum lanjut) ---
export function validateWizardStep(step: 1 | 2 | 3, form: Partial<CustomScenarioInput> & { rubricKeys?: string[]; customDimension?: string }): string | null {
  if (step === 1) {
    if (!(form.personaName || "").trim() || (form.personaName || "").trim().length < 2) return "Isi dulu nama lawan bicaramu — langkah 1 belum lengkap.";
    if (!(form.personaRole || "").trim() || (form.personaRole || "").trim().length < 2) return "Isi dulu peran/hubungan lawan bicaramu — langkah 1 belum lengkap.";
    if (!(TRAITS as readonly string[]).includes(form.trait || "")) return "Pilih dulu sifat lawan bicaramu — langkah 1 belum lengkap.";
    if (!Number.isInteger(form.level) || (form.level as number) < 1 || (form.level as number) > 5) return "Pilih level tekanan 1–5 — langkah 1 belum lengkap.";
    return null;
  }
  if (step === 2) {
    if ((form.situation || "").trim().length < 20) return "Ceritakan situasinya minimal 20 karakter (2–3 kalimat) — langkah 2 belum lengkap.";
    if ((form.goal || "").trim().length < 10) return "Tulis tujuanmu (minimal 10 karakter) — langkah 2 belum lengkap.";
    if (!(form.title || "").trim() || (form.title || "").trim().length < 3) return "Beri judul skenariomu (minimal 3 karakter) — langkah 2 belum lengkap.";
    return null;
  }
  const sels: RubricSelection[] = (form.rubricKeys || []).map((k) => ({ key: k }));
  if (form.customDimension && form.customDimension.trim()) sels.push({ customLabel: form.customDimension.trim() });
  return validateRubricSelections(sels);
}

// --- Duplikasi: skenario bawaan → isian awal wizard Skenarioku ---
// Trait dipetakan lewat traitForScenario yang sudah ada; rubrik = rubrik asli
// (kunci-kuncinya sudah ada di pustaka) + 1 slot kosong untuk dimensi pilihan
// pengguna. Bila rubrik asli sudah 4 dimensi, slot penuh — dicatat di hasilnya.
export type DuplicatePrefill = {
  title: string; personaName: string; personaRole: string; trait: Trait;
  situation: string; goal: string; level: number; openingLine: string;
  rubricKeys: string[]; rubricSlotFull: boolean; sourceScenarioId: string; sourceTitle: string;
};

export function duplicatePrefillFromScenario(s: Scenario): DuplicatePrefill {
  const known = s.rubric.filter((r) => rubricDimensionByKey(r.key));
  return {
    title: s.title,
    personaName: s.personaName,
    personaRole: s.personaRole,
    trait: traitForScenario(s),
    situation: s.context,
    goal: s.goal,
    level: s.baseDifficulty,
    openingLine: s.opening,
    rubricKeys: known.map((r) => r.key),
    rubricSlotFull: known.length >= 4,
    sourceScenarioId: s.id,
    sourceTitle: s.title,
  };
}

// --- Simpan dari Roleplay Bebas: judul otomatis dari situasi ---
export function suggestTitleFromSituation(situation: string, fallback = "Skenario Buatanmu"): string {
  const clean = (situation || "").trim().replace(/\s+/g, " ");
  if (!clean) return fallback;
  const first = clean.split(/(?<=[.!?])\s/)[0] || clean;
  const short = first.length > 60 ? first.slice(0, 60).replace(/\s+\S*$/, "") + "…" : first;
  return short.charAt(0).toUpperCase() + short.slice(1);
}

// --- Kartu persona untuk CustomScenario (dipakai sesi) ---
// openingLine yang ditulis pengguna dipakai; bila kosong, dibuat otomatis
// dari situasi (template per sifat, sama seperti Roleplay Bebas).
export function personaCardForCustomScenario(input: {
  personaName: string; personaRole: string; trait: Trait; situation: string; openingLine?: string;
}) {
  const card = buildPersonaCard(input);
  if ((input.openingLine || "").trim()) card.opening = input.openingLine!.trim();
  return card;
}
