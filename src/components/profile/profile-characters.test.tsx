import React from "react";
import { render, screen } from "@testing-library/react";
import type { Character } from "@prisma/client";
import { ProfileCharacters } from "@/components/profile/profile-characters";

vi.mock("@/components/profile/profile-character-actions", () => ({
  ProfileCharacterActions: ({ isMain }: { isMain: boolean }) => (
    <button type="button">{isMain ? "Главный выбран" : "Действия"}</button>
  ),
}));

vi.mock("@/components/profile/profile-sync-control", () => ({
  ProfileSyncControl: () => <button type="button">Синхронизировать</button>,
}));

function character(
  id: string,
  name: string,
  isActive: boolean,
): Character {
  return {
    activeSpec: "Огонь",
    avatarUrl: null,
    className: "Маг",
    factionName: "Орда",
    id,
    isActive,
    itemLevel: 670,
    level: 90,
    name,
    realm: "Гордунни",
    thumbnailUrl: null,
  } as Character;
}

describe("ProfileCharacters", () => {
  it("shows every character and marks the selected main character", () => {
    render(
      <ProfileCharacters
        characters={[
          character("main", "Главныймаг", true),
          character("inactive", "Старыймаг", false),
        ]}
        locale="ru"
        mainCharacterId="main"
      />,
    );

    expect(screen.getByText("Главныймаг")).toBeInTheDocument();
    expect(screen.getByText("Старыймаг")).toBeInTheDocument();
    expect(screen.getByText("Главный")).toBeInTheDocument();
    expect(screen.getByText("Неактивен")).toBeInTheDocument();
  });

  it("shows the empty state and keeps the sync action available", () => {
    render(
      <ProfileCharacters characters={[]} locale="ru" mainCharacterId={null} />,
    );

    expect(screen.getByText("Персонажи не найдены")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Синхронизировать" }),
    ).toBeInTheDocument();
  });
});
