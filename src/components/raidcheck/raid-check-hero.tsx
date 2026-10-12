import Image from "next/image";
import Link from "next/link";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { t, type AppLocale } from "@/lib/i18n";

export function RaidCheckHero({ locale }: { locale: AppLocale }) {
  return (
    <section className="raid-workshop-hero" aria-labelledby="raidcheck-title">
      <link rel="preload" as="image" href="/raidcheck/workshop/title-sign.webp" fetchPriority="high" />
      <div className="raid-workshop-sign" data-locale={locale}>
        {/* Keep decorative artwork out of browser image toolbars. */}
        <div className="raid-workshop-sign-art" aria-hidden="true" />
        <h1 className={locale === "ru" ? "sr-only" : "raid-workshop-title-en"} id="raidcheck-title">{t(locale, "raidcheck.title")}</h1>
        <p className="raid-workshop-subtitle">{t(locale, "raidcheck.heroCopy")}</p>
      </div>
      <Card className="raid-workshop-addon raid-workshop-metal">
        <CardHeader className="raid-workshop-addon-heading">
          <CardTitle>{t(locale, "raidcheck.addonDownloadTitle")}</CardTitle>
          <CardDescription>
            {t(locale, "raidcheck.addonDownloadCopy")}<br />
            {locale === "ru" ? "и всегда проверяйте рейды актуальной версией." : "and always check raids with the latest version."}
          </CardDescription>
        </CardHeader>
        <CardContent className="raid-workshop-addon-content">
          <Button asChild className="raid-workshop-download" size="lg">
            <Link href="https://www.curseforge.com/wow/addons/raidreminder" rel="noreferrer" target="_blank">
              <DownloadSimpleIcon data-icon="inline-start" aria-hidden="true" />
              {locale === "ru" ? "Скачать аддон" : "Download addon"}
            </Link>
          </Button>
        </CardContent>
        <Image className="raid-workshop-goblin" src="/raidcheck/workshop/addon-goblin.webp" alt="" width={1254} height={1254} sizes="(max-width: 700px) 140px, 320px" quality={95} priority />
      </Card>
    </section>
  );
}
