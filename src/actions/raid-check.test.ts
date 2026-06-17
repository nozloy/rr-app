import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, authMock } = vi.hoisted(() => ({
  prismaMock: {
    raidCheckBookmark: {
      create: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
  },
  authMock: {
    getServerSession: vi.fn(),
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: authMock.getServerSession,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

function bookmarkInput() {
  return {
    name: "Mahita",
    realm: "Hyjal",
    serverSlug: "Hyjal",
    serverRegion: "EU",
  };
}

async function loadActions() {
  vi.resetModules();
  return import("@/actions/raid-check");
}

describe("raid check bookmark action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires auth for anonymous bookmark toggles", async () => {
    authMock.getServerSession.mockResolvedValue(null);

    const { toggleRaidCheckBookmarkAction } = await loadActions();
    const result = await toggleRaidCheckBookmarkAction(bookmarkInput());

    expect(result).toEqual({
      status: "requires_auth",
      bookmark: {
        isBookmarked: false,
        requiresAuth: true,
      },
    });
  });

  it("creates a bookmark for authenticated users", async () => {
    authMock.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    prismaMock.raidCheckBookmark.findUnique.mockResolvedValue(null);
    prismaMock.raidCheckBookmark.create.mockResolvedValue({});

    const { toggleRaidCheckBookmarkAction } = await loadActions();
    const result = await toggleRaidCheckBookmarkAction(bookmarkInput());

    expect(result.status).toBe("success");
    expect(result.bookmark.isBookmarked).toBe(true);
    expect(prismaMock.raidCheckBookmark.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        name: "Mahita",
        realm: "Hyjal",
        serverSlug: "hyjal",
        serverRegion: "eu",
      },
    });
  });

  it("deletes an existing bookmark", async () => {
    authMock.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    prismaMock.raidCheckBookmark.findUnique.mockResolvedValue({ id: "bookmark-1" });
    prismaMock.raidCheckBookmark.delete.mockResolvedValue({});

    const { toggleRaidCheckBookmarkAction } = await loadActions();
    const result = await toggleRaidCheckBookmarkAction(bookmarkInput());

    expect(result.status).toBe("success");
    expect(result.bookmark.isBookmarked).toBe(false);
    expect(prismaMock.raidCheckBookmark.delete).toHaveBeenCalled();
  });

  it("treats duplicate bookmark creates as already bookmarked", async () => {
    authMock.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    prismaMock.raidCheckBookmark.findUnique.mockResolvedValue(null);
    prismaMock.raidCheckBookmark.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    const { toggleRaidCheckBookmarkAction } = await loadActions();
    const result = await toggleRaidCheckBookmarkAction(bookmarkInput());

    expect(result.status).toBe("success");
    expect(result.bookmark.isBookmarked).toBe(true);
  });
});
