// Tes logika murni Skenarioku + Pilarku (src/lib/custom-library.ts) —
// tanpa database, tanpa LLM. Dijalankan: npm test
import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_CUSTOM_PILLARS,
  MAX_CUSTOM_SCENARIOS,
  PILLAR_COLORS,
  PILLAR_ICONS,
  RUBRIC_DIMENSION_LIBRARY,
  buildRubricFromSelections,
  duplicatePrefillFromScenario,
  isPillarLimitReached,
  isScenarioLimitReached,
  pillarLabelForKey,
  suggestTitleFromSituation,
  validateCustomPillar,
  validateCustomScenario,
  validateRubricSelections,
  validateWizardStep,
} from "../src/lib/custom-library";
import { SCENARIOS } from "../src/lib/scenarios";

const BASE = {
  title: "Minta Naik Gaji",
  personaName: "Atasan saya",
  personaRole: "atasan langsung yang memegang anggaran tim",
  trait: "Skeptis",
  situation: "Sudah dua tahun saya di tim ini dan beban kerja saya bertambah — saya mengurus dua proyek sekaligus, tapi gaji saya belum pernah disesuaikan.",
  goal: "Mendapat kenaikan gaji yang wajar dengan menunjukkan bukti kontribusi saya.",
  level: 3,
  openingLine: "",
  pillarKey: "interpersonal",
  rubric: [{ key: "bukti" }, { key: "struktur" }, { key: "ketegasan" }],
};

test("batas: MAX_CUSTOM_PILLARS = 5, MAX_CUSTOM_SCENARIOS = 20", () => {
  assert.equal(MAX_CUSTOM_PILLARS, 5);
  assert.equal(MAX_CUSTOM_SCENARIOS, 20);
  assert.equal(isPillarLimitReached(4), false);
  assert.equal(isPillarLimitReached(5), true);
  assert.equal(isPillarLimitReached(6), true);
  assert.equal(isScenarioLimitReached(19), false);
  assert.equal(isScenarioLimitReached(20), true);
});

test("palet pilar: 6 warna hex, 8 ikon — tanpa teks bebas", () => {
  assert.equal(PILLAR_COLORS.length, 6);
  assert.equal(PILLAR_ICONS.length, 8);
  for (const c of PILLAR_COLORS) assert.match(c, /^#[0-9A-F]{6}$/);
  assert.ok((PILLAR_ICONS as readonly string[]).includes("chat"));
  assert.ok((PILLAR_ICONS as readonly string[]).includes("target"));
});

test("validateCustomPillar: nama 2–40, deskripsi maks 200, warna/ikon dari daftar", () => {
  assert.equal(validateCustomPillar({ name: "Kerja", description: "", color: "#14B8A6", icon: "briefcase" }), null);
  assert.ok(validateCustomPillar({ name: "A", description: "", color: "#14B8A6", icon: "chat" }));
  assert.ok(validateCustomPillar({ name: "x".repeat(41), description: "", color: "#14B8A6", icon: "chat" }));
  assert.ok(validateCustomPillar({ name: "Kerja", description: "x".repeat(201), color: "#14B8A6", icon: "chat" }));
  assert.ok(validateCustomPillar({ name: "Kerja", description: "", color: "#ABCDEF", icon: "chat" }));
  assert.ok(validateCustomPillar({ name: "Kerja", description: "", color: "#14B8A6", icon: "roket" }));
});

test("validateRubricSelections: tolak 1 atau 5 dimensi, terima 2–4", () => {
  assert.ok(validateRubricSelections([{ key: "bukti" }]));
  assert.equal(validateRubricSelections([{ key: "bukti" }, { key: "struktur" }]), null);
  assert.equal(validateRubricSelections([{ key: "bukti" }, { key: "struktur" }, { key: "empati" }, { key: "ketegasan" }]), null);
  assert.ok(validateRubricSelections([
    { key: "bukti" }, { key: "struktur" }, { key: "empati" }, { key: "ketegasan" }, { key: "kejelasan" },
  ]));
  assert.ok(validateRubricSelections([{ key: "tidak_ada" }, { key: "struktur" }]));
  assert.ok(validateRubricSelections([{ key: "bukti" }, { key: "bukti" }]));
});

test("validateRubricSelections: dimensi custom maks 1, maks 40 karakter", () => {
  assert.equal(validateRubricSelections([{ key: "bukti" }, { customLabel: "Nada bicara yang hangat" }]), null);
  assert.ok(validateRubricSelections([{ key: "bukti" }, { customLabel: "Satu" }, { customLabel: "Dua" }]));
  assert.ok(validateRubricSelections([{ key: "bukti" }, { customLabel: "x".repeat(41) }]));
  assert.equal(validateRubricSelections([{ key: "bukti" }, { key: "struktur" }, { customLabel: "Tegas tapi hangat" }]), null);
});

test("buildRubricFromSelections: bobot dibagi rata, total tepat 1", () => {
  const r = buildRubricFromSelections([{ key: "bukti" }, { key: "struktur" }, { key: "empati" }]);
  assert.equal(r.length, 3);
  assert.equal(r.reduce((a, d) => a + d.weight, 0), 1);
  assert.equal(r[0].label, "Bukti & Angka");
  const custom = buildRubricFromSelections([{ key: "bukti" }, { customLabel: "Nada hangat" }]);
  assert.equal(custom[1].label, "Nada hangat");
  assert.ok(custom[1].key.startsWith("custom_"));
});

test("validateCustomScenario: skenario lengkap lolos; judul/situasi/tujuan/level ditolak bila tidak memenuhi", () => {
  assert.equal(validateCustomScenario(BASE), null);
  assert.ok(validateCustomScenario({ ...BASE, title: "Ab" }));
  assert.ok(validateCustomScenario({ ...BASE, title: "x".repeat(81) }));
  assert.ok(validateCustomScenario({ ...BASE, situation: "Terlalu pendek." }));
  assert.ok(validateCustomScenario({ ...BASE, goal: "Coba" }));
  assert.ok(validateCustomScenario({ ...BASE, level: 0 }));
  assert.ok(validateCustomScenario({ ...BASE, level: 6 }));
  assert.ok(validateCustomScenario({ ...BASE, trait: "Santai" }));
  assert.ok(validateCustomScenario({ ...BASE, pillarKey: "tidak-ada" }));
  assert.ok(validateCustomScenario({ ...BASE, rubric: [{ key: "bukti" }] }));
  assert.ok(validateCustomScenario({ ...BASE, openingLine: "x".repeat(301) }));
});

test("validateWizardStep: langkah 1 butuh persona+sifat+level, langkah 2 butuh judul+situasi+tujuan, langkah 3 butuh 2–4 rubrik", () => {
  assert.ok(validateWizardStep(1, { personaName: "", personaRole: "atasan", trait: "Skeptis", level: 3 }));
  assert.ok(validateWizardStep(1, { personaName: "Atasan", personaRole: "", trait: "Skeptis", level: 3 }));
  assert.equal(validateWizardStep(1, { personaName: "Atasan", personaRole: "atasan", trait: "Skeptis", level: 3 }), null);
  assert.ok(validateWizardStep(2, { title: "Judul", situation: "pendek", goal: "Tujuan yang cukup panjang di sini." }));
  assert.equal(validateWizardStep(2, { title: "Judul", situation: BASE.situation, goal: BASE.goal }), null);
  assert.ok(validateWizardStep(3, { rubricKeys: ["bukti"] }));
  assert.equal(validateWizardStep(3, { rubricKeys: ["bukti", "struktur"] }), null);
});

test("validateWizardStep langkah 3: 1 kunci + 1 dimensi custom = 2 dimensi, lolos", () => {
  assert.equal(validateWizardStep(3, { rubricKeys: ["bukti"], customDimension: "Nada hangat" }), null);
  assert.ok(validateWizardStep(3, { rubricKeys: ["bukti", "struktur", "empati", "ketegasan"], customDimension: "Nada hangat" }));
});

test("duplicatePrefillFromScenario: duplikasi Wawancara Kerja mempertahankan sifat + rubrik", () => {
  const sc = SCENARIOS.find((s) => s.id === "interpersonal-wawancara-kerja")!;
  const pre = duplicatePrefillFromScenario(sc);
  assert.equal(pre.trait, "Skeptis");
  assert.equal(pre.personaName, "Bu Nadia");
  assert.equal(pre.situation, sc.context);
  assert.equal(pre.goal, sc.goal);
  assert.equal(pre.level, sc.baseDifficulty);
  assert.equal(pre.sourceScenarioId, sc.id);
  assert.equal(pre.rubricSlotFull, true); // rubrik asli 4 dimensi
  assert.deepEqual(pre.rubricKeys, ["struktur", "bukti", "percaya_diri", "relevansi"]);
});

test("duplicatePrefillFromScenario: skenario rubrik 3 dimensi menyisakan 1 slot kosong", () => {
  const sc = SCENARIOS.find((s) => s.id === "interpersonal-wawancara-beasiswa")!;
  const pre = duplicatePrefillFromScenario(sc);
  assert.equal(pre.rubricSlotFull, false);
  assert.equal(pre.rubricKeys.length, 3);
  assert.equal(pre.trait, "Skeptis");
});

test("pillarLabelForKey: slug bawaan, custom:<id>, dan fallback aman", () => {
  assert.equal(pillarLabelForKey("interpersonal", []), "Interpersonal");
  assert.equal(pillarLabelForKey("pr-krisis", []), "PR / Krisis");
  assert.equal(pillarLabelForKey("custom:abc123", [{ id: "abc123", name: "Kerja Kantorku" }]), "Kerja Kantorku");
  assert.equal(pillarLabelForKey("custom:hilang", []), "Interpersonal");
  assert.equal(pillarLabelForKey("aneh", []), "Interpersonal");
});

test("suggestTitleFromSituation: kalimat pertama situasi, maks ~60 karakter", () => {
  const t = suggestTitleFromSituation("Besok saya mau minta naik gaji ke atasan, tapi saya gugup karena tahun lalu ditolak. Saya sudah menyiapkan data penjualan saya.");
  assert.ok(t.startsWith("Besok saya mau minta naik gaji"));
  assert.ok(t.length <= 65);
  assert.equal(suggestTitleFromSituation(""), "Skenario Buatanmu");
});

test("pustaka rubrik: semua kunci dikenal evaluator (scoreDimension)", async () => {
  // Semua kunci pustaka harus punya cabang di scoreDimension (atau default) —
  // diuji lewat pemakaian: kunci-kunci ini dipakai evaluator tanpa error.
  const { scoreDimension } = await import("../src/lib/ai");
  for (const dim of RUBRIC_DIMENSION_LIBRARY) {
    const s = scoreDimension(dim.key, ["Pertama, saya menaikkan penjualan sebesar 30 persen dalam 3 bulan. Contohnya, dari 20 juta menjadi 26 juta."]);
    assert.ok(Number.isFinite(s.score) && s.score >= 0 && s.score <= 100, `${dim.key} harus menghasilkan skor 0–100`);
  }
  assert.ok(RUBRIC_DIMENSION_LIBRARY.length >= 20);
});
