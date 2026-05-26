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
}: PartyCompositionInput): PartyNeedsSummary {
  const safeDps = Math.max(0, Math.min(3, dpsFilled));
  const tankNeeded = tankFilled ? 0 : 1;
  const healerNeeded = healerFilled ? 0 : 1;
  const dpsNeeded = Math.max(0, 3 - safeDps);

  const neededLabels = [
    ...(tankNeeded ? ["Танк"] : []),
    ...(healerNeeded ? ["Хилл"] : []),
    ...Array.from({ length: dpsNeeded }, () => "ДД"),
  ];

  return {
    neededLabels,
    tankNeeded,
    healerNeeded,
    dpsNeeded,
    slots: [
      { key: "tank", label: "Танк", filled: tankFilled },
      { key: "healer", label: "Хилл", filled: healerFilled },
      ...Array.from({ length: 3 }, (_, index) => ({
        key: `dps-${index + 1}` as const,
        label: `ДД ${index + 1}`,
        filled: index < safeDps,
      })),
    ],
  };
}
