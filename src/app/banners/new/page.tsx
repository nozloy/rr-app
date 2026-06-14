import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, DownloadCloud, ImageIcon, SlidersHorizontal, UsersRound } from "lucide-react";
import { CopyImageButton } from "@/components/copy-image-button";
import { AppHeader } from "@/components/shell/app-header";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getGroupedNeedLabels } from "@/lib/banner-needs";
import {
  getBannerDraftFromPageParams,
  getBannerImageUrl,
  hasBannerDraftParams,
  type BannerType,
  type PageSearchParams,
} from "@/lib/banner-params";
import {
  currentSeasonDungeons,
  getDungeonBySlug,
  getLocalizedDungeonName,
} from "@/lib/dungeons";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { getPartyNeeds } from "@/lib/party-slots";
import { prisma } from "@/lib/prisma";
import {
  currentRaidInstances,
  getLocalizedRaidName,
  getRaidBySlug,
} from "@/lib/raids";
import { getRaidRecruitmentNeedsLabel } from "@/lib/raid-composition";
import { requireSession } from "@/lib/session";
import { formatItemLevel } from "@/lib/utils";

type NewBannerPageProps = {
  searchParams: Promise<PageSearchParams>;
};

function getBuilderSteps(locale: "ru" | "en") {
  return locale === "ru"
    ? [
        {
          title: "Основа",
          text: "Персонаж, подземелье и уровень ключа задают главный фокус PNG.",
          icon: ImageIcon,
        },
        {
          title: "Состав",
          text: "Роли и утилити превращаются в короткие читабельные строки.",
          icon: UsersRound,
        },
        {
          title: "Экспорт",
          text: "Готовый баннер можно скопировать в Discord или скачать.",
          icon: DownloadCloud,
        },
      ]
    : [
        {
          title: "Core",
          text: "Character, dungeon, and keystone level define the PNG focus.",
          icon: ImageIcon,
        },
        {
          title: "Composition",
          text: "Roles and utility become short readable strings.",
          icon: UsersRound,
        },
        {
          title: "Export",
          text: "Final banner can be copied to Discord or downloaded.",
          icon: DownloadCloud,
        },
      ];
}

const raidTankNeedOptions = [0, 1, 2];
const raidHealerNeedOptions = Array.from({ length: 11 }, (_, index) => index);
const formSelectTriggerClassName =
  "min-h-10 border-input bg-[rgba(8,13,20,0.72)] text-foreground";
const choiceCardClassName =
  "flex min-h-14 cursor-pointer items-center gap-3 rounded-[0.9rem] border border-[var(--line)] bg-white/[0.03] px-[0.95rem] py-[0.85rem] text-[#dce5f0] transition-colors hover:border-slate-200/30 hover:bg-white/[0.055]";
const choiceCheckboxClassName =
  "border-slate-300/55 data-[state=checked]:border-slate-100 data-[state=checked]:bg-slate-100 data-[state=checked]:text-slate-950";

function getModeHref({
  bannerType,
  characterId,
  dungeonSlug,
  raidSlug,
}: {
  bannerType: BannerType;
  characterId: string;
  dungeonSlug: string;
  raidSlug: string;
}) {
  const params = new URLSearchParams({
    bannerType,
    characterId,
  });

  if (bannerType === "raid") {
    params.set("raidSlug", raidSlug);
  } else {
    params.set("dungeonSlug", dungeonSlug);
  }

  return `/banners/new?${params.toString()}`;
}

export default async function NewBannerPage({
  searchParams,
}: NewBannerPageProps) {
  const locale = await getRequestLocale();
  const builderSteps = getBuilderSteps(locale);
  const session = await requireSession();
  const query = await searchParams;
  const characters = await prisma.character.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
    },
    orderBy: [{ itemLevel: "desc" }, { name: "asc" }],
  });

  const topCharacter = characters[0] ?? null;
  const headerUser = {
    avatarUrl: topCharacter?.avatarUrl ?? topCharacter?.thumbnailUrl ?? session.user.image ?? null,
    displayName:
      topCharacter?.name ?? session.user.name ?? t(locale, "header.playerFallback"),
  };
  const defaultCharacter = characters[0];
  const defaultDungeon = currentSeasonDungeons[0];
  const defaultRaid = currentRaidInstances[0];

  if (!defaultCharacter || !defaultDungeon || !defaultRaid) {
    return (
      <>
        <AppHeader user={headerUser} />
        <main className="app-shell space-y-6 py-6">
          <Card className="surface-card rounded-2xl">
            <CardContent className="p-6 md:p-8">
              <div className="panel-heading">
                <div className="max-w-2xl space-y-4">
                  <div className="eyebrow">{t(locale, "banners.createBannerEyebrow")}</div>
                  <h1 className="section-title">{t(locale, "banners.noCharacterTitle")}</h1>
                  <p className="subtle m-0 leading-7">
                    {t(locale, "banners.noCharacterCopy")}
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link href="/dashboard">
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    {t(locale, "banners.backToDashboard")}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  const rawDraft = getBannerDraftFromPageParams(query, {
    characterId: defaultCharacter.id,
    dungeonSlug: defaultDungeon.slug,
    raidSlug: defaultRaid.slug,
  });
  const hasPreview = hasBannerDraftParams(query);
  const selectedCharacter =
    characters.find((character) => character.id === rawDraft.characterId) ??
    defaultCharacter;
  const selectedDungeon =
    getDungeonBySlug(rawDraft.dungeonSlug) ?? defaultDungeon;
  const selectedRaid = getRaidBySlug(rawDraft.raidSlug ?? "") ?? defaultRaid;
  const draft = {
    ...rawDraft,
    characterId: selectedCharacter.id,
    dungeonSlug: selectedDungeon.slug,
    raidSlug: selectedRaid.slug,
    tankFilled:
      rawDraft.bannerType === "mythicPlus" && !hasPreview
        ? true
        : rawDraft.tankFilled,
  };
  const isRaidMode = draft.bannerType === "raid";
  const imageUrl = getBannerImageUrl(draft);
  const party = getPartyNeeds({
    tankFilled: draft.tankFilled,
    healerFilled: draft.healerFilled,
    dpsFilled: draft.dpsFilled,
  }, locale);
  const needLabels = getGroupedNeedLabels(party.neededLabels, {
    hasBloodlust: draft.hasBloodlust,
    hasBattleRes: draft.hasBattleRes,
  });
  const raidNeedsLabel = getRaidRecruitmentNeedsLabel({
    roleNeeds: {
      tankNeeded: draft.raidTankNeeded,
      healerNeeded: draft.raidHealerNeeded,
    },
    analysis: null,
  });

  return (
    <>
      <AppHeader user={headerUser} />
      <main className="app-shell space-y-6 py-6">
        <Card className="surface-card rounded-2xl">
        <CardContent className="p-6 md:p-8">
          <div className="panel-heading">
            <div className="max-w-3xl space-y-4">
              <div className="eyebrow">{t(locale, "banners.createBannerEyebrow")}</div>
              <h1 className="section-title">
                {locale === "ru" ? "Соберите Mythic+ или рейдовый PNG" : "Build Mythic+ or raid PNG"}
              </h1>
              <p className="lead-copy m-0 max-w-2xl">
                {locale === "ru"
                  ? "Быстрый конфигуратор без сохранения черновиков: параметры живут в URL, а справа видно итоговую картинку или ее структуру."
                  : "Fast builder without draft persistence: params live in URL and the right panel shows final image or structure."}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <ArrowLeft className="size-4" aria-hidden="true" />
                {t(locale, "banners.backToDashboard")}
              </Link>
            </Button>
          </div>

          <div className="method-grid mt-8">
            {builderSteps.map((step) => {
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

      <section className="form-shell columns-2">
        <Card className="surface-card form-panel">
          <CardContent className="space-y-7 p-6">
            <div>
              <div className="eyebrow">{t(locale, "banners.parameters")}</div>
              <h2 className="section-title mt-3">
                {isRaidMode
                  ? locale === "ru"
                    ? "Основа рейда"
                    : "Raid setup"
                  : locale === "ru"
                    ? "Основа группы"
                    : "Group setup"}
              </h2>
              <p className="subtle mt-3 mb-0 leading-7">
                {isRaidMode
                  ? locale === "ru"
                    ? "Выберите актуальный рейд и явно задайте, сколько ролей еще нужно."
                    : "Choose current raid and explicitly set how many roles are still needed."
                  : locale === "ru"
                    ? "Самые важные поля сверху, чтобы собрать баннер за один проход."
                    : "Most important fields are on top so you can assemble a banner in one pass."}
              </p>
            </div>

              <div className="space-y-3">
                <h3 className="m-0 text-lg font-semibold tracking-[-0.03em]">
                {locale === "ru" ? "Тип баннера" : "Banner type"}
                </h3>
              <div className="action-row">
                <Button asChild variant={!isRaidMode ? "default" : "outline"}>
                  <Link
                    href={getModeHref({
                      bannerType: "mythicPlus",
                      characterId: selectedCharacter.id,
                      dungeonSlug: selectedDungeon.slug,
                      raidSlug: selectedRaid.slug,
                    })}
                  >
                    Mythic+
                  </Link>
                </Button>
                <Button asChild variant={isRaidMode ? "default" : "outline"}>
                  <Link
                    href={getModeHref({
                      bannerType: "raid",
                      characterId: selectedCharacter.id,
                      dungeonSlug: selectedDungeon.slug,
                      raidSlug: selectedRaid.slug,
                    })}
                  >
                    {t(locale, "events.typeRaid")}
                  </Link>
                </Button>
              </div>
            </div>

            <form method="get" className="space-y-7">
              <input name="bannerType" type="hidden" value={draft.bannerType} />

              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="field-label">{locale === "ru" ? "Персонаж" : "Character"}</span>
                  <Select defaultValue={draft.characterId} name="characterId">
                    <SelectTrigger className={formSelectTriggerClassName}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                    {characters.map((character) => (
                      <SelectItem key={character.id} value={character.id}>
                        {character.name} · {character.realm} · ilvl{" "}
                        {formatItemLevel(character.itemLevel)}
                      </SelectItem>
                    ))}
                    </SelectContent>
                  </Select>
                </label>

                {isRaidMode ? (
                  <>
                    <label className="grid gap-2">
                      <span className="field-label">{t(locale, "events.typeRaid")}</span>
                      <Select defaultValue={draft.raidSlug} name="raidSlug">
                        <SelectTrigger className={formSelectTriggerClassName}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                        {currentRaidInstances.map((raid) => (
                          <SelectItem key={raid.slug} value={raid.slug}>
                            {getLocalizedRaidName(raid, locale)}
                          </SelectItem>
                        ))}
                        </SelectContent>
                      </Select>
                    </label>

                    <label className="grid gap-2">
                      <span className="field-label">{locale === "ru" ? "Танков нужно" : "Tanks needed"}</span>
                      <Select defaultValue={String(draft.raidTankNeeded)} name="raidTankNeeded">
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
                      <Select defaultValue={String(draft.raidHealerNeeded)} name="raidHealerNeeded">
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
                  </>
                ) : (
                  <>
                    <label className="grid gap-2">
                      <span className="field-label">{t(locale, "events.typeDungeon")}</span>
                      <Select defaultValue={draft.dungeonSlug} name="dungeonSlug">
                        <SelectTrigger className={formSelectTriggerClassName}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                        {currentSeasonDungeons.map((dungeon) => (
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
                        defaultValue={draft.keystoneLevel}
                        max={30}
                        min={2}
                        name="keystoneLevel"
                        type="number"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="field-label">{locale === "ru" ? "Сколько ДД уже есть" : "DPS already filled"}</span>
                      <Select defaultValue={String(draft.dpsFilled)} name="dpsFilled">
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
                )}
              </div>

              {!isRaidMode ? (
                <div className="space-y-3">
                  <h3 className="m-0 text-lg font-semibold tracking-[-0.03em]">
                    {locale === "ru" ? "Слоты и утилити" : "Slots and utility"}
                  </h3>
                  <div className="choice-grid">
                    <label className={choiceCardClassName}>
                      <Checkbox
                        className={choiceCheckboxClassName}
                        defaultChecked={draft.tankFilled}
                        name="tankFilled"
                      />
                      <span>{locale === "ru" ? "Танк уже есть" : "Tank filled"}</span>
                    </label>
                    <label className={choiceCardClassName}>
                      <Checkbox
                        className={choiceCheckboxClassName}
                        defaultChecked={draft.healerFilled}
                        name="healerFilled"
                      />
                      <span>{locale === "ru" ? "Хилл уже есть" : "Healer filled"}</span>
                    </label>
                    <label className={choiceCardClassName}>
                      <Checkbox
                        className={choiceCheckboxClassName}
                        defaultChecked={draft.hasBloodlust}
                        name="hasBloodlust"
                      />
                      <span>{locale === "ru" ? "Есть БЛ" : "Bloodlust covered"}</span>
                    </label>
                    <label className={choiceCardClassName}>
                      <Checkbox
                        className={choiceCheckboxClassName}
                        defaultChecked={draft.hasBattleRes}
                        name="hasBattleRes"
                      />
                      <span>{locale === "ru" ? "Есть БР" : "Battle res covered"}</span>
                    </label>
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                <h3 className="m-0 text-lg font-semibold tracking-[-0.03em]">
                  {locale === "ru" ? "Как это будет читаться" : "How it reads"}
                </h3>
                <div className="chip-row">
                  {isRaidMode ? (
                    <span className="chip chip-needed">{raidNeedsLabel}</span>
                  ) : (
                    <>
                      {party.slots.map((slot) => (
                        <span
                          className={`chip ${slot.filled ? "chip-filled" : "chip-needed"}`}
                          key={slot.key}
                        >
                          {slot.filled
                            ? locale === "ru"
                              ? "Закрыто"
                              : "Filled"
                            : locale === "ru"
                              ? "Свободно"
                              : "Open"}{" "}
                          · {slot.label}
                        </span>
                      ))}
                      {needLabels.map((label) => (
                        <span className="chip chip-needed" key={label}>
                          {locale === "ru" ? "Нужно" : "Need"} · {label}
                        </span>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div className="action-row">
                <SubmitButton pendingLabel={t(locale, "banners.generatingBanner")}>
                  {t(locale, "banners.createBanner")}
                </SubmitButton>
                <Button asChild variant="outline">
                  <Link href="/dashboard">{t(locale, "common.cancel")}</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="surface-card preview-panel sticky-preview">
          <SlidersHorizontal className="background-icon" aria-hidden="true" />
          <CardContent className="p-6">
            <div className="mb-5">
              <div className="eyebrow">{t(locale, "banners.preview")}</div>
              <h2 className="section-title mt-3">{t(locale, "banners.finalPng")}</h2>
              <p className="subtle mt-3 mb-0">
                {selectedCharacter.name} ·{" "}
                {isRaidMode
                  ? getLocalizedRaidName(selectedRaid, locale)
                  : `${getLocalizedDungeonName(selectedDungeon, locale)} +${draft.keystoneLevel}`}
              </p>
            </div>

            <div className="chip-row mb-5">
              <span className="chip">{selectedCharacter.className}</span>
              <span className="chip">ilvl {formatItemLevel(selectedCharacter.itemLevel)}</span>
              {isRaidMode ? (
                <>
                  <span
                    className={
                      draft.raidTankNeeded > 0 ? "chip chip-needed" : "chip"
                    }
                    >
                    {locale === "ru" ? "Танков нужно" : "Tanks needed"}: {draft.raidTankNeeded}
                  </span>
                  <span
                    className={
                      draft.raidHealerNeeded > 0 ? "chip chip-needed" : "chip"
                    }
                    >
                    {locale === "ru" ? "Хилов нужно" : "Healers needed"}: {draft.raidHealerNeeded}
                  </span>
                </>
              ) : (
                <span className="chip">
                  {party.slots.filter((slot) => slot.filled).length}/5
                </span>
              )}
            </div>

            {hasPreview ? (
              <div className="space-y-4">
                <div className="image-frame">
                    <Image
                      alt={`Баннер ${selectedCharacter.name}`}
                    className="w-full"
                    src={imageUrl}
                    unoptimized
                    width={1200}
                    height={675}
                  />
                </div>
                <div className="action-row">
                  <CopyImageButton imageUrl={imageUrl} />
                  <Button asChild variant="outline">
                    <a download="raid-reminder-banner.png" href={imageUrl}>
                      <DownloadCloud className="size-4" aria-hidden="true" />
                      {t(locale, "common.downloadPng")}
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="preview-placeholder"
                style={{
                  backgroundImage: `linear-gradient(135deg, rgba(8,13,20,0.88), rgba(8,13,20,0.66)), url(${selectedDungeon.artPath})`,
                  ...(isRaidMode
                    ? {
                        backgroundImage: `linear-gradient(135deg, rgba(8,13,20,0.88), rgba(8,13,20,0.66)), url(${selectedRaid.artPath})`,
                      }
                    : {}),
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                }}
              >
                <div className="max-w-sm">
                  <ImageIcon className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
                  <h3 className="section-title mt-4">{t(locale, "banners.clickToCreate")}</h3>
                  <p className="subtle mt-3 mb-0 leading-7">{t(locale, "banners.clickToCreateCopy")}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </section>
      </main>
    </>
  );
}
