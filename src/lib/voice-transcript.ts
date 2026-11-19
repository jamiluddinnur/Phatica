// Buffer transkrip suara — logika murni, tanpa DOM/Web Speech API, supaya
// bisa dites (tests/voice-transcript.test.ts).
//
// Cara kerja Web Speech API (continuous) yang harus ditangani di sini:
// - Setiap event membawa SELURUH daftar hasil instans recognizer itu,
//   plus resultIndex = indeks pertama yang berubah pada event ini.
// - Hasil final di indeks yang sama bisa muncul lagi di event berikutnya
//   (re-emit) — tidak boleh dikomit dua kali. Kuncinya: committedCount,
//   jumlah hasil yang sudah dikomit untuk INSTANS ini.
// - Bila recognizer di-restart (instans baru), daftar hasilnya mulai dari
//   nol lagi — committedCount harus direset (beginInstance), tetapi
//   committedText dari instans sebelumnya TETAP dipertahankan.
// - Hasil interim (belum final) hanya menggantikan interimText, tidak
//   pernah masuk committedText.

export interface VoiceResultItem {
  isFinal: boolean;
  transcript: string;
}

export interface VoiceTranscriptBuffer {
  // Teks yang sudah diketik pengguna SEBELUM mikrofon dinyalakan.
  // Suara selalu MENAMBAH setelah teks ini, tidak pernah menimpanya.
  prefixText: string;
  // Gabungan semua hasil FINAL dari semua instans recognizer.
  committedText: string;
  // Potongan yang masih interim (belum final) — ditampilkan live,
  // diganti tiap event, tidak pernah dikomit.
  interimText: string;
  // Berapa hasil yang sudah dikomit untuk instans recognizer SAAT INI.
  committedCount: number;
}

function cleanPart(text: string): string {
  return (text || "").replace(/\s+/g, " ").trim();
}

function joinParts(parts: string[]): string {
  return parts.map(cleanPart).filter(Boolean).join(" ");
}

export function startSession(prefix: string): VoiceTranscriptBuffer {
  return {
    prefixText: prefix || "",
    committedText: "",
    interimText: "",
    committedCount: 0,
  };
}

// Dipanggil setiap kali instans recognizer baru dimulai (start pertama
// maupun auto-restart): daftar hasil mulai dari nol, jadi hitungan
// komit direset dan interim dibersihkan — committedText tetap.
export function beginInstance(buf: VoiceTranscriptBuffer): void {
  buf.committedCount = 0;
  buf.interimText = "";
}

// Terapkan satu event hasil recognizer. `results` = seluruh daftar hasil
// instans ini (sudah dipetakan dari e.results), `resultIndex` = e.resultIndex.
export function applyResult(
  buf: VoiceTranscriptBuffer,
  results: VoiceResultItem[],
  resultIndex: number,
): void {
  const start = Math.max(0, resultIndex || 0);
  // 1) Komit hasil final yang belum pernah dikomit pada instans ini.
  //    Guard `i >= committedCount` mencegah komit ganda saat recognizer
  //    mengulang hasil lama di event berikutnya.
  for (let i = start; i < results.length; i++) {
    const r = results[i];
    if (r && r.isFinal && i >= buf.committedCount) {
      const t = cleanPart(r.transcript);
      if (t) {
        buf.committedText = buf.committedText ? `${buf.committedText} ${t}` : t;
      }
      buf.committedCount = i + 1;
    }
  }
  // 2) Interim = gabungan hasil BELUM final mulai dari committedCount.
  //    Selalu dibangun ulang (diganti), tidak pernah ditambahkan.
  const interimParts: string[] = [];
  for (let i = buf.committedCount; i < results.length; i++) {
    const r = results[i];
    if (r && !r.isFinal) {
      const t = cleanPart(r.transcript);
      if (t) interimParts.push(t);
    }
  }
  buf.interimText = interimParts.join(" ");
}

// Teks yang ditampilkan live di kotak jawaban: prefix + final + interim.
export function displayText(buf: VoiceTranscriptBuffer): string {
  return joinParts([buf.prefixText, buf.committedText, buf.interimText]);
}

// Teks final saat mikrofon dimatikan: prefix + final saja (interim dibuang).
export function finalText(buf: VoiceTranscriptBuffer): string {
  return joinParts([buf.prefixText, buf.committedText]);
}

// ---------- Pemilihan suara TTS Bahasa Indonesia ----------
// speechSynthesis.getVoices() mengembalikan daftar suara yang tersedia di
// browser/sistem pengguna. Pilih yang Bahasa Indonesia: utamakan lang
// persis "id-ID", lalu lang apa pun yang diawali "id" (mis. "id_ID").
// Mengembalikan null bila tidak ada suara Indonesia — pemanggil lalu
// memakai suara default browser dengan lang tetap "id-ID".
export interface VoiceOption {
  lang: string;
  name?: string;
}

export function pickIndonesianVoice<T extends VoiceOption>(
  voices: readonly T[] | null | undefined,
): T | null {
  if (!voices || voices.length === 0) return null;
  const norm = (l: string) => (l || "").toLowerCase().replace(/_/g, "-");
  return (
    voices.find((v) => norm(v.lang) === "id-id") ||
    voices.find((v) => norm(v.lang).startsWith("id")) ||
    null
  );
}
