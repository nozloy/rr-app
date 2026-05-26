import { ImageResponse } from "next/og";
import {
  AddonExportParseError,
  LEGACY_RAID_GOAL_LABEL,
  getImportedBannerDraftFromExport,
  getImportedRaidDisplayMode,
  parseAddonExportString,
} from "@/lib/addon-export";
import { bannerImageSize, renderBannerImage } from "@/lib/banner-render";
import { getBannerNeedsLabel } from "@/lib/banner-needs";
import { currentSeasonDungeons, getDungeonBySlug } from "@/lib/dungeons";
import { getAssetDataUrl } from "@/lib/image-assets";
import { getPartyNeeds } from "@/lib/party-slots";
import {
  getRaidCompositionAnalysis,
  getRaidRecruitmentNeedsLabel,
} from "@/lib/raid-composition";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function badRequest(message: string) {
  return new Response(message, { status: 400 });
}

export async function GET(request: Request) {
  const data = new URL(request.url).searchParams.get("data");

  if (!data) {
    return badRequest("Import data is missing.");
  }

  let draft;

  try {
    draft = getImportedBannerDraftFromExport(parseAddonExportString(data));
  } catch (error) {
    if (error instanceof AddonExportParseError) {
      return badRequest(error.message);
    }

    return badRequest("Import data is invalid.");
  }

  const dungeon =
    getDungeonBySlug(draft.dungeonSlug) ?? currentSeasonDungeons[0];
  const displayMode = getImportedRaidDisplayMode(draft);
  const raid = displayMode.raid;
  const displayRaid = displayMode.displayRaid;
  const isLegacyRaid = displayMode.bannerVariant === "legacyRaid";

  if (!draft.hasMythicPlusKey && !raid && !isLegacyRaid) {
    return badRequest("Mythic+ key data is missing.");
  }

  const party = getPartyNeeds({
    tankFilled: draft.tankFilled,
    healerFilled: draft.healerFilled,
    dpsFilled: draft.dpsFilled,
  });
  const raidAnalysis = raid ? getRaidCompositionAnalysis(draft.source) : null;
  const needsLabel = isLegacyRaid
    ? LEGACY_RAID_GOAL_LABEL
    : raid
    ? getRaidRecruitmentNeedsLabel({
        roleNeeds: {
          tankNeeded: draft.raidTankNeeded,
          healerNeeded: draft.raidHealerNeeded,
        },
        analysis: raidAnalysis,
      })
    : getBannerNeedsLabel(party.neededLabels, {
        hasBloodlust: draft.hasBloodlust,
        hasBattleRes: draft.hasBattleRes,
      });
  const activity = raid ?? dungeon;
  const backgroundActivity = isLegacyRaid ? displayRaid : activity;

  if (!isLegacyRaid && !activity) {
    return badRequest("Banner activity data is missing.");
  }

  const backgroundImage =
    backgroundActivity ? await getAssetDataUrl(backgroundActivity.artPath) : undefined;
  const missingBuffs = raidAnalysis
    ? await Promise.all(
        raidAnalysis.missingBuffs.map(async (buff) => ({
          key: buff.key,
          label: buff.label,
          icon: await getAssetDataUrl(buff.iconPath),
        })),
      )
    : [];
  const difficultyLabel =
    draft.source.difficultyName ??
    draft.source.selectedRaidDifficultyName ??
    "Raid";

  return new ImageResponse(
    renderBannerImage({
      backgroundImage,
      bannerVariant: displayMode.bannerVariant,
      character: {
        name: draft.characterName,
        realm: draft.realm,
        className: draft.className,
        activeSpec: draft.spec,
        itemLevel: draft.itemLevel,
      },
      dungeonName: isLegacyRaid
        ? displayMode.activityName
        : (activity?.name ?? "Подземелье"),
      keystoneLevel: draft.keystoneLevel,
      needsLabel,
      party,
      activityLabel: isLegacyRaid ? "Collection run" : raid ? "Raid LFG" : undefined,
      compositionLabel: raid ? String(draft.source.groupSize) : undefined,
      needsHeading: isLegacyRaid ? "Цель сбора" : raid ? "Состав рейда" : undefined,
      partySummary: raid
        ? `${raidAnalysis?.roleSummary ?? ""} • ${draft.source.instanceName ?? raid.name}`
        : undefined,
      raidDetails: raidAnalysis
        ? {
            armorCounts: raidAnalysis.armorCounts,
            missingBuffs,
          }
        : undefined,
      topBadgeLabel: isLegacyRaid ? "Legacy" : raid ? difficultyLabel : undefined,
    }),
    bannerImageSize,
  );
}
