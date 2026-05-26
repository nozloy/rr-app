import Link from "next/link";
import { ClipboardPaste, ScanLine, SlidersHorizontal } from "lucide-react";
import { ImportBannerForm } from "@/app/banners/import/import-banner-form";
import { AppHeader } from "@/components/shell/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { currentSeasonDungeons } from "@/lib/dungeons";
import type { PageSearchParams } from "@/lib/banner-params";

type ImportBannerPageProps = {
  searchParams: Promise<PageSearchParams>;
};

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const importSteps = [
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
];

export default async function ImportBannerPage({
  searchParams,
}: ImportBannerPageProps) {
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
                <h1 className="section-title">Баннер из строки RaidReminder</h1>
                <p className="lead-copy m-0 max-w-3xl">
                  Вставьте <code className="code-inline">RR1?...</code> или
                  отсканируйте QR <code className="code-inline">RRQ1?...</code> из
                  аддона. Экспорт станет редактируемым черновиком без Battle.net-логина.
                </p>
              </div>
              <div className="action-row">
                <Button asChild variant="outline">
                  <Link href="/">На главную</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/banners/new">Конструктор с логином</Link>
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
        />
      </main>
    </>
  );
}
