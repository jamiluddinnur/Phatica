// Tes validasi umpan balik + cek pemilik + ringkasan — fungsi murni, tanpa database.
import test from "node:test";
import assert from "node:assert/strict";
import {
  FEEDBACK_MAX_COMMENT,
  RATING_LABELS,
  isOwnerEmail,
  ratingLabel,
  summarizeFeedback,
  validateFeedback,
} from "../src/lib/feedback";

test("validateFeedback: rating 1-5 diterima, 0 dan 6 ditolak", () => {
  for (const r of [1, 2, 3, 4, 5]) {
    assert.equal(validateFeedback({ rating: r, kind: "aplikasi" }), null, `rating ${r}`);
  }
  assert.match(validateFeedback({ rating: 0, kind: "aplikasi" }) || "", /1 sampai 5/);
  assert.match(validateFeedback({ rating: 6, kind: "aplikasi" }) || "", /1 sampai 5/);
  assert.match(validateFeedback({ rating: 3.5, kind: "aplikasi" }) || "", /1 sampai 5/);
  assert.match(validateFeedback({ rating: "5", kind: "aplikasi" }) || "", /1 sampai 5/);
  assert.match(validateFeedback({}) || "", /1 sampai 5/);
});

test("validateFeedback: komentar >1000 karakter ditolak, 1000 diterima", () => {
  assert.equal(
    validateFeedback({ rating: 5, kind: "aplikasi", comment: "x".repeat(1000) }),
    null
  );
  assert.match(
    validateFeedback({ rating: 5, kind: "aplikasi", comment: "x".repeat(1001) }) || "",
    /1000/
  );
  assert.equal(FEEDBACK_MAX_COMMENT, 1000);
});

test("validateFeedback: kind sesi wajib punya sessionId, kind aplikasi tidak", () => {
  assert.match(
    validateFeedback({ rating: 4, kind: "sesi" }) || "",
    /satu sesi/
  );
  assert.equal(validateFeedback({ rating: 4, kind: "sesi", sessionId: "abc123" }), null);
  assert.equal(validateFeedback({ rating: 4, kind: "aplikasi" }), null);
  assert.match(validateFeedback({ rating: 4, kind: "lain" }) || "", /tidak dikenal/);
});

test("ratingLabel: 1=Sangat kurang sampai 5=Sangat membantu", () => {
  assert.equal(ratingLabel(1), "Sangat kurang");
  assert.equal(ratingLabel(5), "Sangat membantu");
  assert.deepEqual([...RATING_LABELS], [
    "Sangat kurang",
    "Kurang",
    "Cukup",
    "Membantu",
    "Sangat membantu",
  ]);
});

test("isOwnerEmail: email cocok boleh, tidak cocok/kosong ditolak", () => {
  assert.equal(isOwnerEmail("jam@mail.com", "jam@mail.com"), true);
  assert.equal(isOwnerEmail("JAM@mail.com", "jam@mail.com"), true); // tidak peka huruf
  assert.equal(isOwnerEmail("lain@mail.com", "jam@mail.com"), false);
  assert.equal(isOwnerEmail("jam@mail.com", ""), false);
  assert.equal(isOwnerEmail("jam@mail.com", undefined), false);
  assert.equal(isOwnerEmail(null, "jam@mail.com"), false);
  assert.equal(isOwnerEmail(undefined, "jam@mail.com"), false);
});

test("summarizeFeedback: rata-rata + distribusi per bintang", () => {
  const s = summarizeFeedback([5, 4, 5, 1]);
  assert.equal(s.total, 4);
  assert.equal(s.average, 3.8);
  assert.deepEqual(s.distribution, { 1: 1, 2: 0, 3: 0, 4: 1, 5: 2 });
  const empty = summarizeFeedback([]);
  assert.equal(empty.total, 0);
  assert.equal(empty.average, null);
});
