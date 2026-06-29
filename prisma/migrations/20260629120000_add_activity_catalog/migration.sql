-- CreateEnum
CREATE TYPE "ActivityKind" AS ENUM ('RAID', 'DUNGEON', 'OPEN_WORLD');

-- CreateEnum
CREATE TYPE "ActivityGroupKind" AS ENUM ('EXPANSION', 'SEASON');

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "ActivityKind" NOT NULL,
    "nameRu" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "shortNameRu" TEXT NOT NULL,
    "shortNameEn" TEXT NOT NULL,
    "artPath" TEXT NOT NULL,
    "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "warcraftLogsZoneId" INTEGER,
    "warcraftLogsZoneName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityGroup" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "ActivityGroupKind" NOT NULL,
    "nameRu" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityGroupItem" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityGroupItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventDifficultyOption" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "labelRu" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventDifficultyOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Activity_slug_key" ON "Activity"("slug");

-- CreateIndex
CREATE INDEX "Activity_kind_isActive_sortOrder_idx" ON "Activity"("kind", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityGroup_slug_key" ON "ActivityGroup"("slug");

-- CreateIndex
CREATE INDEX "ActivityGroup_kind_isActive_sortOrder_idx" ON "ActivityGroup"("kind", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityGroupItem_groupId_activityId_key" ON "ActivityGroupItem"("groupId", "activityId");

-- CreateIndex
CREATE INDEX "ActivityGroupItem_activityId_idx" ON "ActivityGroupItem"("activityId");

-- CreateIndex
CREATE INDEX "ActivityGroupItem_groupId_sortOrder_idx" ON "ActivityGroupItem"("groupId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "EventDifficultyOption_slug_key" ON "EventDifficultyOption"("slug");

-- CreateIndex
CREATE INDEX "EventDifficultyOption_isActive_sortOrder_idx" ON "EventDifficultyOption"("isActive", "sortOrder");

-- AddForeignKey
ALTER TABLE "ActivityGroupItem" ADD CONSTRAINT "ActivityGroupItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ActivityGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityGroupItem" ADD CONSTRAINT "ActivityGroupItem_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
