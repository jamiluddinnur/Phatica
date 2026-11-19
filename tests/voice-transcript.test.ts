// Tes buffer transkrip suara (src/lib/voice-transcript.ts) — logika murni,
// mensimulasikan event Web Speech API tanpa browser.
// Dijalankan: npm test
import test from "node:test";
import assert from "node:assert/strict";
import {
  startSession,
  beginInstance,
  applyResult,
  displayText,
  finalText,
  pickIndonesianVoice,
  type VoiceResultItem,
} from "../src/lib/voice-transcript";

const fin = (transcript: string): VoiceResultItem => ({ isFinal: true, transcript });
const inter = (transcript: string): VoiceResultItem => ({ isFinal: false, transcript });

test("final terakumulasi lintas restart tanpa duplikasi", () => {
  const buf = startSession("");
  // Instans 1: dua hasil final.
  applyResult(buf, [fin("halo apa kabar")], 0);
  applyResult(buf, [fin("halo apa kabar"), fin("saya baik")], 1);
  assert.equal(finalText(buf), "halo apa kabar saya baik");
  // Restart: instans baru, daftar hasil mulai dari nol.
  beginInstance(buf);
  applyResult(buf, [fin("terima kasih")], 0);
  assert.equal(finalText(buf), "halo apa kabar saya baik terima kasih");
});

test("interim diganti, tidak ditambahkan, dan tidak masuk finalText", () => {
  const buf = startSession("");
  applyResult(buf, [inter("saya")], 0);
  assert.equal(displayText(buf), "saya");
  applyResult(buf, [inter("saya ingin")], 0);
  assert.equal(displayText(buf), "saya ingin");
  applyResult(buf, [inter("saya ingin bertanya")], 0);
  assert.equal(displayText(buf), "saya ingin bertanya");
  // Interim tidak pernah bocor ke teks final.
  assert.equal(finalText(buf), "");
  // Begitu final, interim bersih dan teksnya pindah ke committed.
  applyResult(buf, [fin("saya ingin bertanya")], 0);
  assert.equal(buf.interimText, "");
  assert.equal(finalText(buf), "saya ingin bertanya");
  assert.equal(displayText(buf), "saya ingin bertanya");
});

test("prefix yang diketik tetap utuh, suara menambah setelahnya", () => {
  const buf = startSession("Menurut saya,");
  applyResult(buf, [inter("kita harus")], 0);
  assert.equal(displayText(buf), "Menurut saya, kita harus");
  applyResult(buf, [fin("kita harus mulai sekarang")], 0);
  assert.equal(finalText(buf), "Menurut saya, kita harus mulai sekarang");
});

test("hasil lama yang diulang recognizer continuous tidak dikomit dua kali", () => {
  const buf = startSession("");
  applyResult(buf, [fin("satu")], 0);
  applyResult(buf, [fin("satu"), fin("dua")], 1);
  // Event berikutnya mengulang SELURUH daftar dari indeks 0.
  applyResult(buf, [fin("satu"), fin("dua"), fin("tiga")], 0);
  assert.equal(finalText(buf), "satu dua tiga");
  // Event duplikat persis (tanpa hasil baru) tidak mengubah apa pun.
  applyResult(buf, [fin("satu"), fin("dua"), fin("tiga")], 0);
  assert.equal(finalText(buf), "satu dua tiga");
});

test("transkrip kosong/spasi tidak menambah spasi liar", () => {
  const buf = startSession("");
  applyResult(buf, [fin("   ")], 0);
  assert.equal(finalText(buf), "");
  assert.equal(displayText(buf), "");
  applyResult(buf, [fin("   "), fin("  halo   dunia  ")], 1);
  assert.equal(finalText(buf), "halo dunia");
  applyResult(buf, [fin("halo dunia"), inter("   ")], 1);
  assert.equal(displayText(buf), "halo dunia");
});

test("interim setelah final pada event yang sama tampil live dan terkomit saat final", () => {
  const buf = startSession("");
  applyResult(buf, [fin("pembuka selesai"), inter("lanjut ke")], 0);
  assert.equal(displayText(buf), "pembuka selesai lanjut ke");
  assert.equal(finalText(buf), "pembuka selesai");
  applyResult(buf, [fin("pembuka selesai"), fin("lanjut ke inti")], 1);
  assert.equal(finalText(buf), "pembuka selesai lanjut ke inti");
  assert.equal(buf.interimText, "");
});

// ---------- pickIndonesianVoice ----------

test("pickIndonesianVoice memilih suara id-ID dari daftar campuran", () => {
  const voices = [
    { lang: "en-US", name: "English US" },
    { lang: "id-ID", name: "Bahasa Indonesia" },
    { lang: "ms-MY", name: "Melayu" },
  ];
  assert.equal(pickIndonesianVoice(voices)?.name, "Bahasa Indonesia");
});

test("pickIndonesianVoice mengutamakan id-ID persis di atas awalan id lain", () => {
  const voices = [
    { lang: "id", name: "Indonesia tanpa region" },
    { lang: "id-ID", name: "Indonesia persis" },
  ];
  assert.equal(pickIndonesianVoice(voices)?.name, "Indonesia persis");
  // Format underscore "id_ID" dinormalisasi dan tetap dikenali sebagai Indonesia.
  assert.equal(pickIndonesianVoice([{ lang: "id_ID", name: "Indonesia underscore" }])?.name, "Indonesia underscore");
});

test("pickIndonesianVoice mengembalikan null bila tidak ada suara Indonesia", () => {
  assert.equal(pickIndonesianVoice([{ lang: "en-US" }, { lang: "ja-JP" }]), null);
});

test("pickIndonesianVoice mengembalikan null untuk daftar kosong/null", () => {
  assert.equal(pickIndonesianVoice([]), null);
  assert.equal(pickIndonesianVoice(null), null);
  assert.equal(pickIndonesianVoice(undefined), null);
});
