"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  DownloadCloud,
  ImageIcon,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import { CopyImageButton } from "@/components/copy-image-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AddonExportParseError,
  getLegacyRaidGoalLabel,
  getImportedBannerDraftFromExport,
  getImportedBannerImageUrl,
  getImportedRaidDisplayMode,
  parseAddonExportString,
  type AddonGroupType,
  type AddonRole,
  type ImportedBannerDraft,
} from "@/lib/addon-export";
import { getLocalizedDungeonName, type DungeonDefinition } from "@/lib/dungeons";
import { t, type AppLocale } from "@/lib/i18n";
import {
  getRaidArmorSummary,
  getRaidCompositionAnalysis,
  getRaidRecruitmentNeedsLabel,
} from "@/lib/raid-composition";
import { getLocalizedRaidName } from "@/lib/raids";
import { formatItemLevel } from "@/lib/utils";

type ImportBannerFormProps = {
  dungeons: DungeonDefinition[];
  initialExportString: string;
  locale: AppLocale;
};

type InitialState = {
  draft: ImportedBannerDraft | null;
  error: string | null;
};

type ScannerControls = {
  stop: () => void;
};

function getGroupLabels(locale: AppLocale): Record<AddonGroupType, string> {
  return {
    solo: t(locale, "banners.groupTypeSolo"),
    party: t(locale, "banners.groupTypeParty"),
    raid: t(locale, "banners.groupTypeRaid"),
  };
}

function getRoleLabels(locale: AppLocale): Record<AddonRole, string> {
  return {
    TANK: t(locale, "banners.roleTank"),
    HEALER: t(locale, "banners.roleHealer"),
    DAMAGER: t(locale, "banners.roleDamage"),
    NONE: t(locale, "banners.roleNone"),
  };
}

const raidTankNeedOptions = [0, 1, 2];
const raidHealerNeedOptions = Array.from({ length: 11 }, (_, index) => index);
const formSelectTriggerClassName =
  "min-h-10 border-input bg-[rgba(8,13,20,0.72)] text-foreground";
const choiceCardClassName =
  "flex min-h-14 cursor-pointer items-center gap-3 rounded-[0.9rem] border border-[var(--line)] bg-white/[0.03] px-[0.95rem] py-[0.85rem] text-[#dce5f0] transition-colors hover:border-slate-200/30 hover:bg-white/[0.055]";
const choiceCheckboxClassName =
  "border-slate-300/55 data-[state=checked]:border-slate-100 data-[state=checked]:bg-slate-100 data-[state=checked]:text-slate-950";

function parseInitialExportString(value: string, locale: AppLocale): InitialState {
  if (!value.trim()) {
    return { draft: null, error: null };
  }

  try {
    return {
      draft: getImportedBannerDraftFromExport(parseAddonExportString(value, locale)),
      error: null,
    };
  } catch (error) {
    return {
      draft: null,
      error:
        error instanceof AddonExportParseError
          ? error.message
          : t(locale, "addonExport.parseError"),
    };
  }
}

function clampNumber(value: string, min: number, max: number, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  const safeValue = Number.isFinite(parsed) ? parsed : fallback;

  return Math.max(min, Math.min(max, safeValue));
}

export function ImportBannerForm({
  dungeons,
  initialExportString,
  locale,
}: ImportBannerFormProps) {
  const groupLabels = getGroupLabels(locale);
  const roleLabels = getRoleLabels(locale);
  const initialState = parseInitialExportString(initialExportString, locale);
  const [exportText, setExportText] = useState(initialExportString);
  const [draft, setDraft] = useState<ImportedBannerDraft | null>(
    initialState.draft,
  );
  const [error, setError] = useState<string | null>(initialState.error);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControlsRef = useRef<ScannerControls | null>(null);

  const applyImportText = useCallback((value: string) => {
    try {
      const parsed = parseAddonExportString(value, locale);
      setDraft(getImportedBannerDraftFromExport(parsed));
      setError(null);
      return true;
    } catch (caughtError) {
      setDraft(null);
      setError(
        caughtError instanceof AddonExportParseError
          ? caughtError.message
          : t(locale, "addonExport.parseError"),
      );
      return false;
    }
  }, [locale]);

  const stopScanner = useCallback(() => {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    setIsScanning(false);
  }, []);

  const startScanner = useCallback(() => {
    setScannerError(null);

    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setScannerError(
        locale === "ru"
          ? "Камера недоступна в этом браузере. Вставьте строку вручную или откройте страницу в мобильном браузере."
          : "Camera is unavailable in this browser. Paste export manually or open the page on mobile.",
      );
      return;
    }

    if (!window.isSecureContext) {
      setScannerError(
        locale === "ru"
          ? "Сканирование QR работает только через HTTPS или localhost. Откройте защищенную версию страницы."
          : "QR scanner works only over HTTPS or localhost. Open secure page URL.",
      );
      return;
    }

    setIsScanning(true);
  }, [locale]);

  useEffect(() => {
    if (!isScanning) {
      return;
    }

    let canceled = false;

    async function decodeQr() {
      try {
        const videoElement = videoRef.current;
        if (!videoElement) {
          return;
        }

        const { BrowserQRCodeReader } = await import("@zxing/browser");
        const reader = new BrowserQRCodeReader();
        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
            },
          },
          videoElement,
          (result, scanError, callbackControls) => {
            if (scanError || !result || canceled) {
              return;
            }

            const scannedText = result.getText();
            callbackControls.stop();
            scannerControlsRef.current = null;
            setIsScanning(false);
            setScannerError(null);
            setExportText(scannedText);
            applyImportText(scannedText);
          },
        );

        if (canceled) {
          controls.stop();
          return;
        }

        scannerControlsRef.current = controls;
      } catch {
        if (!canceled) {
          setScannerError(
            locale === "ru"
              ? "Камера недоступна. Разрешите доступ к камере в браузере/настройках и попробуйте еще раз."
              : "Camera is unavailable. Allow camera access in browser/settings and try again.",
          );
          setIsScanning(false);
        }
      }
    }

    void decodeQr();

    return () => {
      canceled = true;
      scannerControlsRef.current?.stop();
      scannerControlsRef.current = null;
    };
  }, [applyImportText, isScanning, locale]);

  function handleImport() {
    applyImportText(exportText);
  }

  function updateDraft(patch: Partial<ImportedBannerDraft>) {
    setDraft((currentDraft) =>
      currentDraft ? { ...currentDraft, ...patch } : currentDraft,
    );
  }

  const selectedDungeon = draft
    ? dungeons.find((dungeon) => dungeon.slug === draft.dungeonSlug)
    : null;
  const raidDisplayMode = draft ? getImportedRaidDisplayMode(draft, locale) : null;
  const selectedRaid = raidDisplayMode?.raid ?? null;
  const isLegacyRaid = raidDisplayMode?.bannerVariant === "legacyRaid";
  const isCurrentRaid = raidDisplayMode?.bannerVariant === "currentRaid";
  const raidAnalysis =
    draft && selectedRaid ? getRaidCompositionAnalysis(draft.source) : null;
  const raidNeedsLabel =
    draft && raidAnalysis
      ? getRaidRecruitmentNeedsLabel({
          roleNeeds: {
            tankNeeded: draft.raidTankNeeded,
            healerNeeded: draft.raidHealerNeeded,
          },
          analysis: raidAnalysis,
        })
      : null;
  const imageUrl =
    draft && (draft.hasMythicPlusKey || selectedRaid || isLegacyRaid)
      ? getImportedBannerImageUrl(draft)
      : null;
  const activityName =
    isLegacyRaid && raidDisplayMode
      ? raidDisplayMode.activityName
      : selectedRaid
        ? getLocalizedRaidName(selectedRaid, locale)
        : selectedDungeon
          ? getLocalizedDungeonName(selectedDungeon, locale)
          : t(locale, "events.typeDungeon");
  const characterNameLabel = draft?.source.groupType === "raid"
    ? (locale === "ru" ? "Рейдлидер" : "Raid leader")
    : (locale === "ru" ? "Персонаж" : "Character");
  const showCharacterMetaControls = !isLegacyRaid;
  const showMythicPlusControls = !isLegacyRaid && !isCurrentRaid;
  const showRaidNeedsControls = isCurrentRaid;

  return (
    <section className="form-shell columns-2">
      <Card className="surface-card form-panel">
        <CardContent className="space-y-7 p-6">
          <div className="space-y-4">
            <div>
              <div className="eyebrow">{t(locale, "banners.source")}</div>
              <h2 className="section-title mt-3">{t(locale, "banners.addonData")}</h2>
              <p className="subtle mt-3 mb-0 leading-7">
                {locale === "ru"
                  ? "Вставьте строку как есть. После распознавания черновик можно спокойно поправить вручную."
                  : "Paste export as-is. After parsing, you can safely edit draft fields."}
              </p>
            </div>

            <label className="grid gap-2">
              <span className="field-label">{t(locale, "banners.exportString")}</span>
              <Textarea
                className="min-h-40 resize-y font-mono text-sm"
                onChange={(event) => setExportText(event.currentTarget.value)}
                placeholder={locale === "ru" ? "RR1?name=... или RRQ1?..." : "RR1?name=... or RRQ1?..."}
                value={exportText}
              />
            </label>

            <div className="action-row">
              <Button onClick={handleImport} type="button">
                {t(locale, "banners.importButton")}
              </Button>
              <Button
                onClick={() => {
                  stopScanner();
                  setExportText("");
                  setDraft(null);
                  setError(null);
                  setScannerError(null);
                }}
                type="button"
                variant="outline"
              >
                {t(locale, "banners.clearButton")}
              </Button>
              <Button
                onClick={isScanning ? stopScanner : startScanner}
                type="button"
                variant="outline"
              >
                <Camera className="size-4" aria-hidden="true" />
                {isScanning ? t(locale, "banners.stopScanner") : t(locale, "banners.scanQr")}
              </Button>
            </div>

            {scannerError ? <p className="status-note warn">{scannerError}</p> : null}

            {isScanning ? (
              <div className="image-frame">
                <video
                  className="aspect-video w-full object-cover"
                  muted
                  playsInline
                  ref={videoRef}
                />
              </div>
            ) : null}

            {error ? <p className="status-note error">{error}</p> : null}
          </div>

          {draft ? (
            <div className="grid gap-6 border-t border-border pt-7">
                <div>
                <div className="eyebrow">{t(locale, "banners.draft")}</div>
                <h2 className="section-title mt-3">{t(locale, "banners.checkData")}</h2>
                <p className="field-hint mt-2">
                  {locale === "ru"
                    ? "Эти значения попадут в превью и итоговый баннер."
                    : "These values are used for preview and final banner."}
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="field-label">{characterNameLabel}</span>
                  <Input
                    onChange={(event) =>
                      updateDraft({ characterName: event.currentTarget.value })
                    }
                    value={draft.characterName}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="field-label">{t(locale, "common.realm")}</span>
                  <Input
                    onChange={(event) =>
                      updateDraft({ realm: event.currentTarget.value })
                    }
                    value={draft.realm}
                  />
                </label>

                {showCharacterMetaControls ? (
                  <>
                    <label className="grid gap-2">
                      <span className="field-label">{locale === "ru" ? "Класс" : "Class"}</span>
                      <Input
                        onChange={(event) =>
                          updateDraft({ className: event.currentTarget.value })
                        }
                        value={draft.className}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="field-label">{locale === "ru" ? "Спек" : "Spec"}</span>
                      <Input
                        onChange={(event) =>
                          updateDraft({ spec: event.currentTarget.value || null })
                        }
                        value={draft.spec ?? ""}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="field-label">ilvl</span>
                      <Input
                        max={999}
                        min={0}
                        onChange={(event) =>
                          updateDraft({
                            itemLevel: clampNumber(
                              event.currentTarget.value,
                              0,
                              999,
                              0,
                            ),
                          })
                        }
                        type="number"
                        value={draft.itemLevel}
                      />
                    </label>
                  </>
                ) : null}

                {showMythicPlusControls ? (
                  <>
                    <label className="grid gap-2">
                      <span className="field-label">{t(locale, "events.typeDungeon")}</span>
                      <Select
                        onValueChange={(value) => updateDraft({ dungeonSlug: value })}
                        value={draft.dungeonSlug}
                      >
                        <SelectTrigger className={formSelectTriggerClassName}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                        {dungeons.map((dungeon) => (
                          <SelectItem key={dungeon.slug} value={dungeon.slug}>
                            {getLocalizedDungeonName(dungeon, locale)}
                          </SelectItem>
                        ))}
                        </SelectContent>
                      </Select>
                    </label>

                    <label className="grid gap-2">
                      <span className="field-label">{locale === "ru" ? "Уровень ключа" : "Keystone level"}</span>
                      <Input
                        max={30}
                        min={2}
                        onChange={(event) =>
                          updateDraft({
                            hasMythicPlusKey: true,
                            keystoneLevel: clampNumber(
                              event.currentTarget.value,
                              2,
                              30,
                              10,
                            ),
                          })
                        }
                        type="number"
                        value={draft.keystoneLevel}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="field-label">{locale === "ru" ? "Сколько ДД уже есть" : "DPS already filled"}</span>
                      <Select
                        onValueChange={(value) =>
                          updateDraft({
                            dpsFilled: clampNumber(
                              value,
                              0,
                              3,
                              0,
                            ),
                          })
                        }
                        value={String(draft.dpsFilled)}
                      >
                        <SelectTrigger className={formSelectTriggerClassName}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                        {[0, 1, 2, 3].map((value) => (
                          <SelectItem key={value} value={String(value)}>
                            {value}
                          </SelectItem>
                        ))}
                        </SelectContent>
                      </Select>
                    </label>
                  </>
                ) : null}

                {showRaidNeedsControls ? (
                  <div className="grid gap-5 rounded-3xl border border-border bg-background/35 p-5 md:col-span-2 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <div className="eyebrow">{locale === "ru" ? "Нужно в рейд" : "Raid needs"}</div>
                      <p className="field-hint mt-2">
                        {locale === "ru"
                          ? "Эти значения задаются вручную и не считаются из состава аддона."
                          : "These values are manual and not inferred from addon roster."}
                      </p>
                    </div>

                    <label className="grid gap-2">
                      <span className="field-label">{locale === "ru" ? "Танков нужно" : "Tanks needed"}</span>
                      <Select
                        onValueChange={(value) =>
                          updateDraft({
                            raidTankNeeded: clampNumber(
                              value,
                              0,
                              2,
                              0,
                            ),
                          })
                        }
                        value={String(draft.raidTankNeeded)}
                      >
                        <SelectTrigger className={formSelectTriggerClassName}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                        {raidTankNeedOptions.map((value) => (
                          <SelectItem key={value} value={String(value)}>
                            {value}
                          </SelectItem>
                        ))}
                        </SelectContent>
                      </Select>
                    </label>

                    <label className="grid gap-2">
                      <span className="field-label">{locale === "ru" ? "Хилов нужно" : "Healers needed"}</span>
                      <Select
                        onValueChange={(value) =>
                          updateDraft({
                            raidHealerNeeded: clampNumber(
                              value,
                              0,
                              10,
                              0,
                            ),
                          })
                        }
                        value={String(draft.raidHealerNeeded)}
                      >
                        <SelectTrigger className={formSelectTriggerClassName}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                        {raidHealerNeedOptions.map((value) => (
                          <SelectItem key={value} value={String(value)}>
                            {value}
                          </SelectItem>
                        ))}
                        </SelectContent>
                      </Select>
                    </label>
                  </div>
                ) : null}
              </div>

              {showMythicPlusControls ? (
                <div className="choice-grid">
                  <label className={choiceCardClassName}>
                    <Checkbox
                      className={choiceCheckboxClassName}
                      checked={draft.tankFilled}
                      onCheckedChange={(checked) => updateDraft({ tankFilled: checked === true })}
                    />
                    <span>{locale === "ru" ? "Танк уже есть" : "Tank filled"}</span>
                  </label>
                  <label className={choiceCardClassName}>
                    <Checkbox
                      className={choiceCheckboxClassName}
                      checked={draft.healerFilled}
                      onCheckedChange={(checked) => updateDraft({ healerFilled: checked === true })}
                    />
                    <span>{locale === "ru" ? "Хилл уже есть" : "Healer filled"}</span>
                  </label>
                  <label className={choiceCardClassName}>
                    <Checkbox
                      className={choiceCheckboxClassName}
                      checked={draft.hasBloodlust}
                      onCheckedChange={(checked) => updateDraft({ hasBloodlust: checked === true })}
                    />
                    <span>{locale === "ru" ? "Есть БЛ" : "Bloodlust covered"}</span>
                  </label>
                  <label className={choiceCardClassName}>
                    <Checkbox
                      className={choiceCheckboxClassName}
                      checked={draft.hasBattleRes}
                      onCheckedChange={(checked) => updateDraft({ hasBattleRes: checked === true })}
                    />
                    <span>{locale === "ru" ? "Есть БР" : "Battle res covered"}</span>
                  </label>
                </div>
              ) : isLegacyRaid ? (
                <p className="status-note">
                  {locale === "ru"
                    ? "Collection-run: в баннере останется только цель сбора без требований к составу и экипировке."
                    : "Collection run: banner keeps only gathering goal, without roster and gear requirements."}
                </p>
              ) : (
                <p className="status-note">
                  {locale === "ru"
                    ? "Рейдовые роли задаются вручную, а классы и бафы считаются из состава аддона."
                    : "Raid role needs are manual, while classes and buffs are inferred from addon roster."}
                </p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="surface-card preview-panel sticky-preview">
        <SlidersHorizontal className="background-icon" aria-hidden="true" />
        <CardContent className="p-6">
          {draft ? (
            <div className="space-y-5">
              <div>
                <div className="eyebrow">{t(locale, "banners.preview")}</div>
                <h2 className="section-title mt-3">{t(locale, "banners.resultPng")}</h2>
                <p className="subtle mt-3 mb-0">
                  {draft.characterName} · {activityName}
                  {draft.source.groupType === "raid"
                    ? ""
                    : ` +${draft.keystoneLevel}`}
                </p>
              </div>

              <div className="chip-row">
                <span className="chip chip-filled">
                  {isLegacyRaid ? "Collection run" : groupLabels[draft.source.groupType]}
                </span>
                {isLegacyRaid ? (
                  <span className="chip">Legacy</span>
                ) : (
                  <>
                    <span className="chip">
                      {draft.source.groupSize} {locale === "ru" ? "игроков" : "players"}
                    </span>
                    {draft.source.instanceType ? (
                      <span className="chip">{draft.source.instanceType}</span>
                    ) : null}
                    {draft.source.difficultyName ? (
                      <span className="chip">{draft.source.difficultyName}</span>
                    ) : null}
                    {draft.source.selectedRaidDifficultyName ? (
                      <span className="chip chip-needed">
                        {locale === "ru" ? "Выбрано" : "Selected"}: {draft.source.selectedRaidDifficultyName}
                      </span>
                    ) : null}
                    {isCurrentRaid ? (
                      <>
                        <span
                          className={
                            draft.raidTankNeeded > 0
                              ? "chip chip-needed"
                              : "chip"
                          }
                        >
                          {locale === "ru" ? "Танков нужно" : "Tanks needed"}: {draft.raidTankNeeded}
                        </span>
                        <span
                          className={
                            draft.raidHealerNeeded > 0
                              ? "chip chip-needed"
                              : "chip"
                          }
                        >
                          {locale === "ru" ? "Хилов нужно" : "Healers needed"}: {draft.raidHealerNeeded}
                        </span>
                      </>
                    ) : null}
                  </>
                )}
              </div>

              {isLegacyRaid || draft.source.instanceName || draft.source.keyMapName ? (
                <Card className="quiet-card">
                  <CardContent className="p-4 text-sm">
                    {draft.source.keyMapName && !isLegacyRaid ? (
                      <div>{locale === "ru" ? "Ключ из аддона" : "Key from addon"}: {draft.source.keyMapName}</div>
                    ) : null}
                    {draft.source.instanceName || isLegacyRaid ? (
                      <div className={isLegacyRaid ? "" : "subtle mt-1"}>
                        {isLegacyRaid
                          ? t(locale, "events.typeRaid")
                          : locale === "ru"
                            ? "Текущий инстанс"
                            : "Current instance"}
                        :{" "}
                        {draft.source.instanceName ?? activityName}
                      </div>
                    ) : null}
                    {isLegacyRaid ? (
                      <div className="subtle mt-2">{getLegacyRaidGoalLabel(locale)}</div>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}

              {draft.source.members.length > 0 && !isLegacyRaid ? (
                <ScrollArea className="max-h-32 pr-3">
                  <div className="chip-row">
                    {draft.source.members.map((member, index) => (
                      <span
                        className="member-chip"
                        key={`${member.classFile}-${index}`}
                      >
                        <UsersRound className="size-4" aria-hidden="true" />
                        {member.classFile} · {roleLabels[member.role]}
                      </span>
                    ))}
                  </div>
                </ScrollArea>
              ) : null}

              {raidAnalysis ? (
                <div className="raid-analysis-card space-y-3 text-sm">
                  {raidNeedsLabel ? (
                    <div className="chip chip-needed w-fit">{raidNeedsLabel}</div>
                  ) : null}

                  <div className="chip-row">
                    {raidAnalysis.armorCounts.map((armor) => (
                      <span className="chip" key={armor.key}>
                        {armor.label}: {armor.count}
                      </span>
                    ))}
                  </div>

                  <div className="subtle">
                    {t(locale, "banners.armor")}: {getRaidArmorSummary(raidAnalysis)}
                  </div>

                  {raidAnalysis.classNeeds.length > 0 ? (
                    <div className="chip-row">
                      {raidAnalysis.classNeeds.map((need) => (
                        <span className="chip chip-needed" key={need.classFile}>
                          {locale === "ru" ? "Нужно" : "Need"}: {need.label} x{need.missing}
                          {need.reasons.length > 0
                            ? ` (${need.reasons.join(", ")})`
                            : ""}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <ScrollArea className="max-h-28 pr-3">
                    <div className="chip-row">
                      {raidAnalysis.missingBuffs.length > 0 ? (
                        raidAnalysis.missingBuffs.map((buff) => (
                          <span className="member-chip" key={buff.key}>
                            <Image
                              alt=""
                              className="size-6 rounded-full"
                              height={24}
                              src={buff.iconPath}
                              unoptimized
                              width={24}
                            />
                            {buff.label}
                          </span>
                        ))
                      ) : (
                        <span className="chip chip-filled">
                          {locale === "ru" ? "Все рейдовые бафы закрыты" : "All raid buffs are covered"}
                        </span>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              ) : null}

              {imageUrl ? (
                <div className="space-y-4">
                  <div className="image-frame">
                    <Image
                      alt={`Баннер ${draft.characterName}`}
                      className="w-full"
                      height={675}
                      src={imageUrl}
                      unoptimized
                      width={1200}
                    />
                  </div>
                  <div className="action-row">
                    <CopyImageButton imageUrl={imageUrl} />
                    <Button asChild variant="outline">
                      <a
                        download="raid-reminder-import-banner.png"
                        href={imageUrl}
                      >
                        <DownloadCloud className="size-4" aria-hidden="true" />
                        {t(locale, "common.downloadPng")}
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="status-note warn">
                  {draft.source.groupType === "raid"
                    ? locale === "ru"
                      ? "Не удалось сформировать рейдовый PNG из текущего экспорта."
                      : "Failed to build raid PNG from current export."
                    : locale === "ru"
                      ? "В экспорте нет Mythic+ ключа. Укажите уровень ключа в черновике, чтобы включить PNG-превью."
                      : "Export has no Mythic+ key. Set keystone level in draft to enable PNG preview."}
                </p>
              )}

              <p className="subtle m-0 text-sm">
                {isLegacyRaid
                  ? getLegacyRaidGoalLabel(locale)
                  : `ilvl ${formatItemLevel(draft.itemLevel)} · ${draft.className}${
                      draft.spec ? ` · ${draft.spec}` : ""
                    }`}
              </p>
            </div>
          ) : (
            <div className="preview-placeholder">
              <div className="max-w-sm">
                <ImageIcon className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
                <h2 className="section-title mt-4">
                  {locale === "ru" ? "Здесь появится баннер" : "Banner will appear here"}
                </h2>
                <p className="subtle mt-3 mb-0 leading-7">
                  {locale === "ru"
                    ? "Вставьте строку или включите сканер QR. Когда экспорт распознается, здесь появится черновик и PNG-превью."
                    : "Paste export string or enable QR scanner. Parsed draft and PNG preview will appear here."}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
