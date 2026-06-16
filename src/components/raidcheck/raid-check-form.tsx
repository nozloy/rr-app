"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  CheckCircle2,
  CircleSlash,
  Hourglass,
  Loader2,
  MoreVertical,
  Search,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import {
  getRaidCheckCharacterDetailsAction,
  raidCheckAction,
} from "@/actions/raid-check";
import { RaidCheckCharacterSheet } from "@/components/raidcheck/raid-check-character-sheet";
import {
  RaidCheckClassIcon,
  getClassLabel,
} from "@/components/raidcheck/raid-check-class-icon";
import { useAppLocale } from "@/components/shell/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  AddonExportParseError,
  parseAddonExportString,
  type AddonExportData,
} from "@/lib/addon-export";
import { t } from "@/lib/i18n";
import { localizeRaidBossName } from "@/lib/raid-boss-localization";
import {
  ALL_SEASON_RAIDS_VALUE,
  RAID_CHECK_DIFFICULTIES,
  getDefaultRaidCheckDifficultyID,
  getRaidCheckDifficultyOptions,
} from "@/lib/raid-check-core";
import { currentRaidInstances, getLocalizedRaidName, getRaidByName } from "@/lib/raids";
import type {
  RaidCheckCharacterLogs,
  RaidCheckCharacterResult,
  RaidCheckResult,
} from "@/lib/raid-check";
import type { WarcraftLogsCharacterDetailsResult } from "@/lib/warcraftlogs-core";

type ImportPreview =
  | {
      status: "ready";
      exportData: AddonExportData;
      defaultDifficultyID: number;
      options: ReturnType<typeof getRaidCheckDifficultyOptions>;
    }
  | {
      status: "idle" | "error";
      message: string | null;
      options: [];
    };

function getStatusLabels(locale: "ru" | "en") {
  return {
    clean: t(locale, "raidcheck.statusClean"),
    error: t(locale, "raidcheck.statusError"),
    locked: t(locale, "raidcheck.statusLocked"),
    not_found: t(locale, "raidcheck.statusNotFound"),
  } satisfies Record<RaidCheckCharacterResult["status"], string>;
}

const statusIcons = {
  clean: CheckCircle2,
  error: ShieldAlert,
  locked: ShieldAlert,
  not_found: CircleSlash,
} satisfies Record<RaidCheckCharacterResult["status"], typeof CheckCircle2>;

const issueStatusPriority: Record<RaidCheckCharacterResult["status"], number> = {
  locked: 0,
  error: 1,
  not_found: 2,
  clean: 3,
};

function getPreview(exportText: string, locale: "ru" | "en"): ImportPreview {
  if (!exportText.trim()) {
    return { status: "idle", message: null, options: [] };
  }

  try {
    const exportData = parseAddonExportString(exportText, locale);
    return {
      status: "ready",
      exportData,
      defaultDifficultyID: getDefaultRaidCheckDifficultyID(exportData),
      options: getRaidCheckDifficultyOptions(exportData),
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof AddonExportParseError
          ? error.message
          : t(locale, "raidcheck.previewParseError"),
      options: [],
    };
  }
}

function formatKillTime(timestamp: number, locale: "ru" | "en") {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function formatParse(value: number | null) {
  return value === null ? "—" : value.toFixed(value % 1 === 0 ? 0 : 1);
}

function getParseTone(value: number | null) {
  if (value === null) {
    return "empty";
  }

  if (value >= 100) {
    return "artifact";
  }

  if (value >= 99) {
    return "legendary";
  }

  if (value >= 95) {
    return "epic";
  }

  if (value >= 75) {
    return "rare";
  }

  if (value >= 50) {
    return "uncommon";
  }

  if (value >= 25) {
    return "common";
  }

  return "poor";
}

function getResultStats(result: RaidCheckResult | null) {
  if (result?.status !== "success") {
    return null;
  }

  const locked = result.rows.filter((row) => row.status === "locked").length;
  const clean = result.rows.filter((row) => row.status === "clean").length;
  const issues = result.rows.length - locked - clean;

  return { clean, issues, locked, total: result.rows.length };
}

function getDefaultRaidSlug(preview: ImportPreview) {
  if (preview.status !== "ready") {
    return currentRaidInstances[0]?.slug ?? "";
  }

  return (
    getRaidByName(preview.exportData.instanceName)?.slug ??
    currentRaidInstances[0]?.slug ??
    ""
  );
}

function sortRaidCheckRows(rows: RaidCheckCharacterResult[]) {
  return [...rows].sort(
    (left, right) =>
      issueStatusPriority[left.status] - issueStatusPriority[right.status],
  );
}

function normalizeFilterText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/giu, "");
}

function getRowPriority(row: RaidCheckCharacterResult) {
  return row.status === "clean" ? "clean" : "issue";
}

function RaidCheckInfoTooltip({
  children,
  className,
  label,
  trigger,
}: {
  children: ReactNode;
  className: string;
  label: string;
  trigger: ReactNode;
}) {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({
    left: 0,
    placement: "top" as "bottom" | "top",
    top: 0,
  });

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;

    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const pageInset = 12;
    const tooltipWidth = Math.min(320, window.innerWidth - pageInset * 2);
    const placement = rect.top > 150 ? "top" : "bottom";

    setPosition({
      left: Math.min(
        Math.max(rect.right - tooltipWidth, pageInset),
        window.innerWidth - tooltipWidth - pageInset,
      ),
      placement,
      top: placement === "top" ? rect.top - 10 : rect.bottom + 10,
    });
  }, []);

  const openTooltip = useCallback(() => {
    updatePosition();
    setIsOpen(true);
  }, [updatePosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  return (
    <>
      <Button
        aria-describedby={isOpen ? tooltipId : undefined}
        aria-label={label}
        className={className}
        size="icon"
        onBlur={() => setIsOpen(false)}
        onFocus={openTooltip}
        onMouseEnter={openTooltip}
        onMouseLeave={() => setIsOpen(false)}
        ref={triggerRef}
        type="button"
        variant="ghost"
      >
        {trigger}
      </Button>
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="raidcheck-tooltip-portal"
              data-placement={position.placement}
              id={tooltipId}
              role="tooltip"
              style={{ left: position.left, top: position.top }}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function RaidCheckStatus({
  row,
  locale,
}: {
  row: RaidCheckCharacterResult;
  locale: "ru" | "en";
}) {
  const hasKills = row.killedBosses.length > 0;
  const Icon = statusIcons[row.status];
  const statusLabels = getStatusLabels(locale);
  const statusLabel = statusLabels[row.status];

  return (
    <div className="raidcheck-status-cell">
      <RaidCheckInfoTooltip
        className={`raidcheck-status-icon raidcheck-status-${row.status}`}
        label={`${statusLabel}: ${row.name}`}
        trigger={<Icon className="size-4" aria-hidden="true" />}
      >
        <span className="raidcheck-tooltip-title">{statusLabel}</span>
        {hasKills ? (
          <>
            {row.killedBosses.map((boss) => (
              <span
                className="raidcheck-tooltip-row"
                key={`${boss.raidSlug ?? row.raidSlug}-${boss.id}-${boss.name}-${boss.lastKillTimestamp}`}
              >
                <span>{boss.name}</span>
                {boss.lastKillTimestamp > 0 ? (
                  <span>{formatKillTime(boss.lastKillTimestamp, locale)}</span>
                ) : null}
              </span>
            ))}
          </>
        ) : row.error ? (
          <span>{row.error}</span>
        ) : null}
      </RaidCheckInfoTooltip>
    </div>
  );
}

function getLogsTitle(logs: RaidCheckCharacterLogs | null, locale: "ru" | "en") {
  if (logs?.difficulty === "mythic") {
    return t(locale, "raidcheck.mythicLogs");
  }

  if (logs?.difficulty === "heroic") {
    return t(locale, "raidcheck.heroicLogs");
  }

  return t(locale, "raidcheck.logs");
}

function RaidCheckLogs({
  logs,
  locale,
  name,
}: {
  logs: RaidCheckCharacterLogs | null;
  locale: "ru" | "en";
  name: string;
}) {
  const hasSummary =
    logs?.status === "ready" &&
    (logs.averageParse !== null || logs.bestParse !== null || logs.encounters.length > 0);
  const displayLogs = hasSummary && logs ? logs : null;
  const title = getLogsTitle(logs, locale);

  if (!displayLogs) {
    return (
      <span
        aria-label={logs?.message ?? t(locale, "raidcheck.logsNoDataForDifficulty")}
        className="raidcheck-logs-empty"
      >
        —
      </span>
    );
  }

  return (
    <div className="raidcheck-logs-cell">
      <RaidCheckInfoTooltip
        className="raidcheck-logs-trigger"
        label={`${title}: ${name}`}
        trigger={
          <span className="raidcheck-logs-trigger-content">
            <strong
              className="raidcheck-parse-value"
              data-parse-tone={getParseTone(displayLogs.averageParse)}
            >
              {formatParse(displayLogs.averageParse)}
            </strong>
            <span aria-hidden="true">/</span>
            <strong
              className="raidcheck-parse-value"
              data-parse-tone={getParseTone(displayLogs.bestParse)}
            >
              {formatParse(displayLogs.bestParse)}
            </strong>
          </span>
        }
      >
        <span className="raidcheck-tooltip-title">{title}</span>
        <>
          <span className="raidcheck-tooltip-row">
            <span>{t(locale, "raidcheck.averageParse")}</span>
            <span
              className="raidcheck-parse-value"
              data-parse-tone={getParseTone(displayLogs.averageParse)}
            >
              {formatParse(displayLogs.averageParse)}
            </span>
          </span>
          <span className="raidcheck-tooltip-row">
            <span>{t(locale, "raidcheck.bestParse")}</span>
            <span
              className="raidcheck-parse-value"
              data-parse-tone={getParseTone(displayLogs.bestParse)}
            >
              {formatParse(displayLogs.bestParse)}
            </span>
          </span>
          {displayLogs.encounters.length > 0 ? (
            <>
              <span className="raidcheck-tooltip-subtitle">
                {t(locale, "raidcheck.bossParses")}
              </span>
              {displayLogs.encounters.map((encounter) => (
                <span
                  className="raidcheck-tooltip-row"
                  key={`${displayLogs.difficulty}-${encounter.name}`}
                >
                  <span>{localizeRaidBossName({ name: encounter.name }, locale)}</span>
                  <span
                    className="raidcheck-parse-value"
                    data-parse-tone={getParseTone(encounter.parse)}
                  >
                    {formatParse(encounter.parse)}
                  </span>
                </span>
              ))}
            </>
          ) : null}
        </>
      </RaidCheckInfoTooltip>
    </div>
  );
}

function RaidCheckTableRow({
  locale,
  onOpenDetails,
  row,
}: {
  locale: "ru" | "en";
  onOpenDetails: (row: RaidCheckCharacterResult) => void;
  row: RaidCheckCharacterResult;
}) {
  return (
    <tr data-priority={getRowPriority(row)}>
      <td>
        <RaidCheckClassIcon classFile={row.classFile} locale={locale} />
      </td>
      <td>
        <div className="raidcheck-character">
          <span className="raidcheck-character-mark" aria-hidden="true">
            {row.avatarUrl ? (
              <Image
                alt=""
                height={36}
                src={row.avatarUrl}
                width={36}
              />
            ) : (
              row.name.slice(0, 1).toUpperCase()
            )}
          </span>
          <span>
            <strong>{row.name}</strong>
            <small>{row.realm}</small>
          </span>
        </div>
      </td>
      <td aria-hidden="true" className="raidcheck-table-spacer" />
      <td>
        <RaidCheckStatus locale={locale} row={row} />
      </td>
      <td>
        <RaidCheckLogs locale={locale} logs={row.logs} name={row.name} />
      </td>
      <td className="raidcheck-row-action-cell">
        <Button
          aria-label={t(locale, "raidcheck.openCharacterDetails", {
            name: row.name,
          })}
          className="raidcheck-row-action"
          onClick={() => onOpenDetails(row)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <MoreVertical className="size-4" aria-hidden="true" />
        </Button>
      </td>
    </tr>
  );
}

function RaidCheckImportSummary({
  preview,
  locale,
}: {
  preview: ImportPreview;
  locale: "ru" | "en";
}) {
  if (preview.status !== "ready") {
    const ImportStatusIcon = preview.status === "error" ? ShieldAlert : ShieldCheck;

    return (
      <div className="raidcheck-import-status" data-state={preview.status}>
        <ImportStatusIcon className="size-5" aria-hidden="true" />
        <span>
          {preview.status === "error"
            ? t(locale, "raidcheck.checkSource")
            : t(locale, "raidcheck.waitingExport")}
        </span>
      </div>
    );
  }

  const isRaidExport = preview.exportData.groupType === "raid";
  const hasFullRoster = preview.exportData.roster.length > 0;
  const rosterLabel = hasFullRoster
    ? `${preview.exportData.roster.length} ${locale === "ru" ? "игроков" : "players"}`
    : t(locale, "raidcheck.authorOnly");

  return (
    <div className="raidcheck-import-status" data-state="ready">
      <ShieldCheck className="size-5" aria-hidden="true" />
      <span className="raidcheck-import-status-copy">
        <strong>{t(locale, "raidcheck.exportReady")}</strong>
        <small>
          {preview.exportData.instanceName ?? t(locale, "raidcheck.notDetected")} · {rosterLabel}
        </small>
      </span>
      <Badge variant={isRaidExport && hasFullRoster ? "success" : "warning"}>
        {isRaidExport ? t(locale, "raidcheck.ready") : t(locale, "raidcheck.checkSource")}
      </Badge>
    </div>
  );
}

export function RaidCheckForm() {
  const locale = useAppLocale();
  const exportTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [exportText, setExportText] = useState("");
  const [selectedDifficultyID, setSelectedDifficultyID] = useState("15");
  const [selectedRaidSlug, setSelectedRaidSlug] = useState(
    currentRaidInstances[0]?.slug ?? "",
  );
  const [result, setResult] = useState<RaidCheckResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [lockoutFilter, setLockoutFilter] = useState("all");
  const [selectedDetailsRow, setSelectedDetailsRow] =
    useState<RaidCheckCharacterResult | null>(null);
  const [details, setDetails] =
    useState<WarcraftLogsCharacterDetailsResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDetailsPending, startDetailsTransition] = useTransition();
  const preview = useMemo(() => getPreview(exportText, locale), [exportText, locale]);
  const resultStats = getResultStats(result);
  const resultRows = useMemo(
    () => (result?.status === "success" ? result.rows : []),
    [result],
  );
  const classOptions = useMemo(
    () =>
      [...new Set(resultRows.map((row) => row.classFile.trim().toUpperCase()))]
        .filter(Boolean)
        .sort((left, right) =>
          getClassLabel(left, locale).localeCompare(getClassLabel(right, locale)),
        ),
    [locale, resultRows],
  );
  const filteredRows = useMemo(() => {
    const normalizedQuery = normalizeFilterText(searchQuery);

    return sortRaidCheckRows(resultRows).filter((row) => {
      const matchesSearch =
        !normalizedQuery ||
        normalizeFilterText(`${row.name} ${row.realm} ${row.serverSlug ?? ""}`)
          .includes(normalizedQuery);
      const matchesClass =
        classFilter === "all" ||
        row.classFile.trim().toUpperCase() === classFilter;
      const matchesLockout =
        lockoutFilter === "all" || row.status === lockoutFilter;

      return matchesSearch && matchesClass && matchesLockout;
    });
  }, [classFilter, lockoutFilter, resultRows, searchQuery]);
  const difficultyOptions =
    preview.status === "ready" ? preview.options : RAID_CHECK_DIFFICULTIES;

  const resizeExportTextarea = useCallback(() => {
    const textarea = exportTextareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(190, textarea.scrollHeight)}px`;
  }, []);

  useEffect(() => {
    resizeExportTextarea();
  }, [exportText, resizeExportTextarea]);

  useEffect(() => {
    if (preview.status === "ready") {
      setSelectedDifficultyID(String(preview.defaultDifficultyID));
      setSelectedRaidSlug(getDefaultRaidSlug(preview));
    }
  }, [preview]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const nextResult = await raidCheckAction({
        exportText,
        difficultyID: Number.parseInt(selectedDifficultyID, 10),
        locale,
        raidSlug: selectedRaidSlug,
      });
      setResult(nextResult);
    });
  }

  function resetResultState() {
    setResult(null);
    setSearchQuery("");
    setClassFilter("all");
    setLockoutFilter("all");
    setSelectedDetailsRow(null);
    setDetails(null);
  }

  function handleOpenDetails(row: RaidCheckCharacterResult) {
    setSelectedDetailsRow(row);
    setDetails(null);
    startDetailsTransition(async () => {
      setDetails(
        await getRaidCheckCharacterDetailsAction({
          name: row.name,
          raidSlug: row.raidSlug,
          serverSlug: row.serverSlug,
          serverRegion: row.serverRegion,
        }),
      );
    });
  }

  const canSubmit = preview.status === "ready" && Boolean(selectedRaidSlug) && !isPending;

  return (
    <section className="raidcheck-workbench" id="raidcheck-workbench">
      <Card className="raidcheck-panel raidcheck-input-panel">
        <CardContent className="raidcheck-panel-content">
          <form className="raidcheck-form" onSubmit={handleSubmit}>
            <div className="raidcheck-panel-heading">
              <div>
                <div className="eyebrow">{t(locale, "raidcheck.source")}</div>
                <h2>{t(locale, "raidcheck.addonString")}</h2>
              </div>
            </div>

            <p className="raidcheck-copy">
              {t(locale, "raidcheck.useFreshExport")} <code className="code-inline">/rr</code>.
            </p>

            <label className="raidcheck-field">
              <span className="field-label">{t(locale, "raidcheck.addonString")}</span>
              <ScrollArea className="raidcheck-textarea-scroll">
                <Textarea
                  className="raidcheck-textarea"
                  onChange={(event) => {
                    setExportText(event.currentTarget.value);
                    resetResultState();
                    window.requestAnimationFrame(resizeExportTextarea);
                  }}
                  placeholder="RR1?name=...&realm=...&instance=...&roster=..."
                  ref={exportTextareaRef}
                  value={exportText}
                />
              </ScrollArea>
            </label>

            {preview.status === "error" ? (
              <p className="status-note error">{preview.message}</p>
            ) : null}

            <RaidCheckImportSummary locale={locale} preview={preview} />

            <label className="raidcheck-field">
              <span className="field-label">{t(locale, "raidcheck.raidToCheck")}</span>
              <Select
                disabled={preview.status !== "ready"}
                onValueChange={(value) => {
                  setSelectedRaidSlug(value);
                  resetResultState();
                }}
                value={selectedRaidSlug}
              >
                <SelectTrigger className="raidcheck-select">
                  <SelectValue placeholder={t(locale, "raidcheck.chooseCurrentRaid")} />
                </SelectTrigger>
                <SelectContent className="raidcheck-select-content">
                  <SelectItem value={ALL_SEASON_RAIDS_VALUE}>
                    <span className="raidcheck-premium-option">
                      <span>{t(locale, "raidcheck.allSeasonRaids")}</span>
                      <span className="raidcheck-premium-tag">{t(locale, "raidcheck.summaryPremium")}</span>
                    </span>
                  </SelectItem>
                  {currentRaidInstances.map((raid) => (
                    <SelectItem key={raid.slug} value={raid.slug}>
                      {getLocalizedRaidName(raid, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <div className="raidcheck-field">
              <span className="field-label">{t(locale, "raidcheck.difficulty")}</span>
              <div
                aria-label={t(locale, "raidcheck.difficulty")}
                className="raidcheck-difficulty-tabs"
                role="radiogroup"
              >
                {difficultyOptions.map((difficulty) => {
                  const difficultyID = String(difficulty.id);
                  const isSelected = selectedDifficultyID === difficultyID;

                  return (
                    <button
                      aria-checked={isSelected}
                      className="raidcheck-difficulty-tab"
                      data-selected={isSelected ? "true" : undefined}
                      disabled={preview.status !== "ready"}
                      key={difficulty.id}
                      onClick={() => {
                        setSelectedDifficultyID(difficultyID);
                        resetResultState();
                      }}
                      role="radio"
                      type="button"
                    >
                      {difficulty.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              className="raidcheck-submit"
              disabled={!canSubmit}
              size="lg"
              type="submit"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="size-4" aria-hidden="true" />
              )}
              {t(locale, "raidcheck.submit")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="raidcheck-panel raidcheck-result-panel">
        <CardContent className="raidcheck-panel-content">
          <div className="raidcheck-result-header">
            <div>
              <div className="eyebrow">{t(locale, "raidcheck.result")}</div>
              <h2>{t(locale, "raidcheck.resultTable")}</h2>
              {result?.status === "success" ? (
                <p className="raidcheck-copy">
                  {result.raidName} · {result.difficulty?.label}
                </p>
              ) : (
                <p className="raidcheck-copy">
                  {t(locale, "raidcheck.resultEmpty")}
                </p>
              )}
            </div>
            {resultStats ? (
              <div className="raidcheck-result-stats" aria-label={t(locale, "raidcheck.result")}>
                <div data-tone="blue">
                  <UsersRound className="size-4" aria-hidden="true" />
                  <span>{t(locale, "raidcheck.total")}</span>
                  <strong>{resultStats.total}</strong>
                </div>
                <div data-tone="green">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  <span>{t(locale, "raidcheck.clean")}</span>
                  <strong>{resultStats.clean}</strong>
                </div>
                <div data-tone="gold">
                  <Hourglass className="size-4" aria-hidden="true" />
                  <span>{t(locale, "raidcheck.locked")}</span>
                  <strong>{resultStats.locked}</strong>
                </div>
                <div data-tone="red">
                  <TriangleAlert className="size-4" aria-hidden="true" />
                  <span>{t(locale, "raidcheck.issues")}</span>
                  <strong>{resultStats.issues}</strong>
                </div>
                <Badge
                  className="raidcheck-ready-badge"
                  variant={resultStats.issues === 0 && resultStats.locked === 0 ? "success" : "warning"}
                >
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  {resultStats.issues === 0 && resultStats.locked === 0
                    ? t(locale, "raidcheck.readyForRaid")
                    : t(locale, "raidcheck.checkRequired")}
                </Badge>
              </div>
            ) : null}
          </div>

          {result?.warnings.map((warning) => (
            <p className="status-note warn" key={warning}>
              <TriangleAlert className="size-4" aria-hidden="true" />
              {warning}
            </p>
          ))}

          {result?.status === "error" ? (
            <p className="status-note error">{result.message}</p>
          ) : null}

          {result?.status === "success" ? (
            <>
              <div className="raidcheck-result-controls">
                <label className="raidcheck-result-search">
                  <Search className="size-4" aria-hidden="true" />
                  <Input
                    aria-label={t(locale, "raidcheck.searchPlayer")}
                    onChange={(event) => setSearchQuery(event.currentTarget.value)}
                    placeholder={t(locale, "raidcheck.searchPlaceholder")}
                    value={searchQuery}
                  />
                </label>
                <Select onValueChange={setClassFilter} value={classFilter}>
                  <SelectTrigger className="raidcheck-filter-select">
                    <SelectValue placeholder={t(locale, "raidcheck.allClasses")} />
                  </SelectTrigger>
                  <SelectContent className="raidcheck-select-content">
                    <SelectItem value="all">{t(locale, "raidcheck.allClasses")}</SelectItem>
                    {classOptions.map((classFile) => (
                      <SelectItem key={classFile} value={classFile}>
                        {getClassLabel(classFile, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select onValueChange={setLockoutFilter} value={lockoutFilter}>
                  <SelectTrigger className="raidcheck-filter-select">
                    <SelectValue placeholder={t(locale, "raidcheck.allLockouts")} />
                  </SelectTrigger>
                  <SelectContent className="raidcheck-select-content">
                    <SelectItem value="all">{t(locale, "raidcheck.allLockouts")}</SelectItem>
                    {Object.entries(getStatusLabels(locale)).map(([status, label]) => (
                      <SelectItem key={status} value={status}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea
                className="raidcheck-table-shell"
                scrollbarOrientation="horizontal"
              >
                <table className="raidcheck-table">
                  <colgroup>
                    <col className="raidcheck-table-col-class" />
                    <col className="raidcheck-table-col-character" />
                    <col className="raidcheck-table-col-spacer" />
                    <col className="raidcheck-table-col-lockout" />
                    <col className="raidcheck-table-col-logs" />
                    <col className="raidcheck-table-col-actions" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>{t(locale, "raidcheck.class")}</th>
                      <th>{t(locale, "raidcheck.playerRealm")}</th>
                      <th aria-hidden="true" className="raidcheck-table-spacer" />
                      <th>{t(locale, "raidcheck.lockout")}</th>
                      <th>{t(locale, "raidcheck.logs")}</th>
                      <th aria-label={t(locale, "raidcheck.actions")} />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length > 0 ? (
                      filteredRows.map((row) => (
                        <RaidCheckTableRow
                          key={`${row.name}-${row.realm}-${row.status}`}
                          locale={locale}
                          onOpenDetails={handleOpenDetails}
                          row={row}
                        />
                      ))
                    ) : (
                      <tr>
                        <td className="raidcheck-table-empty" colSpan={6}>
                          {t(locale, "raidcheck.noFilteredRows")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </ScrollArea>
            </>
          ) : (
            <div className="raidcheck-empty-result">
              <div className="raidcheck-empty-glow" aria-hidden="true" />
              <Search className="size-9" aria-hidden="true" />
              <h3>{t(locale, "raidcheck.readyToCheck")}</h3>
              <p>{t(locale, "raidcheck.readyToCheckCopy")}</p>
            </div>
          )}
        </CardContent>
      </Card>
      <RaidCheckCharacterSheet
        details={details}
        isLoading={isDetailsPending}
        locale={locale}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedDetailsRow(null);
            setDetails(null);
          }
        }}
        open={Boolean(selectedDetailsRow)}
        row={selectedDetailsRow}
      />
    </section>
  );
}
