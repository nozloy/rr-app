import { ImageResponse } from "next/og";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { bannerImageSize, renderBannerImage } from "@/lib/banner-render";
import { getBannerNeedsLabel } from "@/lib/banner-needs";
import { getBannerDraftFromUrlParams } from "@/lib/banner-params";
import { getDungeonBySlug, getLocalizedDungeonName } from "@/lib/dungeons";
import { getAssetDataUrl } from "@/lib/image-assets";
import { t } from "@/lib/i18n";
import { getLocaleFromRequest } from "@/lib/i18n-server";
import { getPartyNeeds } from "@/lib/party-slots";
import { prisma } from "@/lib/prisma";
import { getLocalizedRaidName, getRaidBySlug } from "@/lib/raids";
import { getRaidRecruitmentNeedsLabel } from "@/lib/raid-composition";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const locale = getLocaleFromRequest(request);
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response(t(locale, "errors.unauthorized"), { status: 401 });
  }

  const draft = getBannerDraftFromUrlParams(new URL(request.url).searchParams);

  if (!draft) {
    return new Response(t(locale, "errors.missingData"), { status: 400 });
  }

  const character = await prisma.character.findFirst({
    where: {
      id: draft.characterId,
      userId: session.user.id,
      isActive: true,
    },
  });

  if (!character) {
    return new Response(t(locale, "errors.notFound"), { status: 404 });
  }

  if (draft.bannerType === "raid") {
    const raid = getRaidBySlug(draft.raidSlug ?? "");

    if (!raid) {
      return new Response(t(locale, "errors.notFound"), { status: 404 });
    }

    const backgroundImage = await getAssetDataUrl(raid.artPath);
    const party = getPartyNeeds({
      tankFilled: false,
      healerFilled: false,
      dpsFilled: 0,
    }, locale);
    const needsLabel = getRaidRecruitmentNeedsLabel({
      roleNeeds: {
        tankNeeded: draft.raidTankNeeded,
        healerNeeded: draft.raidHealerNeeded,
      },
      analysis: null,
    });
    const raidName = getLocalizedRaidName(raid, locale);

    return new ImageResponse(
      renderBannerImage({
        locale,
        backgroundImage,
        bannerVariant: "currentRaid",
        character,
        dungeonName: raidName,
        needsLabel,
        party,
        activityLabel: t(locale, "banners.raidLfg"),
        compositionLabel: t(locale, "events.typeRaid"),
        needsHeading: t(locale, "banners.needsInRaid"),
        partySummary: t(locale, "banners.needsInRaid"),
        topBadgeLabel: t(locale, "events.typeRaid"),
      }),
      bannerImageSize,
    );
  }

  const dungeon = getDungeonBySlug(draft.dungeonSlug);

  if (!dungeon) {
    return new Response("Banner parameters are invalid", { status: 404 });
  }

  const backgroundImage = await getAssetDataUrl(dungeon.artPath);
  const party = getPartyNeeds({
    tankFilled: draft.tankFilled,
    healerFilled: draft.healerFilled,
    dpsFilled: draft.dpsFilled,
  }, locale);
  const needsLabel = getBannerNeedsLabel(party.neededLabels, {
    hasBloodlust: draft.hasBloodlust,
    hasBattleRes: draft.hasBattleRes,
  });
  const dungeonName = getLocalizedDungeonName(dungeon, locale);

  return new ImageResponse(
    renderBannerImage({
      locale,
      backgroundImage,
      character,
      dungeonName,
      keystoneLevel: draft.keystoneLevel,
      needsLabel,
      party,
    }),
    bannerImageSize,
  );
}
