import { ImageResponse } from "next/og";
import {
  AddonExportParseError,
  getImportedBannerDraftFromExport,
  getImportedRaidDisplayMode,
  getLegacyRaidGoalLabel,
  parseAddonExportString,
} from "@/lib/addon-export";
import { bannerImageSize, renderBannerImage } from "@/lib/banner-render";
import { getBannerNeedsLabel } from "@/lib/banner-needs";
import {
  currentSeasonDungeons,
  getDungeonBySlug,
  getLocalizedDungeonName,
} from "@/lib/dungeons";
import { getAssetDataUrl } from "@/lib/image-assets";
import { t } from "@/lib/i18n";
import { getLocaleFromRequest } from "@/lib/i18n-server";
import { getPartyNeeds } from "@/lib/party-slots";
import {
  getRaidCompositionAnalysis,
  getRaidRecruitmentNeedsLabel,
} from "@/lib/raid-composition";
import { getLocalizedRaidName } from "@/lib/raids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function badRequest(message: string) {
  return new Response(message, { status: 400 });
}

export async function GET(request: Request) {
  const locale = getLocaleFromRequest(request);
  const data = new URL(request.url).searchParams.get("data");

  if (!data) {
    return badRequest(t(locale, "errors.missingData"));
  }

  let draft;

  try {
    draft = getImportedBannerDraftFromExport(parseAddonExportString(data, locale));
  } catch (error) {
    if (error instanceof AddonExportParseError) {
      return badRequest(error.message);
    }

    return badRequest(t(locale, "errors.unknown"));
  }

  const dungeon = getDungeonBySlug(draft.dungeonSlug) ?? currentSeasonDungeons[0];
  const displayMode = getImportedRaidDisplayMode(draft, locale);
  const raid = displayMode.raid;
  const displayRaid = displayMode.displayRaid;
  const isLegacyRaid = displayMode.bannerVariant === "legacyRaid";

  if (!draft.hasMythicPlusKey && !raid && !isLegacyRaid) {
    return badRequest(t(locale, "errors.missingData"));
  }

  const party = getPartyNeeds(
    {
      tankFilled: draft.tankFilled,
      healerFilled: draft.healerFilled,
      dpsFilled: draft.dpsFilled,
    },
    locale,
  );
  const raidAnalysis = raid ? getRaidCompositionAnalysis(draft.source) : null;
  const needsLabel = isLegacyRaid
    ? getLegacyRaidGoalLabel(locale)
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
    return badRequest(t(locale, "errors.missingData"));
  }

  const backgroundImage = backgroundActivity
    ? await getAssetDataUrl(backgroundActivity.artPath)
    : undefined;
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
    t(locale, "events.typeRaid");
  const activityName = isLegacyRaid
    ? displayMode.activityName
    : raid
      ? getLocalizedRaidName(raid, locale)
      : dungeon
        ? getLocalizedDungeonName(dungeon, locale)
        : t(locale, "common.notSelected");

  return new ImageResponse(
    renderBannerImage({
      locale,
      backgroundImage,
      bannerVariant: displayMode.bannerVariant,
      character: {
        name: draft.characterName,
        realm: draft.realm,
        className: draft.className,
        activeSpec: draft.spec,
        itemLevel: draft.itemLevel,
      },
      dungeonName: activityName,
      keystoneLevel: draft.keystoneLevel,
      needsLabel,
      party,
      activityLabel: isLegacyRaid
        ? t(locale, "banners.collectionRun")
        : raid
          ? t(locale, "banners.raidLfg")
          : t(locale, "banners.mythicLfg"),
      compositionLabel: raid ? String(draft.source.groupSize) : undefined,
      needsHeading: isLegacyRaid
        ? t(locale, "banners.legacyGoal")
        : raid
          ? t(locale, "banners.needsInRaid")
          : t(locale, "banners.needsInGroup"),
      partySummary: raid
        ? `${raidAnalysis?.roleSummary ?? ""} • ${draft.source.instanceName ?? getLocalizedRaidName(raid, locale)}`
        : undefined,
      raidDetails: raidAnalysis
        ? {
            armorCounts: raidAnalysis.armorCounts,
            missingBuffs,
          }
        : undefined,
      topBadgeLabel: isLegacyRaid
        ? t(locale, "banners.legacy")
        : raid
          ? difficultyLabel
          : undefined,
    }),
    bannerImageSize,
  );
}
