import { t, type AppLocale } from "@/lib/i18n";

export type PartySlot = {
  key: "tank" | "healer" | `dps-${number}`;
  label: string;
  filled: boolean;
};

export type PartyCompositionInput = {
  tankFilled: boolean;
  healerFilled: boolean;
  dpsFilled: number;
};

export type PartyNeedsSummary = {
  neededLabels: string[];
  slots: PartySlot[];
  tankNeeded: number;
  healerNeeded: number;
  dpsNeeded: number;
};

export function getPartyNeeds({
  tankFilled,
  healerFilled,
  dpsFilled,
}: PartyCompositionInput, locale: AppLocale = "ru"): PartyNeedsSummary {
  const safeDps = Math.max(0, Math.min(3, dpsFilled));
  const tankNeeded = tankFilled ? 0 : 1;
  const healerNeeded = healerFilled ? 0 : 1;
  const dpsNeeded = Math.max(0, 3 - safeDps);
  const tankLabel = t(locale, "party.tank");
  const healerLabel = t(locale, "party.healer");
  const damageLabel = t(locale, "party.damage");

  const neededLabels = [
    ...(tankNeeded ? [tankLabel] : []),
    ...(healerNeeded ? [healerLabel] : []),
    ...Array.from({ length: dpsNeeded }, () => damageLabel),
  ];

  return {
    neededLabels,
    tankNeeded,
    healerNeeded,
    dpsNeeded,
    slots: [
      { key: "tank", label: tankLabel, filled: tankFilled },
      { key: "healer", label: healerLabel, filled: healerFilled },
      ...Array.from({ length: 3 }, (_, index) => ({
        key: `dps-${index + 1}` as const,
        label: `${damageLabel} ${index + 1}`,
        filled: index < safeDps,
      })),
    ],
  };
}
