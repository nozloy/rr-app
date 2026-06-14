"use client";

import React, { useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { APP_LOCALE_COOKIE, type AppLocale } from "@/lib/i18n";
import { useAppLocale } from "@/components/shell/locale-provider";
import { t } from "@/lib/i18n";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 5;

function buildLocaleCookie(locale: AppLocale) {
  return `${APP_LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function reloadWindow() {
  window.location.reload();
}

export const localeSwitchRuntime = {
  reload: reloadWindow,
};

export function LocaleSwitch() {
  const locale = useAppLocale();
  const checked = locale === "en";
  const label = useMemo(
    () =>
      locale === "en"
        ? t(locale, "header.switchToRussian")
        : t(locale, "header.switchToEnglish"),
    [locale],
  );

  return (
    <label className="app-locale-switch">
      <span className="app-locale-switch-label">RU</span>
      <Switch
        aria-label={label}
        checked={checked}
        className="app-locale-switch-control"
        onCheckedChange={(nextChecked) => {
          const nextLocale: AppLocale = nextChecked ? "en" : "ru";
          document.cookie = buildLocaleCookie(nextLocale);
          localeSwitchRuntime.reload();
        }}
        size="default"
      />
      <span className="app-locale-switch-label">EN</span>
    </label>
  );
}
