// Tes penyedia LLM (src/lib/llm-provider.ts) + katalog Pilar V
// (src/lib/scenarios.ts) — tanpa database, tanpa panggilan LLM nyata.
// Dijalankan: npm test
import test from "node:test";
import assert from "node:assert/strict";
import {
  getActiveProvider,
  getGeminiModel,
  hasAnyLlmKey,
  parseGeminiResponse,
  buildGeminiRequestBody,
  DEFAULT_GEMINI_MODEL,
} from "../src/lib/llm-provider";
import { isDailyCapReached, LLM_DAILY_TURN_LIMIT } from "../src/lib/llm-usage";
import { SCENARIOS, PILLARS } from "../src/lib/scenarios";
import { OPENING_VARIANTS } from "../src/lib/opening-variants";
import { traitForScenario } from "../src/lib/custom-roleplay";
import { buildPath } from "../src/lib/diagnostic";

// ---------- Matriks pemilihan penyedia ----------

test("provider: LLM_PROVIDER=gemini + kedua kunci terisi → gemini", () => {
  const env = { LLM_PROVIDER: "gemini", OPENAI_API_KEY: "sk-test", GEMINI_API_KEY: "g-test" } as NodeJS.ProcessEnv;
  assert.equal(getActiveProvider(env), "gemini");
});

test("provider: LLM_PROVIDER=openai + kedua kunci terisi → openai", () => {
  const env = { LLM_PROVIDER: "openai", OPENAI_API_KEY: "sk-test", GEMINI_API_KEY: "g-test" } as NodeJS.ProcessEnv;
  assert.equal(getActiveProvider(env), "openai");
});

test("provider: LLM_PROVIDER default + hanya kunci OpenAI → openai", () => {
  assert.equal(getActiveProvider({ OPENAI_API_KEY: "sk-test" } as NodeJS.ProcessEnv), "openai");
});

test("provider: LLM_PROVIDER=gemini tapi kunci Gemini kosong + kunci OpenAI ada → openai (fallback)", () => {
  const env = { LLM_PROVIDER: "gemini", OPENAI_API_KEY: "sk-test", GEMINI_API_KEY: "" } as NodeJS.ProcessEnv;
  assert.equal(getActiveProvider(env), "openai");
});

test("provider: LLM_PROVIDER=openai tapi kunci OpenAI kosong + kunci Gemini ada → gemini (fallback)", () => {
  const env = { LLM_PROVIDER: "openai", OPENAI_API_KEY: "", GEMINI_API_KEY: "g-test" } as NodeJS.ProcessEnv;
  assert.equal(getActiveProvider(env), "gemini");
});

test("provider: tidak ada kunci sama sekali → rule-based", () => {
  assert.equal(getActiveProvider({} as NodeJS.ProcessEnv), "rule-based");
  assert.equal(getActiveProvider({ LLM_PROVIDER: "gemini" } as NodeJS.ProcessEnv), "rule-based");
  assert.equal(hasAnyLlmKey({} as NodeJS.ProcessEnv), false);
  assert.equal(hasAnyLlmKey({ GEMINI_API_KEY: "g-test" } as NodeJS.ProcessEnv), true);
});

test("provider: nilai LLM_PROVIDER tidak dikenal → utamakan OpenAI bila kuncinya ada", () => {
  const env = { LLM_PROVIDER: "apalah", OPENAI_API_KEY: "sk-test", GEMINI_API_KEY: "g-test" } as NodeJS.ProcessEnv;
  assert.equal(getActiveProvider(env), "openai");
});

test("provider: model Gemini default gemini-2.0-flash, bisa diubah lewat env", () => {
  assert.equal(DEFAULT_GEMINI_MODEL, "gemini-2.0-flash");
  assert.equal(getGeminiModel({} as NodeJS.ProcessEnv), "gemini-2.0-flash");
  assert.equal(getGeminiModel({ GEMINI_MODEL: "gemini-2.5-flash" } as NodeJS.ProcessEnv), "gemini-2.5-flash");
});

// ---------- Parsing respons Gemini ----------

const SAMPLE_GEMINI_OK = {
  candidates: [
    { content: { parts: [{ text: "Halo, saya dengar. " }, { text: "Buktinya mana?" }], role: "model" } },
  ],
};

test("gemini parse: gabungkan semua parts teks dari candidates[0]", () => {
  assert.equal(parseGeminiResponse(SAMPLE_GEMINI_OK), "Halo, saya dengar. Buktinya mana?");
});

test("gemini parse: candidates kosong / tanpa teks → null (pemanggil memakai rule-based)", () => {
  assert.equal(parseGeminiResponse({ candidates: [] }), null);
  assert.equal(parseGeminiResponse({}), null);
  assert.equal(parseGeminiResponse(null), null);
  assert.equal(parseGeminiResponse({ candidates: [{ content: { parts: [] } }] }), null);
  assert.equal(parseGeminiResponse({ candidates: [{ content: { parts: [{ text: "   " }] } }] }), null);
});

test("gemini request body: prompt sama, maxOutputTokens 220, temperature 0.7", () => {
  const body = buildGeminiRequestBody("PROMPT UJI");
  assert.equal(body.contents[0].parts[0].text, "PROMPT UJI");
  assert.equal(body.generationConfig.maxOutputTokens, 220);
  assert.equal(body.generationConfig.temperature, 0.7);
});

// ---------- Batas harian: satu batas untuk kedua penyedia ----------

test("cap: fungsi batas harian tidak peduli penyedia — 30 giliran untuk OpenAI maupun Gemini", () => {
  assert.equal(LLM_DAILY_TURN_LIMIT, 30);
  assert.equal(isDailyCapReached(29), false);
  assert.equal(isDailyCapReached(30), true);
  assert.equal(isDailyCapReached(31), true);
  // Batas yang sama dipakai apa pun penyedianya — tidak ada batas terpisah.
  assert.equal(isDailyCapReached(30, LLM_DAILY_TURN_LIMIT), true);
});

// ---------- Pilar V Public Speaking ----------

const NEW_IDS = [
  "public-speaking-pidato-pembukaan",
  "public-speaking-presentasi-atasan",
  "public-speaking-mc-formal",
  "public-speaking-kuliah-umum",
  "public-speaking-debat-forum",
];

test("pillar V: 29 skenario, 5 pilar, Public Speaking berisi 5 skenario", () => {
  assert.equal(SCENARIOS.length, 29);
  assert.equal(PILLARS.length, 5);
  assert.ok((PILLARS as readonly string[]).includes("Public Speaking"));
  const ps = SCENARIOS.filter((s) => s.pillar === "Public Speaking");
  assert.equal(ps.length, 5);
  assert.deepEqual(ps.map((s) => s.id).sort(), [...NEW_IDS].sort());
});

test("pillar V: id baru unik, tiap skenario punya modelAnswer + tip + 2 varian pembuka + trait", () => {
  const ids = SCENARIOS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, "id skenario harus unik");
  for (const id of NEW_IDS) {
    const sc = SCENARIOS.find((s) => s.id === id)!;
    assert.ok(sc, `skenario ${id} harus ada`);
    assert.ok(sc.modelAnswer.trim().length > 20, `${id}: modelAnswer terlalu pendek`);
    assert.ok(sc.tip.trim().length > 20, `${id}: tip terlalu pendek`);
    assert.ok(sc.rubric.length >= 3 && sc.rubric.length <= 4, `${id}: rubrik 3-4 dimensi`);
    for (const r of sc.rubric) assert.ok(r.weight > 0, `${id}: bobot rubrik harus > 0`);
    const wSum = sc.rubric.reduce((a, r) => a + r.weight, 0);
    assert.ok(Math.abs(wSum - 1) < 0.01, `${id}: bobot rubrik harus berjumlah 1, dapat ${wSum}`);
    const variants = OPENING_VARIANTS[id];
    assert.ok(variants && variants.length === 2, `${id}: harus punya tepat 2 varian pembuka`);
    const trait = traitForScenario(sc);
    assert.ok(["Skeptis", "Marah", "Ragu-ragu", "Dingin", "Menekan"].includes(trait), `${id}: trait harus dari daftar yang ada`);
  }
  // Tip suara disebut di 2 dari 5 skenario Pilar V (tidak di semuanya).
  const voiceTips = NEW_IDS.filter((id) => SCENARIOS.find((s) => s.id === id)!.tip.includes("🎤"));
  assert.equal(voiceTips.length, 2);
});

test("pillar V: rubrik skenario baru memakai kunci yang dikenal jalur belajar (buildPath bisa merekomendasikannya)", () => {
  // buildPath hanya memakai katalog — skenario baru harus lolos sebagai
  // kandidat bila dimensinya cocok. Uji langsung: tiap skenario baru punya
  // minimal 1 kunci rubrik yang dipakai pemetaan dimensi diagnostik.
  const knownKeys = new Set(["bukti", "dasar_angka", "bukti_bisnis", "kredibilitas", "nilai_audiens", "struktur", "pembuka", "masalah_solusi", "posisi", "kejelasan", "hook", "nada", "empati", "mendengarkan", "validasi", "ketegasan", "kejelasan_maksud", "ketenangan_tegas", "percaya_diri", "bertahan"]);
  for (const id of NEW_IDS) {
    const sc = SCENARIOS.find((s) => s.id === id)!;
    assert.ok(sc.rubric.some((r) => knownKeys.has(r.key)), `${id}: rubrik harus memetakan ke jalur belajar`);
  }
  const path = buildPath(["struktur", "ketegasan"]);
  assert.equal(path.length, 3);
  assert.equal(new Set(path.map((p) => p.scenarioId)).size, 3);
});
