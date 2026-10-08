"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getRaidForecastAction } from "@/actions/raid-forecast";
import {
  calculateRaidForecast,
  createUnknownForecastCharacters,
  isForecastWeekCurrent,
  type RaidForecastDifficulty,
  type RaidForecastSnapshot,
} from "@/lib/raid-forecast-core";

const REFRESH_MS = 5 * 60_000;

export function useRaidForecast(initialServerNow: string) {
  const [snapshot, setSnapshot] = useState<RaidForecastSnapshot | null>(null);
  const [now, setNow] = useState(() => new Date(initialServerNow));
  const [initialLoading, setInitialLoading] = useState(true);
  const [difficulty, setDifficulty] = useState<RaidForecastDifficulty>("heroic");
  const [reveal, setReveal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const anchor = useRef({ server: Date.parse(initialServerNow), client: performance.now() });
  const snapshotRef = useRef<RaidForecastSnapshot | null>(null);
  const busy = useRef(false);
  const mounted = useRef(false);
  const lastAttempt = useRef(-Infinity);

  const serverTime = useCallback(() => new Date(
    anchor.current.server + performance.now() - anchor.current.client,
  ), []);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    lastAttempt.current = performance.now();
    setError(null);
    try {
      const result = await getRaidForecastAction();
      if (!mounted.current) return;
      anchor.current = { server: Date.parse(result.serverNow), client: performance.now() };
      snapshotRef.current = result;
      setSnapshot(result);
      setNow(new Date(result.serverNow));
    } catch {
      if (!mounted.current) return;
      snapshotRef.current = null;
      setSnapshot(null);
      setError("Не удалось проверить персонажей. Попробуйте ещё раз чуть позже.");
    } finally {
      busy.current = false;
      if (mounted.current) setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const current = serverTime();
      setNow(current);
      if (performance.now() - lastAttempt.current >= REFRESH_MS ||
          (snapshotRef.current && !isForecastWeekCurrent(snapshotRef.current, current))) {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      mounted.current = false;
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, serverTime]);

  // Re-align the minute boundary whenever a response corrects the server clock.
  useEffect(() => {
    let minuteTimer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = serverTime();
      setNow(current);
      if (document.visibilityState === "visible" && snapshotRef.current &&
          !isForecastWeekCurrent(snapshotRef.current, current)) {
        void refresh();
      }
      minuteTimer = setTimeout(tick, 60_000 - current.getTime() % 60_000 + 20);
    };
    tick();
    return () => clearTimeout(minuteTimer);
  }, [refresh, serverTime, snapshot?.serverNow]);

  const toggleDifficulty = useCallback(() => {
    setDifficulty((value) => value === "heroic" ? "mythic" : "heroic");
    setReveal((value) => value + 1);
  }, []);

  const currentWeek = snapshot ? isForecastWeekCurrent(snapshot, now) : false;
  const characters = snapshot && currentWeek
    ? snapshot.charactersByDifficulty[difficulty]
    : createUnknownForecastCharacters();
  return {
    characters,
    forecast: calculateRaidForecast(characters, now),
    now, initialLoading, difficulty, reveal, error,
    buttonLabel: difficulty === "heroic" ? "А мифик?" : "А героик?",
    checkedAt: snapshot && currentWeek ? snapshot.checkedAt : null,
    toggleDifficulty,
  };
}
