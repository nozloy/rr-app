-- AlterTable
ALTER TABLE "WowCharacter" ADD COLUMN "raiderIoProfileJson" JSONB,
ADD COLUMN "raiderIoScore" DOUBLE PRECISION,
ADD COLUMN "raiderIoProfileUrl" TEXT,
ADD COLUMN "raiderIoFetchedAt" TIMESTAMP(3),
ADD COLUMN "blizzardEquipmentJson" JSONB,
ADD COLUMN "blizzardEquippedItemLevel" INTEGER,
ADD COLUMN "blizzardTopItemJson" JSONB,
ADD COLUMN "blizzardEquipmentFetchedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RaidCheckBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "realm" TEXT,
    "serverSlug" TEXT NOT NULL,
    "serverRegion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaidCheckBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RaidCheckBookmark_userId_name_serverSlug_serverRegion_key" ON "RaidCheckBookmark"("userId", "name", "serverSlug", "serverRegion");

-- CreateIndex
CREATE INDEX "RaidCheckBookmark_userId_serverRegion_serverSlug_idx" ON "RaidCheckBookmark"("userId", "serverRegion", "serverSlug");

-- AddForeignKey
ALTER TABLE "RaidCheckBookmark" ADD CONSTRAINT "RaidCheckBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
