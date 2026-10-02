import { act, renderHook } from "@testing-library/react";
import { useRaidForecast } from "@/components/kogda-raid/use-raid-forecast";
import { createUnknownForecastCharacters, type RaidForecastSnapshot } from "@/lib/raid-forecast-core";

const { forecastAction } = vi.hoisted(() => ({ forecastAction: vi.fn() }));
vi.mock("@/actions/raid-forecast", () => ({ getRaidForecastAction: forecastAction }));

function snapshot(time: string, status: "clean" | "locked" = "clean"): RaidForecastSnapshot {
  return { serverNow: time, checkedAt: time, resetStart: "2026-09-30T04:00:00.000Z", characters: createUnknownForecastCharacters().map((character) => ({ ...character, status })) };
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

  it("keeps a fast cached refresh loading for two seconds and ignores overlapping clicks", async () => {
    const time = "2026-10-02T09:00:00.000Z";
    forecastAction.mockResolvedValueOnce(snapshot(time)).mockResolvedValueOnce(snapshot(time, "locked"));
    const { result } = renderHook(() => useRaidForecast(time));
    await act(async () => {});
    expect(result.current.forecast.chance).toBe(90);
    act(() => { void result.current.refresh(); });
    expect(result.current.pending).toBe(true);
    expect(result.current.reveal).toBe(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(1_999); });
    expect(result.current.pending).toBe(true);
    await act(async () => { await result.current.refresh(); });
    expect(forecastAction).toHaveBeenCalledTimes(2);
    expect(result.current.reveal).toBe(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(result.current.pending).toBe(false);
    expect(result.current.forecast.chance).toBe(1);
  });

  it("keeps loading until a slow response arrives without adding another two-second delay", async () => {
    const time = "2026-10-02T09:00:00.000Z";
    let resolveRefresh!: (value: RaidForecastSnapshot) => void;
    forecastAction.mockResolvedValueOnce(snapshot(time)).mockImplementationOnce(() =>
      new Promise<RaidForecastSnapshot>((resolve) => { resolveRefresh = resolve; }));
    const { result } = renderHook(() => useRaidForecast(time));
    await act(async () => {});
    act(() => { void result.current.refresh(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(3_000); });
    expect(result.current.pending).toBe(true);
    await act(async () => { resolveRefresh(snapshot(time, "locked")); });
    expect(result.current.pending).toBe(false);
    expect(result.current.forecast.chance).toBe(1);
  });

  it("changes the caption after five manual clicks, keeps it for later clicks, and resets on a fresh mount", async () => {
    const time = "2026-10-02T09:00:00.000Z";
    forecastAction.mockResolvedValue(snapshot(time));
    const { result, unmount } = renderHook(() => useRaidForecast(time));
    await act(async () => {});
    expect(result.current.buttonLabel).toBe("А сейчас?");
    for (let click = 1; click <= 6; click++) {
      await act(async () => {
        const refresh = result.current.refresh();
        await vi.advanceTimersByTimeAsync(2_000);
        await refresh;
      });
      expect(result.current.reveal).toBe(click);
      expect(result.current.buttonLabel).toBe(click < 5 ? "А сейчас?" : "Купи рейд сам");
    }
    unmount();
    const freshPage = renderHook(() => useRaidForecast(time));
    await act(async () => {});
    expect(freshPage.result.current.reveal).toBe(0);
    expect(freshPage.result.current.buttonLabel).toBe("А сейчас?");
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
    expect(result.current.buttonLabel).toBe("А сейчас?");
  });

  it("shows unknown data when a refresh fails instead of keeping a false positive", async () => {
    const time = "2026-10-02T09:00:00.000Z";
    forecastAction.mockResolvedValueOnce(snapshot(time)).mockRejectedValueOnce(new Error("network down"));
    const { result } = renderHook(() => useRaidForecast(time));
    await act(async () => {});
    act(() => { void result.current.refresh(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1_999); });
    expect(result.current.pending).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(result.current.forecast.chance).toBeNull();
    expect(result.current.error).toContain("Не удалось проверить");
    expect(result.current.pending).toBe(false);
  });
});
