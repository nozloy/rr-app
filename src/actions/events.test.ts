import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateScheduledEventInput } from "@/actions/events";

const { authMock, publicationMock, prismaMock, revalidatePathMock } = vi.hoisted(() => ({
  authMock: {
    getServerSession: vi.fn(),
  },
  prismaMock: {
	$transaction: vi.fn(),
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
	  findFirst: vi.fn(),
	  updateMany: vi.fn(),
    },
	scheduledEventActivity: {
	  createMany: vi.fn(),
	  deleteMany: vi.fn(),
	},
	scheduledEventDelivery: {
	  findMany: vi.fn(),
	  upsert: vi.fn(),
	},
	user: {
	  update: vi.fn(),
	},
  },
	publicationMock: {
		deliverScheduledEvent: vi.fn(),
		getEventChannelAvailability: vi.fn(),
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

vi.mock("@/lib/event-publication", () => ({
	deliverScheduledEvent: publicationMock.deliverScheduledEvent,
	getEventChannelAvailability: publicationMock.getEventChannelAvailability,
}));

function validInput(
  overrides: Partial<CreateScheduledEventInput> = {},
): CreateScheduledEventInput {
  return {
    activityType: "raid",
    addon: "midnight",
    characterId: "character-1",
    clientRequestId: "00000000-0000-4000-8000-000000000001",
    contentScope: "expansion",
    date: "2027-06-29",
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
    timeZone: "Europe/Moscow",
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
	prismaMock.scheduledEvent.findFirst.mockResolvedValue(null);
	prismaMock.scheduledEventDelivery.findMany.mockResolvedValue([]);
	prismaMock.user.update.mockResolvedValue({});
	prismaMock.scheduledEvent.updateMany.mockResolvedValue({ count: 1 });
	prismaMock.scheduledEventActivity.createMany.mockResolvedValue({ count: 2 });
	prismaMock.scheduledEventActivity.deleteMany.mockResolvedValue({ count: 2 });
	prismaMock.scheduledEventDelivery.upsert.mockResolvedValue({});
	prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
	publicationMock.deliverScheduledEvent.mockResolvedValue([]);
	publicationMock.getEventChannelAvailability.mockReturnValue({
		discord: true,
		telegram: true,
	});
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
    prismaMock.scheduledEvent.create.mockResolvedValue({ id: "event-1", version: 1 });

    const { createScheduledEventAction } = await loadActions();
    const result = await createScheduledEventAction(validInput());

	expect(result).toEqual({
	  deliveries: [],
      eventId: "event-1",
      message: "Событие сохранено.",
      status: "success",
	  version: 1,
	  warnings: [],
    });

    const createInput = prismaMock.scheduledEvent.create.mock.calls[0][0];

    expect(createInput.data).toMatchObject({
      activityType: "RAID",
      addonSlug: "midnight",
	  contentScope: "expansion",
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
      localDate: "2027-06-29",
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
      "2027-06-29T17:30:00.000Z",
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

  it("validates seasonal activities by their real activity type", async () => {
    mockAuthenticatedUser();
    prismaMock.eventDifficultyOption.findFirst.mockResolvedValue({
      id: "difficulty-1",
      slug: "heroic",
    });
    prismaMock.activityGroup.findFirst
      .mockResolvedValueOnce({ id: "addon-1" })
      .mockResolvedValueOnce({ id: "season-1" });
    prismaMock.activityGroupItem.findMany.mockResolvedValue([
      {
        activity: {
          id: "activity-1",
          slug: "season-dungeon",
        },
      },
    ]);
    prismaMock.character.findFirst.mockResolvedValue({
      id: "character-1",
      name: "Avayn",
      realm: "Tarren Mill",
    });
    prismaMock.scheduledEvent.create.mockResolvedValue({ id: "event-1", version: 1 });

    const { createScheduledEventAction } = await loadActions();
    const result = await createScheduledEventAction(
      validInput({
        activityType: "dungeon",
        contentScope: "midnight-season-1",
        selectedInstanceSlugs: ["season-dungeon"],
      }),
    );

    expect(result.status).toBe("success");
    expect(prismaMock.activityGroup.findFirst).toHaveBeenNthCalledWith(2, {
      select: { id: true },
      where: {
        isActive: true,
        kind: "SEASON",
        slug: "midnight-season-1",
      },
    });
    expect(prismaMock.activityGroupItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          activity: expect.objectContaining({ kind: "DUNGEON" }),
          groupId: "season-1",
        }),
      }),
    );
    expect(prismaMock.scheduledEvent.create.mock.calls[0][0].data).toMatchObject({
      activityType: "DUNGEON",
    });
  });

  it("rejects a season that belongs to another addon", async () => {
    mockAuthenticatedUser();
    prismaMock.eventDifficultyOption.findFirst.mockResolvedValue({
      id: "difficulty-1",
      slug: "heroic",
    });
    prismaMock.activityGroup.findFirst.mockResolvedValueOnce({ id: "addon-1" });

    const { createScheduledEventAction } = await loadActions();
    const result = await createScheduledEventAction(
      validInput({
        addon: "the-war-within",
        contentScope: "midnight-season-2",
      }),
    );

    expect(result).toEqual({
      message: "Сезонный набор активностей больше недоступен.",
      status: "error",
    });
    expect(prismaMock.activityGroup.findFirst).toHaveBeenCalledTimes(1);
    expect(prismaMock.activityGroupItem.findMany).not.toHaveBeenCalled();
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
    prismaMock.scheduledEvent.create.mockResolvedValue({ id: "event-1", version: 1 });

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

	it("returns the existing event for a repeated client request id", async () => {
		mockAuthenticatedUser();
		prismaMock.scheduledEvent.findFirst.mockResolvedValue({ id: "event-existing", version: 3 });

		const { createScheduledEventAction } = await loadActions();
		const result = await createScheduledEventAction(validInput());

		expect(result).toMatchObject({ eventId: "event-existing", status: "success", version: 3 });
		expect(prismaMock.scheduledEvent.create).not.toHaveBeenCalled();
		expect(publicationMock.deliverScheduledEvent).toHaveBeenCalledWith(
			"event-existing",
			undefined,
		);
	});

	it("updates an owned future event with optimistic locking", async () => {
		mockAuthenticatedUser();
		mockValidCatalog();
		prismaMock.character.findFirst.mockResolvedValue({
			id: "character-1",
			name: "Avayn",
			realm: "Tarren Mill",
		});
		prismaMock.scheduledEvent.findFirst.mockResolvedValue({
			deliveries: [],
			id: "event-1",
			publishTargets: ["APP", "CUSTOM"],
			startsAt: new Date("2027-06-01T17:30:00Z"),
			status: "PUBLISHED",
			version: 1,
		});

		const { updateScheduledEventAction } = await loadActions();
		const result = await updateScheduledEventAction({
			...validInput({ publishTargets: { app: true, discord: false, telegram: false } }),
			eventId: "event-1",
			version: 1,
		});

		expect(result).toMatchObject({ eventId: "event-1", status: "success", version: 2 });
		expect(prismaMock.scheduledEvent.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					contentScope: "expansion",
					publishTargets: ["APP", "CUSTOM"],
					version: { increment: 1 },
				}),
				where: expect.objectContaining({ id: "event-1", version: 1 }),
			}),
		);
		expect(prismaMock.scheduledEventActivity.createMany).toHaveBeenCalled();
	});

	it("rejects an edit after the event has started", async () => {
		mockAuthenticatedUser();
		prismaMock.scheduledEvent.findFirst.mockResolvedValue({
			deliveries: [],
			id: "event-1",
			startsAt: new Date("2020-01-01T00:00:00Z"),
			status: "PUBLISHED",
			version: 1,
		});

		const { updateScheduledEventAction } = await loadActions();
		const result = await updateScheduledEventAction({ ...validInput(), eventId: "event-1", version: 1 });

		expect(result).toMatchObject({ status: "error" });
		expect(prismaMock.scheduledEvent.updateMany).not.toHaveBeenCalled();
	});

	it("reports an optimistic locking conflict before changing an outdated event", async () => {
		mockAuthenticatedUser();
		prismaMock.scheduledEvent.findFirst.mockResolvedValue({
			deliveries: [],
			id: "event-1",
			startsAt: new Date("2027-06-01T17:30:00Z"),
			status: "PUBLISHED",
			version: 2,
		});

		const { updateScheduledEventAction } = await loadActions();
		const result = await updateScheduledEventAction({
			...validInput(),
			eventId: "event-1",
			version: 1,
		});

		expect(result).toMatchObject({ conflict: true, status: "error" });
		expect(prismaMock.scheduledEvent.updateMany).not.toHaveBeenCalled();
	});

	it("rejects an external channel that is not configured", async () => {
		mockAuthenticatedUser();
		publicationMock.getEventChannelAvailability.mockReturnValue({
			discord: false,
			telegram: true,
		});

		const { createScheduledEventAction } = await loadActions();
		const result = await createScheduledEventAction(validInput());

		expect(result).toEqual({
			message: "Discord не настроен на сервере.",
			status: "error",
		});
		expect(prismaMock.scheduledEvent.create).not.toHaveBeenCalled();
	});

	it("soft-cancels an event and keeps external delivery failures retryable", async () => {
		mockAuthenticatedUser();
		prismaMock.scheduledEvent.findFirst.mockResolvedValue({ id: "event-1", status: "PUBLISHED", version: 1 });
		publicationMock.deliverScheduledEvent.mockResolvedValue([
			{
				lastErrorCode: "DISCORD_HTTP_500",
				lastErrorMessage: "Discord вернул ошибку 500.",
				status: "FAILED",
				target: "DISCORD",
			},
		]);

		const { cancelScheduledEventAction } = await loadActions();
		const result = await cancelScheduledEventAction({ eventId: "event-1", version: 1 });

		expect(prismaMock.scheduledEvent.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ status: "CANCELLED" }) }),
		);
		expect(result).toMatchObject({ status: "success", version: 2, warnings: ["Discord вернул ошибку 500."] });
	});

	it("allows the owner to cancel an event after it has started", async () => {
		mockAuthenticatedUser();
		prismaMock.scheduledEvent.findFirst.mockResolvedValue({
			id: "event-1",
			startsAt: new Date("2020-01-01T00:00:00Z"),
			status: "PUBLISHED",
			version: 1,
		});

		const { cancelScheduledEventAction } = await loadActions();
		const result = await cancelScheduledEventAction({ eventId: "event-1", version: 1 });

		expect(result).toMatchObject({ status: "success", version: 2 });
		expect(prismaMock.scheduledEvent.updateMany).toHaveBeenCalledTimes(1);
	});

	it("does not expose or retry another user's delivery", async () => {
		mockAuthenticatedUser();
		prismaMock.scheduledEvent.findFirst.mockResolvedValue(null);

		const { retryScheduledEventDeliveryAction } = await loadActions();
		const result = await retryScheduledEventDeliveryAction({
			eventId: "event-other-user",
			target: "DISCORD",
		});

		expect(result).toEqual({ message: "Событие не найдено.", status: "error" });
		expect(publicationMock.deliverScheduledEvent).not.toHaveBeenCalled();
	});

	it("validates and saves the user's IANA time zone", async () => {
		mockAuthenticatedUser();

		const { updateUserTimeZoneAction } = await loadActions();
		const invalid = await updateUserTimeZoneAction("Mars/Olympus");
		const valid = await updateUserTimeZoneAction("Asia/Almaty");

		expect(invalid).toMatchObject({ status: "error" });
		expect(valid).toMatchObject({ status: "success" });
		expect(prismaMock.user.update).toHaveBeenCalledWith({
			data: { timeZone: "Asia/Almaty" },
			where: { id: "user-1" },
		});
	});
});
