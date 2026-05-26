"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

type CopyImageButtonProps = {
  imageUrl: string;
};

export function CopyImageButton({ imageUrl }: CopyImageButtonProps) {
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
        Скопировать PNG
      </Button>
      {status === "success" ? (
        <span className="text-sm text-[#dff9e7]" role="status">
          Изображение скопировано.
        </span>
      ) : null}
      {status === "error" ? (
        <span className="text-sm text-[#fecaca]" role="status">
          Браузер не дал записать PNG. Используйте скачивание.
        </span>
      ) : null}
    </div>
  );
}
