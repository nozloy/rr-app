/* eslint-disable @next/next/no-img-element */
import type { ReactElement } from "react";
import type { PartyNeedsSummary } from "@/lib/party-slots";
import { formatItemLevel } from "@/lib/utils";

export const bannerImageSize = {
  width: 1200,
  height: 675,
};

export type BannerRenderCharacter = {
  name: string;
  realm: string;
  className: string;
  activeSpec: string | null;
  itemLevel: number;
};

export type BannerVariant = "mythicPlus" | "currentRaid" | "legacyRaid";

export type BannerRenderInput = {
  backgroundImage?: string;
  bannerVariant?: BannerVariant;
  character: BannerRenderCharacter;
  dungeonName: string;
  keystoneLevel?: number;
  needsLabel: string;
  party: PartyNeedsSummary;
  activityLabel?: string;
  compositionLabel?: string;
  needsHeading?: string;
  raidDetails?: BannerRaidDetails;
  topBadgeLabel?: string;
  partySummary?: string;
};

export type BannerRaidDetails = {
  armorCounts: {
    key: string;
    label: string;
    count: number;
  }[];
  missingBuffs: {
    key: string;
    label: string;
    icon: string;
  }[];
};

export function getPartySummary(party: PartyNeedsSummary) {
  const parts = [
    party.tankNeeded === 0 ? "Танк" : null,
    party.healerNeeded === 0 ? "Хилл" : null,
    party.dpsNeeded < 3 ? `ДД x${3 - party.dpsNeeded}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" • ") : "Слоты не отмечены";
}

export function getBannerRenderVisibility(
  bannerVariant: BannerVariant = "mythicPlus",
) {
  const showRaidRecruitmentDetails = bannerVariant !== "legacyRaid";

  return {
    showCharacterMeta: bannerVariant !== "legacyRaid",
    showComposition: showRaidRecruitmentDetails,
    showPartySummary: showRaidRecruitmentDetails,
    showRaidDetails: showRaidRecruitmentDetails,
  };
}

export function renderBannerImage({
  backgroundImage,
  bannerVariant = "mythicPlus",
  character,
  dungeonName,
  keystoneLevel,
  needsLabel,
  party,
  activityLabel = "Mythic+ LFG",
  compositionLabel,
  needsHeading = "Нужно в группу",
  raidDetails,
  topBadgeLabel,
  partySummary = getPartySummary(party),
}: BannerRenderInput): ReactElement {
  const visibility = getBannerRenderVisibility(bannerVariant);
  const hasRaidDetails = visibility.showRaidDetails && Boolean(raidDetails);
  const specLabel = character.activeSpec
    ? `${character.className} • ${character.activeSpec}`
    : character.className;
  const filledCount = party.slots.filter((slot) => slot.filled).length;
  const badgeLabel = topBadgeLabel ?? `+${keystoneLevel ?? 0}`;
  const compositionValue = compositionLabel ?? `${filledCount}/5`;
  const fallbackBackground =
    "radial-gradient(circle at 18% 20%, rgba(152,223,255,0.18) 0%, transparent 28%), radial-gradient(circle at 78% 16%, rgba(240,220,143,0.14) 0%, transparent 26%), radial-gradient(circle at 68% 82%, rgba(99,122,150,0.2) 0%, transparent 32%), linear-gradient(135deg, #07111f 0%, #111827 44%, #1f2937 100%)";

  return (
    <div
      style={{
        width: bannerImageSize.width,
        height: bannerImageSize.height,
        display: "flex",
        position: "relative",
        flexDirection: "column",
        justifyContent: "space-between",
        color: "#f4fbff",
        background: backgroundImage ? "#06111f" : fallbackBackground,
        padding: "44px",
        fontFamily: "Segoe UI",
        overflow: "hidden",
      }}
    >
      {backgroundImage ? (
        <img
          alt={dungeonName}
          src={backgroundImage}
          width={bannerImageSize.width}
          height={bannerImageSize.height}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: bannerImageSize.width,
            height: bannerImageSize.height,
            objectFit: "cover",
            objectPosition: "center center",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(8,17,31,0.3) 0%, rgba(6,14,24,0.62) 48%, rgba(4,10,18,0.9) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(7,16,28,0.9) 0%, rgba(9,21,36,0.64) 44%, rgba(8,20,34,0.78) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(3,8,15,0.84) 0%, rgba(3,8,15,0.62) 30%, rgba(3,8,15,0.2) 58%, rgba(3,8,15,0) 100%)",
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            maxWidth: "760px",
            padding: "22px 26px 24px",
            margin: "-22px 0 0 -26px",
            borderRadius: "28px",
            background: "rgba(2, 7, 14, 0.72)",
            border: "1px solid rgba(255,255,255,0.14)",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 18,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "#98dfff",
            }}
          >
            RaidReminder • {activityLabel}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 68,
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            {character.name}
          </div>
          {visibility.showCharacterMeta ? (
            <div
              style={{
                display: "flex",
                fontSize: 28,
                color: "#d8ecff",
              }}
            >
              {specLabel}
            </div>
          ) : null}
          {visibility.showCharacterMeta ? (
            <div
              style={{
                display: "flex",
                fontSize: 22,
                color: "rgba(216, 236, 255, 0.8)",
              }}
            >
              {character.realm} • ilvl {formatItemLevel(character.itemLevel)}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "16px 24px",
              borderRadius: "999px",
              background: "#f0dc8f",
              color: "#142131",
              fontSize: 42,
              fontWeight: 800,
            }}
          >
            {badgeLabel}
          </div>
          <div
            style={{
              display: "flex",
              padding: "12px 20px",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(2, 7, 14, 0.58)",
              fontSize: 24,
              color: "#eef7ff",
            }}
          >
            {dungeonName}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: hasRaidDetails ? "14px" : "18px",
          position: "relative",
          zIndex: 1,
          padding: hasRaidDetails ? "22px 26px" : "28px 30px",
          borderRadius: "28px",
          border: "1px solid rgba(255,255,255,0.2)",
          background: "rgba(2, 7, 14, 0.74)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "stretch",
            gap: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              justifyContent: "center",
              ...(!visibility.showComposition
                ? {
                    width: "100%",
                    minHeight: 118,
                  }
                : hasRaidDetails
                ? {
                    width: "820px",
                    minHeight: 84,
                  }
                : {
                    width: "760px",
                  }),
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 18,
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: "#98dfff",
            }}
          >
              {needsHeading}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: hasRaidDetails ? 30 : 38,
                fontWeight: 700,
                lineHeight: 1.1,
              }}
            >
              {needsLabel}
            </div>
          </div>

          {visibility.showComposition ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                justifyContent: "center",
                gap: "8px",
                ...(hasRaidDetails
                  ? {
                      width: "170px",
                      minHeight: 84,
                      padding: "12px 16px",
                      borderRadius: "22px",
                      background: "rgba(0,0,0,0.22)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }
                  : {}),
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 18,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: "#98dfff",
                }}
              >
                Состав
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 42,
                  fontWeight: 800,
                }}
              >
                {compositionValue}
              </div>
            </div>
          ) : null}
        </div>

        {visibility.showPartySummary ? (
          <div
            style={{
              display: "flex",
              gap: "24px",
              fontSize: hasRaidDetails ? 19 : 22,
              color: "rgba(232, 243, 255, 0.84)",
            }}
          >
            <div style={{ display: "flex" }}>Сейчас: {partySummary}</div>
          </div>
        ) : null}

        {hasRaidDetails && raidDetails ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "stretch",
              gap: "18px",
              width: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                width: "410px",
                minHeight: 112,
                padding: "14px 16px",
                borderRadius: "22px",
                background: "rgba(0,0,0,0.26)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 15,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  color: "#98dfff",
                }}
              >
                Броня
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                {raidDetails.armorCounts.map((armor) => (
                  <div
                    key={armor.key}
                    style={{
                      display: "flex",
                      padding: "8px 10px",
                      borderRadius: "999px",
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(255,255,255,0.16)",
                      fontSize: 17,
                      color: "#eef7ff",
                    }}
                  >
                    {armor.label}: {armor.count}
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                alignItems: "stretch",
                width: "610px",
                minHeight: 112,
                padding: "14px 16px",
                borderRadius: "22px",
                background: "rgba(0,0,0,0.26)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 15,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  color: "#98dfff",
                  justifyContent: "flex-start",
                }}
              >
                Нужные бафы
              </div>
              {raidDetails.missingBuffs.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "flex-start",
                    gap: "7px",
                  }}
                >
                  {raidDetails.missingBuffs.map((buff) => (
                    <div
                      key={buff.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "5px 8px 5px 5px",
                        borderRadius: "999px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.16)",
                        fontSize: 15,
                        color: "#eef7ff",
                      }}
                    >
                      <img
                        alt=""
                        src={buff.icon}
                        width={28}
                        height={28}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "999px",
                        }}
                      />
                      {buff.label}
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    padding: "8px 12px",
                    borderRadius: "999px",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.16)",
                    fontSize: 17,
                    color: "#eef7ff",
                  }}
                >
                  Все закрыты
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
