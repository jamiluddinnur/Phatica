// Tes Tes Awal + Jalur Belajar (src/lib/diagnostic.ts) — tanpa database.
import test from "node:test";
import assert from "node:assert/strict";
import { scoreDiagnostic, buildPath } from "../src/lib/diagnostic";
import { SCENARIOS } from "../src/lib/scenarios";

const STRONG =
  "Pertama, saya menaikkan penjualan sebesar 30 persen dalam 3 bulan. " +
  "Kedua, saya menguji 5 iklan berbeda. Contohnya, penjualan naik dari 20 juta menjadi 26 juta.";
const WEAK = "Saya pekerja keras.";

test("scoreDiagnostic: mengembalikan 4 skor + tepat 2 dimensi terlemah", () => {
  const { scores, weakest } = scoreDiagnostic([STRONG, WEAK, WEAK]);
  assert.equal(scores.length, 4);
  assert.equal(weakest.length, 2);
  for (const w of weakest) assert.ok(["bukti", "struktur", "empati", "ketegasan"].includes(w));
  // Dimensi terlemah harus 2 skor terendah
  const sorted = [...scores].sort((a, b) => a.score - b.score).slice(0, 2).map((s) => s.key);
  assert.deepEqual([...weakest].sort(), [...sorted].sort());
});

test("buildPath: tepat 3 skenario unik, semua ada di katalog", () => {
  const path = buildPath(["bukti", "empati"]);
  assert.equal(path.length, 3);
  const ids = path.map((p) => p.scenarioId);
  assert.equal(new Set(ids).size, 3, "skenario jalur harus unik");
  for (const item of path) {
    assert.ok(SCENARIOS.some((s) => s.id === item.scenarioId), `tidak dikenal: ${item.scenarioId}`);
    assert.equal(item.done, false);
    assert.ok(["Bukti", "Struktur", "Empati", "Ketegasan"].includes(item.dimension));
  }
  // Urutan: dimensi terlemah pertama dilatih 2x (posisi 1 dan 3)
  assert.equal(path[0].dimension, "Bukti");
  assert.equal(path[1].dimension, "Empati");
  assert.equal(path[2].dimension, "Bukti");
});

test("buildPath: dimensi tidak dikenal tetap menghasilkan 3 skenario (pengaman)", () => {
  const path = buildPath(["tidak-ada", "juga-tidak-ada"]);
  assert.equal(path.length, 3);
  assert.equal(new Set(path.map((p) => p.scenarioId)).size, 3);
});
