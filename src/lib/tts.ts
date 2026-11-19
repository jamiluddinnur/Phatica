// Penyedia TTS (text-to-speech) Phatica — ElevenLabs, dipilih lewat env.
// - ELEVENLABS_API_KEY terisi → suara cloud aktif (mesin pilihan untuk
//   "Suara Persona"); kosong → persona memakai suara browser seperti biasa.
// - Kunci HANYA hidup di server: tidak pernah dicatat di log, tidak pernah
//   dikirim ke klien. Klien hanya tahu boolean "ttsCloud" dari /api/auth/me.
// - Kegagalan apa pun (kuota, jaringan, upstream) dilempar sebagai TtsError
//   dan rute /api/tts menjawab { fallback: true } — klien lalu otomatis
//   memakai suara browser untuk teks yang sama.
import { logServerError } from "./log";

/** Suara bawaan ElevenLabs ("Rachel") — suara premade, jalan juga di paket gratis. */
export const DEFAULT_ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
/** Model default: Flash v2.5 — mendukung Bahasa Indonesia, menerima
 *  language_code, dan berbiaya ±0,5 kredit/karakter (Multilingual v2: 1). */
export const DEFAULT_ELEVENLABS_MODEL = "eleven_flash_v2_5";
/** Batas keras teks per panggilan — balasan persona memang pendek. */
export const TTS_MAX_CHARS = 800;

export type TtsConfig = { apiKey: string; voiceId: string; model: string };

/**
 * Konfigurasi TTS dari env. Menerima env sebagai argumen supaya bisa
 * diuji tanpa mengubah process.env (pola yang sama dengan llm-provider).
 */
export function getTtsConfig(env: NodeJS.ProcessEnv = process.env): TtsConfig {
  return {
    apiKey: (env.ELEVENLABS_API_KEY || "").trim(),
    voiceId: (env.ELEVENLABS_VOICE_ID || "").trim() || DEFAULT_ELEVENLABS_VOICE_ID,
    model: (env.ELEVENLABS_MODEL || "").trim() || DEFAULT_ELEVENLABS_MODEL,
  };
}

/** true bila kunci ElevenLabs terisi — suara cloud tersedia. */
export function isTtsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(getTtsConfig(env).apiKey);
}

/** Error TTS bertipe: "quota" untuk 401/429 (kunci salah/kuota habis),
 *  "error" untuk kegagalan lain. Pesan tidak pernah membawa kunci atau
 *  body upstream. */
export class TtsError extends Error {
  kind: "quota" | "error";
  constructor(kind: "quota" | "error", message: string) {
    super(message);
    this.name = "TtsError";
    this.kind = kind;
  }
}

/**
 * Siapkan teks untuk dikirim ke ElevenLabs:
 * - trim; teks kosong → TtsError.
 * - lebih dari TTS_MAX_CHARS → potong di batas kalimat terakhir yang muat
 *   (tanda . ! ? … diikuti spasi/akhir), atau potong keras bila tidak ada.
 */
export function prepareTtsText(text: string): string {
  const clean = (text || "").trim();
  if (!clean) throw new TtsError("error", "Teks suara kosong.");
  if (clean.length <= TTS_MAX_CHARS) return clean;
  const head = clean.slice(0, TTS_MAX_CHARS);
  // Cari akhir kalimat terakhir di dalam jendela yang muat.
  let cut = -1;
  for (let i = head.length - 1; i >= 0; i--) {
    const ch = head[i];
    if (ch === "." || ch === "!" || ch === "?" || ch === "…") { cut = i + 1; break; }
  }
  // Batas kalimat terlalu awal (< setengah batas) tidak berguna — potong keras.
  if (cut >= Math.floor(TTS_MAX_CHARS / 2)) return head.slice(0, cut).trim();
  return head.trim();
}

/** Bentuk request ElevenLabs — murni, bisa diuji tanpa jaringan. */
export function buildElevenLabsRequest(
  config: TtsConfig,
  preparedText: string
): { url: string; headers: Record<string, string>; body: Record<string, unknown> } {
  const body: Record<string, unknown> = {
    text: preparedText,
    model_id: config.model,
    voice_settings: { stability: 0.5, similarity_boost: 0.75 },
  };
  // language_code HANYA diterima model Flash v2.5 — model lain (mis.
  // eleven_multilingual_v2) menolaknya, jadi jangan kirim ke sana.
  if (config.model === "eleven_flash_v2_5") body.language_code = "id";
  return {
    url: `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(config.voiceId)}`,
    headers: {
      "xi-api-key": config.apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body,
  };
}

export type TtsResult = { audio: ArrayBuffer; contentType: string; chars: number };

/**
 * Panggil ElevenLabs TTS. Sukses → { audio, contentType, chars }
 * (chars = panjang teks yang benar-benar dikirim, untuk pencatatan
 * pemakaian). Gagal → lempar TtsError; body upstream tidak pernah
 * diteruskan ke klien atau log.
 */
export async function callElevenLabsTts(
  text: string,
  opts: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {}
): Promise<TtsResult> {
  const config = getTtsConfig(opts.env ?? process.env);
  if (!config.apiKey) throw new TtsError("error", "Kunci ElevenLabs belum dipasang.");
  const prepared = prepareTtsText(text);
  const req = buildElevenLabsRequest(config, prepared);
  const doFetch = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await doFetch(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify(req.body),
    });
  } catch (err) {
    logServerError("tts", err);
    throw new TtsError("error", "Jaringan ke ElevenLabs gagal.");
  }
  if (!res.ok) {
    const kind = res.status === 401 || res.status === 429 ? "quota" : "error";
    logServerError("tts", new Error(`ElevenLabs menjawab status ${res.status}`));
    throw new TtsError(kind, `ElevenLabs menjawab status ${res.status}.`);
  }
  const audio = await res.arrayBuffer();
  return { audio, contentType: res.headers.get("content-type") || "audio/mpeg", chars: prepared.length };
}
