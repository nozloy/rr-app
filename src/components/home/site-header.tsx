import { AppHeader } from "@/components/shell/app-header";

type SiteHeaderProps = {
  envReady: boolean;
};

export function SiteHeader({ envReady }: SiteHeaderProps) {
  void envReady;

  return <AppHeader />;
}
