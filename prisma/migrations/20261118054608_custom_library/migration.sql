-- AlterTable
ALTER TABLE "PracticeSession" ADD COLUMN     "customScenarioId" TEXT;

-- CreateTable
CREATE TABLE "CustomPillar" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomPillar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomScenario" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pillarKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "personaName" TEXT NOT NULL,
    "personaRole" TEXT NOT NULL,
    "trait" TEXT NOT NULL,
    "situation" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 3,
    "openingLine" TEXT NOT NULL DEFAULT '',
    "rubric" TEXT NOT NULL,
    "sourceScenarioId" TEXT,
    "sourceCustomRoleplayId" TEXT,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomScenario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomPillar_userId_name_key" ON "CustomPillar"("userId", "name");

-- AddForeignKey
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_customScenarioId_fkey" FOREIGN KEY ("customScenarioId") REFERENCES "CustomScenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomPillar" ADD CONSTRAINT "CustomPillar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomScenario" ADD CONSTRAINT "CustomScenario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

