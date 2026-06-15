"use client";

import Image from "next/image";
import { ExternalLink, Loader2 } from "lucide-react";
import { RaidCheckClassIcon } from "@/components/raidcheck/raid-check-class-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { t } from "@/lib/i18n";
import { localizeRaidBossName } from "@/lib/raid-boss-localization";
import type { RaidCheckCharacterResult } from "@/lib/raid-check";
import type {
  WarcraftLogsCharacterDetailsResult,
  WarcraftLogsDifficultySummary,
  WarcraftLogsGearSummary,
} from "@/lib/warcraftlogs-core";

function formatParse(value: number | null) {
  return value === null ? "—" : value.toFixed(value % 1 === 0 ? 0 : 1);
}

function formatFetchedAt(value: string | null, locale: "ru" | "en") {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ParseCard({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="raidcheck-sheet-stat">
      <span>{label}</span>
      <strong>{formatParse(value)}</strong>
    </div>
  );
}

function RankingSection({
  emptyLabel,
  locale,
  summary,
  title,
}: {
  emptyLabel: string;
  locale: "ru" | "en";
  summary: WarcraftLogsDifficultySummary | null;
  title: string;
}) {
  return (
    <section className="raidcheck-sheet-section">
      <div className="raidcheck-sheet-section-heading">
        <h4>{title}</h4>
        <span>{formatParse(summary?.averageParse ?? null)}</span>
      </div>
      {summary?.encounters.length ? (
        <div className="raidcheck-sheet-ranking-list">
          {summary.encounters.map((encounter) => (
            <div
              className="raidcheck-sheet-ranking-row"
              key={`${summary.difficulty}-${encounter.name}`}
            >
              <span>
                <strong>{localizeRaidBossName({ name: encounter.name }, locale)}</strong>
                {encounter.spec ? <small>{encounter.spec}</small> : null}
              </span>
              <b>{formatParse(encounter.parse)}</b>
            </div>
          ))}
        </div>
      ) : (
        <p className="raidcheck-sheet-muted">{emptyLabel}</p>
      )}
    </section>
  );
}

function GearSection({
  gear,
  locale,
}: {
  gear: WarcraftLogsGearSummary | null;
  locale: "ru" | "en";
}) {
  if (!gear?.items.length) {
    return (
      <section className="raidcheck-sheet-section">
        <div className="raidcheck-sheet-section-heading">
          <h4>{t(locale, "raidcheck.gear")}</h4>
          <span>{gear?.itemLevel ?? "—"}</span>
        </div>
        <p className="raidcheck-sheet-muted">{t(locale, "raidcheck.noGear")}</p>
      </section>
    );
  }

  return (
    <section className="raidcheck-sheet-section">
      <div className="raidcheck-sheet-section-heading">
        <h4>{t(locale, "raidcheck.gear")}</h4>
        <span>ilvl {gear.itemLevel ?? "—"}</span>
      </div>
      <div className="raidcheck-sheet-gear-list">
        {gear.items.slice(0, 16).map((item) => (
          <div className="raidcheck-sheet-gear-row" key={`${item.slot}-${item.name}`}>
            <span>
              <strong>{item.name}</strong>
              <small>{item.slot ?? "—"}</small>
            </span>
            <b>{item.itemLevel ?? "—"}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function DetailsContent({
  details,
  isLoading,
  locale,
}: {
  details: WarcraftLogsCharacterDetailsResult | null;
  isLoading: boolean;
  locale: "ru" | "en";
}) {
  if (isLoading && !details) {
    return (
      <div className="raidcheck-sheet-state">
        <Loader2 className="size-7 animate-spin" aria-hidden="true" />
        <span>{t(locale, "raidcheck.logsLoading")}</span>
      </div>
    );
  }

  if (!details) {
    return null;
  }

  if (details.status === "error") {
    return (
      <div className="raidcheck-sheet-state" data-tone="error">
        <strong>{t(locale, "raidcheck.logsError")}</strong>
        <span>{details.message ?? t(locale, "errors.unknown")}</span>
      </div>
    );
  }

  if (details.status === "not_found") {
    return (
      <div className="raidcheck-sheet-state">
        <strong>{t(locale, "raidcheck.noPublicLogs")}</strong>
        <span>{details.message ?? t(locale, "raidcheck.noPublicLogsHint")}</span>
      </div>
    );
  }

  return (
    <div className="raidcheck-sheet-content">
      {details.message ? (
        <p className="status-note warn">{details.message}</p>
      ) : null}
      <div className="raidcheck-sheet-stats">
        <ParseCard
          label={t(locale, "raidcheck.averageParse")}
          value={details.summary.averageParse}
        />
        <ParseCard
          label={t(locale, "raidcheck.bestParse")}
          value={details.summary.bestParse}
        />
      </div>
      <RankingSection
        emptyLabel={t(locale, "raidcheck.noRankings")}
        locale={locale}
        summary={details.rankings.heroic}
        title={t(locale, "raidcheck.heroicLogs")}
      />
      <RankingSection
        emptyLabel={t(locale, "raidcheck.noRankings")}
        locale={locale}
        summary={details.rankings.mythic}
        title={t(locale, "raidcheck.mythicLogs")}
      />
      <GearSection gear={details.gear} locale={locale} />
    </div>
  );
}

export function RaidCheckCharacterSheet({
  details,
  isLoading,
  locale,
  onOpenChange,
  open,
  row,
}: {
  details: WarcraftLogsCharacterDetailsResult | null;
  isLoading: boolean;
  locale: "ru" | "en";
  onOpenChange: (open: boolean) => void;
  open: boolean;
  row: RaidCheckCharacterResult | null;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="raidcheck-sheet">
        <SheetHeader className="raidcheck-sheet-header">
          <div className="raidcheck-sheet-character">
            <span className="raidcheck-character-mark" aria-hidden="true">
              {row?.avatarUrl ? (
                <Image alt="" height={40} src={row.avatarUrl} width={40} />
              ) : (
                row?.name.slice(0, 1).toUpperCase() ?? "?"
              )}
            </span>
            <span>
              <SheetTitle>{row?.name ?? t(locale, "raidcheck.character")}</SheetTitle>
              <SheetDescription>
                {row ? `${row.realm} · ${row.serverRegion.toUpperCase()}` : "—"}
              </SheetDescription>
            </span>
            {row ? (
              <RaidCheckClassIcon classFile={row.classFile} locale={locale} />
            ) : null}
          </div>
          <div className="raidcheck-sheet-actions">
            {details?.profileUrl ? (
              <Button asChild variant="outline">
                <a href={details.profileUrl} rel="noreferrer" target="_blank">
                  <ExternalLink className="size-4" aria-hidden="true" />
                  Warcraft Logs
                </a>
              </Button>
            ) : null}
            <Button disabled variant="outline">
              {t(locale, "raidcheck.refreshLogs")}
              <Badge variant="arcane">{t(locale, "common.premium")}</Badge>
            </Button>
          </div>
          <p className="raidcheck-sheet-cache-note">
            {t(locale, "raidcheck.logsCacheNote", {
              date: formatFetchedAt(details?.lastFetchedAt ?? null, locale),
            })}
          </p>
        </SheetHeader>
        <ScrollArea className="raidcheck-sheet-scroll">
          <DetailsContent details={details} isLoading={isLoading} locale={locale} />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
