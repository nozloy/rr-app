ALTER TABLE "ActivityGroup" ADD COLUMN "artPath" TEXT;

CREATE TABLE "ActivityDifficultyOption" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "difficultyId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityDifficultyOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActivityDifficultyOption_activityId_difficultyId_key" ON "ActivityDifficultyOption"("activityId", "difficultyId");
CREATE INDEX "ActivityDifficultyOption_activityId_sortOrder_idx" ON "ActivityDifficultyOption"("activityId", "sortOrder");
CREATE INDEX "ActivityDifficultyOption_difficultyId_idx" ON "ActivityDifficultyOption"("difficultyId");

INSERT INTO "EventDifficultyOption" (
    "id",
    "slug",
    "labelRu",
    "labelEn",
    "isActive",
    "sortOrder",
    "createdAt",
    "updatedAt"
)
VALUES (
    'difficulty-flex-mythic',
    'flex-mythic',
    'Гибкий Мифический',
    'Flexible Mythic',
    true,
    3,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "ActivityDifficultyOption" (
    "id",
    "activityId",
    "difficultyId",
    "sortOrder",
    "createdAt"
)
SELECT
    'activity-difficulty-' || md5("Activity"."id" || '-' || "EventDifficultyOption"."id"),
    "Activity"."id",
    "EventDifficultyOption"."id",
    CASE "EventDifficultyOption"."slug"
        WHEN 'normal' THEN 0
        WHEN 'heroic' THEN 1
        ELSE 2
    END,
    CURRENT_TIMESTAMP
FROM "Activity"
CROSS JOIN "EventDifficultyOption"
WHERE "Activity"."kind" = 'RAID'
  AND "EventDifficultyOption"."slug" IN ('normal', 'heroic', 'mythic')
ON CONFLICT ("activityId", "difficultyId") DO NOTHING;

DELETE FROM "ActivityDifficultyOption"
USING "Activity", "EventDifficultyOption"
WHERE "ActivityDifficultyOption"."activityId" = "Activity"."id"
  AND "ActivityDifficultyOption"."difficultyId" = "EventDifficultyOption"."id"
  AND "Activity"."slug" = 'sporefall'
  AND "EventDifficultyOption"."slug" = 'mythic';

INSERT INTO "ActivityDifficultyOption" (
    "id",
    "activityId",
    "difficultyId",
    "sortOrder",
    "createdAt"
)
SELECT
    'activity-difficulty-' || md5("Activity"."id" || '-' || "EventDifficultyOption"."id"),
    "Activity"."id",
    "EventDifficultyOption"."id",
    2,
    CURRENT_TIMESTAMP
FROM "Activity"
CROSS JOIN "EventDifficultyOption"
WHERE "Activity"."slug" = 'sporefall'
  AND "EventDifficultyOption"."slug" = 'flex-mythic'
ON CONFLICT ("activityId", "difficultyId") DO NOTHING;

ALTER TABLE "ActivityDifficultyOption" ADD CONSTRAINT "ActivityDifficultyOption_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityDifficultyOption" ADD CONSTRAINT "ActivityDifficultyOption_difficultyId_fkey" FOREIGN KEY ("difficultyId") REFERENCES "EventDifficultyOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
