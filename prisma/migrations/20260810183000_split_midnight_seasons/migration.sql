INSERT INTO "ActivityGroup" (
    "id",
    "slug",
    "kind",
    "nameRu",
    "nameEn",
    "artPath",
    "startsAt",
    "endsAt",
    "isActive",
    "sortOrder",
    "createdAt",
    "updatedAt"
)
VALUES (
    'activity-group-midnight-season-2',
    'midnight-season-2',
    'SEASON',
    'Сезон 2 · Midnight',
    'Season 2 · Midnight',
    NULL,
    NULL,
    NULL,
    true,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
    "kind" = 'SEASON',
    "nameRu" = EXCLUDED."nameRu",
    "nameEn" = EXCLUDED."nameEn",
    "isActive" = true,
    "sortOrder" = 0,
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ActivityGroupItem" (
    "id",
    "groupId",
    "activityId",
    "sortOrder",
    "createdAt"
)
SELECT
    'activity-group-item-' || md5(season_two."id" || '-' || item."activityId"),
    season_two."id",
    item."activityId",
    item."sortOrder",
    CURRENT_TIMESTAMP
FROM "ActivityGroup" legacy_season
JOIN "ActivityGroupItem" item ON item."groupId" = legacy_season."id"
CROSS JOIN "ActivityGroup" season_two
WHERE legacy_season."slug" = 'current-season'
  AND season_two."slug" = 'midnight-season-2'
ON CONFLICT ("groupId", "activityId") DO UPDATE SET
    "sortOrder" = EXCLUDED."sortOrder";

INSERT INTO "ActivityGroup" (
    "id",
    "slug",
    "kind",
    "nameRu",
    "nameEn",
    "artPath",
    "startsAt",
    "endsAt",
    "isActive",
    "sortOrder",
    "createdAt",
    "updatedAt"
)
VALUES (
    'activity-group-midnight-season-1',
    'midnight-season-1',
    'SEASON',
    'Сезон 1 · Midnight',
    'Season 1 · Midnight',
    NULL,
    NULL,
    NULL,
    true,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
    "kind" = 'SEASON',
    "nameRu" = EXCLUDED."nameRu",
    "nameEn" = EXCLUDED."nameEn",
    "isActive" = true,
    "sortOrder" = 1,
    "updatedAt" = CURRENT_TIMESTAMP;

DELETE FROM "ActivityGroupItem" item
USING "ActivityGroup" season_two, "Activity" activity
WHERE item."groupId" = season_two."id"
  AND item."activityId" = activity."id"
  AND season_two."slug" = 'midnight-season-2'
  AND activity."slug" IN (
      'march-on-queldanas',
      'the-dreamrift',
      'the-voidspire',
      'sporefall'
  );

INSERT INTO "ActivityGroupItem" (
    "id",
    "groupId",
    "activityId",
    "sortOrder",
    "createdAt"
)
SELECT
    'activity-group-item-' || md5(season_one."id" || '-' || activity."id"),
    season_one."id",
    activity."id",
    CASE activity."slug"
        WHEN 'march-on-queldanas' THEN 0
        WHEN 'the-dreamrift' THEN 1
        WHEN 'the-voidspire' THEN 2
        WHEN 'sporefall' THEN 3
    END,
    CURRENT_TIMESTAMP
FROM "Activity" activity
CROSS JOIN "ActivityGroup" season_one
WHERE season_one."slug" = 'midnight-season-1'
  AND activity."kind" = 'RAID'
  AND activity."slug" IN (
      'march-on-queldanas',
      'the-dreamrift',
      'the-voidspire',
      'sporefall'
  )
ON CONFLICT ("groupId", "activityId") DO UPDATE SET
    "sortOrder" = EXCLUDED."sortOrder";

UPDATE "ActivityGroup"
SET
    "sortOrder" = "sortOrder" + 2,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "kind" = 'SEASON'
  AND "slug" NOT IN (
      'current-season',
      'midnight-season-1',
      'midnight-season-2'
  )
  AND "sortOrder" < 2;

DELETE FROM "ActivityGroup"
WHERE "kind" = 'SEASON'
  AND "slug" = 'current-season';
