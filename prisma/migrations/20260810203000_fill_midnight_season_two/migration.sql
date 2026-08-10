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
VALUES
    (
        'activity-ruby-life-pools',
        'ruby-life-pools',
        'DUNGEON',
        'Рубиновые Омуты',
        'Ruby Life Pools',
        'RLP',
        'RLP',
        '/dungeons/ruby_life_pools_styled_16x9.png',
        ARRAY['Рубиновые Омуты', 'Ruby Life Pools', 'RLP']::TEXT[],
        NULL,
        NULL,
        true,
        100,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'activity-kings-rest',
        'kings-rest',
        'DUNGEON',
        'Гробница королей',
        'King''s Rest',
        'KR',
        'KR',
        '/dungeons/kings_rest_styled_16x9.png',
        ARRAY['Гробница королей', 'King''s Rest', 'Kings Rest', 'KR']::TEXT[],
        NULL,
        NULL,
        true,
        101,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'activity-temple-of-sethraliss',
        'temple-of-sethraliss',
        'DUNGEON',
        'Храм Сетралис',
        'Temple of Sethraliss',
        'TOS',
        'TOS',
        '/dungeons/temple_of_sethraliss_styled_16x9.png',
        ARRAY['Храм Сетралис', 'Temple of Sethraliss', 'TOS']::TEXT[],
        NULL,
        NULL,
        true,
        102,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'activity-venomous-abyss',
        'venomous-abyss',
        'RAID',
        'Ядовитая бездна',
        'The Venomous Abyss',
        'TVA',
        'TVA',
        '/raids/venomous_abyss_styled_16x9.png',
        ARRAY['Ядовитая бездна', 'The Venomous Abyss', 'Venomous Abyss', 'Ula''tek', 'Ула''тек']::TEXT[],
        54,
        'The Venomous Abyss',
        true,
        4,
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
    'activity-group-item-' || md5(activity_group."id" || '-' || activity."id"),
    activity_group."id",
    activity."id",
    membership."sortOrder",
    CURRENT_TIMESTAMP
FROM (
    VALUES
        ('ruby-life-pools', 'dragonflight', 100),
        ('kings-rest', 'battle-for-azeroth', 100),
        ('temple-of-sethraliss', 'battle-for-azeroth', 101),
        ('venomous-abyss', 'midnight', 4)
) AS membership("activitySlug", "groupSlug", "sortOrder")
JOIN "Activity" activity ON activity."slug" = membership."activitySlug"
JOIN "ActivityGroup" activity_group ON activity_group."slug" = membership."groupSlug"
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
    rotation."sortOrder",
    CURRENT_TIMESTAMP
FROM (
    VALUES
        ('altar-of-fangs', 0),
        ('murder-row', 1),
        ('den-of-nalorakk', 2),
        ('blinding-vale', 3),
        ('voidscar-arena', 4),
        ('ruby-life-pools', 5),
        ('kings-rest', 6),
        ('temple-of-sethraliss', 7),
        ('venomous-abyss', 8)
) AS rotation("activitySlug", "sortOrder")
JOIN "Activity" activity ON activity."slug" = rotation."activitySlug"
CROSS JOIN "ActivityGroup" season_two
WHERE season_two."slug" = 'midnight-season-2'
ON CONFLICT ("groupId", "activityId") DO UPDATE SET
    "sortOrder" = EXCLUDED."sortOrder";
