import type { ReactNode } from "react";
import { BrandLockup } from "@/components/shell/brand-lockup";
import { cn } from "@/lib/utils";

export type ShellNavItem = {
  label: string;
  href: string;
  isActive?: boolean;
};

type SiteTopbarProps = {
  action?: ReactNode;
  brandHref?: string;
  className?: string;
  navClassName?: string;
  navItems: ShellNavItem[];
};

export function SiteTopbar({
  action,
  brandHref = "#top",
  className,
  navClassName,
  navItems,
}: SiteTopbarProps) {
  return (
    <header className={cn("home-topbar", className)}>
      <BrandLockup href={brandHref} />

      <nav className={cn("home-nav", navClassName)} aria-label="Основная навигация">
        {navItems.map((item) => (
          <a
            className={item.isActive ? "is-active" : undefined}
            href={item.href}
            key={`${item.label}-${item.href}`}
          >
            {item.label}
          </a>
        ))}
      </nav>

      {action}
    </header>
  );
}
