"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  Copy,
  ExternalLink,
  Loader2,
  MoreVertical,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { RaidCheckCharacterSheetDetails } from "@/actions/raid-check";
import { RaidCheckClassIcon } from "@/components/raidcheck/raid-check-class-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  WarcraftLogsDifficultySummary,
  WarcraftLogsEncounterParse,
} from "@/lib/warcraftlogs-core";

type DifficultyTab = "all" | "heroic" | "mythic";
type SortMode = "best" | "worst" | "name";

const difficultyTabs: DifficultyTab[] = ["all", "heroic", "mythic"];

function formatParse(value: number | null) {
  return value === null ? "—" : value.toFixed(value % 1 === 0 ? 0 : 1);
}

function formatScore(value: number | null) {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function formatRank(value: number | null, locale: "ru" | "en") {
  if (!value) {
    return "—";
  }

  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US").format(value);
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

function isUpdatedToday(value: string | null) {
  if (!value) {
    return false;
  }

  return Date.now() - new Date(value).getTime() < 24 * 60 * 60 * 1000;
}

function getParseTone(value: number | null) {
  if (value === null) {
    return "poor";
  }

  if (value >= 99) {
    return "artifact";
  }

  if (value >= 95) {
    return "legendary";
  }

  if (value >= 75) {
    return "epic";
  }

  if (value >= 50) {
    return "rare";
  }

  if (value >= 25) {
    return "uncommon";
  }

  return "common";
}

function getRoleLabel(value: string | null | undefined, locale: "ru" | "en") {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "tank") {
    return t(locale, "raidcheck.roleTank");
  }

  if (normalized === "healer") {
    return t(locale, "raidcheck.roleHealer");
  }

  if (normalized === "dps" || normalized === "damage") {
    return t(locale, "raidcheck.roleDamage");
  }

  return t(locale, "raidcheck.roleNone");
}

function getReadiness(row: RaidCheckCharacterResult | null, locale: "ru" | "en") {
  if (!row) {
    return {
      tone: "muted",
      label: "—",
      sublabel: t(locale, "raidcheck.checkRequired"),
    };
  }

  if (row.status === "clean") {
    return {
      tone: "good",
      label: t(locale, "raidcheck.readinessGood"),
      sublabel: t(locale, "raidcheck.statusClean"),
    };
  }

  if (row.status === "locked") {
    return {
      tone: "warn",
      label: t(locale, "raidcheck.readinessLocked"),
      sublabel: `${row.killedBosses.length} ${t(locale, "raidcheck.lockedBosses")}`,
    };
  }

  return {
    tone: "bad",
    label: t(locale, "raidcheck.readinessReview"),
    sublabel: row.error ?? t(locale, "raidcheck.checkRequired"),
  };
}

function sortEncounters(
  encounters: WarcraftLogsEncounterParse[],
  sortMode: SortMode,
  locale: "ru" | "en",
) {
  return [...encounters].sort((left, right) => {
    if (sortMode === "name") {
      return localizeRaidBossName({ name: left.name }, locale).localeCompare(
        localizeRaidBossName({ name: right.name }, locale),
      );
    }

    const leftParse = left.parse ?? -1;
    const rightParse = right.parse ?? -1;

    return sortMode === "best" ? rightParse - leftParse : leftParse - rightParse;
  });
}

function getEncounterPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

function getEncounterExtremes(details: RaidCheckCharacterSheetDetails | null) {
  const encounters = [
    ...(details?.warcraftLogs.rankings.heroic?.encounters ?? []),
    ...(details?.warcraftLogs.rankings.mythic?.encounters ?? []),
  ].filter((encounter) => encounter.parse !== null);

  if (encounters.length === 0) {
    return {
      strongest: null,
      weakest: null,
    };
  }

  const sorted = [...encounters].sort((left, right) => (left.parse ?? 0) - (right.parse ?? 0));

  return {
    strongest: sorted[sorted.length - 1],
    weakest: sorted[0],
  };
}

async function copyText(value: string | null | undefined) {
  if (!value || !navigator.clipboard) {
    return;
  }

  await navigator.clipboard.writeText(value);
}

function MetricCard({
  label,
  sublabel,
  tone = "muted",
  value,
}: {
  label: string;
  sublabel?: string;
  tone?: "blue" | "good" | "muted" | "purple" | "warn" | "bad";
  value: string;
}) {
  return (
    <div className="raidcheck-sheet-metric" data-tone={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
      {sublabel ? <small>{sublabel}</small> : null}
    </div>
  );
}

function RankingGroup({
  isOpen,
  locale,
  onToggle,
  sortMode,
  summary,
  title,
}: {
  isOpen: boolean;
  locale: "ru" | "en";
  onToggle: () => void;
  sortMode: SortMode;
  summary: WarcraftLogsDifficultySummary | null;
  title: string;
}) {
  const encounters = summary ? sortEncounters(summary.encounters, sortMode, locale) : [];

  return (
    <section className="raidcheck-sheet-log-group">
      <button
        className="raidcheck-sheet-log-heading"
        onClick={onToggle}
        type="button"
      >
        <span>
          <Sparkles className="size-4" aria-hidden="true" />
          <strong>{title}</strong>
        </span>
        <span>
          {t(locale, "raidcheck.average")}:{" "}
          <b className="raidcheck-parse-value" data-parse-tone={getParseTone(summary?.averageParse ?? null)}>
            {formatParse(summary?.averageParse ?? null)}
          </b>
          <ChevronDown className="size-4" aria-hidden="true" data-open={isOpen} />
        </span>
      </button>
      {isOpen ? (
        encounters.length > 0 ? (
          <div className="raidcheck-sheet-ranking-list">
            {encounters.map((encounter) => (
              <div
                className="raidcheck-sheet-ranking-row"
                key={`${summary?.difficulty}-${encounter.name}`}
              >
                <span className="raidcheck-sheet-boss">
                  <strong>{localizeRaidBossName({ name: encounter.name }, locale)}</strong>
                  {encounter.spec ? <small>{encounter.spec}</small> : null}
                </span>
                <span className="raidcheck-sheet-parse-bar" aria-hidden="true">
                  <span style={{ width: `${getEncounterPercent(encounter.parse)}%` }} />
                </span>
                <b
                  className="raidcheck-parse-value"
                  data-parse-tone={getParseTone(encounter.parse)}
                >
                  {formatParse(encounter.parse)}
                </b>
              </div>
            ))}
          </div>
        ) : (
          <p className="raidcheck-sheet-muted">{t(locale, "raidcheck.noRankings")}</p>
        )
      ) : null}
    </section>
  );
}

function Insights({
  details,
  locale,
}: {
  details: RaidCheckCharacterSheetDetails;
  locale: "ru" | "en";
}) {
  const { strongest, weakest } = getEncounterExtremes(details);
  const bestRun = details.raiderIo.profile?.bestRuns[0] ?? null;
  const regionRank = details.raiderIo.profile?.overallRank?.region ?? null;

  return (
    <section className="raidcheck-sheet-insights">
      <div className="raidcheck-sheet-section-title">
        <Sparkles className="size-4" aria-hidden="true" />
        <strong>{t(locale, "raidcheck.insights")}</strong>
      </div>
      <div className="raidcheck-sheet-insight-grid">
        <div>
          <span className="raidcheck-sheet-insight">
            <TrendingUp className="size-4" aria-hidden="true" />
            <span>
              <small>{t(locale, "raidcheck.strongestEncounter")}</small>
              <b>
                {strongest
                  ? `${localizeRaidBossName({ name: strongest.name }, locale)} (${formatParse(strongest.parse)})`
                  : t(locale, "raidcheck.noRankings")}
              </b>
            </span>
          </span>
          <span className="raidcheck-sheet-insight" data-tone="bad">
            <TrendingDown className="size-4" aria-hidden="true" />
            <span>
              <small>{t(locale, "raidcheck.weakestEncounter")}</small>
              <b>
                {weakest
                  ? `${localizeRaidBossName({ name: weakest.name }, locale)} (${formatParse(weakest.parse)})`
                  : t(locale, "raidcheck.noRankings")}
              </b>
            </span>
          </span>
        </div>
        <div>
          <span className="raidcheck-sheet-insight" data-tone="blue">
            <ShieldCheck className="size-4" aria-hidden="true" />
            <span>
              <small>{t(locale, "raidcheck.raiderIoSummary")}</small>
              <b>
                {formatScore(details.raiderIo.score)} · {t(locale, "raidcheck.regionRank")}{" "}
                {formatRank(regionRank, locale)}
              </b>
            </span>
          </span>
          <span className="raidcheck-sheet-insight" data-tone="purple">
            <Sparkles className="size-4" aria-hidden="true" />
            <span>
              <small>{t(locale, "raidcheck.bestMythicRun")}</small>
              <b>
                {bestRun
                  ? `${bestRun.dungeon} +${bestRun.mythicLevel ?? "?"} (${formatScore(bestRun.score)})`
                  : t(locale, "raidcheck.noCurrentRuns")}
              </b>
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}

function DetailsContent({
  details,
  isLoading,
  locale,
  row,
}: {
  details: RaidCheckCharacterSheetDetails | null;
  isLoading: boolean;
  locale: "ru" | "en";
  row: RaidCheckCharacterResult | null;
}) {
  const [activeTab, setActiveTab] = useState<DifficultyTab>("all");
  const [sortMode, setSortMode] = useState<SortMode>("best");
  const [openSections, setOpenSections] = useState({
    heroic: true,
    mythic: true,
  });

  useEffect(() => {
    setActiveTab("all");
    setSortMode("best");
    setOpenSections({ heroic: true, mythic: true });
  }, [row?.name, row?.serverSlug]);

  const sections = useMemo(
    () =>
      [
        {
          key: "heroic" as const,
          summary: details?.warcraftLogs.rankings.heroic ?? null,
          title: t(locale, "raidcheck.heroicLogs"),
        },
        {
          key: "mythic" as const,
          summary: details?.warcraftLogs.rankings.mythic ?? null,
          title: t(locale, "raidcheck.mythicLogs"),
        },
      ].filter((section) => activeTab === "all" || activeTab === section.key),
    [activeTab, details, locale],
  );
  const readiness = getReadiness(row, locale);

  if (isLoading && !details) {
    return (
      <div className="raidcheck-sheet-state">
        <Loader2 className="size-7 animate-spin" aria-hidden="true" />
        <span>{t(locale, "raidcheck.detailsLoading")}</span>
      </div>
    );
  }

  if (!details) {
    return null;
  }

  return (
    <div className="raidcheck-sheet-content">
      {details.warnings.length > 0 ? (
        <div className="raidcheck-sheet-warning-list">
          {details.warnings.map((warning) => (
            <p className="status-note warn" key={warning}>
              <ShieldAlert className="size-4" aria-hidden="true" />
              {warning}
            </p>
          ))}
        </div>
      ) : null}

      <div className="raidcheck-sheet-metrics">
        <MetricCard
          label={t(locale, "raidcheck.averageParse")}
          sublabel="Percentile"
          tone="purple"
          value={formatParse(details.warcraftLogs.summary.averageParse)}
        />
        <MetricCard
          label={t(locale, "raidcheck.bestParse")}
          sublabel="Percentile"
          tone="blue"
          value={formatParse(details.warcraftLogs.summary.bestParse)}
        />
        <MetricCard
          label={t(locale, "raidcheck.raiderIoRating")}
          sublabel={t(locale, "raidcheck.currentSeason")}
          tone="blue"
          value={formatScore(details.raiderIo.score)}
        />
        <MetricCard
          label={t(locale, "raidcheck.raidReadiness")}
          sublabel={readiness.sublabel}
          tone={readiness.tone as "good" | "warn" | "bad" | "muted"}
          value={readiness.label}
        />
      </div>

      <div className="raidcheck-sheet-toolbar">
        <div
          aria-label={t(locale, "raidcheck.logs")}
          className="raidcheck-sheet-tabs"
          role="tablist"
        >
          {difficultyTabs.map((tab) => (
            <button
              aria-selected={activeTab === tab}
              className="raidcheck-sheet-tab"
              data-active={activeTab === tab ? "true" : undefined}
              key={tab}
              onClick={() => setActiveTab(tab)}
              role="tab"
              type="button"
            >
              {t(locale, `raidcheck.tab${tab[0].toUpperCase()}${tab.slice(1)}`)}
            </button>
          ))}
        </div>
        <Select
          onValueChange={(value) => setSortMode(value as SortMode)}
          value={sortMode}
        >
          <SelectTrigger className="raidcheck-sheet-sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="raidcheck-select-content">
            <SelectItem value="best">{t(locale, "raidcheck.sortBest")}</SelectItem>
            <SelectItem value="worst">{t(locale, "raidcheck.sortWorst")}</SelectItem>
            <SelectItem value="name">{t(locale, "raidcheck.sortName")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="raidcheck-sheet-log-list">
        {sections.map((section) => (
          <RankingGroup
            isOpen={openSections[section.key]}
            key={section.key}
            locale={locale}
            onToggle={() =>
              setOpenSections((current) => ({
                ...current,
                [section.key]: !current[section.key],
              }))
            }
            sortMode={sortMode}
            summary={section.summary}
            title={section.title}
          />
        ))}
      </div>

      <Insights details={details} locale={locale} />
    </div>
  );
}

export function RaidCheckCharacterSheet({
  details,
  isBookmarkPending,
  isLoading,
  isRefreshing,
  locale,
  onBookmarkToggle,
  onOpenChange,
  onRefresh,
  open,
  row,
}: {
  details: RaidCheckCharacterSheetDetails | null;
  isBookmarkPending: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  locale: "ru" | "en";
  onBookmarkToggle: () => void;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
  open: boolean;
  row: RaidCheckCharacterResult | null;
}) {
  const roleLabel = getRoleLabel(
    details?.raiderIo.profile?.activeSpecRole ?? row?.role,
    locale,
  );
  const specLabel = details?.raiderIo.profile?.activeSpecName;
  const primaryProfile =
    details?.links.raiderIo ?? details?.links.warcraftLogs ?? details?.links.armory;
  const BookmarkIcon = details?.bookmark.isBookmarked ? BookmarkCheck : Bookmark;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="raidcheck-sheet">
        <SheetHeader className="raidcheck-sheet-header">
          <div className="raidcheck-sheet-character">
            <span className="raidcheck-character-mark raidcheck-sheet-avatar" aria-hidden="true">
              {row?.avatarUrl ? (
                <Image alt="" height={58} src={row.avatarUrl} width={58} />
              ) : (
                row?.name.slice(0, 1).toUpperCase() ?? "?"
              )}
            </span>
            <span className="raidcheck-sheet-character-copy">
              <SheetTitle>{row?.name ?? t(locale, "raidcheck.character")}</SheetTitle>
              <SheetDescription>
                {row ? `${row.realm} · ${row.serverRegion.toUpperCase()}` : "—"}
              </SheetDescription>
              <span className="raidcheck-sheet-character-meta">
                {specLabel ? <Badge variant="arcane">{specLabel}</Badge> : null}
                <Badge variant="success">{roleLabel}</Badge>
                {details?.equipment.itemLevel ? (
                  <Badge variant="outline">ilvl {details.equipment.itemLevel}</Badge>
                ) : null}
                {details?.lastUpdatedAt && isUpdatedToday(details.lastUpdatedAt) ? (
                  <Badge variant="success">{t(locale, "raidcheck.updatedToday")}</Badge>
                ) : null}
              </span>
            </span>
            {row ? (
              <span className="raidcheck-sheet-class">
                <RaidCheckClassIcon classFile={row.classFile} locale={locale} />
                {details?.equipment.topItem ? (
                  <small>
                    {details.equipment.topItem.name} · {details.equipment.topItem.itemLevel ?? "—"}
                  </small>
                ) : null}
              </span>
            ) : null}
          </div>
          <div className="raidcheck-sheet-actions">
            {details?.links.warcraftLogs ? (
              <Button asChild variant="outline">
                <a href={details.links.warcraftLogs} rel="noreferrer" target="_blank">
                  <ExternalLink className="size-4" aria-hidden="true" />
                  Warcraft Logs
                </a>
              </Button>
            ) : null}
            {details?.links.raiderIo ? (
              <Button asChild variant="outline">
                <a href={details.links.raiderIo} rel="noreferrer" target="_blank">
                  <ExternalLink className="size-4" aria-hidden="true" />
                  Raider.IO
                </a>
              </Button>
            ) : null}
            <Button disabled={!row || isRefreshing} onClick={onRefresh} variant="outline">
              <RefreshCw
                className={`size-4${isRefreshing ? " animate-spin" : ""}`}
                aria-hidden="true"
              />
              {t(locale, "raidcheck.refreshLogs")}
            </Button>
            <Button
              aria-label={
                details?.bookmark.isBookmarked
                  ? t(locale, "raidcheck.removeBookmark")
                  : t(locale, "raidcheck.addBookmark")
              }
              className="raidcheck-sheet-icon-button"
              disabled={!row || isBookmarkPending}
              onClick={onBookmarkToggle}
              size="icon"
              type="button"
              variant="outline"
            >
              {isBookmarkPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <BookmarkIcon className="size-4" aria-hidden="true" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="raidcheck-sheet-icon-button" size="icon" variant="outline">
                  <MoreVertical className="size-4" aria-hidden="true" />
                  <span className="sr-only">{t(locale, "raidcheck.actions")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="raidcheck-sheet-menu">
                <DropdownMenuItem onSelect={() => copyText(row?.name)}>
                  <Copy className="size-4" aria-hidden="true" />
                  {t(locale, "raidcheck.copyCharacterName")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={!details?.links.warcraftLogs}
                  onSelect={() => copyText(details?.links.warcraftLogs)}
                >
                  <Copy className="size-4" aria-hidden="true" />
                  {t(locale, "raidcheck.copyWarcraftLogsLink")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!details?.links.raiderIo}
                  onSelect={() => copyText(details?.links.raiderIo)}
                >
                  <Copy className="size-4" aria-hidden="true" />
                  {t(locale, "raidcheck.copyRaiderIoLink")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!details?.links.armory}
                  onSelect={() => {
                    if (details?.links.armory) {
                      window.open(details.links.armory, "_blank", "noreferrer");
                    }
                  }}
                >
                  <ExternalLink className="size-4" aria-hidden="true" />
                  {t(locale, "raidcheck.openArmory")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SheetHeader>
        <ScrollArea className="raidcheck-sheet-scroll">
          <DetailsContent
            details={details}
            isLoading={isLoading}
            locale={locale}
            row={row}
          />
        </ScrollArea>
        <div className="raidcheck-sheet-footer">
          {primaryProfile ? (
            <a href={primaryProfile} rel="noreferrer" target="_blank">
              {t(locale, "raidcheck.openFullProfile")}
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          ) : (
            <span />
          )}
          <span>
            {t(locale, "raidcheck.lastUpdate")}:{" "}
            {formatFetchedAt(details?.lastUpdatedAt ?? null, locale)}
          </span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
