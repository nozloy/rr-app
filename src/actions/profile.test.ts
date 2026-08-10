import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, localeMock, prismaMock, revalidatePathMock } = vi.hoisted(
  () => ({
    authMock: { getServerSession: vi.fn() },
    localeMock: { getRequestLocale: vi.fn() },
    prismaMock: {
      character: { findFirst: vi.fn() },
      user: { update: vi.fn() },
    },
    revalidatePathMock: vi.fn(),
  }),
);

vi.mock("next-auth", () => ({
  getServerSession: authMock.getServerSession,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/i18n-server", () => ({
  getRequestLocale: localeMock.getRequestLocale,
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

async function loadAction() {
  vi.resetModules();
  return import("@/actions/profile");
}

describe("setMainCharacterAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localeMock.getRequestLocale.mockResolvedValue("ru");
  });

  it("requires an authenticated user", async () => {
    authMock.getServerSession.mockResolvedValue(null);
    const { setMainCharacterAction } = await loadAction();

    const result = await setMainCharacterAction("character-1");

    expect(result.status).toBe("error");
    expect(prismaMock.character.findFirst).not.toHaveBeenCalled();
  });

  it("rejects a character that is not active and owned by the user", async () => {
    authMock.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    prismaMock.character.findFirst.mockResolvedValue(null);
    const { setMainCharacterAction } = await loadAction();

    const result = await setMainCharacterAction("character-2");

    expect(result.status).toBe("error");
    expect(prismaMock.character.findFirst).toHaveBeenCalledWith({
      select: { id: true },
      where: {
        id: "character-2",
        isActive: true,
        userId: "user-1",
      },
    });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("stores the main character and revalidates dependent screens", async () => {
    authMock.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    prismaMock.character.findFirst.mockResolvedValue({ id: "character-1" });
    prismaMock.user.update.mockResolvedValue({});
    const { setMainCharacterAction } = await loadAction();

    const result = await setMainCharacterAction("character-1");

    expect(result.status).toBe("success");
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      data: { mainCharacterId: "character-1" },
      where: { id: "user-1" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");
    expect(revalidatePathMock).toHaveBeenCalledWith("/profile");
    expect(revalidatePathMock).toHaveBeenCalledWith("/events/new");
    expect(revalidatePathMock).toHaveBeenCalledWith("/banners/new");
  });
});
