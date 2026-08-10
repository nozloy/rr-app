-- CreateEnum
CREATE TYPE "ScheduledEventActivityType" AS ENUM ('RAID', 'DUNGEON', 'SEASON', 'OPEN_WORLD');

-- CreateEnum
CREATE TYPE "ScheduledEventLeaderMode" AS ENUM ('CHARACTER', 'MANUAL');

-- CreateEnum
CREATE TYPE "ScheduledEventStatus" AS ENUM ('PUBLISHED');

-- CreateEnum
CREATE TYPE "EventPublishTarget" AS ENUM ('DISCORD', 'TELEGRAM', 'APP', 'CUSTOM');

-- CreateTable
CREATE TABLE "ScheduledEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addonSlug" TEXT NOT NULL,
    "activityType" "ScheduledEventActivityType" NOT NULL,
    "difficultyId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "localDate" TEXT NOT NULL,
    "localTime" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'Europe/Moscow',
    "leaderMode" "ScheduledEventLeaderMode" NOT NULL,
    "leaderCharacterId" TEXT,
    "leaderName" TEXT NOT NULL,
    "leaderRealm" TEXT NOT NULL,
    "tankMin" INTEGER NOT NULL,
    "tankMax" INTEGER NOT NULL,
    "healerMin" INTEGER NOT NULL,
    "healerMax" INTEGER NOT NULL,
    "damageMin" INTEGER NOT NULL,
    "damageMax" INTEGER NOT NULL,
    "hasPaidSlots" BOOLEAN NOT NULL DEFAULT false,
    "paidSlots" INTEGER NOT NULL DEFAULT 0,
    "paidSlotPrice" INTEGER NOT NULL DEFAULT 0,
    "hasUnroll" BOOLEAN NOT NULL DEFAULT false,
    "unrollItemIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "unrollTemplateId" TEXT,
    "publishTargets" "EventPublishTarget"[] NOT NULL DEFAULT ARRAY[]::"EventPublishTarget"[],
    "status" "ScheduledEventStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledEventActivity" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduledEventActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduledEvent_userId_startsAt_idx" ON "ScheduledEvent"("userId", "startsAt");

-- CreateIndex
CREATE INDEX "ScheduledEvent_status_startsAt_idx" ON "ScheduledEvent"("status", "startsAt");

-- CreateIndex
CREATE INDEX "ScheduledEvent_difficultyId_idx" ON "ScheduledEvent"("difficultyId");

-- CreateIndex
CREATE INDEX "ScheduledEvent_leaderCharacterId_idx" ON "ScheduledEvent"("leaderCharacterId");

-- CreateIndex
CREATE INDEX "ScheduledEventActivity_activityId_idx" ON "ScheduledEventActivity"("activityId");

-- CreateIndex
CREATE INDEX "ScheduledEventActivity_eventId_sortOrder_idx" ON "ScheduledEventActivity"("eventId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledEventActivity_eventId_activityId_key" ON "ScheduledEventActivity"("eventId", "activityId");

-- AddForeignKey
ALTER TABLE "ScheduledEvent" ADD CONSTRAINT "ScheduledEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledEvent" ADD CONSTRAINT "ScheduledEvent_leaderCharacterId_fkey" FOREIGN KEY ("leaderCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledEvent" ADD CONSTRAINT "ScheduledEvent_difficultyId_fkey" FOREIGN KEY ("difficultyId") REFERENCES "EventDifficultyOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledEventActivity" ADD CONSTRAINT "ScheduledEventActivity_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ScheduledEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledEventActivity" ADD CONSTRAINT "ScheduledEventActivity_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
