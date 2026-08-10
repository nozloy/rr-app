import { Prisma } from "@prisma/client";
import {
  AdminDashboard,
  type AdminCacheRow,
  type AdminEncounterActivityRow,
  type AdminEncounterDifficultyRow,
  type AdminEncounterGroupRow,
  type AdminEncounterSort,
  type AdminEncounterStatusFilter,
  type AdminEncounterTab,
  type AdminEventRow,
  type AdminPremiumFilter,
  type AdminRoleFilter,
  type AdminSection,
  type AdminStat,
  type AdminUserRow,
} from "@/components/admin/admin-dashboard";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/session";

type DashboardPageProps = {
  searchParams: Promise<{
    encounterTab?: string | string[];
    premium?: string | string[];
    q?: string | string[];
    role?: string | string[];
    section?: string | string[];
    sort?: string | string[];
    status?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

function normalizeQuery(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;

  return raw?.trim().slice(0, 80) ?? "";
}

function normalizeRoleFilter(
  value: string | string[] | undefined,
): AdminRoleFilter {
  const raw = Array.isArray(value) ? value[0] : value;

  return raw === "admin" || raw === "user" ? raw : "all";
}

function normalizePremiumFilter(
  value: string | string[] | undefined,
): AdminPremiumFilter {
  const raw = Array.isArray(value) ? value[0] : value;

  return raw === "premium" || raw === "standard" ? raw : "all";
}

function normalizeSection(value: string | string[] | undefined): AdminSection {
  const raw = Array.isArray(value) ? value[0] : value;

  return raw === "cache" ||
    raw === "events" ||
    raw === "encounter"
    ? raw
    : "users";
}

function normalizeEncounterTab(
  value: string | string[] | undefined,
): AdminEncounterTab {
  const raw = Array.isArray(value) ? value[0] : value;

  return raw === "raids" ||
    raw === "dungeons" ||
    raw === "activities" ||
    raw === "addons"
    ? raw
    : "addons";
}

function normalizeEncounterStatus(
  value: string | string[] | undefined,
): AdminEncounterStatusFilter {
  const raw = Array.isArray(value) ? value[0] : value;

  return raw === "active" || raw === "inactive" ? raw : "all";
}

function normalizeEncounterSort(
  value: string | string[] | undefined,
): AdminEncounterSort {
  const raw = Array.isArray(value) ? value[0] : value;

  return raw === "name" || raw === "updated" ? raw : "order";
}

function getTextFilter(query: string) {
  return {
    contains: query,
    mode: "insensitive" as const,
  };
}

function getActivityWhere(
  kind: "RAID" | "DUNGEON" | "OPEN_WORLD",
  textFilter: ReturnType<typeof getTextFilter> | null,
  statusFilter: AdminEncounterStatusFilter,
): Prisma.ActivityWhereInput {
  const filters: Prisma.ActivityWhereInput[] = [{ kind }];

  if (statusFilter !== "all") {
    filters.push({ isActive: statusFilter === "active" });
  }

  if (textFilter) {
    filters.push({
      OR: [
        { slug: textFilter },
        { nameRu: textFilter },
        { nameEn: textFilter },
        { shortNameRu: textFilter },
        { shortNameEn: textFilter },
      ],
    });
  }

  return filters.length === 1 ? filters[0] : { AND: filters };
}

function getActivityGroupWhere(
  textFilter: ReturnType<typeof getTextFilter> | null,
  statusFilter: AdminEncounterStatusFilter,
): Prisma.ActivityGroupWhereInput {
  const filters: Prisma.ActivityGroupWhereInput[] = [{ kind: "EXPANSION" }];

  if (statusFilter !== "all") {
    filters.push({ isActive: statusFilter === "active" });
  }

  if (textFilter) {
    filters.push({
      OR: [
        { slug: textFilter },
        { nameRu: textFilter },
        { nameEn: textFilter },
      ],
    });
  }

  return filters.length === 1 ? filters[0] : { AND: filters };
}

function getActivityOrder(
  sort: AdminEncounterSort,
): Prisma.ActivityOrderByWithRelationInput[] {
  if (sort === "name") {
    return [{ nameEn: "asc" }, { sortOrder: "asc" }];
  }

  if (sort === "updated") {
    return [{ updatedAt: "desc" }, { sortOrder: "asc" }];
  }

  return [{ sortOrder: "asc" }, { nameEn: "asc" }];
}

function getActivityGroupOrder(
  sort: AdminEncounterSort,
): Prisma.ActivityGroupOrderByWithRelationInput[] {
  if (sort === "name") {
    return [{ nameEn: "asc" }, { sortOrder: "asc" }];
  }

  if (sort === "updated") {
    return [{ updatedAt: "desc" }, { sortOrder: "asc" }];
  }

  return [{ sortOrder: "asc" }, { nameEn: "asc" }];
}

function formatShare(value: number, total: number) {
  if (total <= 0) {
    return "0% от всех";
  }

  return `${Math.round((value / total) * 1000) / 10}% от всех`;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const locale = await getRequestLocale();
  const session = await requireAdminSession();
  const params = await searchParams;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const section = normalizeSection(params.section);
  const query = normalizeQuery(params.q);
  const roleFilter = normalizeRoleFilter(params.role);
  const premiumFilter = normalizePremiumFilter(params.premium);
  const encounterTab = normalizeEncounterTab(params.encounterTab);
  const encounterStatusFilter = normalizeEncounterStatus(params.status);
  const encounterSort = normalizeEncounterSort(params.sort);
  const textFilter = query ? getTextFilter(query) : null;
  const userTextFilter = section === "users" ? textFilter : null;
  const cacheTextFilter = section === "cache" ? textFilter : null;
  const eventTextFilter = section === "events" ? textFilter : null;
  const encounterTextFilter = section === "encounter" ? textFilter : null;
  const userFilters: Prisma.UserWhereInput[] = [];
  const activePremiumWhere: Prisma.UserWhereInput = {
    isPremium: true,
    OR: [{ premiumExpiresAt: null }, { premiumExpiresAt: { gt: now } }],
  };

  if (userTextFilter) {
    userFilters.push({
      OR: [
        { id: userTextFilter },
        { name: userTextFilter },
        { email: userTextFilter },
        {
          accounts: {
            some: {
              OR: [
                { provider: userTextFilter },
                { providerAccountId: userTextFilter },
              ],
            },
          },
        },
      ],
    });
  }

  if (roleFilter === "admin") {
    userFilters.push({ isAdmin: true });
  } else if (roleFilter === "user") {
    userFilters.push({ isAdmin: false });
  }

  if (premiumFilter === "premium") {
    userFilters.push(activePremiumWhere);
  } else if (premiumFilter === "standard") {
    userFilters.push({
      OR: [{ isPremium: false }, { premiumExpiresAt: { lte: now } }],
    });
  }

  const userWhere: Prisma.UserWhereInput =
    userFilters.length > 0 ? { AND: userFilters } : {};
  const cacheWhere: Prisma.WowCharacterWhereInput = cacheTextFilter
    ? {
        OR: [
          { name: cacheTextFilter },
          { serverSlug: cacheTextFilter },
          { serverRegion: cacheTextFilter },
        ],
      }
    : {};
  const eventWhere: Prisma.ScheduledEventWhereInput = eventTextFilter
    ? {
        OR: [
          { addonSlug: eventTextFilter },
          { leaderName: eventTextFilter },
          { leaderRealm: eventTextFilter },
          {
            user: {
              OR: [
                { name: eventTextFilter },
                { email: eventTextFilter },
                {
                  accounts: {
                    some: { providerAccountId: eventTextFilter },
                  },
                },
              ],
            },
          },
          {
            activities: {
              some: {
                activity: {
                  OR: [
                    { slug: eventTextFilter },
                    { nameRu: eventTextFilter },
                    { nameEn: eventTextFilter },
                  ],
                },
              },
            },
          },
        ],
      }
    : {};
  const encounterActivitySelect = {
    aliases: true,
    artPath: true,
    groupItems: {
      orderBy: [{ sortOrder: "asc" }],
      select: {
        groupId: true,
        group: {
          select: {
            id: true,
            nameEn: true,
            nameRu: true,
            slug: true,
          },
        },
      },
    },
    id: true,
    isActive: true,
    kind: true,
    nameEn: true,
    nameRu: true,
    shortNameEn: true,
    shortNameRu: true,
    slug: true,
    sortOrder: true,
    updatedAt: true,
  } satisfies Prisma.ActivitySelect;
  const encounterRaidSelect = {
    ...encounterActivitySelect,
    difficultyOptions: {
      orderBy: [{ sortOrder: "asc" }],
      select: {
        difficultyId: true,
        sortOrder: true,
        difficulty: {
          select: {
            id: true,
            isActive: true,
            labelEn: true,
            labelRu: true,
            slug: true,
            sortOrder: true,
          },
        },
      },
    },
  } satisfies Prisma.ActivitySelect;

  let userCount = 0;
  let weeklyUserCount = 0;
  let adminCount = 0;
  let premiumCount = 0;
  let activeUserCount = 0;
  let accountCount = 0;
  let sessionCount = 0;
  let users: AdminUserRow[] = [];
  let cacheRows: AdminCacheRow[] = [];
  let eventRows: AdminEventRow[] = [];
  let encounterGroups: AdminEncounterGroupRow[] = [];
  let encounterRaids: AdminEncounterActivityRow[] = [];
  let encounterDungeons: AdminEncounterActivityRow[] = [];
  let encounterActivities: AdminEncounterActivityRow[] = [];
  let encounterDifficulties: AdminEncounterDifficultyRow[] = [];

  if (section === "users") {
    userCount = await prisma.user.count();
    weeklyUserCount = await prisma.user.count({
      where: { createdAt: { gte: weekAgo } },
    });
    adminCount = await prisma.user.count({ where: { isAdmin: true } });
    premiumCount = await prisma.user.count({ where: activePremiumWhere });
    activeUserCount = await prisma.user.count({
      where: {
        sessions: {
          some: {
            expires: { gt: now },
          },
        },
      },
    });
    accountCount = await prisma.account.count();
    sessionCount = await prisma.session.count();
    users = await prisma.user.findMany({
      where: userWhere,
      orderBy: [
        { isAdmin: "desc" },
        { isPremium: "desc" },
        { updatedAt: "desc" },
      ],
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isAdmin: true,
        isPremium: true,
        premiumExpiresAt: true,
        createdAt: true,
        updatedAt: true,
        accounts: {
          orderBy: { updatedAt: "desc" },
          select: {
            provider: true,
            providerAccountId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        characters: {
          orderBy: [{ isActive: "desc" }, { itemLevel: "desc" }],
          select: {
            name: true,
            realm: true,
            itemLevel: true,
            isActive: true,
          },
          take: 3,
        },
        _count: {
          select: {
            characters: true,
            raidCheckBookmarks: true,
            scheduledEvents: true,
            sessions: true,
          },
        },
      },
      take: 30,
    });
  } else if (section === "cache") {
    cacheRows = await prisma.wowCharacter.findMany({
      where: cacheWhere,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        serverSlug: true,
        serverRegion: true,
        warcraftLogsId: true,
        averageParse: true,
        bestParse: true,
        lastFetchedAt: true,
        raiderIoScore: true,
        raiderIoFetchedAt: true,
        blizzardEquippedItemLevel: true,
        blizzardEquipmentFetchedAt: true,
        updatedAt: true,
      },
      take: 30,
    });
  } else if (section === "events") {
    eventRows = await prisma.scheduledEvent.findMany({
      where: eventWhere,
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        addonSlug: true,
        activityType: true,
        startsAt: true,
        localDate: true,
        localTime: true,
        timeZone: true,
        leaderMode: true,
        leaderName: true,
        leaderRealm: true,
        tankMin: true,
        tankMax: true,
        healerMin: true,
        healerMax: true,
        damageMin: true,
        damageMax: true,
        hasPaidSlots: true,
        paidSlots: true,
        paidSlotPrice: true,
        publishTargets: true,
        status: true,
        createdAt: true,
        difficulty: {
          select: {
            slug: true,
            labelRu: true,
            labelEn: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            accounts: {
              orderBy: { updatedAt: "desc" },
              select: {
                provider: true,
                providerAccountId: true,
              },
              take: 1,
            },
          },
        },
        activities: {
          orderBy: [{ sortOrder: "asc" }],
          select: {
            activity: {
              select: {
                slug: true,
                kind: true,
                nameRu: true,
                nameEn: true,
                shortNameRu: true,
                shortNameEn: true,
                artPath: true,
              },
            },
          },
        },
      },
      take: 50,
    });
  } else if (section === "encounter") {
    encounterGroups = await prisma.activityGroup.findMany({
      where:
        encounterTab === "addons"
          ? getActivityGroupWhere(encounterTextFilter, encounterStatusFilter)
          : { kind: "EXPANSION" },
      orderBy: getActivityGroupOrder(
        encounterTab === "addons" ? encounterSort : "order",
      ),
      select: {
        _count: {
          select: { items: true },
        },
        artPath: true,
        id: true,
        isActive: true,
        nameEn: true,
        nameRu: true,
        slug: true,
        sortOrder: true,
        updatedAt: true,
      },
      take: encounterTab === "addons" ? 80 : 200,
    });

    if (encounterTab === "raids") {
      encounterRaids = await prisma.activity.findMany({
        where: getActivityWhere("RAID", encounterTextFilter, encounterStatusFilter),
        orderBy: getActivityOrder(encounterSort),
        select: encounterRaidSelect,
        take: 80,
      });
      encounterDifficulties = await prisma.eventDifficultyOption.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
        select: {
          id: true,
          slug: true,
          labelRu: true,
          labelEn: true,
          isActive: true,
          sortOrder: true,
        },
      });
    } else if (encounterTab === "dungeons") {
      encounterDungeons = await prisma.activity.findMany({
        where: getActivityWhere(
          "DUNGEON",
          encounterTextFilter,
          encounterStatusFilter,
        ),
        orderBy: getActivityOrder(encounterSort),
        select: encounterActivitySelect,
        take: 80,
      });
    } else if (encounterTab === "activities") {
      encounterActivities = await prisma.activity.findMany({
        where: getActivityWhere(
          "OPEN_WORLD",
          encounterTextFilter,
          encounterStatusFilter,
        ),
        orderBy: getActivityOrder(encounterSort),
        select: encounterActivitySelect,
        take: 80,
      });
    }
  }

  const stats: AdminStat[] = [
    {
      detail: `+${weeklyUserCount} за неделю · ${accountCount} Battle.net`,
      icon: "users",
      label: "Всего пользователей",
      value: String(userCount),
    },
    {
      detail: formatShare(adminCount, userCount),
      icon: "admins",
      label: "Администраторы",
      value: String(adminCount),
    },
    {
      detail: formatShare(premiumCount, userCount),
      icon: "premium",
      label: "Premium пользователи",
      value: String(premiumCount),
    },
    {
      detail: `${formatShare(activeUserCount, userCount)} · ${sessionCount} сессий`,
      icon: "active",
      label: "Активные пользователи",
      value: String(activeUserCount),
    },
  ];

  return (
    <AdminDashboard
      cacheRows={cacheRows}
      currentUserId={session.user.id}
      encounterActivities={encounterActivities}
      encounterDifficulties={encounterDifficulties}
      encounterDungeons={encounterDungeons}
      encounterGroups={encounterGroups}
      encounterRaids={encounterRaids}
      encounterSort={encounterSort}
      encounterStatusFilter={encounterStatusFilter}
      encounterTab={encounterTab}
      eventRows={eventRows}
      headerUser={{
        avatarUrl: session.user.image,
        displayName: session.user.name ?? t(locale, "header.playerFallback"),
        isAdmin: true,
      }}
      locale={locale}
      premiumFilter={premiumFilter}
      query={query}
      roleFilter={roleFilter}
      section={section}
      stats={stats}
      users={users}
    />
  );
}
