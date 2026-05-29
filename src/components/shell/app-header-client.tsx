"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  Menu,
} from "lucide-react";
import { LoginButton } from "@/components/login-button";
import { LogoutButton } from "@/components/logout-button";
import { BrandLockup } from "@/components/shell/brand-lockup";
import {
  accountMenuItems,
  authenticatedHeaderNavItems,
  headerNavItems,
} from "@/components/shell/nav-items";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type AppHeaderUser = {
  avatarUrl?: string | null;
  displayName: string;
};

type AppHeaderClientProps = {
  className?: string;
  envReady: boolean;
  user?: AppHeaderUser | null;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getInitial(value: string) {
  return value.trim().slice(0, 1).toUpperCase() || "R";
}

function HeaderAvatar({ user }: { user: AppHeaderUser }) {
  return (
    <span className="app-header-avatar" aria-hidden="true">
      {user.avatarUrl ? (
        <Image
          src={user.avatarUrl}
          alt=""
          width={36}
          height={36}
          unoptimized
        />
      ) : (
        getInitial(user.displayName)
      )}
    </span>
  );
}

export function AppHeaderClient({
  className,
  envReady,
  user,
}: AppHeaderClientProps) {
  const pathname = usePathname() ?? "/";
  const mainNavItems = user
    ? [...headerNavItems, ...authenticatedHeaderNavItems]
    : headerNavItems;

  return (
    <header className={cn("app-header", className)}>
      <BrandLockup
        href="/"
        className="app-header-brand"
        markClassName="app-header-brand-mark"
        textClassName="app-header-brand-text"
      />

      <nav className="app-header-nav" aria-label="Основная навигация">
        {mainNavItems.map((item) => (
          <Link
            className={cn(isActivePath(pathname, item.href) && "is-active")}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="app-header-actions">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Открыть навигацию"
              className="app-header-mobile-trigger"
              size="icon"
              type="button"
              variant="outline"
            >
              <Menu className="size-5" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="app-header-dropdown app-header-mobile-menu"
          >
            <DropdownMenuLabel>Навигация</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {mainNavItems.map((item) => {
              const Icon = item.icon;

              return (
                <DropdownMenuItem asChild key={item.href}>
                  <Link
                    className={cn(
                      "app-header-dropdown-link",
                      isActivePath(pathname, item.href) && "is-active",
                    )}
                    href={item.href}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {user ? (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="app-header-account-trigger"
                  type="button"
                  variant="outline"
                >
                  <HeaderAvatar user={user} />
                  <span className="app-header-account-name">
                    {user.displayName}
                  </span>
                  <ChevronDown className="size-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="app-header-dropdown app-header-account-menu"
              >
                <DropdownMenuLabel className="app-header-account-label">
                  <span>Battle.net</span>
                  <strong>{user.displayName}</strong>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {accountMenuItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <DropdownMenuItem asChild key={item.href}>
                      <Link
                        className={cn(
                          "app-header-dropdown-link",
                          isActivePath(pathname, item.href) && "is-active",
                        )}
                        href={item.href}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <div className="app-header-menu-action">
                  <LogoutButton
                    className="app-header-menu-logout"
                    size="sm"
                    variant="ghost"
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                    Выйти
                  </LogoutButton>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <LoginButton
            className="app-header-login-button"
            disabled={!envReady}
            size="lg"
          />
        )}
      </div>
    </header>
  );
}
