import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLANS, TRIAL_DAYS, type PlanKey } from "@/lib/plans";
import { ensureUserRows } from "@/lib/ensure";

// Paket langganan — PEMBAYARAN SIMULASI SAJA (belum ada transaksi nyata / Midtrans live).
// POST { plan: "pro" | "tim", billing: "monthly" | "annual" } → upgrade simulasi.
// POST { plan: "free" } → kembali ke Free. POST { trial: true } → trial Pro 14 hari.
export async function GET() {
  let user; try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  await ensureUserRows(user.id);
  const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ subscription: sub, plans: PLANS, trialDays: TRIAL_DAYS, paymentMode: "simulasi" });
}

export async function POST(req: Request) {
  let user; try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  const body = await req.json().catch(() => ({}));
  const plan = String(body.plan || "free") as PlanKey;
  if (!PLANS[plan]) return NextResponse.json({ error: "Paket tidak dikenal." }, { status: 400 });
  await ensureUserRows(user.id);
  const now = new Date();
  const data: any = { plan, status: "active", updatedAt: now };
  if (body.trial && plan === "pro") {
    data.status = "trialing";
    data.trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  } else {
    data.trialEndsAt = null;
  }
  if (plan !== "free") data.renewsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sub = await prisma.subscription.upsert({ where: { userId: user.id }, update: data, create: { userId: user.id, ...data } });
  return NextResponse.json({ subscription: sub, paymentMode: "simulasi", note: "SIMULASI — tidak ada tagihan nyata. Pasang Midtrans untuk pembayaran live." });
}
