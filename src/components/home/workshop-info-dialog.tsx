"use client";

import Link from "next/link";
import { XIcon } from "@phosphor-icons/react";
import { getWorkshopCopy } from "@/components/home/workshop-copy";
import { LoginButton } from "@/components/login-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { t, type AppLocale } from "@/lib/i18n";

export type WorkshopInfo = "stats" | "community" | "about";

export function WorkshopInfoDialog({
  section,
  open,
  onClose,
  locale,
  envReady,
  signedIn,
}: {
  section: WorkshopInfo;
  open: boolean;
  onClose: () => void;
  locale: AppLocale;
  envReady: boolean;
  signedIn: boolean;
}) {
  const copy = getWorkshopCopy(locale);
  const activeSection = section;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="workshop-overlay" showCloseButton={false}>
        <DialogClose asChild>
          <Button variant="ghost" size="icon" className="absolute right-2 top-2" aria-label={t(locale, "common.close")}>
            <XIcon data-icon="inline-start" aria-hidden="true" />
          </Button>
        </DialogClose>
        <DialogHeader>
          <DialogTitle>{copy[activeSection]}</DialogTitle>
          <DialogDescription>{copy[`${activeSection}Description`]}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-3">
          {activeSection === "stats" ? (
            signedIn ? (
              <Button asChild variant="outline"><Link href="/profile" onNavigate={onClose}>{copy.profile}</Link></Button>
            ) : (
              <LoginButton disabled={!envReady} label={copy.login} variant="outline" title={!envReady ? copy.loginUnavailable : undefined} />
            )
          ) : activeSection === "community" ? (
            <>
              <Button asChild variant="outline"><Link href="/events" onNavigate={onClose}>{copy.openEvents}</Link></Button>
              {signedIn && <Button asChild variant="outline"><Link href="/events/new" onNavigate={onClose}>{copy.createEvent}</Link></Button>}
            </>
          ) : (
            <Button asChild variant="outline"><Link href="/raidcheck" onNavigate={onClose}>{copy.check}</Link></Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
