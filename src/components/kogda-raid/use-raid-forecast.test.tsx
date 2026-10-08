import { act, renderHook } from "@testing-library/react";
import { useRaidForecast } from "@/components/kogda-raid/use-raid-forecast";
import { createUnknownForecastCharacters, type RaidForecastSnapshot, type RaidForecastStatus } from "@/lib/raid-forecast-core";

const { forecastAction } = vi.hoisted(() => ({ forecastAction: vi.fn() }));
vi.mock("@/actions/raid-forecast", () => ({ getRaidForecastAction: forecastAction }));

function snapshot(time: string, heroic: RaidForecastStatus = "clean", mythic: RaidForecastStatus = "locked"): RaidForecastSnapshot {
  return {
    serverNow: time, checkedAt: time, resetStart: "2026-09-30T04:00:00.000Z",
    charactersByDifficulty: {
      heroic: createUnknownForecastCharacters().map((character) => ({ ...character, status: heroic })),
      mythic: createUnknownForecastCharacters().map((character) => ({ ...character, status: mythic })),
    },
  };
}

describe("live forecast clock and refresh", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date", "performance"] });
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    vi.clearAllMocks();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  });
  afterEach(() => vi.useRealTimers());

  it("uses server time despite a wrong client clock and changes at 20:00 without another request", async () => {
    const time = "2026-10-02T16:59:30.000Z";
    forecastAction.mockResolvedValue(snapshot(time));
    const { result } = renderHook(() => useRaidForecast(time));
    await act(async () => {});
    expect(result.current.now.getTime()).toBeGreaterThanOrEqual(Date.parse(time));
    expect(result.current.forecast.reason).toBe("evening");
    await act(async () => { await vi.advanceTimersByTimeAsync(30_050); });
    expect(result.current.forecast).toMatchObject({ chance: 1, reason: "outside_hours" });
    expect(forecastAction).toHaveBeenCalledTimes(1);
  });

  it("re-aligns the boundary after the server corrects the initial clock", async () => {
    const server = "2026-10-02T16:59:50.000Z";
    forecastAction.mockResolvedValue(snapshot(server));
    const { result } = renderHook(() => useRaidForecast("2026-10-02T16:59:05.000Z"));
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(10_050); });
    expect(result.current.forecast.reason).toBe("outside_hours");
  });

  it("allows immediate switching during a background refresh and preserves the selection when it completes", async () => {
    const time = "2026-10-02T09:00:00.000Z";
    let resolveRefresh!: (value: RaidForecastSnapshot) => void;
    forecastAction.mockResolvedValueOnce(snapshot(time)).mockImplementationOnce(() =>
      new Promise<RaidForecastSnapshot>((resolve) => { resolveRefresh = resolve; }));
    const { result } = renderHook(() => useRaidForecast(time));
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(300_000); });
    expect(forecastAction).toHaveBeenCalledTimes(2);
    expect(result.current.initialLoading).toBe(false);
    act(() => { result.current.toggleDifficulty(); });
    expect(result.current.difficulty).toBe("mythic");
    expect(result.current.forecast).toMatchObject({ chance: 1, reason: "all_locked", lockedCount: 10 });
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(forecastAction).toHaveBeenCalledTimes(2);
    await act(async () => { resolveRefresh(snapshot("2026-10-02T09:05:00.000Z", "locked", "clean")); });
    expect(result.current.initialLoading).toBe(false);
    expect(result.current.difficulty).toBe("mythic");
    expect(result.current.forecast).toMatchObject({ chance: 90, reason: "available", freeCount: 10 });
    expect(result.current.buttonLabel).toBe("А героик?");
    expect(result.current.reveal).toBe(1);
  });

  it("starts on heroic, switches both rosters and forecasts without requests, and resets on a fresh mount", async () => {
    const time = "2026-10-02T09:00:00.000Z";
    forecastAction.mockResolvedValue(snapshot(time));
    const { result, unmount } = renderHook(() => useRaidForecast(time));
    expect(result.current.initialLoading).toBe(true);
    await act(async () => {});
    expect(result.current.difficulty).toBe("heroic");
    expect(result.current.buttonLabel).toBe("А мифик?");
    expect(result.current.forecast).toMatchObject({ chance: 90, freeCount: 10 });
    for (let click = 1; click <= 7; click++) {
      act(() => { result.current.toggleDifficulty(); });
      const mythic = click % 2 === 1;
      expect(result.current.reveal).toBe(click);
      expect(result.current.difficulty).toBe(mythic ? "mythic" : "heroic");
      expect(result.current.buttonLabel).toBe(mythic ? "А героик?" : "А мифик?");
      expect(result.current.characters.every((character) => character.status === (mythic ? "locked" : "clean"))).toBe(true);
      expect(result.current.forecast).toMatchObject(mythic
        ? { chance: 1, reason: "all_locked", freeCount: 0, lockedCount: 10 }
        : { chance: 90, reason: "available", freeCount: 10, lockedCount: 0 });
      expect(result.current.initialLoading).toBe(false);
      expect(result.current.checkedAt).toBe(time);
      expect(forecastAction).toHaveBeenCalledTimes(1);
    }
    unmount();
    const freshPage = renderHook(() => useRaidForecast(time));
    await act(async () => {});
    expect(freshPage.result.current.reveal).toBe(0);
    expect(freshPage.result.current.difficulty).toBe("heroic");
    expect(freshPage.result.current.buttonLabel).toBe("А мифик?");
  });

  it("polls only while visible and refreshes when returning to an old tab", async () => {
    const time = "2026-10-02T09:00:00.000Z";
    forecastAction.mockResolvedValue(snapshot(time));
    const { result } = renderHook(() => useRaidForecast(time));
    await act(async () => {});
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    await act(async () => { await vi.advanceTimersByTimeAsync(300_000); });
    expect(forecastAction).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(forecastAction).toHaveBeenCalledTimes(2);
    expect(result.current.reveal).toBe(0);
    expect(result.current.buttonLabel).toBe("А мифик?");
  });

  it("shows unknown data when a refresh fails instead of keeping a false positive", async () => {
    const time = "2026-10-02T09:00:00.000Z";
    forecastAction.mockResolvedValueOnce(snapshot(time)).mockRejectedValueOnce(new Error("network down"));
    const { result } = renderHook(() => useRaidForecast(time));
    await act(async () => {});
    act(() => { result.current.toggleDifficulty(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(300_000); });
    expect(result.current.forecast.chance).toBeNull();
    expect(result.current.error).toContain("Не удалось проверить");
    expect(result.current.initialLoading).toBe(false);
    expect(result.current.difficulty).toBe("mythic");
    expect(result.current.characters.every((character) => character.status === "unknown")).toBe(true);
    act(() => { result.current.toggleDifficulty(); });
    expect(result.current.forecast.chance).toBeNull();
    expect(result.current.characters.every((character) => character.status === "unknown")).toBe(true);
  });

  it("keeps an unavailable difficulty unknown without hiding the valid forecast", async () => {
    const time = "2026-10-02T09:00:00.000Z";
    forecastAction.mockResolvedValue(snapshot(time, "clean", "unknown"));
    const { result } = renderHook(() => useRaidForecast(time));
    await act(async () => {});
    expect(result.current.forecast.chance).toBe(90);
    act(() => { result.current.toggleDifficulty(); });
    expect(result.current.forecast).toMatchObject({ chance: null, unknownCount: 10, freeCount: 0 });
    act(() => { result.current.toggleDifficulty(); });
    expect(result.current.forecast).toMatchObject({ chance: 90, unknownCount: 0, freeCount: 10 });
  });

  it("invalidates both lists at the weekly reset while preserving the selected difficulty", async () => {
    const time = "2026-10-07T03:59:30.000Z";
    const initial = snapshot(time, "locked", "locked");
    const afterReset = { ...snapshot("2026-10-07T04:00:00.000Z"), resetStart: "2026-10-07T04:00:00.000Z" };
    let resolveRefresh!: (value: RaidForecastSnapshot) => void;
    forecastAction.mockResolvedValueOnce(initial).mockImplementationOnce(() =>
      new Promise<RaidForecastSnapshot>((resolve) => { resolveRefresh = resolve; }));
    const { result } = renderHook(() => useRaidForecast(time));
    await act(async () => {});
    act(() => { result.current.toggleDifficulty(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(30_050); });
    expect(forecastAction).toHaveBeenCalledTimes(2);
    expect(result.current.difficulty).toBe("mythic");
    expect(result.current.checkedAt).toBeNull();
    expect(result.current.characters.every((character) => character.status === "unknown")).toBe(true);
    act(() => { result.current.toggleDifficulty(); });
    expect(result.current.characters.every((character) => character.status === "unknown")).toBe(true);
    act(() => { result.current.toggleDifficulty(); });
    await act(async () => { resolveRefresh(afterReset); });
    expect(result.current.difficulty).toBe("mythic");
    expect(result.current.characters.every((character) => character.status === "locked")).toBe(true);
    act(() => { result.current.toggleDifficulty(); });
    expect(result.current.characters.every((character) => character.status === "clean")).toBe(true);
  });
});
