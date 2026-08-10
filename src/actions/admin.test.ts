import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, prismaMock, revalidatePathMock } = vi.hoisted(() => ({
  authMock: {
    getServerSession: vi.fn(),
  },
  prismaMock: {
    activity: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    activityDifficultyOption: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    activityGroup: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    activityGroupItem: {
      count: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
    eventDifficultyOption: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    user: {
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    wowCharacter: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  revalidatePathMock: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: authMock.getServerSession,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

async function loadActions() {
  vi.resetModules();
  return import("@/actions/admin");
}

function mockAdminActor(userId = "admin-1") {
  authMock.getServerSession.mockResolvedValue({ user: { id: userId } });
  prismaMock.user.findUnique.mockResolvedValueOnce({
    id: userId,
    isAdmin: true,
  });
}

describe("admin actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("denies user admin toggles for non-admin sessions", async () => {
    authMock.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "user-1",
      isAdmin: false,
    });

    const { setUserAdminAction } = await loadActions();
    const result = await setUserAdminAction("target-1", true);

    expect(result.status).toBe("error");
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("does not allow admins to demote themselves", async () => {
    mockAdminActor("admin-1");
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "admin-1",
      isAdmin: true,
      name: "Admin",
    });

    const { setUserAdminAction } = await loadActions();
    const result = await setUserAdminAction("admin-1", false);

    expect(result.status).toBe("error");
    expect(prismaMock.user.count).not.toHaveBeenCalled();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("does not allow removing the last admin", async () => {
    mockAdminActor("admin-1");
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "admin-2",
      isAdmin: true,
      name: "Other admin",
    });
    prismaMock.user.count.mockResolvedValue(1);

    const { setUserAdminAction } = await loadActions();
    const result = await setUserAdminAction("admin-2", false);

    expect(result.status).toBe("error");
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("updates a target user's admin flag", async () => {
    mockAdminActor("admin-1");
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "user-2",
      isAdmin: false,
      name: "Player",
    });
    prismaMock.user.update.mockResolvedValue({});

    const { setUserAdminAction } = await loadActions();
    const result = await setUserAdminAction("user-2", true);

    expect(result.status).toBe("success");
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-2" },
      data: { isAdmin: true },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
  });

  it("denies premium toggles for non-admin sessions", async () => {
    authMock.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "user-1",
      isAdmin: false,
    });

    const { setUserPremiumAction } = await loadActions();
    const result = await setUserPremiumAction("target-1", true);

    expect(result.status).toBe("error");
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("requires a user id for premium toggles", async () => {
    mockAdminActor("admin-1");

    const { setUserPremiumAction } = await loadActions();
    const result = await setUserPremiumAction("  ", true);

    expect(result.status).toBe("error");
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("returns an error when premium target user is missing", async () => {
    mockAdminActor("admin-1");
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    const { setUserPremiumAction } = await loadActions();
    const result = await setUserPremiumAction("missing-user", true);

    expect(result.status).toBe("error");
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("updates a target user's premium flag", async () => {
    mockAdminActor("admin-1");
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "user-2",
      name: "Player",
    });
    prismaMock.user.update.mockResolvedValue({});

    const { setUserPremiumAction } = await loadActions();
    const result = await setUserPremiumAction("user-2", true);

    expect(result.status).toBe("success");
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-2" },
      data: { isPremium: true, premiumExpiresAt: null },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
  });

  it("stores a premium expiration date", async () => {
    mockAdminActor("admin-1");
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "user-2",
      name: "Player",
    });
    prismaMock.user.update.mockResolvedValue({});

    const expiresAt = new Date("2026-08-01T00:00:00.000Z");
    const { setUserPremiumAction } = await loadActions();
    const result = await setUserPremiumAction("user-2", true, expiresAt);

    expect(result.status).toBe("success");
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-2" },
      data: { isPremium: true, premiumExpiresAt: expiresAt },
    });
  });

  it("clears premium expiration when premium is disabled", async () => {
    mockAdminActor("admin-1");
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "user-2",
      name: "Player",
    });
    prismaMock.user.update.mockResolvedValue({});

    const { setUserPremiumAction } = await loadActions();
    const result = await setUserPremiumAction(
      "user-2",
      false,
      new Date("2026-08-01T00:00:00.000Z"),
    );

    expect(result.status).toBe("success");
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-2" },
      data: { isPremium: false, premiumExpiresAt: null },
    });
  });

  it("updates catalog activity status", async () => {
    mockAdminActor("admin-1");
    prismaMock.activity.update.mockResolvedValue({});

    const { setCatalogItemActiveAction } = await loadActions();
    const result = await setCatalogItemActiveAction("activity", "activity-1", false);

    expect(result.status).toBe("success");
    expect(prismaMock.activity.update).toHaveBeenCalledWith({
      where: { id: "activity-1" },
      data: { isActive: false },
    });
  });

  it("denies encounter catalog updates for non-admin sessions", async () => {
    authMock.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "user-1",
      isAdmin: false,
    });

    const { saveActivityAction } = await loadActions();
    const result = await saveActivityAction({
      kind: "RAID",
      nameEn: "Sporefall",
      nameRu: "Споропад",
      shortNameEn: "SF",
      shortNameRu: "SF",
      slug: "sporefall",
    });

    expect(result.status).toBe("error");
    expect(prismaMock.activity.create).not.toHaveBeenCalled();
    expect(prismaMock.activity.update).not.toHaveBeenCalled();
  });

  it("saves an encounter addon", async () => {
    mockAdminActor("admin-1");
    prismaMock.activityGroup.findUnique.mockResolvedValueOnce({
      id: "addon-1",
    });
    prismaMock.activityGroup.update.mockResolvedValue({});

    const { saveActivityGroupAction } = await loadActions();
    const result = await saveActivityGroupAction({
      artPath: "/home/hero-midnight-citadel.jpg",
      id: "addon-1",
      isActive: true,
      nameEn: "Midnight",
      nameRu: "Midnight",
      slug: "midnight",
      sortOrder: 0,
    });

    expect(result.status).toBe("success");
    expect(prismaMock.activityGroup.update).toHaveBeenCalledWith({
      data: {
        artPath: "/home/hero-midnight-citadel.jpg",
        isActive: true,
        kind: "EXPANSION",
        nameEn: "Midnight",
        nameRu: "Midnight",
        slug: "midnight",
        sortOrder: 0,
      },
      where: { id: "addon-1" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/events/new");
  });

  it("saves an encounter activity", async () => {
    mockAdminActor("admin-1");
    prismaMock.activity.findUnique.mockResolvedValueOnce({
      id: "activity-1",
    });
    prismaMock.activity.update.mockResolvedValue({});

    const { saveActivityAction } = await loadActions();
    const result = await saveActivityAction({
      aliases: ["Sporefall", "Споропад"],
      artPath: "/raids/sporefall_styled_16x9.png",
      id: "activity-1",
      isActive: true,
      kind: "RAID",
      nameEn: "Sporefall",
      nameRu: "Споропад",
      shortNameEn: "SF",
      shortNameRu: "SF",
      slug: "sporefall",
      sortOrder: 3,
    });

    expect(result.status).toBe("success");
    expect(prismaMock.activity.update).toHaveBeenCalledWith({
      data: {
        aliases: ["Sporefall", "Споропад"],
        artPath: "/raids/sporefall_styled_16x9.png",
        isActive: true,
        kind: "RAID",
        nameEn: "Sporefall",
        nameRu: "Споропад",
        shortNameEn: "SF",
        shortNameRu: "SF",
        slug: "sporefall",
        sortOrder: 3,
      },
      where: { id: "activity-1" },
    });
  });

  it("returns an error when an encounter activity is missing", async () => {
    mockAdminActor("admin-1");
    prismaMock.activity.findUnique.mockResolvedValueOnce(null);

    const { saveActivityAction } = await loadActions();
    const result = await saveActivityAction({
      id: "missing",
      kind: "RAID",
      nameEn: "Missing",
      nameRu: "Missing",
      shortNameEn: "M",
      shortNameRu: "M",
      slug: "missing",
    });

    expect(result.status).toBe("error");
    expect(prismaMock.activity.update).not.toHaveBeenCalled();
  });

  it("assigns raid difficulty options", async () => {
    mockAdminActor("admin-1");
    prismaMock.activity.findUnique.mockResolvedValueOnce({
      id: "activity-1",
      kind: "RAID",
    });
    prismaMock.eventDifficultyOption.findMany.mockResolvedValue([
      { id: "difficulty-1", sortOrder: 0 },
      { id: "difficulty-2", sortOrder: 1 },
    ]);
    prismaMock.activityDifficultyOption.deleteMany.mockReturnValue({
      kind: "delete",
    });
    prismaMock.activityDifficultyOption.createMany.mockReturnValue({
      kind: "create",
    });
    prismaMock.$transaction.mockResolvedValue([]);

    const { setActivityDifficultyOptionsAction } = await loadActions();
    const result = await setActivityDifficultyOptionsAction("activity-1", [
      "difficulty-1",
      "difficulty-2",
    ]);

    expect(result.status).toBe("success");
    expect(prismaMock.activityDifficultyOption.deleteMany).toHaveBeenCalledWith({
      where: { activityId: "activity-1" },
    });
    expect(prismaMock.activityDifficultyOption.createMany).toHaveBeenCalledWith({
      data: [
        {
          activityId: "activity-1",
          difficultyId: "difficulty-1",
          sortOrder: 0,
        },
        {
          activityId: "activity-1",
          difficultyId: "difficulty-2",
          sortOrder: 1,
        },
      ],
      skipDuplicates: true,
    });
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it("requires an activity id when assigning raid difficulties", async () => {
    mockAdminActor("admin-1");

    const { setActivityDifficultyOptionsAction } = await loadActions();
    const result = await setActivityDifficultyOptionsAction(" ", [
      "difficulty-1",
    ]);

    expect(result.status).toBe("error");
    expect(prismaMock.activityDifficultyOption.deleteMany).not.toHaveBeenCalled();
  });

  it("marks only the selected cache timestamp as stale", async () => {
    mockAdminActor("admin-1");
    prismaMock.wowCharacter.update.mockResolvedValue({});

    const { markWowCharacterCacheStaleAction } = await loadActions();
    const result = await markWowCharacterCacheStaleAction(
      "wow-character-1",
      "warcraftLogs",
    );

    expect(result.status).toBe("success");
    const updateInput = prismaMock.wowCharacter.update.mock.calls[0][0];
    expect(updateInput.where).toEqual({ id: "wow-character-1" });
    expect(updateInput.data.lastFetchedAt.toISOString()).toBe(
      "1970-01-01T00:00:00.000Z",
    );
    expect(updateInput.data.raiderIoFetchedAt).toBeUndefined();
    expect(updateInput.data.blizzardEquipmentFetchedAt).toBeUndefined();
  });
});
