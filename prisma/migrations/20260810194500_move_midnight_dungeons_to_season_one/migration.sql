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
    season_two_item."sortOrder",
    CURRENT_TIMESTAMP
FROM "ActivityGroup" season_two
JOIN "ActivityGroupItem" season_two_item ON season_two_item."groupId" = season_two."id"
JOIN "Activity" activity ON activity."id" = season_two_item."activityId"
CROSS JOIN "ActivityGroup" season_one
WHERE season_two."slug" = 'midnight-season-2'
  AND season_one."slug" = 'midnight-season-1'
  AND activity."kind" = 'DUNGEON'
  AND activity."slug" IN (
      'magisters-terrace',
      'maisara-caverns',
      'nexus-point-xenas',
      'windrunner-spire',
      'algethar-academy',
      'seat-of-the-triumvirate',
      'skyreach',
      'pit-of-saron'
  )
ON CONFLICT ("groupId", "activityId") DO UPDATE SET
    "sortOrder" = EXCLUDED."sortOrder";

DELETE FROM "ActivityGroupItem" item
USING "ActivityGroup" season_two, "Activity" activity
WHERE item."groupId" = season_two."id"
  AND item."activityId" = activity."id"
  AND season_two."slug" = 'midnight-season-2'
  AND activity."kind" = 'DUNGEON'
  AND activity."slug" IN (
      'magisters-terrace',
      'maisara-caverns',
      'nexus-point-xenas',
      'windrunner-spire',
      'algethar-academy',
      'seat-of-the-triumvirate',
      'skyreach',
      'pit-of-saron'
  );
