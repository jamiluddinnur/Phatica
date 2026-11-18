// GET /api/library/detail?id=<scenarioId> — satu skenario Skenarioku milik
// akun, untuk pengisian awal wizard (builder pre-fill) + kartu persona.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { personaCardForCustomScenario, type Trait } from "@/lib/custom-library";
import { serializeScenario } from "../helpers";

export async function GET(req: Request) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "Login dulu dengan email." }, { status: 401 }); }
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "ID skenario tidak ada." }, { status: 400 });
  const item = await prisma.customScenario.findFirst({ where: { id, userId: user.id } });
  if (!item) return NextResponse.json({ error: "Skenario tidak ditemukan." }, { status: 404 });
  const personaCard = personaCardForCustomScenario({
    personaName: item.personaName, personaRole: item.personaRole,
    trait: item.trait as Trait, situation: item.situation, openingLine: item.openingLine,
  });
  return NextResponse.json({ scenario: serializeScenario(item), personaCard });
}
