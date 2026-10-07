"use client";

import { useLinkStatus } from "next/link";
import { CaretRightIcon, CircleNotchIcon } from "@phosphor-icons/react";
import type { AppLocale } from "@/lib/i18n";

export function WorkshopActionContent({ label, locale }: { label: string; locale: AppLocale }) {
  const { pending } = useLinkStatus();

  return (
    <>
      <span className="workshop-action-label" role="status">
        {pending ? (locale === "ru" ? "Открываем…" : "Opening…") : label}
      </span>
      {pending ? (
        <span className="workshop-action-chevron" aria-hidden="true">
          <CircleNotchIcon className="block h-auto w-full animate-spin motion-reduce:animate-none" />
        </span>
      ) : (
        <CaretRightIcon className="workshop-action-chevron" weight="bold" aria-hidden="true" />
      )}
    </>
  );
}
