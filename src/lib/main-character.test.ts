import { describe, expect, it } from "vitest";
import {
  getPreferredCharacter,
  orderCharactersByPreference,
} from "@/lib/main-character";

const characters = [
  { id: "low", isActive: true, itemLevel: 620, name: "Low" },
  { id: "high", isActive: true, itemLevel: 680, name: "High" },
  { id: "inactive", isActive: false, itemLevel: 700, name: "Inactive" },
];

describe("main character preference", () => {
  it("uses the strongest active character as fallback", () => {
    expect(getPreferredCharacter(characters)?.id).toBe("high");
  });

  it("uses the selected active character before item level", () => {
    expect(getPreferredCharacter(characters, "low")?.id).toBe("low");
    expect(orderCharactersByPreference(characters, "low")[0]?.id).toBe("low");
  });

  it("ignores an inactive selected character", () => {
    expect(getPreferredCharacter(characters, "inactive")?.id).toBe("high");
  });
});
