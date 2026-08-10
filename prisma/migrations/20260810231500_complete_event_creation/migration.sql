-- AlterEnum
ALTER TYPE "ScheduledEventStatus" ADD VALUE 'CANCELLED';

-- CreateEnum
CREATE TYPE "ExternalPublishTarget" AS ENUM ('DISCORD', 'TELEGRAM');

-- CreateEnum
CREATE TYPE "EventDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'REMOVED', 'CANCELLED');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'Europe/Moscow';

-- AlterTable
ALTER TABLE "ScheduledEvent"
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "clientRequestId" TEXT,
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "contentScope" TEXT NOT NULL DEFAULT 'expansion';

-- CreateTable
CREATE TABLE "EventTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledEventDelivery" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "target" "ExternalPublishTarget" NOT NULL,
    "status" "EventDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "remoteMessageId" TEXT,
    "destinationFingerprint" TEXT,
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "lastAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledEventDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledEvent_userId_clientRequestId_key"
ON "ScheduledEvent"("userId", "clientRequestId");

CREATE UNIQUE INDEX "EventTemplate_userId_normalizedName_key"
ON "EventTemplate"("userId", "normalizedName");

CREATE INDEX "EventTemplate_userId_updatedAt_idx"
ON "EventTemplate"("userId", "updatedAt");

CREATE UNIQUE INDEX "ScheduledEventDelivery_eventId_target_key"
ON "ScheduledEventDelivery"("eventId", "target");

CREATE INDEX "ScheduledEventDelivery_status_lastAttemptAt_idx"
ON "ScheduledEventDelivery"("status", "lastAttemptAt");

-- AddForeignKey
ALTER TABLE "EventTemplate"
ADD CONSTRAINT "EventTemplate_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScheduledEventDelivery"
ADD CONSTRAINT "ScheduledEventDelivery_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "ScheduledEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing channel selections predate real delivery. Mark them as retryable.
INSERT INTO "ScheduledEventDelivery" (
    "id",
    "eventId",
    "target",
    "status",
    "attemptCount",
    "lastErrorCode",
    "lastErrorMessage",
    "createdAt",
    "updatedAt"
)
SELECT
    'legacy_' || md5(event."id" || target::text),
    event."id",
    target::text::"ExternalPublishTarget",
    'FAILED'::"EventDeliveryStatus",
    0,
    'LEGACY_NOT_DELIVERED',
    'Событие создано до подключения внешней публикации.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "ScheduledEvent" AS event
CROSS JOIN LATERAL unnest(event."publishTargets") AS target
WHERE target::text IN ('DISCORD', 'TELEGRAM');
