// Penyedia LLM Phatica — OpenAI dan Gemini, dipilih lewat env.
// Aturan pemilihan (didokumentasikan di README):
// - LLM_PROVIDER=gemini + GEMINI_API_KEY terisi → Gemini.
// - LLM_PROVIDER=openai (default) + OPENAI_API_KEY terisi → OpenAI.
// - Bila penyedia yang diminta kuncinya kosong, pakai penyedia lain bila
//   kuncinya ada; bila tidak ada kunci sama sekali → rule-based.
// - Engine yang ditampilkan di UI selalu yang BENAR-BENAR menjawab.
// Tidak ada kunci yang dicatat di log atau dikembalikan ke klien.
import type { Msg } from "./ai";

export type LlmProvider = "openai" | "gemini" | "rule-based";
export type LlmEngine = "openai" | "gemini";

export const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

/** Model Gemini yang dipakai (env GEMINI_MODEL, default gemini-2.0-flash). */
export function getGeminiModel(env: NodeJS.ProcessEnv = process.env): string {
  const m = (env.GEMINI_MODEL || "").trim();
  return m || DEFAULT_GEMINI_MODEL;
}

/**
 * Penyedia LLM yang AKTIF, berdasarkan env yang diteruskan.
 * Menerima env sebagai argumen supaya bisa diuji tanpa mengubah process.env.
 */
export function getActiveProvider(env: NodeJS.ProcessEnv = process.env): LlmProvider {
  const wanted = (env.LLM_PROVIDER || "openai").trim().toLowerCase();
  const hasOpenAi = Boolean((env.OPENAI_API_KEY || "").trim());
  const hasGemini = Boolean((env.GEMINI_API_KEY || "").trim());
  if (wanted === "gemini") {
    if (hasGemini) return "gemini";
    if (hasOpenAi) return "openai";
    return "rule-based";
  }
  // "openai" (default) dan nilai lain yang tidak dikenal: utamakan OpenAI.
  if (hasOpenAi) return "openai";
  if (hasGemini) return "gemini";
  return "rule-based";
}

/** true bila ada kunci LLM apa pun yang terisi (OpenAI atau Gemini). */
export function hasAnyLlmKey(env: NodeJS.ProcessEnv = process.env): boolean {
  return getActiveProvider(env) !== "rule-based";
}

// ---------- Gemini ----------

/** Body request Gemini — prompt yang sama persis dengan jalur OpenAI. */
export function buildGeminiRequestBody(promptText: string): {
  contents: Array<{ parts: Array<{ text: string }> }>;
  generationConfig: { maxOutputTokens: number; temperature: number };
} {
  return {
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: { maxOutputTokens: 220, temperature: 0.7 },
  };
}

/**
 * Parse respons Gemini (generateContent) jadi teks balasan.
 * Gabungkan semua parts teks dari candidates[0].content.
 * Kembalikan null bila tidak ada kandidat/teks (pemanggil lalu memakai
 * mesin rule-based).
 */
export function parseGeminiResponse(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const candidates = (json as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const first = candidates[0] as { content?: { parts?: unknown } };
  const parts = first?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const text = parts
    .map((p) => (p as { text?: unknown }).text)
    .filter((t): t is string => typeof t === "string")
    .join("")
    .trim();
  return text || null;
}

/** Panggil Gemini generateContent. Kembalikan teks, atau null bila gagal/kosong. */
export async function callGemini(promptText: string): Promise<string | null> {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) return null;
  const model = getGeminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildGeminiRequestBody(promptText)),
    });
    if (!res.ok) {
      console.error("[llm] Gemini non-OK", { status: res.status, model });
      return null;
    }
    return parseGeminiResponse(await res.json().catch(() => null));
  } catch (err) {
    console.error("[llm] Gemini gagal", { err: String(err) });
    return null;
  }
}

// ---------- OpenAI (jalur lama, tidak diubah perilakunya) ----------

/** Panggil OpenAI chat completions. Kembalikan teks, atau null bila gagal/kosong. */
export async function callOpenAi(systemPrompt: string, history: Msg[], temperature: number): Promise<string | null> {
  const key = (process.env.OPENAI_API_KEY || "").trim();
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...history.slice(-10).map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })),
        ],
        temperature,
        max_tokens: 220,
      }),
    });
    if (!res.ok) {
      console.error("[llm] OpenAI non-OK", { status: res.status });
      return null;
    }
    const j = await res.json();
    return j.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error("[llm] OpenAI gagal", { err: String(err) });
    return null;
  }
}

/**
 * Satu pintu panggilan LLM untuk Roleplay Agent.
 * - Bangun SATU teks prompt (system + riwayat) yang sama untuk kedua penyedia,
 *   supaya perilaku persona identik.
 * - OpenAI memakai chat completions (system + messages); Gemini memakai
 *   generateContent dengan teks prompt gabungan yang sama.
 * - Kembalikan { text, engine } bila LLM menjawab, atau null bila tidak ada
 *   kunci / panggilan gagal (pemanggil memakai rule-based).
 */
export async function callLlm(
  systemPrompt: string,
  history: Msg[],
  temperature: number
): Promise<{ text: string; engine: LlmEngine } | null> {
  const provider = getActiveProvider();
  if (provider === "gemini") {
    const promptText = [systemPrompt, ...history.slice(-10).map((m) => `${m.role === "user" ? "Pengguna" : "Persona"}: ${m.content}`)].join("\n");
    const text = await callGemini(promptText);
    return text ? { text, engine: "gemini" } : null;
  }
  if (provider === "openai") {
    const text = await callOpenAi(systemPrompt, history, temperature);
    return text ? { text, engine: "openai" } : null;
  }
  return null;
}
