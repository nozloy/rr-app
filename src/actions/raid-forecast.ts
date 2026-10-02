"use server";

import { getRaidForecast } from "@/lib/raid-forecast-server";
import type { RaidForecastSnapshot } from "@/lib/raid-forecast-core";

export async function getRaidForecastAction(): Promise<RaidForecastSnapshot> {
  return getRaidForecast();
}
