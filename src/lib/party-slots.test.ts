import { getPartyNeeds } from "@/lib/party-slots";

describe("getPartyNeeds", () => {
  it("marks healer and two dps as needed when tank and one dps are filled", () => {
    const result = getPartyNeeds({
      tankFilled: true,
      healerFilled: false,
      dpsFilled: 1,
    });

    expect(result.tankNeeded).toBe(0);
    expect(result.healerNeeded).toBe(1);
    expect(result.dpsNeeded).toBe(2);
    expect(result.neededLabels).toEqual(["Хилл", "ДД", "ДД"]);
  });

  it("returns no needed roles for a full party", () => {
    const result = getPartyNeeds({
      tankFilled: true,
      healerFilled: true,
      dpsFilled: 3,
    });

    expect(result.neededLabels).toEqual([]);
    expect(result.slots.every((slot) => slot.filled)).toBe(true);
  });

  it("clamps invalid dps values to valid boundaries", () => {
    expect(
      getPartyNeeds({
        tankFilled: false,
        healerFilled: false,
        dpsFilled: -1,
      }).dpsNeeded,
    ).toBe(3);

    expect(
      getPartyNeeds({
        tankFilled: false,
        healerFilled: false,
        dpsFilled: 9,
      }).dpsNeeded,
    ).toBe(0);
  });
});
