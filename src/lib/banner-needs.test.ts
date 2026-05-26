import { getBannerNeedsLabel, getGroupedNeedLabels } from "@/lib/banner-needs";

describe("banner needs", () => {
  it("adds utility needs when bloodlust or battle res are missing", () => {
    expect(
      getGroupedNeedLabels(["Хилл", "ДД", "ДД"], {
        hasBloodlust: false,
        hasBattleRes: false,
      }),
    ).toEqual(["Хилл", "ДД x2", "БЛ", "БР"]);
  });

  it("does not add utility needs when both are already covered", () => {
    expect(
      getBannerNeedsLabel([], {
        hasBloodlust: true,
        hasBattleRes: true,
      }),
    ).toBe("Группа собрана");
  });
});
