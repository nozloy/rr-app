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
import {
  CheckCircle2,
  CircleSlash,
  Info,
  Loader2,
  Search,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { raidCheckAction } from "@/actions/raid-check";
import { useAppLocale } from "@/components/shell/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  ALL_SEASON_RAIDS_VALUE,
  getDefaultRaidCheckDifficultyID,
  getRaidCheckDifficultyOptions,
} from "@/lib/raid-check-core";
import { currentRaidInstances, getLocalizedRaidName, getRaidByName } from "@/lib/raids";
import type {
  RaidCheckCharacterResult,
  RaidCheckResult,
} from "@/lib/raid-check";

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

const CLEAN_ROWS_COLLAPSED_LIMIT = 6;

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

function RaidCheckInfoTooltip({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
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
        className="raidcheck-info"
        size="icon"
        onBlur={() => setIsOpen(false)}
        onFocus={openTooltip}
        onMouseEnter={openTooltip}
        onMouseLeave={() => setIsOpen(false)}
        ref={triggerRef}
        type="button"
        variant="ghost"
      >
        <Info className="size-4" aria-hidden="true" />
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

  return (
    <div className="raidcheck-status-cell">
      <span className={`raidcheck-status raidcheck-status-${row.status}`}>
        <Icon className="size-4" aria-hidden="true" />
        {statusLabels[row.status]}
      </span>
      {hasKills ? (
        <RaidCheckInfoTooltip label={`${t(locale, "raidcheck.lockout")}: ${row.name}`}>
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
        </RaidCheckInfoTooltip>
      ) : row.error ? (
        <RaidCheckInfoTooltip label={`${t(locale, "raidcheck.statusError")}: ${row.name}`}>
          <span>{row.error}</span>
        </RaidCheckInfoTooltip>
      ) : null}
    </div>
  );
}

function RaidCheckTableRow({
  locale,
  priority,
  row,
}: {
  locale: "ru" | "en";
  priority: "clean" | "issue";
  row: RaidCheckCharacterResult;
}) {
  return (
    <tr data-priority={priority}>
      <td>
        <div className="raidcheck-character">
          <span className="raidcheck-character-mark" aria-hidden="true">
            {row.name.slice(0, 1).toUpperCase()}
          </span>
          <span>
            <strong>{row.name}</strong>
            <small>{row.realm}</small>
          </span>
        </div>
      </td>
      <td>
        <RaidCheckStatus locale={locale} row={row} />
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
    return (
      <div className="raidcheck-import-empty">
        <ShieldCheck className="size-5" aria-hidden="true" />
        <span>{t(locale, "raidcheck.waitingExport")}</span>
      </div>
    );
  }

  const isRaidExport = preview.exportData.groupType === "raid";
  const hasFullRoster = preview.exportData.roster.length > 0;

  return (
    <div className="raidcheck-import-summary">
      <div className="raidcheck-summary-card" data-tone={isRaidExport ? "green" : "gold"}>
        <span>{t(locale, "raidcheck.type")}</span>
        <strong>{isRaidExport ? t(locale, "raidcheck.raid") : t(locale, "raidcheck.notRaid")}</strong>
        <Badge variant={isRaidExport ? "success" : "warning"}>
          {isRaidExport ? t(locale, "raidcheck.ready") : t(locale, "raidcheck.checkSource")}
        </Badge>
      </div>
      <div className="raidcheck-summary-card" data-tone="blue">
        <span>{t(locale, "raidcheck.instance")}</span>
        <strong>{preview.exportData.instanceName ?? t(locale, "raidcheck.notDetected")}</strong>
        <Badge variant="arcane">{t(locale, "raidcheck.raidCatalog")}</Badge>
      </div>
      <div className="raidcheck-summary-card" data-tone={hasFullRoster ? "green" : "gold"}>
        <span>{t(locale, "raidcheck.roster")}</span>
        <strong>
          {hasFullRoster
            ? `${preview.exportData.roster.length} ${locale === "ru" ? "игроков" : "players"}`
            : t(locale, "raidcheck.authorOnly")}
        </strong>
        <Badge variant={hasFullRoster ? "success" : "warning"}>
          {hasFullRoster ? t(locale, "raidcheck.rosterFound") : t(locale, "raidcheck.needNewAddon")}
        </Badge>
      </div>
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
  const [showAllCleanRows, setShowAllCleanRows] = useState(false);
  const [isPending, startTransition] = useTransition();
  const preview = useMemo(() => getPreview(exportText, locale), [exportText, locale]);
  const resultStats = getResultStats(result);
  const resultRows = useMemo(
    () => (result?.status === "success" ? result.rows : []),
    [result],
  );
  const issueRows = useMemo(
    () =>
      sortRaidCheckRows(resultRows.filter((row) => row.status !== "clean")),
    [resultRows],
  );
  const cleanRows = resultRows.filter((row) => row.status === "clean");
  const visibleCleanRows = showAllCleanRows
    ? cleanRows
    : cleanRows.slice(0, CLEAN_ROWS_COLLAPSED_LIMIT);
  const hiddenCleanRows = cleanRows.length - visibleCleanRows.length;

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
      setShowAllCleanRows(false);
      setResult(nextResult);
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
                    setShowAllCleanRows(false);
                    setResult(null);
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
                  setShowAllCleanRows(false);
                  setResult(null);
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

            <label className="raidcheck-field">
              <span className="field-label">{t(locale, "raidcheck.difficulty")}</span>
              <Select
                disabled={preview.status !== "ready"}
                onValueChange={(value) => {
                  setSelectedDifficultyID(value);
                  setShowAllCleanRows(false);
                  setResult(null);
                }}
                value={selectedDifficultyID}
              >
                <SelectTrigger className="raidcheck-select">
                  <SelectValue placeholder={t(locale, "raidcheck.pasteFirst")} />
                </SelectTrigger>
                <SelectContent className="raidcheck-select-content">
                  {(preview.status === "ready" ? preview.options : []).map(
                    (difficulty) => (
                      <SelectItem key={difficulty.id} value={String(difficulty.id)}>
                        {difficulty.label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </label>

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
          <div className="raidcheck-panel-heading">
            <div>
              <div className="eyebrow">{t(locale, "raidcheck.result")}</div>
              <h2>{t(locale, "raidcheck.resultTable")}</h2>
            </div>
          </div>

          {result?.status === "success" ? (
            <p className="raidcheck-copy">
              {result.raidName} · {result.difficulty?.label}
            </p>
          ) : (
            <p className="raidcheck-copy">
              {t(locale, "raidcheck.resultEmpty")}
            </p>
          )}

          {resultStats ? (
            <div className="raidcheck-result-stats">
              <div data-tone="blue">
                <span>{t(locale, "raidcheck.total")}</span>
                <strong>{resultStats.total}</strong>
              </div>
              <div data-tone="green">
                <span>{t(locale, "raidcheck.clean")}</span>
                <strong>{resultStats.clean}</strong>
              </div>
              <div data-tone="gold">
                <span>{t(locale, "raidcheck.locked")}</span>
                <strong>{resultStats.locked}</strong>
              </div>
              <div data-tone="red">
                <span>{t(locale, "raidcheck.issues")}</span>
                <strong>{resultStats.issues}</strong>
              </div>
            </div>
          ) : null}

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
            <ScrollArea
              className="rounded-lg border border-[#6f9ee1]/20 bg-[rgba(3,13,27,0.52)]"
              scrollbarOrientation="horizontal"
            >
              <table className="raidcheck-table">
                <thead>
                  <tr>
                    <th>{t(locale, "raidcheck.playerRealm")}</th>
                    <th>{t(locale, "raidcheck.lockout")}</th>
                  </tr>
                </thead>
                <tbody>
                  {issueRows.map((row) => (
                    <RaidCheckTableRow
                      key={`${row.name}-${row.realm}-issue`}
                      locale={locale}
                      priority="issue"
                      row={row}
                    />
                  ))}
                  {issueRows.length > 0 && cleanRows.length > 0 ? (
                    <tr className="raidcheck-table-divider">
                      <td colSpan={2}>
                        <span>{t(locale, "raidcheck.othersClean")}</span>
                        <strong>{cleanRows.length}</strong>
                      </td>
                    </tr>
                  ) : null}
                  {visibleCleanRows.map((row) => (
                    <RaidCheckTableRow
                      key={`${row.name}-${row.realm}-clean`}
                      locale={locale}
                      priority="clean"
                      row={row}
                    />
                  ))}
                </tbody>
              </table>
              {cleanRows.length > CLEAN_ROWS_COLLAPSED_LIMIT ? (
                <div className="raidcheck-table-actions">
                  <Button
                    className="raidcheck-clean-toggle"
                    onClick={() => setShowAllCleanRows((current) => !current)}
                    type="button"
                    variant="outline"
                  >
                    {showAllCleanRows
                      ? t(locale, "raidcheck.collapseClean")
                      : t(locale, "raidcheck.showClean", { count: hiddenCleanRows })}
                  </Button>
                </div>
              ) : null}
            </ScrollArea>
          ) : (
            <div className="raidcheck-empty-result">
              <div className="raidcheck-empty-glow" aria-hidden="true" />
              <Search className="size-9" aria-hidden="true" />
              <h3>{t(locale, "raidcheck.readyToCheck")}</h3>
              <p>{t(locale, "raidcheck.readyToCheckCopy")}</p>
              <div className="raidcheck-empty-pills">
                <span>Normal</span>
                <span>Heroic</span>
                <span>Mythic</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
