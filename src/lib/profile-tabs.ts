import type { ProfileTab } from "@/components/profile/profile-page";

export function getProfileTab(value: string | string[] | undefined): ProfileTab {
  const tab = Array.isArray(value) ? value[0] : value;

  return tab === "characters" || tab === "overview" ? "characters" : "events";
}
