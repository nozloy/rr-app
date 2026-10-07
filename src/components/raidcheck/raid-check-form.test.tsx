import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RaidCheckForm } from "@/components/raidcheck/raid-check-form";
import { currentRaidInstances, getLocalizedRaidName } from "@/lib/raids";

const { checkMock } = vi.hoisted(() => ({ checkMock: vi.fn() }));

vi.mock("@/actions/raid-check", () => ({
  raidCheckAction: checkMock,
  getRaidCheckCharacterDetailsAction: vi.fn(),
  toggleRaidCheckBookmarkAction: vi.fn(),
}));

vi.mock("@/components/shell/locale-provider", () => ({
  useAppLocale: () => "ru",
}));

vi.mock("@/components/raidcheck/raid-check-character-sheet", () => ({
  RaidCheckCharacterSheet: () => null,
}));

const exportString = "RR1?name=LayoutTest&realm=Draenor&classFile=MAGE&groupType=raid&difficultyID=15&roster=LayoutTest:Draenor:MAGE:DAMAGER";

describe("RaidCheckForm controls", () => {
  beforeAll(() => vi.stubGlobal("React", React));
  afterAll(() => vi.unstubAllGlobals());

  beforeEach(() => {
    vi.clearAllMocks();
    checkMock.mockResolvedValue({
      status: "success",
      message: null,
      raidName: "Test raid",
      difficulty: { id: 14, label: "Normal", type: "NORMAL" },
      difficultyOptions: [],
      defaultDifficultyID: 15,
      resetStart: null,
      usedFallbackRoster: false,
      warnings: [],
      rows: [],
    });
  });

  it("responds to an empty submit with an inline error and focus instead of disabling the controls", async () => {
    const user = userEvent.setup();
    render(<RaidCheckForm />);

    expect(screen.getByRole("combobox", { name: "Рейд для проверки" })).toBeEnabled();
    await user.click(screen.getByRole("radio", { name: "Normal", exact: true }));
    expect(screen.getByRole("radio", { name: "Normal", exact: true })).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Проверить кд" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Сначала вставьте строку");
    expect(screen.getByRole("textbox", { name: "Строка из аддона" })).toHaveFocus();
    expect(checkMock).not.toHaveBeenCalled();
  });

  it("preserves choices made before importing and submits those choices", async () => {
    const user = userEvent.setup();
    render(<RaidCheckForm />);

    const raid = currentRaidInstances[1];
    await user.click(screen.getByRole("combobox", { name: "Рейд для проверки" }));
    await user.click(screen.getByRole("option", { name: getLocalizedRaidName(raid, "ru"), exact: true }));
    await user.click(screen.getByRole("radio", { name: "Normal", exact: true }));
    await user.click(screen.getByRole("textbox", { name: "Строка из аддона" }));
    await user.paste(exportString);

    expect(screen.getByRole("combobox", { name: "Рейд для проверки" })).toHaveTextContent(getLocalizedRaidName(raid, "ru"));
    expect(screen.getByRole("radio", { name: "Normal", exact: true })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Проверить кд" }));

    await waitFor(() => expect(checkMock).toHaveBeenCalledWith({
      exportText: exportString,
      difficultyID: 14,
      locale: "ru",
      raidSlug: raid.slug,
    }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Проверить кд" })).toBeEnabled());
  });

  it("rejects invalid input locally and still imports defaults when nothing was chosen manually", async () => {
    const user = userEvent.setup();
    render(<RaidCheckForm />);
    const input = screen.getByRole("textbox", { name: "Строка из аддона" });
    await user.type(input, "wrong-format");
    await user.click(screen.getByRole("button", { name: "Проверить кд" }));

    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(checkMock).not.toHaveBeenCalled();

    await user.clear(input);
    await user.paste(exportString.replace("difficultyID=15", "difficultyID=16"));
    expect(screen.getByRole("radio", { name: "Mythic", exact: true })).toBeChecked();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
