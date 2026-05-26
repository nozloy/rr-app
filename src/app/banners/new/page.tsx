import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, DownloadCloud, ImageIcon, SlidersHorizontal, UsersRound } from "lucide-react";
import { CopyImageButton } from "@/components/copy-image-button";
import { AppHeader } from "@/components/shell/app-header";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getGroupedNeedLabels } from "@/lib/banner-needs";
import {
  getBannerDraftFromPageParams,
  getBannerImageUrl,
  hasBannerDraftParams,
  type BannerType,
  type PageSearchParams,
} from "@/lib/banner-params";
import { currentSeasonDungeons, getDungeonBySlug } from "@/lib/dungeons";
import { getPartyNeeds } from "@/lib/party-slots";
import { prisma } from "@/lib/prisma";
import { currentRaidInstances, getRaidBySlug } from "@/lib/raids";
import { getRaidRecruitmentNeedsLabel } from "@/lib/raid-composition";
import { requireSession } from "@/lib/session";
import { formatItemLevel } from "@/lib/utils";

type NewBannerPageProps = {
  searchParams: Promise<PageSearchParams>;
};

const builderSteps = [
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
];

const raidTankNeedOptions = [0, 1, 2];
const raidHealerNeedOptions = Array.from({ length: 11 }, (_, index) => index);

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
    displayName: topCharacter?.name ?? session.user.name ?? "Игрок",
  };
  const defaultCharacter = characters[0];
  const defaultDungeon = currentSeasonDungeons[0];
  const defaultRaid = currentRaidInstances[0];

  if (!defaultCharacter || !defaultDungeon || !defaultRaid) {
    return (
      <>
        <AppHeader compact user={headerUser} />
        <main className="app-shell space-y-6 py-6">
          <Card className="surface-card rounded-2xl">
            <CardContent className="p-6 md:p-8">
              <div className="panel-heading">
                <div className="max-w-2xl space-y-4">
                  <div className="eyebrow">Создание баннера</div>
                  <h1 className="section-title">Сначала нужен хотя бы один персонаж</h1>
                  <p className="subtle m-0 leading-7">
                    Синхронизируйте аккаунт в кабинете, и конструктор предложит
                    самого сильного активного персонажа.
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link href="/dashboard">
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Назад в кабинет
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
  });
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
      <AppHeader compact user={headerUser} />
      <main className="app-shell space-y-6 py-6">
        <Card className="surface-card rounded-2xl">
        <CardContent className="p-6 md:p-8">
          <div className="panel-heading">
            <div className="max-w-3xl space-y-4">
              <div className="eyebrow">Создание баннера</div>
              <h1 className="section-title">
                Соберите Mythic+ или рейдовый PNG
              </h1>
              <p className="lead-copy m-0 max-w-2xl">
                Быстрый конфигуратор без сохранения черновиков: параметры живут
                в URL, а справа видно итоговую картинку или ее структуру.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Назад в кабинет
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
              <div className="eyebrow">Параметры</div>
              <h2 className="section-title mt-3">
                {isRaidMode ? "Основа рейда" : "Основа группы"}
              </h2>
              <p className="subtle mt-3 mb-0 leading-7">
                {isRaidMode
                  ? "Выберите актуальный рейд и явно задайте, сколько ролей еще нужно."
                  : "Самые важные поля сверху, чтобы собрать баннер за один проход."}
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="m-0 text-lg font-semibold tracking-[-0.03em]">
                Тип баннера
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
                    Raid
                  </Link>
                </Button>
              </div>
            </div>

            <form method="get" className="space-y-7">
              <input name="bannerType" type="hidden" value={draft.bannerType} />

              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="field-label">Персонаж</span>
                  <select
                    className="native-select"
                    defaultValue={draft.characterId}
                    name="characterId"
                  >
                    {characters.map((character) => (
                      <option key={character.id} value={character.id}>
                        {character.name} · {character.realm} · ilvl{" "}
                        {formatItemLevel(character.itemLevel)}
                      </option>
                    ))}
                  </select>
                </label>

                {isRaidMode ? (
                  <>
                    <label className="grid gap-2">
                      <span className="field-label">Рейд</span>
                      <select
                        className="native-select"
                        defaultValue={draft.raidSlug}
                        name="raidSlug"
                      >
                        {currentRaidInstances.map((raid) => (
                          <option key={raid.slug} value={raid.slug}>
                            {raid.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="field-label">Танков нужно</span>
                      <select
                        className="native-select"
                        defaultValue={draft.raidTankNeeded}
                        name="raidTankNeeded"
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
                        defaultValue={draft.raidHealerNeeded}
                        name="raidHealerNeeded"
                      >
                        {raidHealerNeedOptions.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : (
                  <>
                    <label className="grid gap-2">
                      <span className="field-label">Подземелье</span>
                      <select
                        className="native-select"
                        defaultValue={draft.dungeonSlug}
                        name="dungeonSlug"
                      >
                        {currentSeasonDungeons.map((dungeon) => (
                          <option key={dungeon.slug} value={dungeon.slug}>
                            {dungeon.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="field-label">Уровень ключа</span>
                      <Input
                        defaultValue={draft.keystoneLevel}
                        max={30}
                        min={2}
                        name="keystoneLevel"
                        type="number"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="field-label">Сколько ДД уже есть</span>
                      <select
                        className="native-select"
                        defaultValue={draft.dpsFilled}
                        name="dpsFilled"
                      >
                        {[0, 1, 2, 3].map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
              </div>

              {!isRaidMode ? (
                <div className="space-y-3">
                  <h3 className="m-0 text-lg font-semibold tracking-[-0.03em]">
                    Слоты и утилити
                  </h3>
                  <div className="choice-grid">
                    <label className="check-card">
                      <input
                        defaultChecked={draft.tankFilled}
                        name="tankFilled"
                        type="checkbox"
                      />
                      <span>Танк уже есть</span>
                    </label>
                    <label className="check-card">
                      <input
                        defaultChecked={draft.healerFilled}
                        name="healerFilled"
                        type="checkbox"
                      />
                      <span>Хилл уже есть</span>
                    </label>
                    <label className="check-card">
                      <input
                        defaultChecked={draft.hasBloodlust}
                        name="hasBloodlust"
                        type="checkbox"
                      />
                      <span>Есть БЛ</span>
                    </label>
                    <label className="check-card">
                      <input
                        defaultChecked={draft.hasBattleRes}
                        name="hasBattleRes"
                        type="checkbox"
                      />
                      <span>Есть БР</span>
                    </label>
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                <h3 className="m-0 text-lg font-semibold tracking-[-0.03em]">
                  Как это будет читаться
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
                          {slot.filled ? "Закрыто" : "Свободно"} · {slot.label}
                        </span>
                      ))}
                      {needLabels.map((label) => (
                        <span className="chip chip-needed" key={label}>
                          Нужно · {label}
                        </span>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div className="action-row">
                <SubmitButton pendingLabel="Генерируем баннер...">
                  Создать баннер
                </SubmitButton>
                <Button asChild variant="outline">
                  <Link href="/dashboard">Отмена</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="surface-card preview-panel sticky-preview">
          <SlidersHorizontal className="background-icon" aria-hidden="true" />
          <CardContent className="p-6">
            <div className="mb-5">
              <div className="eyebrow">Предпросмотр</div>
              <h2 className="section-title mt-3">Итоговый PNG</h2>
              <p className="subtle mt-3 mb-0">
                {selectedCharacter.name} ·{" "}
                {isRaidMode
                  ? selectedRaid.name
                  : `${selectedDungeon.name} +${draft.keystoneLevel}`}
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
                    Танков нужно: {draft.raidTankNeeded}
                  </span>
                  <span
                    className={
                      draft.raidHealerNeeded > 0 ? "chip chip-needed" : "chip"
                    }
                  >
                    Хилов нужно: {draft.raidHealerNeeded}
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
                      Скачать PNG
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
                  <h3 className="section-title mt-4">Нажмите «Создать баннер»</h3>
                  <p className="subtle mt-3 mb-0 leading-7">
                    После генерации здесь появится финальная картинка и кнопки
                    копирования/скачивания.
                  </p>
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
