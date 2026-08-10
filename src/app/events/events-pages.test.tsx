import React from "react";

const { localeMock, prismaMock, sessionMock } = vi.hoisted(() => ({
  localeMock: vi.fn(),
  prismaMock: {
    eventDifficultyOption: { findMany: vi.fn() },
    scheduledEvent: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
  },
  sessionMock: vi.fn(),
}));

vi.mock("@/lib/i18n-server", () => ({ getRequestLocale: localeMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/session", () => ({ getOptionalSession: sessionMock }));
vi.mock("@/components/shell/app-header", () => ({ AppHeader: () => null }));

function publicEvent(status: "PUBLISHED" | "CANCELLED") {
  return {
    activities: [
      {
        activity: {
          artPath: "/raids/test.png",
          id: "activity-1",
          nameEn: "Hidden raid",
          nameRu: "Скрытый рейд",
        },
      },
    ],
    activityType: "RAID",
    cancelledAt: status === "CANCELLED" ? new Date() : null,
    damageMax: 12,
    damageMin: 9,
    deliveries: [],
    difficulty: { labelEn: "Heroic", labelRu: "Героик" },
    hasPaidSlots: false,
    hasUnroll: false,
    healerMax: 3,
    healerMin: 3,
    id: `event-${status.toLowerCase()}`,
    leaderName: "NoZloy",
    leaderRealm: "Гордунни",
    paidSlotPrice: 0,
    paidSlots: 0,
    publishTargets: [],
    startsAt: new Date("2027-08-12T17:30:00.000Z"),
    status,
    tankMax: 2,
    tankMin: 2,
    timeZone: "Europe/Moscow",
    unrollItemIds: [],
    userId: "user-1",
    version: 1,
  };
}

describe("public event pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localeMock.mockResolvedValue("ru");
    sessionMock.mockResolvedValue(null);
    prismaMock.scheduledEvent.count.mockResolvedValue(0);
    prismaMock.scheduledEvent.findMany.mockResolvedValue([]);
    prismaMock.eventDifficultyOption.findMany.mockResolvedValue([]);
  });

  it("queries only future active APP events and paginates by 12", async () => {
    const { default: EventsPage } = await import("@/app/events/page");

    await EventsPage({
      searchParams: Promise.resolve({
        date: "2026-08-12",
        difficulty: "heroic",
        page: "2",
        type: "dungeon",
      }),
    });

    expect(prismaMock.scheduledEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ startsAt: "asc" }],
        skip: 12,
        take: 12,
        where: expect.objectContaining({
          activityType: "DUNGEON",
          difficulty: { slug: "heroic" },
          localDate: "2026-08-12",
          publishTargets: { has: "APP" },
          startsAt: { gt: expect.any(Date) },
          status: "PUBLISHED",
        }),
      }),
    );
  }, 20_000);

  it.each(["PUBLISHED", "CANCELLED"] as const)(
    "keeps an unlisted %s event available by direct link",
    async (status) => {
      prismaMock.scheduledEvent.findUnique.mockResolvedValue(publicEvent(status));
      const { default: EventDetailPage } = await import(
        "@/app/events/[id]/page"
      );

      const result = await EventDetailPage({
        params: Promise.resolve({ id: `event-${status.toLowerCase()}` }),
      });

      expect(React.isValidElement(result)).toBe(true);
      expect(prismaMock.scheduledEvent.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: `event-${status.toLowerCase()}` },
        }),
      );
    },
    20_000,
  );
});
