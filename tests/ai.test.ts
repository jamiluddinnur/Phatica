// Tes logika murni mesin AI (src/lib/ai.ts) — tanpa database, tanpa LLM.
// Dijalankan: npm test
import test from "node:test";
import assert from "node:assert/strict";
import {
  scoreDimension,
  adaptLevel,
  computeVoiceMetrics,
  voiceNote,
  sharpenSentence,
  diagnosticScores,
} from "../src/lib/ai";
import { SCENARIOS } from "../src/lib/scenarios";

const wawancara = SCENARIOS.find((s) => s.id === "interpersonal-wawancara-kerja")!;

const STRONG =
  "Pertama, saya menaikkan penjualan toko online sebesar 30 persen dalam 3 bulan. " +
  "Kedua, saya menguji 5 iklan berbeda dan mempertahankan yang paling laku. " +
  "Contohnya, penjualan naik dari 20 juta menjadi 26 juta per bulan. Bagaimana menurut Anda, apakah hasil itu cukup meyakinkan?";
const WEAK = "Saya pekerja keras. Mungkin saya bisa coba.";

test("scoreDimension: jawaban kuat dengan angka + struktur > jawaban lemah", () => {
  const strong = scoreDimension("bukti", [STRONG]);
  const weak = scoreDimension("bukti", [WEAK]);
  assert.ok(strong.score > weak.score, `kuat ${strong.score} harus > lemah ${weak.score}`);
  assert.ok(strong.score >= 70, `jawaban kuat harus >= 70, dapat ${strong.score}`);
});

test("scoreDimension: empati naik saat ada pengakuan perasaan", () => {
  const empathetic = scoreDimension("empati", [
    "Saya paham kekhawatiranmu, maaf saya membatalkan janji. Dampaknya pasti mengecewakan.",
  ]);
  const cold = scoreDimension("empati", ["Itu bukan salah saya. Saya sibuk."]);
  assert.ok(empathetic.score > cold.score);
});

test("adaptLevel: jawaban kuat menaikkan level, jawaban lemah menurunkan", () => {
  const up = adaptLevel(wawancara, 3, [STRONG]);
  assert.equal(up.level, 4);
  assert.equal(up.signal, "dominating");
  const down = adaptLevel(wawancara, 3, [WEAK]);
  assert.equal(down.level, 2);
  assert.equal(down.signal, "struggling");
  const steady = adaptLevel(wawancara, 3, [
    "Saya pernah menangani pelanggan yang kecewa. Saya mendengarkan dulu, lalu menawarkan solusi pengganti.",
  ]);
  assert.ok(steady.level >= 2 && steady.level <= 4);
});

test("diagnosticScores: 4 dimensi, skor 0-100", () => {
  const scores = diagnosticScores([STRONG, WEAK, "Maaf, saya paham kamu kecewa. Saya yang salah membatalkan janji itu."]);
  assert.equal(scores.length, 4);
  assert.deepEqual(scores.map((s) => s.key), ["bukti", "struktur", "empati", "ketegasan"]);
  for (const s of scores) assert.ok(s.score >= 0 && s.score <= 100, `${s.key}: ${s.score}`);
});

test("computeVoiceMetrics: kecepatan dan kata pengisi dihitung dari transkripsi", () => {
  const m = computeVoiceMetrics("Halo nama saya Budi eh saya melamar posisi ini anu karena saya tertarik", 30);
  assert.equal(m.words, 13);
  assert.equal(m.paceWpm, 26); // 13 kata / 30 detik * 60
  assert.ok(m.fillers >= 2, `filler harus >= 2, dapat ${m.fillers}`);
  const empty = computeVoiceMetrics("   ", 10);
  assert.equal(empty.words, 0);
  assert.equal(empty.paceWpm, 0);
});

test("voiceNote: tanpa kata, minta bicara lebih dekat ke mikrofon", () => {
  assert.match(voiceNote({ paceWpm: 0, fillers: 0, words: 0 }), /mikrofon/);
  assert.match(voiceNote({ paceWpm: 200, fillers: 6, words: 50 }), /cepat/);
  assert.match(voiceNote({ paceWpm: 120, fillers: 0, words: 50 }), /pas/);
});

test("sharpenSentence: berisi placeholder [ ... ], tidak mengarang angka", () => {
  const r = sharpenSentence("Saya pekerja keras dan bisa diandalkan.");
  assert.ok(r.sharpened.includes("["));
  assert.ok(!/\d+\s*%/.test(r.sharpened.replace(/\[.*?\]/g, "")), "tidak boleh ada angka di luar placeholder");
  assert.ok(r.sharpened.includes("Contohnya"));
  assert.ok(r.sharpened.includes("Langkah berikutnya"));
  const withNum = sharpenSentence("Saya menaikkan penjualan 30 persen dalam 3 bulan.");
  assert.ok(withNum.sharpened.includes("[tulis 1 hasil nyata]"));
});
