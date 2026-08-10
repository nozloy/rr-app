UPDATE "Activity"
SET "artPath" = '/activities/farm_styled_16x9.png',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'farm'
  AND "artPath" = '/activities/farm_styled_16x9.jpg';

UPDATE "Activity"
SET "artPath" = '/activities/achievements_styled_16x9.png',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'achievements'
  AND "artPath" = '/activities/achievements_styled_16x9.jpg';
