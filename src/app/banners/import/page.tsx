import Link from "next/link";
import { ClipboardPaste, ScanLine, SlidersHorizontal } from "lucide-react";
import { ImportBannerForm } from "@/app/banners/import/import-banner-form";
import { AppHeader } from "@/components/shell/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { currentSeasonDungeons } from "@/lib/dungeons";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import type { PageSearchParams } from "@/lib/banner-params";

type ImportBannerPageProps = {
  searchParams: Promise<PageSearchParams>;
};

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getImportSteps(locale: "ru" | "en") {
  return locale === "ru"
    ? [
        {
          title: "Вставьте строку",
          text: "Подходит для быстрых Discord-постов и ручного копирования из игры.",
          icon: ClipboardPaste,
        },
        {
          title: "Сканируйте QR",
          text: "Удобно, если аддон открыт на другом экране или у рейд-лида.",
          icon: ScanLine,
        },
        {
          title: "Проверьте черновик",
          text: "Перед PNG можно поправить роль, ключ, ilvl и недостающие бафы.",
          icon: SlidersHorizontal,
        },
      ]
    : [
        {
          title: "Paste export",
          text: "Great for fast Discord posts and manual in-game copy.",
          icon: ClipboardPaste,
        },
        {
          title: "Scan QR",
          text: "Useful when addon is open on another display or at raid lead.",
          icon: ScanLine,
        },
        {
          title: "Review draft",
          text: "Before PNG, adjust role, key level, ilvl, and missing buffs.",
          icon: SlidersHorizontal,
        },
      ];
}

export default async function ImportBannerPage({
  searchParams,
}: ImportBannerPageProps) {
  const locale = await getRequestLocale();
  const importSteps = getImportSteps(locale);
  const query = await searchParams;
  const initialExportString = getFirstParam(query.data) ?? "";

  return (
    <>
      <AppHeader />
      <main className="app-shell space-y-6 py-6">
        <Card className="surface-card rounded-2xl">
          <CardContent className="p-6 md:p-8">
            <div className="panel-heading">
              <div className="max-w-3xl space-y-4">
                <div className="eyebrow">Addon import</div>
                <h1 className="section-title">{t(locale, "banners.importTitle")}</h1>
                <p className="lead-copy m-0 max-w-3xl">
                  {locale === "ru"
                    ? "Вставьте RR1?... или отсканируйте QR RRQ1?... из аддона. Экспорт станет редактируемым черновиком без Battle.net-логина."
                    : "Paste RR1?... or scan RRQ1?... from the addon. Export becomes an editable draft without Battle.net login."}
                </p>
              </div>
              <div className="action-row">
                <Button asChild variant="outline">
                  <Link href="/">{t(locale, "common.home")}</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/banners/new">
                    {locale === "ru" ? "Конструктор с логином" : "Builder with login"}
                  </Link>
                </Button>
              </div>
            </div>

            <div className="method-grid mt-8">
              {importSteps.map((step) => {
                const Icon = step.icon;

                return (
                  <Card className="quiet-card method-card" key={step.title}>
                    <Icon className="background-icon" aria-hidden="true" />
                    <CardContent className="p-5">
                      <h3 className="text-base font-semibold tracking-[-0.02em]">
                        {step.title}
                      </h3>
                      <p className="subtle mt-3 mb-0 leading-7">{step.text}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <ImportBannerForm
          dungeons={currentSeasonDungeons}
          initialExportString={initialExportString}
          locale={locale}
        />
      </main>
    </>
  );
}
