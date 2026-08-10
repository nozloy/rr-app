import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateScheduledEventInput } from "@/actions/events";

const { authMock, prismaMock, revalidatePathMock } = vi.hoisted(() => ({
  authMock: {
    getServerSession: vi.fn(),
  },
  prismaMock: {
    activityGroup: {
      findFirst: vi.fn(),
    },
    activityGroupItem: {
      findMany: vi.fn(),
    },
    activityDifficultyOption: {
      findMany: vi.fn(),
    },
    character: {
      findFirst: vi.fn(),
    },
    eventDifficultyOption: {
      findFirst: vi.fn(),
    },
    scheduledEvent: {
      create: vi.fn(),
    },
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

function validInput(
  overrides: Partial<CreateScheduledEventInput> = {},
): CreateScheduledEventInput {
  return {
    activityType: "raid",
    addon: "midnight",
    characterId: "character-1",
    date: "2026-06-29",
    difficulty: "heroic",
    hasPaidSlots: true,
    hasUnroll: true,
    leaderMode: "character",
    manualLeaderName: "",
    manualLeaderRealm: "",
    paidSlotPrice: 50000,
    paidSlots: 2,
    publishTargets: {
      app: true,
      custom: false,
      discord: true,
      telegram: true,
    },
    roles: {
      damage: { max: 12, min: 10 },
      healer: { max: 5, min: 4 },
      tank: { max: 2, min: 2 },
    },
    selectedInstanceSlugs: ["march-on-queldanas", "the-voidspire"],
    time: "20:30",
    unrollInput: "249343, 249344",
    unrollItemIds: ["249343", "item-249344"],
    unrollTemplateId: "cloth",
    ...overrides,
  };
}

async function loadActions() {
  vi.resetModules();
  return import("@/actions/events");
}

function mockAuthenticatedUser() {
  authMock.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
}

function mockValidCatalog({
  difficultyId = "difficulty-1",
  difficultySlug = "heroic",
}: {
  difficultyId?: string;
  difficultySlug?: string;
} = {}) {
  prismaMock.eventDifficultyOption.findFirst.mockResolvedValue({
    id: difficultyId,
    slug: difficultySlug,
  });
  prismaMock.activityGroup.findFirst.mockResolvedValue({ id: "addon-1" });
  prismaMock.activityGroupItem.findMany.mockResolvedValue([
    {
      activity: {
        id: "activity-1",
        slug: "march-on-queldanas",
      },
    },
    {
      activity: {
        id: "activity-2",
        slug: "the-voidspire",
      },
    },
  ]);
  prismaMock.activityDifficultyOption.findMany.mockResolvedValue([
    {
      activityId: "activity-1",
      difficulty: {
        isActive: true,
        slug: difficultySlug,
      },
      difficultyId,
    },
    {
      activityId: "activity-2",
      difficulty: {
        isActive: true,
        slug: difficultySlug,
      },
      difficultyId,
    },
  ]);
}

describe("createScheduledEventAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires auth", async () => {
    authMock.getServerSession.mockResolvedValue(null);

    const { createScheduledEventAction } = await loadActions();
    const result = await createScheduledEventAction(validInput());

    expect(result.status).toBe("error");
    expect(prismaMock.scheduledEvent.create).not.toHaveBeenCalled();
  });

  it("rejects selected activities that are not active in the selected catalog group", async () => {
    mockAuthenticatedUser();
    prismaMock.eventDifficultyOption.findFirst.mockResolvedValue({ id: "difficulty-1" });
    prismaMock.activityGroup.findFirst.mockResolvedValue({ id: "addon-1" });
    prismaMock.activityGroupItem.findMany.mockResolvedValue([
      {
        activity: {
          id: "activity-1",
          slug: "march-on-queldanas",
        },
      },
    ]);

    const { createScheduledEventAction } = await loadActions();
    const result = await createScheduledEventAction(validInput());

    expect(result.status).toBe("error");
    expect(prismaMock.scheduledEvent.create).not.toHaveBeenCalled();
  });

  it("rejects character leaders that do not belong to the current user", async () => {
    mockAuthenticatedUser();
    mockValidCatalog();
    prismaMock.character.findFirst.mockResolvedValue(null);

    const { createScheduledEventAction } = await loadActions();
    const result = await createScheduledEventAction(validInput());

    expect(result.status).toBe("error");
    expect(prismaMock.character.findFirst).toHaveBeenCalledWith({
      select: {
        id: true,
        name: true,
        realm: true,
      },
      where: {
        id: "character-1",
        isActive: true,
        userId: "user-1",
      },
    });
    expect(prismaMock.scheduledEvent.create).not.toHaveBeenCalled();
  });

  it("creates a published event with Moscow local time stored as UTC startsAt", async () => {
    mockAuthenticatedUser();
    mockValidCatalog();
    prismaMock.character.findFirst.mockResolvedValue({
      id: "character-1",
      name: "Avayn",
      realm: "Tarren Mill",
    });
    prismaMock.scheduledEvent.create.mockResolvedValue({ id: "event-1" });

    const { createScheduledEventAction } = await loadActions();
    const result = await createScheduledEventAction(validInput());

    expect(result).toEqual({
      eventId: "event-1",
      message: "Событие сохранено.",
      status: "success",
    });

    const createInput = prismaMock.scheduledEvent.create.mock.calls[0][0];

    expect(createInput.data).toMatchObject({
      activityType: "RAID",
      addonSlug: "midnight",
      damageMax: 12,
      damageMin: 10,
      difficultyId: "difficulty-1",
      hasPaidSlots: true,
      hasUnroll: true,
      healerMax: 5,
      healerMin: 4,
      leaderCharacterId: "character-1",
      leaderMode: "CHARACTER",
      leaderName: "Avayn",
      leaderRealm: "Tarren Mill",
      localDate: "2026-06-29",
      localTime: "20:30",
      paidSlotPrice: 50000,
      paidSlots: 2,
      publishTargets: ["APP", "DISCORD", "TELEGRAM"],
      status: "PUBLISHED",
      tankMax: 2,
      tankMin: 2,
      timeZone: "Europe/Moscow",
      unrollItemIds: ["249343", "249344"],
      unrollTemplateId: "cloth",
      userId: "user-1",
    });
    expect(createInput.data.startsAt.toISOString()).toBe(
      "2026-06-29T17:30:00.000Z",
    );
    expect(createInput.data.activities.create).toEqual([
      {
        activityId: "activity-1",
        sortOrder: 0,
      },
      {
        activityId: "activity-2",
        sortOrder: 1,
      },
    ]);
    expect(revalidatePathMock).toHaveBeenCalledWith("/profile");
  });

  it("accepts a dynamic raid difficulty when it is allowed for the selected raids", async () => {
    mockAuthenticatedUser();
    mockValidCatalog({
      difficultyId: "difficulty-flex",
      difficultySlug: "flex-mythic",
    });
    prismaMock.character.findFirst.mockResolvedValue({
      id: "character-1",
      name: "Avayn",
      realm: "Tarren Mill",
    });
    prismaMock.scheduledEvent.create.mockResolvedValue({ id: "event-1" });

    const { createScheduledEventAction } = await loadActions();
    const result = await createScheduledEventAction(
      validInput({ difficulty: "flex-mythic" }),
    );

    expect(result.status).toBe("success");
    expect(prismaMock.scheduledEvent.create.mock.calls[0][0].data).toMatchObject({
      difficultyId: "difficulty-flex",
    });
  });

  it("rejects a raid difficulty that is not allowed for every selected raid", async () => {
    mockAuthenticatedUser();
    mockValidCatalog({
      difficultyId: "difficulty-flex",
      difficultySlug: "flex-mythic",
    });
    prismaMock.activityDifficultyOption.findMany.mockResolvedValue([
      {
        activityId: "activity-1",
        difficulty: {
          isActive: true,
          slug: "flex-mythic",
        },
        difficultyId: "difficulty-flex",
      },
      {
        activityId: "activity-2",
        difficulty: {
          isActive: true,
          slug: "mythic",
        },
        difficultyId: "difficulty-mythic",
      },
    ]);

    const { createScheduledEventAction } = await loadActions();
    const result = await createScheduledEventAction(
      validInput({ difficulty: "flex-mythic" }),
    );

    expect(result.status).toBe("error");
    expect(prismaMock.scheduledEvent.create).not.toHaveBeenCalled();
  });
});
