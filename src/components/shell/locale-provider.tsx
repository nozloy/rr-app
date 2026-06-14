"use client";

import React, { createContext, useContext } from "react";
import type { AppLocale } from "@/lib/i18n";

type LocaleContextValue = {
  locale: AppLocale;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: AppLocale;
}) {
  return (
    <LocaleContext.Provider value={{ locale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useAppLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useAppLocale must be used within LocaleProvider.");
  }

  return context.locale;
}
