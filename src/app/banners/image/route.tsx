import { ImageResponse } from "next/og";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { bannerImageSize, renderBannerImage } from "@/lib/banner-render";
import { getBannerNeedsLabel } from "@/lib/banner-needs";
import { getBannerDraftFromUrlParams } from "@/lib/banner-params";
import { getDungeonBySlug } from "@/lib/dungeons";
import { getAssetDataUrl } from "@/lib/image-assets";
import { getPartyNeeds } from "@/lib/party-slots";
import { prisma } from "@/lib/prisma";
import { getRaidBySlug } from "@/lib/raids";
import { getRaidRecruitmentNeedsLabel } from "@/lib/raid-composition";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const draft = getBannerDraftFromUrlParams(new URL(request.url).searchParams);

  if (!draft) {
    return new Response("Banner parameters are missing", { status: 400 });
  }

  const character = await prisma.character.findFirst({
    where: {
      id: draft.characterId,
      userId: session.user.id,
      isActive: true,
    },
  });

  if (!character) {
    return new Response("Banner parameters are invalid", { status: 404 });
  }

  if (draft.bannerType === "raid") {
    const raid = getRaidBySlug(draft.raidSlug ?? "");

    if (!raid) {
      return new Response("Banner parameters are invalid", { status: 404 });
    }

    const backgroundImage = await getAssetDataUrl(raid.artPath);
    const party = getPartyNeeds({
      tankFilled: false,
      healerFilled: false,
      dpsFilled: 0,
    });
    const needsLabel = getRaidRecruitmentNeedsLabel({
      roleNeeds: {
        tankNeeded: draft.raidTankNeeded,
        healerNeeded: draft.raidHealerNeeded,
      },
      analysis: null,
    });

    return new ImageResponse(
      renderBannerImage({
        backgroundImage,
        bannerVariant: "currentRaid",
        character,
        dungeonName: raid.name,
        needsLabel,
        party,
        activityLabel: "Raid LFG",
        compositionLabel: "Raid",
        needsHeading: "Состав рейда",
        partySummary: "Ручной рейдовый подбор",
        topBadgeLabel: "Raid",
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
  });
  const needsLabel = getBannerNeedsLabel(party.neededLabels, {
    hasBloodlust: draft.hasBloodlust,
    hasBattleRes: draft.hasBattleRes,
  });

  return new ImageResponse(
    renderBannerImage({
      backgroundImage,
      character,
      dungeonName: dungeon.name,
      keystoneLevel: draft.keystoneLevel,
      needsLabel,
      party,
    }),
    bannerImageSize,
  );
}
