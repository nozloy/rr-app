import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { RaidForecastExperience } from "@/components/kogda-raid/raid-forecast";
import { createUnknownForecastCharacters, type RaidForecastSnapshot } from "@/lib/raid-forecast-core";

const { forecastAction } = vi.hoisted(() => ({ forecastAction: vi.fn() }));
vi.mock("@/actions/raid-forecast", () => ({ getRaidForecastAction: forecastAction }));

const time = "2026-10-02T09:00:00.000Z";
function snapshot(): RaidForecastSnapshot {
  return {
    serverNow: time, checkedAt: time, resetStart: "2026-09-30T04:00:00.000Z",
    charactersByDifficulty: {
      heroic: createUnknownForecastCharacters().map((character) => ({ ...character, status: "clean" })),
      mythic: createUnknownForecastCharacters().map((character) => ({ ...character, status: "locked" })),
    },
  };
}

describe("raid forecast difficulty control", () => {
  beforeAll(() => vi.stubGlobal("React", React));
  afterAll(() => vi.unstubAllGlobals());
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date", "performance"] });
    vi.setSystemTime(new Date(time));
    vi.resetAllMocks();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  });
  afterEach(() => vi.useRealTimers());

  it("switches the caption, visible difficulty, chance, count, quote and roster together", async () => {
    forecastAction.mockResolvedValue(snapshot());
    render(<RaidForecastExperience initialServerNow={time} />);
    await act(async () => {});
    expect(screen.getByRole("status")).toHaveTextContent("Героик");
    expect(screen.getByRole("status")).toHaveTextContent("90%");
    expect(screen.getByRole("status")).toHaveTextContent("Без КД: 10 из 10 персонажей");
    expect(screen.getByText(/Звёзды благоволят/)).toBeInTheDocument();
    const heroicRoster = screen.getByRole("list", { name: "Недельные КД десяти персонажей — Героик" });
    expect(within(heroicRoster).getAllByRole("listitem")).toHaveLength(10);
    expect(within(heroicRoster).getAllByText("Без КД")).toHaveLength(10);

    fireEvent.click(screen.getByRole("button", { name: "А мифик?" }));
    expect(screen.getByRole("button", { name: "А героик?" })).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent("Мифик");
    expect(screen.getByRole("status")).toHaveTextContent("1%");
    expect(screen.getByRole("status")).toHaveTextContent("Без КД: 0 из 10 персонажей");
    expect(screen.getByText(/Карты притихли/)).toBeInTheDocument();
    const mythicRoster = screen.getByRole("list", { name: "Недельные КД десяти персонажей — Мифик" });
    expect(within(mythicRoster).getAllByText("Уже закрыт")).toHaveLength(10);
    expect(screen.getAllByRole("list")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "А героик?" }));
    expect(screen.getByRole("button", { name: "А мифик?" })).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent("90%");
    expect(forecastAction).toHaveBeenCalledTimes(1);
  });

  it("disables the button only for initial loading and keeps it usable during polling", async () => {
    let resolveInitial!: (value: RaidForecastSnapshot) => void;
    let resolvePoll!: (value: RaidForecastSnapshot) => void;
    forecastAction
      .mockImplementationOnce(() => new Promise<RaidForecastSnapshot>((resolve) => { resolveInitial = resolve; }))
      .mockImplementationOnce(() => new Promise<RaidForecastSnapshot>((resolve) => { resolvePoll = resolve; }));
    render(<RaidForecastExperience initialServerNow={time} />);
    expect(screen.getByRole("button", { name: "Вглядываемся в будущее…" })).toBeDisabled();
    await act(async () => { resolveInitial(snapshot()); });
    expect(screen.getByRole("button", { name: "А мифик?" })).toBeEnabled();
    await act(async () => { await vi.advanceTimersByTimeAsync(300_000); });
    fireEvent.click(screen.getByRole("button", { name: "А мифик?" }));
    expect(screen.getByRole("button", { name: "А героик?" })).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent("Мифик");
    await act(async () => { resolvePoll(snapshot()); });
    expect(screen.getByRole("button", { name: "А героик?" })).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent("Мифик");
    expect(forecastAction).toHaveBeenCalledTimes(2);
  });
});
