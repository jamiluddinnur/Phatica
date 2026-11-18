// Roleplay Bebas / "Skenario Buatanmu" — persona card + rubrik dinamis.
// Semua dibuat dari input pengguna dengan template + pemetaan kata kunci
// (tanpa LLM), jadi fitur ini jalan penuh tanpa OPENAI_API_KEY.
// Bila kunci dipasang, balasan persona di sesi memakai LLM dengan
// system prompt ketat dari kartu persona ini (lihat ai.ts).

export type Trait = "Skeptis" | "Marah" | "Ragu-ragu" | "Dingin" | "Menekan";
export const TRAITS: Trait[] = ["Skeptis", "Marah", "Ragu-ragu", "Dingin", "Menekan"];

export type PersonaCard = {
  personaName: string;
  personaRole: string;
  trait: Trait;
  personaGoal: string; // apa yang mau dicapai persona ini dalam percakapan
  hiddenAgenda: string; // satu kalimat — apa yang sebenarnya dia rasakan/inginkan
  pressureStyle: string; // bagaimana dia menekan
  opening: string; // kalimat pembuka, dibuat dari kata-kata situasi pengguna
};

export type RubricItem = { key: string; label: string; rubric: string; weight: number };

export const MAX_CUSTOM_TURNS = 12; // maks giliran pengguna per sesi Roleplay Bebas

export function customStage(userTurns: number): string {
  if (userTurns <= 2) return "Pembuka";
  if (userTurns <= 5) return "Digali";
  return "Keberatan & Penutup";
}

export const TRAIT_PROFILE: Record<Trait, { personaGoal: string; hiddenAgenda: string; pressureStyle: string }> = {
  Skeptis: {
    personaGoal: "menguji apakah klaimmu punya bukti",
    hiddenAgenda: "Dia sebenarnya ingin yakin, tapi tidak akan percaya sebelum melihat bukti nyata.",
    pressureStyle: "Menantang setiap klaim dengan 'buktinya apa?' dan menguji konsistensimu.",
  },
  Marah: {
    personaGoal: "meluapkan kekecewaan dan butuh diakui dulu sebelum mau mendengar penjelasan",
    hiddenAgenda: "Di balik marahnya, dia takut masalah ini terulang dan tidak ada yang berubah.",
    pressureStyle: "Nada meninggi, mengungkit yang sudah terjadi, dan sulit ditenangkan sampai perasaannya diakui.",
  },
  "Ragu-ragu": {
    personaGoal: "menimbang-nimbang dan butuh kepastian sebelum berani memutuskan",
    hiddenAgenda: "Dia sebenarnya tertarik, tapi takut salah pilih dan menyesal.",
    pressureStyle: "Menunda-nunda, banyak 'nanti dulu', dan butuh diyakinkan pelan-pelan dengan kepastian.",
  },
  Dingin: {
    personaGoal: "menjaga jarak dan menilai tanpa menunjukkan perasaan",
    hiddenAgenda: "Dia menilai dari caramu bicara — kalau kamu gugup atau berbelit, dia makin menjauh.",
    pressureStyle: "Jawaban pendek dan datar, dengan jeda yang membuatmu tidak nyaman.",
  },
  Menekan: {
    personaGoal: "mendapatkan jawaban atau keputusan sekarang juga, tanpa menunggu",
    hiddenAgenda: "Dia punya tenggat dari atasannya, jadi dia memindahkan tekanannya ke kamu.",
    pressureStyle: "Mendesak tenggat, mengulang pertanyaan yang sama, dan tidak memberi ruang berpikir lama.",
  },
};

const OPENING_TEMPLATES: Record<Trait, (name: string, situation: string) => string> = {
  Skeptis: (n, s) => `Oke, saya dengar situasinya: ${s} Tapi jujur saja, saya belum yakin. Coba jelaskan — kenapa saya harus percaya padamu?`,
  Marah: (n, s) => `Jadi begini: ${s} Saya sudah cukup sabar. Sekarang saya mau dengar — kamu sadar nggak sih dampaknya ke saya?`,
  "Ragu-ragu": (n, s) => `Hmm, soal ini: ${s} Saya masih mikir-mikir. Coba yakinkan saya pelan-pelan — apa yang bikin ini aman buat saya?`,
  Dingin: (n, s) => `${s} Saya dengar. Lanjutkan — saya mau lihat apakah yang kamu bilang ini benar-benar masuk akal.`,
  Menekan: (n, s) => `Kita tidak punya banyak waktu. Situasinya begini: ${s} Saya butuh jawabanmu sekarang — keputusanmu apa?`,
};

export function buildPersonaCard(input: { personaName: string; personaRole: string; trait: Trait; situation: string }): PersonaCard {
  const p = TRAIT_PROFILE[input.trait];
  const situation = input.situation.trim();
  // Potong situasi jadi satu kalimat pendek untuk kalimat pembuka.
  const short = situation.length > 180 ? situation.slice(0, 180).replace(/\s+\S*$/, "") + "…" : situation;
  return {
    personaName: input.personaName.trim(),
    personaRole: input.personaRole.trim(),
    trait: input.trait,
    personaGoal: p.personaGoal,
    hiddenAgenda: p.hiddenAgenda,
    pressureStyle: p.pressureStyle,
    opening: OPENING_TEMPLATES[input.trait](input.personaName.trim(), short),
  };
}

// --- Pemetaan sifat untuk 24 skenario tetap (dipilih yang paling masuk akal) ---
// Dipakai saat pengguna menduplikasi skenario ("Duplikasi & Sesuaikan") dan saat sesi tetap
// (yang tidak disesuaikan) berjalan dengan bank keberatan per sifat.
// Daftar id tidak diubah — ini hanya pemetaan, bukan perubahan katalog.
const TRAIT_BY_SCENARIO_ID: Record<string, Trait> = {
  "interpersonal-wawancara-kerja": "Skeptis",
  "interpersonal-wawancara-beasiswa": "Skeptis",
  "interpersonal-orang-tua": "Menekan",
  "interpersonal-minta-maaf": "Marah",
  "interpersonal-phk": "Dingin",
  "interpersonal-teguran": "Menekan",
  "interpersonal-menolak-tawaran": "Menekan",
  "interpersonal-menolak-pinjaman": "Ragu-ragu",
  "interpersonal-feedback-bawahan": "Dingin",
  "interpersonal-bicara-rapat": "Menekan",
  "interpersonal-atasan": "Menekan",
  "interpersonal-rekan": "Dingin",
  "interpersonal-negosiasi": "Ragu-ragu",
  "krisis-hoax-viral": "Marah",
  "krisis-review-bintang1": "Marah",
  "krisis-live": "Skeptis",
  "sales-skeptical": "Skeptis",
  "sales-pitch-investor": "Skeptis",
  "sales-closing-wa": "Ragu-ragu",
  "branding-elevator-pitch": "Dingin",
  "branding-hater": "Marah",
  "branding-cancel": "Skeptis",
  "branding-endorsement": "Menekan",
  "branding-podcast": "Skeptis",
};

export function traitForScenario(s: { id: string; personaRole?: string; title?: string }): Trait {
  const byId = TRAIT_BY_SCENARIO_ID[s.id];
  if (byId) return byId;
  // Fallback berbasis kata kunci (untuk skenario baru yang belum dipetakan).
  const text = `${s.personaRole || ""} ${s.title || ""}`.toLowerCase();
  if (text.includes("skeptis") || text.includes("menguji") || text.includes("investor")) return "Skeptis";
  if (text.includes("marah") || text.includes("kecewa") || text.includes("menyerang") || text.includes("hater")) return "Marah";
  if (text.includes("ragu") || text.includes("berhati-hati") || text.includes("mikir")) return "Ragu-ragu";
  if (text.includes("dingin") || text.includes("pasif")) return "Dingin";
  if (text.includes("menekan") || text.includes("menegur") || text.includes("menuntut") || text.includes("cepat")) return "Menekan";
  return "Skeptis";
}

// Kartu persona untuk skenario tetap (dipakai mesin sesi + duplikasi "Duplikasi & Sesuaikan").
export function scenarioToPersonaCard(s: { id: string; personaName: string; personaRole: string; opening: string; context?: string }): PersonaCard {
  const trait = traitForScenario(s);
  const p = TRAIT_PROFILE[trait];
  return { personaName: s.personaName, personaRole: s.personaRole, trait, personaGoal: p.personaGoal, hiddenAgenda: p.hiddenAgenda, pressureStyle: p.pressureStyle, opening: s.opening };
}

// Rubrik dinamis dari tujuan + situasi pengguna (pemetaan kata kunci).
// Selalu ada "Kejelasan" + "Struktur"; sisanya mengikuti kata kunci tujuan.
// Dimensi rubrik dari kata kunci tujuan/situasi (dipakai buildRubric dan
// buildCustomizedRubric — pemetaan yang sama di kedua jalur).
export function goalKeywordDims(goal: string, situation: string): RubricItem[] {
  const text = `${goal} ${situation}`.toLowerCase();
  const dims: RubricItem[] = [];
  const has = (...words: string[]) => words.some((w) => text.includes(w));
  if (has("gaji", "harga", "angka", "naik", "diskon", "rate", "bayar", "biaya", "rupiah", "juta", "ribu", "tawar", "nego")) {
    dims.push({ key: "bukti", label: "Bukti & Angka", rubric: "apakah ada contoh nyata dan angka yang mendukung permintaanmu — bukan sekadar 'saya pantas' tanpa dasar", weight: 0.3 });
  }
  if (has("maaf", "perasaan", "kecewa", "marah", "sedih", "sakit hati", "hubungan", "percaya")) {
    dims.push({ key: "empati", label: "Empati & Validasi", rubric: "apakah kamu mengakui dulu perasaan dan dampak ke lawan bicara sebelum menjelaskan atau membela diri", weight: 0.3 });
  }
  if (has("tolak", "tidak", "batas", "menolak", "tidak bisa", "berani bilang")) {
    dims.push({ key: "ketegasan", label: "Ketegasan yang Sopan", rubric: "apakah posisi atau batasmu disampaikan jelas dan berani, tanpa agresif, tanpa berbelit, dan tanpa menghindar", weight: 0.3 });
  }
  if (has("komplain", "rusak", "cacat", "pengembalian", "refund", "kecewa dengan produk", "barang")) {
    dims.push({ key: "fakta", label: "Ketepatan Fakta", rubric: "apakah kamu hanya menyampaikan yang sudah pasti terjadi, dengan rincian yang bisa dicek — tanpa melebih-lebihkan", weight: 0.25 });
  }
  if (has("negosiasi", "kesepakatan", "deal", "kerja sama", "kontrak")) {
    dims.push({ key: "negosiasi", label: "Negosiasi Tanpa Menutup Pintu", rubric: "apakah tawaran yang kurang cocok ditolak dengan alternatif yang masuk akal, dan hubungan tetap baik", weight: 0.3 });
  }
  return dims;
}

function normalizeWeights(dims: RubricItem[]): RubricItem[] {
  const total = dims.reduce((a, d) => a + d.weight, 0) || 1;
  const out = dims.map((d) => ({ ...d, weight: Math.round((d.weight / total) * 100) / 100 }));
  // Perbaiki selisih pembulatan pada item terakhir supaya total tepat 1.
  const sum = out.reduce((a, d) => a + d.weight, 0);
  if (out.length) out[out.length - 1].weight = Math.round((out[out.length - 1].weight + (1 - sum)) * 100) / 100;
  return out;
}

export function buildRubric(goal: string, situation: string): RubricItem[] {
  const dims: RubricItem[] = [
    ...goalKeywordDims(goal, situation),
    { key: "kejelasan", label: "Kejelasan", rubric: "apakah maksudmu langsung bisa dipahami dalam kalimat yang sederhana — tanpa berputar-putar", weight: 0.2 },
    { key: "struktur", label: "Struktur", rubric: "apakah jawabanmu mengalir jelas — situasi, alasan, lalu langkah berikutnya — bukan cerita acak tanpa ujung", weight: 0.2 },
  ];
  // Batasi maksimal 4 dimensi.
  const picked = dims.slice(0, 4);
  return normalizeWeights(picked);
}

// Rubrik untuk skenario tetap yang disesuaikan: mulai dari rubrik asli,
// lalu tambahkan/sesuaikan 1 dimensi dari tujuan BARU pengguna (pemetaan
// kata kunci yang sama). Bila rubrik asli sudah 4 dimensi, dimensi dengan
// bobot terkecil diganti oleh dimensi baru itu.
export function buildCustomizedRubric(originalRubric: RubricItem[], goal: string, situation: string): RubricItem[] {
  const base = originalRubric.map((r) => ({ ...r }));
  const keys = new Set(base.map((r) => r.key));
  const extra = goalKeywordDims(goal, situation).find((d) => !keys.has(d.key));
  if (!extra) return normalizeWeights(base);
  if (base.length < 4) {
    base.push(extra);
  } else {
    let minIdx = 0;
    base.forEach((r, i) => { if (r.weight < base[minIdx].weight) minIdx = i; });
    base[minIdx] = extra;
  }
  return normalizeWeights(base);
}

// --- Validasi + keamanan (server-side) ---
// Daftar blokir kecil: istilah romantis/seksual dan pelecehan/ujaran kebencian
// (Indonesia + Inggris, kata yang umum). Ini penyaring kata, bukan penilai
// konteks — lihat batasannya di README (bagian Roleplay Bebas).
export const BLOCKED_TERMS = [
  // romantis / seksual
  "seks", "sex", "porno", "porn", "telanjang", "bugil", "bercinta", "hubungan intim",
  "ciuman", "erotis", "erotic", "nude", "naked", "mesum",
  // pelecehan / ujaran kasar
  "tolol", "goblok", "bangsat", "anjing", "babi", "kampret", "lonte", "pelacur",
  "kafir", "benci orang", "rasis",
];

export function findBlockedTerm(text: string): string | null {
  const lower = ` ${text.toLowerCase()} `;
  for (const t of BLOCKED_TERMS) {
    if (lower.includes(t)) return t;
  }
  return null;
}

export function validateCustomInput(input: { personaName: string; personaRole: string; trait: string; situation: string; goal: string; level: number }): string | null {
  if (!input.personaName || input.personaName.trim().length < 2) return "Isi nama lawan bicaramu (mis. 'Atasan saya', 'Bu Ratna').";
  if (input.personaName.trim().length > 100) return "Nama lawan bicara terlalu panjang (maks 100 karakter).";
  if (!input.personaRole || input.personaRole.trim().length < 2) return "Isi peran/hubungannya (mis. atasan, calon mertua, klien kecewa).";
  if (!TRAITS.includes(input.trait as Trait)) return "Pilih sifat lawan bicaramu.";
  if (!input.situation || input.situation.trim().length < 20) return "Ceritakan situasinya minimal 20 karakter (2–3 kalimat).";
  if (!input.goal || input.goal.trim().length < 10) return "Tulis tujuanmu — apa yang ingin kamu capai di akhir percakapan (minimal 10 karakter).";
  if (!Number.isInteger(input.level) || input.level < 1 || input.level > 5) return "Level tekanan harus 1–5.";
  const blocked = findBlockedTerm(`${input.personaName} ${input.personaRole} ${input.situation} ${input.goal}`);
  if (blocked) return "Maaf, skenario ini tidak bisa dibuat — ada kata yang tidak diperbolehkan. Coba ubah dengan bahasa yang sopan.";
  return null;
}

// --- 5 template sekali ketuk (mengisi seluruh form) ---
export type CustomTemplate = { label: string; personaName: string; personaRole: string; trait: Trait; situation: string; goal: string; level: number };
export const CUSTOM_TEMPLATES: CustomTemplate[] = [
  {
    label: "Minta naik gaji",
    personaName: "Atasan saya", personaRole: "atasan langsung yang memegang anggaran tim", trait: "Skeptis",
    situation: "Sudah dua tahun saya di tim ini dan beban kerja saya bertambah — saya mengurus dua proyek sekaligus, tapi gaji saya belum pernah disesuaikan. Minggu ini ada review tahunan dan saya mau mengajukan kenaikan gaji.",
    goal: "Mendapat kenaikan gaji yang wajar dengan menunjukkan bukti kontribusi saya, tanpa terdengar mengancam atau memaksa.",
    level: 3,
  },
  {
    label: "Menolak tanpa menyakiti",
    personaName: "Teman dekat saya", personaRole: "teman dekat yang meminta bantuan besar di luar kemampuan saya", trait: "Ragu-ragu",
    situation: "Teman dekat saya meminta saya meminjamkan uang dalam jumlah besar untuk usahanya. Saya sayang hubungan ini, tapi keuangan saya sendiri sedang ketat dan saya sudah pernah kecewa karena pinjaman sebelumnya belum kembali.",
    goal: "Menolak pinjamannya dengan jelas tapi hangat, dan menawarkan bantuan lain yang benar-benar bisa saya lakukan.",
    level: 2,
  },
  {
    label: "Komplain ke penjual",
    personaName: "Penjual online", personaRole: "penjual yang barangnya datang rusak dan slow respon", trait: "Dingin",
    situation: "Barang yang saya pesan datang rusak dan penjualnya membalas chat dengan singkat dan dingin. Saya sudah kirim foto kerusakannya, tapi belum ada solusi — hanya disuruh menunggu tanpa tanggal yang jelas.",
    goal: "Mendapat penggantian barang atau pengembalian dana, dengan menyampaikan keluhan secara tenang, jelas, dan berdasarkan bukti.",
    level: 3,
  },
  {
    label: "Minta maaf ke pasangan",
    personaName: "Pasangan saya", personaRole: "pasangan yang kecewa karena saya melanggar janji penting", trait: "Marah",
    situation: "Saya berjanji akan datang ke acara keluarga pasangan saya, tapi saya membatalkannya di menit terakhir karena pekerjaan. Pasangan saya kecewa berat dan sekarang sulit diajak bicara — setiap kali saya minta maaf, jawabannya dingin.",
    goal: "Membuat pasangan saya merasa benar-benar didengar dan dipahami, lalu memperbaiki keadaan dengan langkah yang konkret — bukan sekadar kata maaf.",
    level: 3,
  },
  {
    label: "Negosiasi harga dengan klien",
    personaName: "Klien saya", personaRole: "klien yang menawar harga jauh di bawah tarif normal saya", trait: "Menekan",
    situation: "Seorang klien meminta saya mengerjakan proyek besar, tapi menawar harga sampai setengah dari tarif normal saya dan minta jawaban hari ini juga. Saya butuh proyek ini, tapi kalau saya terima dengan harga segitu, saya rugi waktu dan tenaga.",
    goal: "Mendapat harga yang adil dengan menjelaskan nilai kerja saya, tanpa kehilangan klien dan tanpa merusak hubungan.",
    level: 4,
  },
];
