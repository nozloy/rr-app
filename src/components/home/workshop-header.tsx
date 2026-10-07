"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GearSixIcon, ListIcon, SignInIcon, UserCircleIcon } from "@phosphor-icons/react";
import { getWorkshopCopy } from "@/components/home/workshop-copy";
import { WorkshopInfoDialog, type WorkshopInfo } from "@/components/home/workshop-info-dialog";
import { LoginButton } from "@/components/login-button";
import { LogoutButton } from "@/components/logout-button";
import type { AppHeaderUser } from "@/components/shell/app-header-client";
import { getAccountMenuItems } from "@/components/shell/nav-items";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { t, type AppLocale } from "@/lib/i18n";

export function WorkshopHeader({ locale, envReady, user }: {
  locale: AppLocale;
  envReady: boolean;
  user: AppHeaderUser | null;
}) {
  const copy = getWorkshopCopy(locale);
  const pathname = usePathname();
  const [info, setInfo] = useState<WorkshopInfo>("about");
  const [infoOpen, setInfoOpen] = useState(false);
  function openInfo(section: WorkshopInfo) {
    setInfo(section);
    setInfoOpen(true);
  }
  const links = [
    { label: copy.home, href: "/", active: pathname === "/" },
    { label: copy.raids, href: "/events", active: pathname === "/events" },
    { label: copy.tools, href: pathname === "/" ? "#tools" : "/#tools", active: pathname === "/raidcheck" },
  ];
  const sections = ["stats", "community", "about"] as const;

  return (
    <>
      <header className="workshop-header">
        <Link href="/" className="workshop-brand" aria-label={copy.title}>
          <GearSixIcon weight="duotone" className="workshop-brand-art" aria-hidden="true" />
        </Link>
        <nav className="workshop-nav" aria-label={copy.navigation}>
          {links.map((link) => <Link href={link.href} key={link.href} aria-current={link.active ? "page" : undefined}>{link.label}</Link>)}
          {sections.map((section) => <Button key={section} type="button" variant="ghost" onClick={() => openInfo(section)}>{copy[section]}</Button>)}
        </nav>
        <div className="workshop-header-actions">
          <p className="workshop-status"><span aria-hidden="true" />{copy.status}</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="workshop-mobile-menu" variant="ghost" size="icon" aria-label={copy.navigation}>
                <ListIcon data-icon="inline-start" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="workshop-overlay">
              <DropdownMenuLabel>{copy.navigation}</DropdownMenuLabel>
              <DropdownMenuGroup>
                {links.map((link) => <DropdownMenuItem key={link.href} asChild><Link href={link.href}>{link.label}</Link></DropdownMenuItem>)}
                {sections.map((section) => <DropdownMenuItem key={section} onSelect={() => openInfo(section)}>{copy[section]}</DropdownMenuItem>)}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="workshop-login" aria-label={t(locale, "header.accountMenuLabel")}>
                  <UserCircleIcon weight="duotone" data-icon="inline-start" aria-hidden="true" />
                  <span className="truncate">{user.displayName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="workshop-overlay" align="end">
                <DropdownMenuLabel>{user.displayName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {getAccountMenuItems(locale, user.isAdmin).map((item) => <DropdownMenuItem key={item.href} asChild><Link href={item.href}>{item.label}</Link></DropdownMenuItem>)}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <LogoutButton variant="ghost" className="w-full justify-start" size="sm">{t(locale, "header.logout")}</LogoutButton>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="workshop-login-wrap">
              <SignInIcon weight="duotone" aria-hidden="true" />
              <LoginButton className="workshop-login" variant="ghost" disabled={!envReady} label={copy.login} title={!envReady ? copy.loginUnavailable : t(locale, "header.signInWithBattleNet")} />
            </div>
          )}
        </div>
      </header>
      <WorkshopInfoDialog section={info} open={infoOpen} onClose={() => setInfoOpen(false)} locale={locale} envReady={envReady} signedIn={!!user} />
    </>
  );
}
