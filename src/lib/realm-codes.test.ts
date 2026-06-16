import { readFileSync } from "node:fs";
import path from "node:path";
import {
  REALM_CODE_ENTRIES,
  REALM_CODE_TOTAL,
  type RealmRegion,
} from "@/lib/realm-codes";

function sourceRealmRows() {
  const source = readFileSync(
    path.join(process.cwd(), "scripts", "wow_realm_slugs_eu_us.md"),
    "utf8",
  );

  return source
    .split(/\r?\n/u)
    .filter((line) => /^\|\s*(EU|US)\s*\|/u.test(line));
}

function luaString(value: string) {
  return `"${value.replace(/\\/gu, "\\\\").replace(/"/gu, '\\"')}"`;
}

describe("realm codes", () => {
  it("matches the generated source row count", () => {
    expect(sourceRealmRows()).toHaveLength(494);
    expect(REALM_CODE_TOTAL).toBe(494);
    expect(REALM_CODE_ENTRIES).toHaveLength(494);
  });

  it("keeps realm codes unique within each region", () => {
    for (const region of ["eu", "us"] satisfies RealmRegion[]) {
      const entries = REALM_CODE_ENTRIES.filter((entry) => entry.region === region);

      expect(new Set(entries.map((entry) => entry.code)).size).toBe(entries.length);
      expect(new Set(entries.map((entry) => entry.slug)).size).toBe(entries.length);
    }
  });

  it("keeps generated TypeScript and Lua realm entries in sync", () => {
    const lua = readFileSync(
      path.join(process.cwd(), "addons", "RaidReminder", "RealmCodes.lua"),
      "utf8",
    );

    for (const entry of REALM_CODE_ENTRIES) {
      const value = `{ ${luaString(entry.code)}, ${luaString(entry.slug)}, ${luaString(entry.realmName)} }`;
      expect(lua).toContain(value);
    }
  });

  it("includes localized Russian realm aliases for addon-side lookup", () => {
    const lua = readFileSync(
      path.join(process.cwd(), "addons", "RaidReminder", "RealmCodes.lua"),
      "utf8",
    );
    const entry = REALM_CODE_ENTRIES.find(
      (item) => item.region === "eu" && item.slug === "howling-fjord",
    );

    expect(entry).toBeDefined();

    const value = `{ ${luaString(entry!.code)}, ${luaString(entry!.slug)}, ${luaString(entry!.realmName)} }`;
    expect(lua).toContain(`[${luaString("Ревущий фьорд")}] = ${value}`);
    expect(lua).toContain(`[${luaString("Ревущийфьорд")}] = ${value}`);
  });
});
