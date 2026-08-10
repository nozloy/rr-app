import { describe, expect, it } from "vitest";
import { getProfileTab } from "@/lib/profile-tabs";

describe("getProfileTab", () => {
  it("opens events by default and supports the legacy events value", () => {
    expect(getProfileTab(undefined)).toBe("events");
    expect(getProfileTab("my-events")).toBe("events");
  });

  it("opens characters for the current and legacy character values", () => {
    expect(getProfileTab("characters")).toBe("characters");
    expect(getProfileTab("overview")).toBe("characters");
  });
});
