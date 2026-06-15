-- CreateTable
CREATE TABLE "WowCharacter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serverSlug" TEXT NOT NULL,
    "serverRegion" TEXT NOT NULL,
    "warcraftLogsId" INTEGER,
    "lastFetchedAt" TIMESTAMP(3),
    "rankingsJson" JSONB,
    "gearJson" JSONB,
    "averageParse" DOUBLE PRECISION,
    "bestParse" DOUBLE PRECISION,
    "raidStatsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WowCharacter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WowCharacter_serverRegion_serverSlug_idx" ON "WowCharacter"("serverRegion", "serverSlug");

-- CreateIndex
CREATE UNIQUE INDEX "WowCharacter_name_serverSlug_serverRegion_key" ON "WowCharacter"("name", "serverSlug", "serverRegion");
