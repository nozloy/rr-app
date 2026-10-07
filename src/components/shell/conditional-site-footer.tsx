"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function ConditionalSiteFooter({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/" || pathname === "/raidcheck" || pathname?.startsWith("/dashboard") || pathname === "/kogda-raid") {
    return null;
  }

  return children;
}
