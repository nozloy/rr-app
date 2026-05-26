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
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  AddonExportParseError,
  LEGACY_RAID_GOAL_LABEL,
  getImportedBannerDraftFromExport,
  getImportedBannerImageUrl,
  getImportedRaidDisplayMode,
  parseAddonExportString,
  type AddonGroupType,
  type AddonRole,
  type ImportedBannerDraft,
} from "@/lib/addon-export";
import type { DungeonDefinition } from "@/lib/dungeons";
import {
  getRaidArmorSummary,
  getRaidCompositionAnalysis,
  getRaidRecruitmentNeedsLabel,
} from "@/lib/raid-composition";
import { formatItemLevel } from "@/lib/utils";

type ImportBannerFormProps = {
  dungeons: DungeonDefinition[];
  initialExportString: string;
};

type InitialState = {
  draft: ImportedBannerDraft | null;
  error: string | null;
};

type ScannerControls = {
  stop: () => void;
};

const groupLabels: Record<AddonGroupType, string> = {
  solo: "Соло",
  party: "Группа",
  raid: "Рейд",
};

const roleLabels: Record<AddonRole, string> = {
  TANK: "Танк",
  HEALER: "Хилл",
  DAMAGER: "ДД",
  NONE: "Без роли",
};

const raidTankNeedOptions = [0, 1, 2];
const raidHealerNeedOptions = Array.from({ length: 11 }, (_, index) => index);

function parseInitialExportString(value: string): InitialState {
  if (!value.trim()) {
    return { draft: null, error: null };
  }

  try {
    return {
      draft: getImportedBannerDraftFromExport(parseAddonExportString(value)),
      error: null,
    };
  } catch (error) {
    return {
      draft: null,
      error:
        error instanceof AddonExportParseError
          ? error.message
          : "Не удалось прочитать строку экспорта.",
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
}: ImportBannerFormProps) {
  const initialState = parseInitialExportString(initialExportString);
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
      const parsed = parseAddonExportString(value);
      setDraft(getImportedBannerDraftFromExport(parsed));
      setError(null);
      return true;
    } catch (caughtError) {
      setDraft(null);
      setError(
        caughtError instanceof AddonExportParseError
          ? caughtError.message
          : "Не удалось прочитать строку экспорта.",
      );
      return false;
    }
  }, []);

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
        "Камера недоступна в этом браузере. Вставьте строку вручную или откройте страницу в мобильном браузере.",
      );
      return;
    }

    if (!window.isSecureContext) {
      setScannerError(
        "Сканирование QR работает только через HTTPS или localhost. Откройте защищенную версию страницы.",
      );
      return;
    }

    setIsScanning(true);
  }, []);

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
            "Камера недоступна. Разрешите доступ к камере в браузере/настройках и попробуйте еще раз.",
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
  }, [applyImportText, isScanning]);

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
  const raidDisplayMode = draft ? getImportedRaidDisplayMode(draft) : null;
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
      : selectedRaid?.name ?? selectedDungeon?.name ?? "Подземелье";
  const characterNameLabel =
    draft?.source.groupType === "raid" ? "Рейдлидер" : "Персонаж";
  const showCharacterMetaControls = !isLegacyRaid;
  const showMythicPlusControls = !isLegacyRaid && !isCurrentRaid;
  const showRaidNeedsControls = isCurrentRaid;

  return (
    <section className="form-shell columns-2">
      <Card className="surface-card form-panel">
        <CardContent className="space-y-7 p-6">
          <div className="space-y-4">
            <div>
              <div className="eyebrow">Источник</div>
              <h2 className="section-title mt-3">Данные из аддона</h2>
              <p className="subtle mt-3 mb-0 leading-7">
                Вставьте строку как есть. После распознавания черновик можно
                спокойно поправить вручную.
              </p>
            </div>

            <label className="grid gap-2">
              <span className="field-label">Строка RaidReminder</span>
              <Textarea
                className="min-h-40 resize-y font-mono text-sm"
                onChange={(event) => setExportText(event.currentTarget.value)}
                placeholder="RR1?name=... или RRQ1?..."
                value={exportText}
              />
            </label>

            <div className="action-row">
              <Button onClick={handleImport} type="button">
                Импортировать
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
                Очистить
              </Button>
              <Button
                onClick={isScanning ? stopScanner : startScanner}
                type="button"
                variant="outline"
              >
                <Camera className="size-4" aria-hidden="true" />
                {isScanning ? "Остановить сканер" : "Сканировать QR"}
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
                <div className="eyebrow">Черновик</div>
                <h2 className="section-title mt-3">Проверьте данные</h2>
                <p className="field-hint mt-2">
                  Эти значения попадут в превью и итоговый баннер.
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
                  <span className="field-label">Реалм</span>
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
                      <span className="field-label">Класс</span>
                      <Input
                        onChange={(event) =>
                          updateDraft({ className: event.currentTarget.value })
                        }
                        value={draft.className}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="field-label">Спек</span>
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
                      <span className="field-label">Подземелье</span>
                      <select
                        className="native-select"
                        onChange={(event) =>
                          updateDraft({ dungeonSlug: event.currentTarget.value })
                        }
                        value={draft.dungeonSlug}
                      >
                        {dungeons.map((dungeon) => (
                          <option key={dungeon.slug} value={dungeon.slug}>
                            {dungeon.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="field-label">Уровень ключа</span>
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
                      <span className="field-label">Сколько ДД уже есть</span>
                      <select
                        className="native-select"
                        onChange={(event) =>
                          updateDraft({
                            dpsFilled: clampNumber(
                              event.currentTarget.value,
                              0,
                              3,
                              0,
                            ),
                          })
                        }
                        value={draft.dpsFilled}
                      >
                        {[0, 1, 2, 3].map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : null}

                {showRaidNeedsControls ? (
                  <div className="grid gap-5 rounded-3xl border border-border bg-background/35 p-5 md:col-span-2 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <div className="eyebrow">Нужно в рейд</div>
                      <p className="field-hint mt-2">
                        Эти значения задаются вручную и не считаются из состава
                        аддона.
                      </p>
                    </div>

                    <label className="grid gap-2">
                      <span className="field-label">Танков нужно</span>
                      <select
                        className="native-select"
                        onChange={(event) =>
                          updateDraft({
                            raidTankNeeded: clampNumber(
                              event.currentTarget.value,
                              0,
                              2,
                              0,
                            ),
                          })
                        }
                        value={draft.raidTankNeeded}
                      >
                        {raidTankNeedOptions.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="field-label">Хилов нужно</span>
                      <select
                        className="native-select"
                        onChange={(event) =>
                          updateDraft({
                            raidHealerNeeded: clampNumber(
                              event.currentTarget.value,
                              0,
                              10,
                              0,
                            ),
                          })
                        }
                        value={draft.raidHealerNeeded}
                      >
                        {raidHealerNeedOptions.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}
              </div>

              {showMythicPlusControls ? (
                <div className="choice-grid">
                  <label className="check-card">
                    <input
                      checked={draft.tankFilled}
                      onChange={(event) =>
                        updateDraft({ tankFilled: event.currentTarget.checked })
                      }
                      type="checkbox"
                    />
                    <span>Танк уже есть</span>
                  </label>
                  <label className="check-card">
                    <input
                      checked={draft.healerFilled}
                      onChange={(event) =>
                        updateDraft({ healerFilled: event.currentTarget.checked })
                      }
                      type="checkbox"
                    />
                    <span>Хилл уже есть</span>
                  </label>
                  <label className="check-card">
                    <input
                      checked={draft.hasBloodlust}
                      onChange={(event) =>
                        updateDraft({ hasBloodlust: event.currentTarget.checked })
                      }
                      type="checkbox"
                    />
                    <span>Есть БЛ</span>
                  </label>
                  <label className="check-card">
                    <input
                      checked={draft.hasBattleRes}
                      onChange={(event) =>
                        updateDraft({ hasBattleRes: event.currentTarget.checked })
                      }
                      type="checkbox"
                    />
                    <span>Есть БР</span>
                  </label>
                </div>
              ) : isLegacyRaid ? (
                <p className="status-note">
                  Collection-run: в баннере останется только цель сбора без
                  требований к составу и экипировке.
                </p>
              ) : (
                <p className="status-note">
                  Рейдовые роли задаются вручную, а классы и бафы считаются из
                  состава аддона.
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
                <div className="eyebrow">Предпросмотр</div>
                <h2 className="section-title mt-3">Итоговый PNG</h2>
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
                    <span className="chip">{draft.source.groupSize} игроков</span>
                    {draft.source.instanceType ? (
                      <span className="chip">{draft.source.instanceType}</span>
                    ) : null}
                    {draft.source.difficultyName ? (
                      <span className="chip">{draft.source.difficultyName}</span>
                    ) : null}
                    {draft.source.selectedRaidDifficultyName ? (
                      <span className="chip chip-needed">
                        Выбрано: {draft.source.selectedRaidDifficultyName}
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
                          Танков нужно: {draft.raidTankNeeded}
                        </span>
                        <span
                          className={
                            draft.raidHealerNeeded > 0
                              ? "chip chip-needed"
                              : "chip"
                          }
                        >
                          Хилов нужно: {draft.raidHealerNeeded}
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
                      <div>Ключ из аддона: {draft.source.keyMapName}</div>
                    ) : null}
                    {draft.source.instanceName || isLegacyRaid ? (
                      <div className={isLegacyRaid ? "" : "subtle mt-1"}>
                        {isLegacyRaid ? "Рейд" : "Текущий инстанс"}:{" "}
                        {draft.source.instanceName ?? activityName}
                      </div>
                    ) : null}
                    {isLegacyRaid ? (
                      <div className="subtle mt-2">{LEGACY_RAID_GOAL_LABEL}</div>
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
                    Броня: {getRaidArmorSummary(raidAnalysis)}
                  </div>

                  {raidAnalysis.classNeeds.length > 0 ? (
                    <div className="chip-row">
                      {raidAnalysis.classNeeds.map((need) => (
                        <span className="chip chip-needed" key={need.classFile}>
                          Нужно: {need.label} x{need.missing}
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
                          Все рейдовые бафы закрыты
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
                        Скачать PNG
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="status-note warn">
                  {draft.source.groupType === "raid"
                    ? "Не удалось сформировать рейдовый PNG из текущего экспорта."
                    : "В экспорте нет Mythic+ ключа. Укажите уровень ключа в черновике, чтобы включить PNG-превью."}
                </p>
              )}

              <p className="subtle m-0 text-sm">
                {isLegacyRaid
                  ? LEGACY_RAID_GOAL_LABEL
                  : `ilvl ${formatItemLevel(draft.itemLevel)} · ${draft.className}${
                      draft.spec ? ` · ${draft.spec}` : ""
                    }`}
              </p>
            </div>
          ) : (
            <div className="preview-placeholder">
              <div className="max-w-sm">
                <ImageIcon className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
                <h2 className="section-title mt-4">Здесь появится баннер</h2>
                <p className="subtle mt-3 mb-0 leading-7">
                  Вставьте строку или включите сканер QR. Когда экспорт
                  распознается, здесь появится черновик и PNG-превью.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
