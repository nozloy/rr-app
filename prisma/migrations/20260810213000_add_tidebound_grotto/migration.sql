INSERT INTO "Activity" (
    "id",
    "slug",
    "kind",
    "nameRu",
    "nameEn",
    "shortNameRu",
    "shortNameEn",
    "artPath",
    "aliases",
    "warcraftLogsZoneId",
    "warcraftLogsZoneName",
    "isActive",
    "sortOrder",
    "createdAt",
    "updatedAt"
)
VALUES (
    'activity-tidebound-grotto',
    'tidebound-grotto',
    'RAID',
    'Приливный Грот',
    'The Tidebound Grotto',
    'ПГ',
    'TBG',
    '/raids/tidebound_grotto_styled_16x9.png',
    ARRAY[
        'Приливный Грот',
        'The Tidebound Grotto',
        'Tidebound Grotto',
        'Нимрисса Волногон',
        'Nymrissa Wavecaller'
    ]::TEXT[],
    NULL,
    NULL,
    true,
    5,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
    "kind" = EXCLUDED."kind",
    "nameRu" = EXCLUDED."nameRu",
    "nameEn" = EXCLUDED."nameEn",
    "shortNameRu" = EXCLUDED."shortNameRu",
    "shortNameEn" = EXCLUDED."shortNameEn",
    "artPath" = EXCLUDED."artPath",
    "aliases" = EXCLUDED."aliases",
    "warcraftLogsZoneId" = EXCLUDED."warcraftLogsZoneId",
    "warcraftLogsZoneName" = EXCLUDED."warcraftLogsZoneName",
    "isActive" = true,
    "sortOrder" = EXCLUDED."sortOrder",
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ActivityGroupItem" (
    "id",
    "groupId",
    "activityId",
    "sortOrder",
    "createdAt"
)
SELECT
    'activity-group-item-' || md5(midnight."id" || '-' || activity."id"),
    midnight."id",
    activity."id",
    5,
    CURRENT_TIMESTAMP
FROM "Activity" activity
CROSS JOIN "ActivityGroup" midnight
WHERE activity."slug" = 'tidebound-grotto'
  AND midnight."slug" = 'midnight'
ON CONFLICT ("groupId", "activityId") DO UPDATE SET
    "sortOrder" = EXCLUDED."sortOrder";

INSERT INTO "ActivityGroupItem" (
    "id",
    "groupId",
    "activityId",
    "sortOrder",
    "createdAt"
)
SELECT
    'activity-group-item-' || md5(season_two."id" || '-' || activity."id"),
    season_two."id",
    activity."id",
    9,
    CURRENT_TIMESTAMP
FROM "Activity" activity
CROSS JOIN "ActivityGroup" season_two
WHERE activity."slug" = 'tidebound-grotto'
  AND season_two."slug" = 'midnight-season-2'
ON CONFLICT ("groupId", "activityId") DO UPDATE SET
    "sortOrder" = EXCLUDED."sortOrder";

DELETE FROM "ActivityDifficultyOption"
USING "Activity", "EventDifficultyOption"
WHERE "ActivityDifficultyOption"."activityId" = "Activity"."id"
  AND "ActivityDifficultyOption"."difficultyId" = "EventDifficultyOption"."id"
  AND "Activity"."slug" = 'tidebound-grotto'
  AND "EventDifficultyOption"."slug" NOT IN ('normal', 'heroic', 'flex-mythic');

INSERT INTO "ActivityDifficultyOption" (
    "id",
    "activityId",
    "difficultyId",
    "sortOrder",
    "createdAt"
)
SELECT
    'activity-difficulty-' || md5(activity."id" || '-' || difficulty."id"),
    activity."id",
    difficulty."id",
    CASE difficulty."slug"
        WHEN 'normal' THEN 0
        WHEN 'heroic' THEN 1
        ELSE 2
    END,
    CURRENT_TIMESTAMP
FROM "Activity" activity
CROSS JOIN "EventDifficultyOption" difficulty
WHERE activity."slug" = 'tidebound-grotto'
  AND difficulty."slug" IN ('normal', 'heroic', 'flex-mythic')
ON CONFLICT ("activityId", "difficultyId") DO UPDATE SET
    "sortOrder" = EXCLUDED."sortOrder";
