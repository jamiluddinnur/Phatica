// Suara cloud persona (ElevenLabs) — POST { text } → audio/mpeg.
// - Wajib login. Kunci ElevenLabs hanya hidup di server (src/lib/tts.ts).
// - Penjaga kredit: rate-limit 30/menit + batas 3.000 karakter/pengguna/hari
//   (WIB, src/lib/tts-usage.ts). Karakter dicatat HANYA setelah generasi
//   berhasil.
// - Setiap kegagalan menjawab JSON { fallback: true } — klien lalu memakai
//   suara browser untuk teks yang sama, sesi tidak pernah macet.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { checkRateLimit, TTS_MAX_PER_MINUTE, TTS_WINDOW_MS } from "@/lib/rate-limit";
import { callElevenLabsTts, isTtsEnabled, prepareTtsText, TtsError } from "@/lib/tts";
import { checkTtsCap, recordTtsUsage } from "@/lib/tts-usage";
import { logServerError } from "@/lib/log";

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 });
  }
  const rl = await checkRateLimit(`tts:${user.id}`, TTS_MAX_PER_MINUTE, TTS_WINDOW_MS);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan suara — coba lagi sebentar lagi.", fallback: true },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }
  if (!isTtsEnabled()) {
    return NextResponse.json({ error: "Suara cloud belum dipasang", fallback: true }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const rawText = typeof body?.text === "string" ? body.text : "";
  let prepared: string;
  try {
    prepared = prepareTtsText(rawText);
  } catch {
    return NextResponse.json({ error: "Teks suara kosong.", fallback: true }, { status: 400 });
  }
  if (!(await checkTtsCap(user.id, prepared.length))) {
    return NextResponse.json({ error: "Batas suara cloud hari ini tercapai", fallback: true }, { status: 429 });
  }
  try {
    const result = await callElevenLabsTts(prepared);
    await recordTtsUsage(user.id, result.chars);
    return new Response(result.audio, {
      status: 200,
      headers: { "Content-Type": result.contentType || "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (err) {
    if (err instanceof TtsError && err.kind === "quota") {
      return NextResponse.json({ error: "Suara cloud tidak tersedia", fallback: true }, { status: 503 });
    }
    if (!(err instanceof TtsError)) logServerError("api/tts", err);
    return NextResponse.json({ error: "Suara cloud tidak tersedia", fallback: true }, { status: 502 });
  }
}
