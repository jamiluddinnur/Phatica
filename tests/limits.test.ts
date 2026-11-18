// Tes matematika rate limit + batas LLM harian — fungsi murni, tanpa database.
import test from "node:test";
import assert from "node:assert/strict";
import {
  LOGIN_MAX_FAILED,
  LOGIN_WINDOW_MS,
  REGISTER_MAX_PER_HOUR,
  MESSAGE_MAX_PER_MINUTE,
  CUSTOM_CREATE_MAX_PER_HOUR,
  isWindowExpired,
  isOverLimit,
  retryAfterSeconds,
} from "../src/lib/rate-limit";
import {
  LLM_DAILY_TURN_LIMIT,
  isDailyCapReached,
  todayDateString,
} from "../src/lib/llm-usage";

test("rate-limit: konstanta sesuai spesifikasi", () => {
  assert.equal(LOGIN_MAX_FAILED, 10);
  assert.equal(LOGIN_WINDOW_MS, 15 * 60 * 1000);
  assert.equal(REGISTER_MAX_PER_HOUR, 5);
  assert.equal(MESSAGE_MAX_PER_MINUTE, 30);
  assert.equal(CUSTOM_CREATE_MAX_PER_HOUR, 10);
  assert.equal(LLM_DAILY_TURN_LIMIT, 30);
});

test("isWindowExpired: jendela 15 menit habis tepat setelah 15 menit", () => {
  const start = new Date("2026-11-17T10:00:00Z");
  assert.equal(isWindowExpired(start, 15 * 60 * 1000, new Date("2026-11-17T10:14:59Z")), false);
  assert.equal(isWindowExpired(start, 15 * 60 * 1000, new Date("2026-11-17T10:15:00Z")), true);
  assert.equal(isWindowExpired(start, 15 * 60 * 1000, new Date("2026-11-17T10:30:00Z")), true);
});

test("isOverLimit: batas tercapai saat count == limit", () => {
  assert.equal(isOverLimit(9, 10), false);
  assert.equal(isOverLimit(10, 10), true);
  assert.equal(isOverLimit(11, 10), true);
  assert.equal(isOverLimit(0, 30), false);
});

test("retryAfterSeconds: sisa waktu jendela, minimal 1 detik", () => {
  const start = new Date("2026-11-17T10:00:00Z");
  assert.equal(retryAfterSeconds(start, 15 * 60 * 1000, new Date("2026-11-17T10:05:00Z")), 600);
  assert.equal(retryAfterSeconds(start, 15 * 60 * 1000, new Date("2026-11-17T10:14:59Z")), 1);
  assert.equal(retryAfterSeconds(start, 15 * 60 * 1000, new Date("2026-11-17T10:16:00Z")), 1);
});

test("isDailyCapReached: 30 giliran = batas tercapai, 29 belum", () => {
  assert.equal(isDailyCapReached(29), false);
  assert.equal(isDailyCapReached(30), true);
  assert.equal(isDailyCapReached(31), true);
  assert.equal(isDailyCapReached(0), false);
});

test("todayDateString: format yyyy-mm-dd dalam WIB (UTC+7)", () => {
  // 2026-11-17 18:00 UTC = 2026-11-18 01:00 WIB → tanggal WIB 2026-11-18
  assert.equal(todayDateString(new Date("2026-11-17T18:00:00Z")), "2026-11-18");
  assert.equal(todayDateString(new Date("2026-11-17T10:00:00Z")), "2026-11-17");
  assert.match(todayDateString(), /^\d{4}-\d{2}-\d{2}$/);
});
