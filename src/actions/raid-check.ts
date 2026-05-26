"use server";

import {
  checkRaidLockoutsForExport,
  type RaidCheckInput,
  type RaidCheckResult,
} from "@/lib/raid-check";

export async function raidCheckAction(
  input: RaidCheckInput,
): Promise<RaidCheckResult> {
  return checkRaidLockoutsForExport(input);
}
