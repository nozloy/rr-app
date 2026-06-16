import { existsSync } from "node:fs";
import path from "node:path";
import { allDungeonInstances } from "@/lib/dungeons";
import { describe, expect, it } from "vitest";

describe("dungeons", () => {
  it("keeps dungeon banner art in ImageResponse-supported formats", () => {
    expect(new Set(allDungeonInstances.map((dungeon) => dungeon.slug)).size).toBe(
      allDungeonInstances.length,
    );

    for (const dungeon of allDungeonInstances) {
      const assetPath = path.join(process.cwd(), "public", dungeon.artPath);

      expect(existsSync(assetPath)).toBe(true);
      expect(dungeon.artPath).toMatch(/_styled_16x9\.(jpg|png)$/);
    }
  });
});
