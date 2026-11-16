import { prisma } from "./prisma";
export async function ensureUserRows(userId: string) {
  await prisma.subscription.upsert({ where: { userId }, update: {}, create: { userId, plan: "free", status: "active" } });
  await prisma.learnerMemory.upsert({ where: { userId }, update: {}, create: { userId, levels: "{}" } });
  await prisma.brandProfile.upsert({ where: { userId }, update: {}, create: { userId } });
}
