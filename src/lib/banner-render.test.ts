import { getBannerRenderVisibility } from "@/lib/banner-render";

describe("banner render visibility", () => {
  it("hides recruitment and gear metadata for legacy raid banners", () => {
    expect(getBannerRenderVisibility("legacyRaid")).toEqual({
      showCharacterMeta: false,
      showComposition: false,
      showPartySummary: false,
      showRaidDetails: false,
    });
  });

  it("keeps recruitment metadata for current raid banners", () => {
    expect(getBannerRenderVisibility("currentRaid")).toEqual({
      showCharacterMeta: true,
      showComposition: true,
      showPartySummary: true,
      showRaidDetails: true,
    });
  });
});
