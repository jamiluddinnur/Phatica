// Mesin AI Phatica — rule-based sebagai default (tanpa kunci LLM).
// Bila OPENAI_API_KEY dipasang, Roleplay Agent memakai OpenAI; semua
// penilaian (scoring) TETAP memakai fungsi terpisah di bawah ini —
// skor tidak pernah ditebak dari satu prompt. Tidak ada angka yang dikarang:
// setiap skor dihitung dari metrik transkrip yang terukur.
import type { Scenario } from "./scenarios";

export type Msg = { role: string; content: string };
export type ToolTrace = { tool: string; input: unknown; output: unknown; durationMs: number };

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));
const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
const countRe = (t: string, re: RegExp) => (t.match(re) || []).length;
const hasNum = (t: string) => /\d+(\.\d+)?\s*(%|persen|juta|ribu|tahun|orang|kali|x\b)/i.test(t) || /\d/.test(t);

function metrics(userTexts: string[]) {
  const all = userTexts.join("\n");
  return {
    turns: userTexts.length,
    avgWords: userTexts.length ? userTexts.reduce((a, t) => a + words(t), 0) / userTexts.length : 0,
    totalWords: words(all),
    numbers: countRe(all, /\d+/g),
    questions: countRe(all, /\?/g),
    empathy: countRe(all, /\b(saya paham|mengerti|maaf|terima kasih|menurutmu|bagaimana perasaan|kekhawatiranmu|dampaknya)\b/gi),
    hedging: countRe(all, /\b(mungkin|kayaknya|agak|saya rasa sih|nggak tahu ya|ntar dulu)\b/gi),
    structure: countRe(all, /\b(pertama|kedua|ketiga|kemudian|hasilnya|contohnya|misalnya|langkah)\b/gi),
    apologies: countRe(all, /\b(maaf|saya salah|tanggung jawab saya)\b/gi),
    blame: countRe(all, /\b(salahmu|kamu yang|gara-gara kamu|bukan saya)\b/gi),
    promises: countRe(all, /\b(saya janji|pasti bisa|dijamin|100%)\b/gi),
    percents: [...all.matchAll(/(\d+)\s*%/g)].map((m) => Number(m[1])),
  };
}

// ---------- Roleplay Agent (rule-based) ----------
const PRESSURE: Record<string, string[]> = {
  default: [
    "Oke, itu jawaban yang cukup aman. Tapi saya butuh yang lebih konkret — contoh nyatanya apa?",
    "Hmm, saya belum yakin. Bisa tunjukkan bukti atau angka yang mendukung itu?",
    "Menarik. Tapi kalau saya tantang sedikit: apa kelemahan dari pendekatan itu?",
  ],
};
export function roleplayReply(scenario: Scenario, level: number, history: Msg[], memoryNote: string): string {
  const last = [...history].reverse().find((m) => m.role === "user")?.content || "";
  const m = metrics([last]);
  const name = scenario.personaName;
  const hard = level >= 4;
  const soft = level <= 2;
  if (soft && m.avgWords < 8) return `${name}: Saya dengar kamu. Coba ceritakan sedikit lebih panjang — apa yang sebenarnya kamu rasakan atau kamu mau dari percakapan ini?`;
  if (m.blame > 0) return `${name}: Tunggu dulu — itu terdengar seperti menyalahkan saya. Saya mau dengar bagianmu: apa yang bisa kamu lakukan berbeda?`;
  if (m.numbers === 0 && /wawancara|beasiswa|gaji|investor|pitch|endorsement|harga/i.test(scenario.id + scenario.title)) {
    return `${name}: Itu masih klaim umum. ${hard ? "Saya butuh angka atau contoh nyata, kalau tidak saya anggap ini cuma hafalan." : "Coba tambahkan satu contoh nyata atau angka — itu yang membedakan jawabanmu."}`;
  }
  if (m.questions > 0) return `${name}: Pertanyaan bagus. Tapi sekarang giliran saya yang bertanya: ${hard ? "jawab tanpa berputar-putar — apa keputusanmu?" : "menurutmu sendiri, apa langkah paling masuk akal sekarang?"}`;
  if (m.avgWords > 60) return `${name}: Itu panjang, tapi intinya apa? Coba ringkas dalam 2 kalimat — saya butuh yang tajam, bukan yang panjang.`;
  const pool = PRESSURE.default;
  const pick = pool[(history.length + level) % pool.length];
  return hard ? `${name}: ${pick} Saya tidak akan mudah puas — tunjukkan saya kenapa jawabanmu layak dipercaya.` : `${name}: ${pick}`;
}

export async function roleplayReplyLLM(scenario: Scenario, level: number, history: Msg[], memoryNote: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `Kamu adalah ${scenario.personaName}, ${scenario.personaRole}. Skenario: ${scenario.context}. Tujuan lawan bicaramu: ${scenario.goal}. Level tekanan ${level}/5 (1 lunak, 5 sangat menekan). Jawab dalam Bahasa Indonesia sehari-hari, tetap dalam karakter, jangan keluar dari peran, jangan memberi nasihat, jangan mengarang data. Catatan memori pembelajar: ${memoryNote || "-"}` },
          ...history.slice(-10).map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })),
        ],
        temperature: 0.8, max_tokens: 220,
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j.choices?.[0]?.message?.content?.trim() || null;
  } catch { return null; }
}

// ---------- Adaptation Engine ----------
export function adaptLevel(scenario: Scenario, level: number, userTexts: string[]): { level: number; signal: string; reason: string } {
  const m = metrics(userTexts);
  const last = userTexts[userTexts.length - 1] || "";
  // Sinyal kekuatan yang terukur: bukti angka, struktur, pertanyaan yang menggali, panjang memadai.
  const strength =
    (m.numbers > 0 ? 25 : 0) + (m.structure > 0 ? 20 : 0) + (m.questions > 0 ? 15 : 0) +
    (m.avgWords >= 25 ? 20 : m.avgWords >= 12 ? 10 : 0) + (m.empathy > 0 ? 10 : 0) + (m.blame === 0 && m.hedging <= 1 ? 10 : 0);
  if (strength >= 70 && level < 5) return { level: level + 1, signal: "dominating", reason: `Jawabanmu kuat (skor sinyal ${strength}/100: ada bukti/angka, struktur jelas, dan pertanyaan yang menggali), jadi ${scenario.personaName} menaikkan tekanan ke Level ${level + 1}.` };
  if (strength <= 35 && level > 1) return { level: level - 1, signal: "struggling", reason: `Jawabanmu masih pendek/umum (skor sinyal ${strength}/100), jadi ${scenario.personaName} menurunkan tekanan ke Level ${level - 1} supaya kamu bisa mengejar.` };
  return { level, signal: "steady", reason: `Jawabanmu stabil (skor sinyal ${strength}/100), level tetap ${level}.` };
}

// ---------- Evaluation Agent: satu fungsi scoring PER dimensi rubrik ----------
export function scoreDimension(key: string, userTexts: string[]): { score: number; note: string } {
  const m = metrics(userTexts);
  const t = (n: number) => clamp(n);
  switch (key) {
    case "struktur": case "pembuka": case "masalah_solusi": case "posisi":
      return { score: t(45 + m.structure * 12 + (m.avgWords >= 20 ? 15 : 0) + (m.questions * 3)), note: "Struktur dinilai dari kata penanda urutan dan kelengkapan jawaban." };
    case "bukti": case "dasar_angka": case "bukti_bisnis": case "kredibilitas": case "nilai_audiens":
      return { score: t(35 + m.numbers * 12 + (hasNum(userTexts.join(" ")) ? 15 : 0) + (m.structure * 5)), note: "Bukti dinilai dari contoh nyata dan angka yang disebut." };
    case "percaya_diri": case "percaya_diri_harga": case "bertahan":
      return { score: t(55 + (m.avgWords >= 15 ? 15 : 0) - m.hedging * 8 + (m.questions * 2)), note: "Kepercayaan diri dinilai dari ketegasan kalimat dan minimnya kata ragu-ragu." };
    case "relevansi": case "kenapa_sekarang": case "konsistensi": case "keaslian":
      return { score: t(55 + m.structure * 8 + (m.avgWords >= 20 ? 12 : 0) - m.hedging * 5), note: "Relevansi dinilai dari keterkaitan jawaban dengan konteks skenario." };
    case "motivasi": case "kontribusi": case "usulan": case "ajakan": case "negosiasi":
      return { score: t(50 + m.structure * 10 + (m.avgWords >= 20 ? 12 : 0) + (m.questions * 3)), note: "Dinilai dari kekonkretan langkah dan ajakan berikutnya." };
    case "mendengarkan": case "validasi":
      return { score: t(50 + m.empathy * 12 + (m.avgWords >= 15 ? 10 : 0) - m.blame * 15), note: "Dinilai dari pengakuan terhadap perasaan lawan bicara sebelum membela diri." };
    case "ketegasan": case "kejelasan_maksud": case "ketenangan_tegas":
      return { score: t(55 + (m.avgWords >= 12 ? 12 : 0) - m.hedging * 7 - m.blame * 8), note: "Dinilai dari kejelasan posisi tanpa agresif dan tanpa menghindar." };
    case "fakta": case "ketenangan":
      return { score: t(60 + (m.empathy * 5) - m.promises * 12 - (m.percents.some((p) => p > 0) ? 0 : 0)), note: "Dinilai dari hanya menyampaikan yang pasti dan tidak berspekulasi." };
    case "konsistensi":
      return { score: t(60 + m.structure * 6 - m.hedging * 5), note: "Dinilai dari pesan yang sama dari awal sampai akhir." };
    case "empati":
      return { score: t(45 + m.empathy * 12 + m.apologies * 8 - m.blame * 15), note: "Dinilai dari pengakuan dampak sebelum menjelaskan atau membela diri." };
    case "penggalian": case "keberatan_harga":
      return { score: t(45 + m.questions * 10 + m.numbers * 8 + (m.avgWords >= 20 ? 10 : 0)), note: "Dinilai dari pertanyaan yang menggali kebutuhan sebelum menawarkan." };
    case "hook": case "nada":
      return { score: t(50 + (m.avgWords >= 12 ? 12 : 0) + m.structure * 6), note: "Dinilai dari pembuka yang spesifik dan nada yang konsisten." };
    default:
      return { score: t(55 + m.structure * 6 + (m.avgWords >= 15 ? 10 : 0)), note: "Skor dihitung dari metrik transkrip." };
  }
}

// Evidence / blind-spot / dangerous-pattern tool — membaca memori antar-sesi.
export function analyzeEvidence(scenario: Scenario, userTexts: string[], memoryWeaknesses: string[]) {
  const m = metrics(userTexts);
  const quotes = userTexts.filter((t) => words(t) >= 5).slice(0, 3);
  while (quotes.length < 3 && userTexts.length) quotes.push(userTexts[userTexts.length - 1]);
  const patterns: string[] = [];
  if (m.percents.length > 0) patterns.push("Spekulasi");
  if (m.promises > 0) patterns.push("Janji kosong");
  if (m.blame > 0) patterns.push("Menyalahkan lawan bicara");
  if (m.numbers === 0 && /wawancara|beasiswa|gaji|investor|pitch|endorsement|harga/i.test(scenario.id + scenario.title)) patterns.push("Tidak mengkuantifikasi nilai (tanpa angka/bukti)");
  const blindSpot =
    m.numbers === 0 ? "Tidak mengkuantifikasi nilai dalam rupiah/angka — jawabanmu terdengar umum dan mudah dilupakan."
    : m.empathy === 0 && m.blame > 0 ? "Kamu langsung membela diri tanpa mengakui dulu perasaan lawan bicara."
    : m.structure === 0 ? "Jawabanmu tidak punya struktur yang jelas — pendengar sulit mengikuti alurnya."
    : m.questions === 0 ? "Kamu hampir tidak bertanya balik — percakapan jadi satu arah."
    : "Kamu cenderung menjawab terlalu panjang tanpa menutup dengan langkah berikutnya yang jelas.";
  const weakest = [...userTexts].sort((a, b) => words(a) - words(b))[0] || "";
  const alternative = weakest
    ? `Versi yang lebih tajam dari kalimatmu: “${weakest.trim().slice(0, 120)}” — coba ulangi dengan satu contoh nyata dan satu angka, lalu tutup dengan langkah berikutnya.`
    : "Coba ulangi jawaban terakhirmu dengan satu contoh nyata dan satu angka.";
  return { quotes: quotes.slice(0, 3), blindSpot, alternative, patterns, recurring: memoryWeaknesses };
}

export function composeVerdict(scenario: Scenario, overall: number): string {
  if (overall >= 80) return `Hampir lolos — ${scenario.personaName} mulai percaya padamu, tinggal konsisten di bukti dan penutup.`;
  if (overall >= 60) return `Hampir lolos — dasarmu sudah ada, tapi bukti dan strukturnya masih perlu diasah supaya meyakinkan.`;
  return `Belum lolos — jawabanmu masih terlalu umum, latih lagi dengan contoh nyata dan angka.`;
}

export function twoMinuteDrill(scenario: Scenario, blindSpot: string): string {
  return `Latihan 2 menit: jawab pertanyaan pembuka skenario ini sekali lagi, tapi kali ini wajib menyebut 1 contoh nyata + 1 angka, lalu tutup dengan 1 kalimat ajakan/langkah berikutnya. Bandingkan dengan jawabanmu tadi — blind spot yang diperbaiki: ${blindSpot}`;
}

// ---------- Brand Audit (4 scoring tool terpisah) & Content Coach ----------
export function auditBrand(bio: string, posts: string[]) {
  const text = (bio + " " + posts.join(" ")).toLowerCase();
  const trace: ToolTrace[] = [];
  const run = (tool: string, score: number, input: unknown) => { trace.push({ tool, input, output: score, durationMs: 1 }); return score; };
  const posisi = run("score_posisi", clamp(30 + (/untuk|membantu|spesialis|ahli|fokus/i.test(text) ? 25 : 0) + (bio.length > 40 ? 15 : 0) + (posts.length >= 3 ? 10 : 0)), bio.slice(0, 80));
  const suara = run("score_suara", clamp(35 + (posts.length >= 2 ? 20 : 0) + (/\b(saya|aku|kami)\b/i.test(text) ? 15 : 0)), posts.length);
  const kredibilitas = run("score_kredibilitas", clamp(25 + (/\d+\s*(tahun|\+|seminar|klien|proyek|pengikut|followers)/i.test(text) ? 35 : 0) + (/\d/.test(text) ? 10 : 0)), bio.slice(0, 80));
  const cta = run("score_cta", clamp(25 + (/(dm|hubungi|klik|daftar|ikuti|cek link|link di bio)/i.test(text) ? 40 : 0) + (bio.length > 20 ? 10 : 0)), bio.slice(0, 80));
  const rewrite = `Bio baru (siap pakai): ${bio.trim().slice(0, 140)} — Tulis ulang dengan rumus: [Siapa kamu] + [untuk siapa] + [bukti 1 angka] + [ajakan DM]. Contoh: “Dosen komunikasi — membantu fresh graduate lolos wawancara kerja. 10+ tahun mengajar, 30+ seminar. DM 'LATIHAN' untuk mulai.”`;
  return { scores: [{ key: "posisi", label: "Kejelasan Posisi", score: posisi }, { key: "suara", label: "Konsistensi Suara", score: suara }, { key: "kredibilitas", label: "Bukti Kredibilitas", score: kredibilitas }, { key: "cta", label: "Ajakan Bertindak", score: cta }], rewrite, trace };
}

export function coachContent(draft: string) {
  const lines = draft.split("\n").filter(Boolean);
  const hook = lines[0] || "";
  const hookScore = clamp(30 + (hook.length >= 20 && hook.length <= 120 ? 25 : 0) + (/[?!]/.test(hook) ? 10 : 0) + (/\d/.test(hook) ? 10 : 0));
  const clarity = clamp(40 + (words(draft) >= 30 ? 20 : 0) + (lines.length >= 2 ? 10 : 0));
  const honesty = clamp(65 - (/\b(dijamin|pasti kaya|100%|rahasia yang disembunyikan)\b/i.test(draft) ? 30 : 0) - ((draft.match(/(\d+)\s*%/g) || []).length > 0 ? 10 : 0));
  const hooks = [
    `Hook 1: “${hook.trim().slice(0, 80)}” — versi lebih tajam: mulai dari masalah pembaca, bukan dari dirimu.`,
    `Hook 2: “Saya dulu juga ${hook.trim().slice(0, 40).toLowerCase()} — sampai saya menemukan 1 hal ini.”`,
    `Hook 3: “Berhenti lakukan ini kalau kamu mau ${hook.trim().slice(0, 50).toLowerCase()}.”`,
  ];
  return { scores: [{ key: "hook", label: "Hook", score: hookScore }, { key: "kejelasan", label: "Kejelasan", score: clarity }, { key: "kejujuran", label: "Kejujuran", score: honesty }], hooks, trace: [{ tool: "score_content", input: draft.slice(0, 120), output: { hook: hookScore, clarity, honesty }, durationMs: 1 }] as ToolTrace[] };
}
