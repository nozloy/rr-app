"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { useAppLocale } from "@/components/shell/locale-provider";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

type CopyImageButtonProps = {
  imageUrl: string;
};

export function CopyImageButton({ imageUrl }: CopyImageButtonProps) {
  const locale = useAppLocale();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  async function handleCopy() {
    try {
      const response = await fetch(imageUrl, { cache: "no-store" });
      const blob = await response.blob();

      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);

      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleCopy} type="button">
        <Copy className="size-4" aria-hidden="true" />
        {t(locale, "banners.copyPng")}
      </Button>
      {status === "success" ? (
        <span className="text-sm text-[#dff9e7]" role="status">
          {t(locale, "banners.copySuccess")}
        </span>
      ) : null}
      {status === "error" ? (
        <span className="text-sm text-[#fecaca]" role="status">
          {t(locale, "banners.copyError")}
        </span>
      ) : null}
    </div>
  );
}
