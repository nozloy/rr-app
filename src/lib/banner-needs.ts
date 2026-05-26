export type UtilityAvailabilityInput = {
  hasBloodlust: boolean;
  hasBattleRes: boolean;
};

export function getUtilityNeedLabels({
  hasBloodlust,
  hasBattleRes,
}: UtilityAvailabilityInput) {
  return [
    ...(!hasBloodlust ? ["БЛ"] : []),
    ...(!hasBattleRes ? ["БР"] : []),
  ];
}

export function getGroupedNeedLabels(
  roleNeedLabels: string[],
  utilityAvailability: UtilityAvailabilityInput,
) {
  const dpsNeeded = roleNeedLabels.filter((label) => label === "ДД").length;
  const labels = roleNeedLabels.filter((label) => label !== "ДД");

  if (dpsNeeded > 0) {
    labels.push(dpsNeeded > 1 ? `ДД x${dpsNeeded}` : "ДД");
  }

  labels.push(...getUtilityNeedLabels(utilityAvailability));

  return labels;
}

export function getBannerNeedsLabel(
  roleNeedLabels: string[],
  utilityAvailability: UtilityAvailabilityInput,
) {
  const labels = getGroupedNeedLabels(roleNeedLabels, utilityAvailability);

  return labels.length > 0 ? labels.join(" • ") : "Группа собрана";
}
