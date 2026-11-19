// Tes TTS ElevenLabs (src/lib/tts.ts) + penjaga kredit harian
// (src/lib/tts-usage.ts) — fetch ditiru, penyimpanan pemakaian ditiru
// dengan store palsu di memori. Tanpa jaringan nyata, tanpa database.
import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_ELEVENLABS_MODEL,
  DEFAULT_ELEVENLABS_VOICE_ID,
  TTS_MAX_CHARS,
  TtsError,
  buildElevenLabsRequest,
  callElevenLabsTts,
  getTtsConfig,
  isTtsEnabled,
  prepareTtsText,
} from "../src/lib/tts";
import {
  TTS_DAILY_CHAR_LIMIT,
  checkAndRecordTtsUsage,
  checkTtsCap,
  getTtsChars,
  recordTtsUsage,
  wouldExceedTtsCap,
  type TtsUsageStore,
} from "../src/lib/tts-usage";

// ---------- Konfigurasi ----------

test("tts config: default voice Rachel + model Flash v2.5, belum aktif tanpa kunci", () => {
  const cfg = getTtsConfig({} as NodeJS.ProcessEnv);
  assert.equal(cfg.apiKey, "");
  assert.equal(cfg.voiceId, DEFAULT_ELEVENLABS_VOICE_ID);
  assert.equal(cfg.voiceId, "21m00Tcm4TlvDq8ikWAM");
  assert.equal(cfg.model, DEFAULT_ELEVENLABS_MODEL);
  assert.equal(cfg.model, "eleven_flash_v2_5");
  assert.equal(isTtsEnabled({} as NodeJS.ProcessEnv), false);
  assert.equal(isTtsEnabled({ ELEVENLABS_API_KEY: "" } as NodeJS.ProcessEnv), false);
});

test("tts config: env menimpa default (kunci, voice id, model)", () => {
  const env = {
    ELEVENLABS_API_KEY: "sk-test-tts",
    ELEVENLABS_VOICE_ID: "voice-xyz",
    ELEVENLABS_MODEL: "eleven_multilingual_v2",
  } as NodeJS.ProcessEnv;
  const cfg = getTtsConfig(env);
  assert.equal(cfg.apiKey, "sk-test-tts");
  assert.equal(cfg.voiceId, "voice-xyz");
  assert.equal(cfg.model, "eleven_multilingual_v2");
  assert.equal(isTtsEnabled(env), true);
});

// ---------- Bentuk request ----------

test("tts request: URL berisi voice id, header xi-api-key, language_code id untuk Flash", () => {
  const cfg = getTtsConfig({ ELEVENLABS_API_KEY: "sk-test-tts" } as NodeJS.ProcessEnv);
  const req = buildElevenLabsRequest(cfg, "Halo, kita mulai ya.");
  assert.ok(req.url.includes("/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM"), req.url);
  assert.equal(req.headers["xi-api-key"], "sk-test-tts");
  assert.equal(req.headers.Accept, "audio/mpeg");
  assert.equal(req.body.text, "Halo, kita mulai ya.");
  assert.equal(req.body.model_id, "eleven_flash_v2_5");
  assert.equal(req.body.language_code, "id");
  assert.deepEqual(req.body.voice_settings, { stability: 0.5, similarity_boost: 0.75 });
});

test("tts request: language_code TIDAK dikirim untuk eleven_multilingual_v2", () => {
  const cfg = getTtsConfig({
    ELEVENLABS_API_KEY: "sk-test-tts",
    ELEVENLABS_MODEL: "eleven_multilingual_v2",
  } as NodeJS.ProcessEnv);
  const req = buildElevenLabsRequest(cfg, "Halo.");
  assert.equal(req.body.model_id, "eleven_multilingual_v2");
  assert.equal("language_code" in req.body, false);
});

// ---------- Panggilan (fetch ditiru) ----------

function fakeResponse(status: number, bytes = [1, 2, 3]) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (n: string) => (n.toLowerCase() === "content-type" ? "audio/mpeg" : null) },
    arrayBuffer: async () => new Uint8Array(bytes).buffer,
  } as unknown as Response;
}

test("tts call: sukses mengembalikan byte audio + jumlah karakter terkirim", async () => {
  let seenUrl = "";
  let seenKey = "";
  const fetchImpl = (async (url: any, init: any) => {
    seenUrl = String(url);
    seenKey = init.headers["xi-api-key"];
    return fakeResponse(200, [9, 8, 7, 6]);
  }) as unknown as typeof fetch;
  const out = await callElevenLabsTts("Halo, apa kabar?", {
    env: { ELEVENLABS_API_KEY: "sk-test-tts" } as NodeJS.ProcessEnv,
    fetchImpl,
  });
  assert.ok(seenUrl.includes("21m00Tcm4TlvDq8ikWAM"));
  assert.equal(seenKey, "sk-test-tts");
  assert.equal(out.contentType, "audio/mpeg");
  assert.equal(new Uint8Array(out.audio).length, 4);
  assert.equal(out.chars, "Halo, apa kabar?".length);
});

test("tts call: 401 dan 429 → TtsError kind quota", async () => {
  for (const status of [401, 429]) {
    const fetchImpl = (async () => fakeResponse(status)) as unknown as typeof fetch;
    await assert.rejects(
      callElevenLabsTts("Halo.", { env: { ELEVENLABS_API_KEY: "sk-x" } as NodeJS.ProcessEnv, fetchImpl }),
      (err: any) => err instanceof TtsError && err.kind === "quota"
    );
  }
});

test("tts call: 500 → kind error; jaringan putus → kind error; tanpa kunci → kind error", async () => {
  const fetch500 = (async () => fakeResponse(500)) as unknown as typeof fetch;
  await assert.rejects(
    callElevenLabsTts("Halo.", { env: { ELEVENLABS_API_KEY: "sk-x" } as NodeJS.ProcessEnv, fetchImpl: fetch500 }),
    (err: any) => err instanceof TtsError && err.kind === "error"
  );
  const fetchThrow = (async () => { throw new Error("ECONNRESET"); }) as unknown as typeof fetch;
  await assert.rejects(
    callElevenLabsTts("Halo.", { env: { ELEVENLABS_API_KEY: "sk-x" } as NodeJS.ProcessEnv, fetchImpl: fetchThrow }),
    (err: any) => err instanceof TtsError && err.kind === "error"
  );
  await assert.rejects(
    callElevenLabsTts("Halo.", { env: {} as NodeJS.ProcessEnv, fetchImpl: fetch500 }),
    (err: any) => err instanceof TtsError && err.kind === "error"
  );
});

// ---------- Penjaga teks ----------

test("tts text: kosong/spasi saja ditolak; teks pendek lolos apa adanya", () => {
  assert.throws(() => prepareTtsText(""), (err: any) => err instanceof TtsError);
  assert.throws(() => prepareTtsText("   \n  "), (err: any) => err instanceof TtsError);
  assert.equal(prepareTtsText("  Halo.  "), "Halo.");
  assert.equal(prepareTtsText("x".repeat(TTS_MAX_CHARS)).length, TTS_MAX_CHARS);
});

test("tts text: >800 karakter dipotong di batas kalimat, bukan di tengah kalimat", () => {
  const sentence = "Ini kalimat persona yang cukup panjang untuk diuji. "; // 52 karakter
  const long = sentence.repeat(30).trim(); // ±1.500 karakter
  const out = prepareTtsText(long);
  assert.ok(out.length <= TTS_MAX_CHARS, `panjang ${out.length}`);
  assert.ok(out.endsWith("."), "harus berakhir di akhir kalimat");
  assert.ok(long.startsWith(out), "harus awalan dari teks asli");
});

test("tts text: >800 tanpa batas kalimat → potong keras tepat 800", () => {
  const out = prepareTtsText("a".repeat(1500));
  assert.equal(out.length, TTS_MAX_CHARS);
});

// ---------- Penjaga kredit harian (store palsu di memori) ----------

function fakeStore(): TtsUsageStore & { data: Map<string, number> } {
  const data = new Map<string, number>();
  return {
    data,
    async getChars(userId, date) { return data.get(`${userId}:${date}`) ?? 0; },
    async addChars(userId, date, chars) { data.set(`${userId}:${date}`, (data.get(`${userId}:${date}`) ?? 0) + chars); },
  };
}

test("tts cap: konstanta 3.000 karakter/hari + fungsi murni wouldExceedTtsCap", () => {
  assert.equal(TTS_DAILY_CHAR_LIMIT, 3000);
  assert.equal(wouldExceedTtsCap(2900, 100), false); // tepat 3.000 masih boleh
  assert.equal(wouldExceedTtsCap(2900, 101), true);
  assert.equal(wouldExceedTtsCap(3000, 1), true);
  assert.equal(wouldExceedTtsCap(0, 3000), false);
});

test("tts cap: karakter terakumulasi dan pemakaian melewati 3.000 diblokir (tanpa dicatat)", async () => {
  const store = fakeStore();
  const date = "2026-11-19";
  assert.equal(await checkAndRecordTtsUsage("u1", 2000, { store, date }), true);
  assert.equal(await checkAndRecordTtsUsage("u1", 900, { store, date }), true);
  assert.equal(await getTtsChars("u1", { store, date }), 2900);
  // 200 lagi akan jadi 3.100 → ditolak, dan TIDAK tercatat.
  assert.equal(await checkAndRecordTtsUsage("u1", 200, { store, date }), false);
  assert.equal(await getTtsChars("u1", { store, date }), 2900);
  // Tepat sampai 3.000 masih boleh.
  assert.equal(await checkAndRecordTtsUsage("u1", 100, { store, date }), true);
  assert.equal(await getTtsChars("u1", { store, date }), 3000);
  assert.equal(await checkTtsCap("u1", 1, { store, date }), false);
});

test("tts cap: hari berbeda = bucket berbeda; pengguna berbeda = bucket berbeda", async () => {
  const store = fakeStore();
  assert.equal(await checkAndRecordTtsUsage("u1", 3000, { store, date: "2026-11-19" }), true);
  assert.equal(await checkTtsCap("u1", 1, { store, date: "2026-11-19" }), false);
  // Besoknya jatah penuh lagi.
  assert.equal(await checkAndRecordTtsUsage("u1", 3000, { store, date: "2026-11-20" }), true);
  // Pengguna lain tidak terpengaruh.
  assert.equal(await checkAndRecordTtsUsage("u2", 3000, { store, date: "2026-11-19" }), true);
});

test("tts cap: recordTtsUsage mencatat hanya yang dipanggil (generasi berhasil)", async () => {
  const store = fakeStore();
  const date = "2026-11-19";
  await recordTtsUsage("u1", 250, { store, date });
  await recordTtsUsage("u1", 250, { store, date });
  assert.equal(await getTtsChars("u1", { store, date }), 500);
});
