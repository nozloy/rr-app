import {
  BattleNetAuthError,
  fetchAccountCharacters,
  fetchCharacterEquipment,
  fetchCharacterMedia,
  fetchCharacterProfile,
  fetchPublicCharacterSummary,
  getBattleNetAccount,
  getValidAccessToken,
} from "@/lib/blizzard-api";
import { mapBlizzardCharacterToNormalized } from "@/lib/blizzard-mappers";
import { prisma } from "@/lib/prisma";

export type CharacterSyncResult = {
  status: "success" | "error" | "reauth";
  importedCount: number;
  updatedCount: number;
  failedCount: number;
  totalCount: number;
  message: string;
};

async function loadOptionalCharacterResource<T>(
  loader: () => Promise<T>,
): Promise<T | null> {
  try {
    return await loader();
  } catch (error) {
    if (error instanceof BattleNetAuthError) {
      throw error;
    }

    return null;
  }
}

export async function syncCharactersForUser(
  userId: string,
): Promise<CharacterSyncResult> {
  const account = await getBattleNetAccount(userId);

  if (!account) {
    return {
      status: "error",
      importedCount: 0,
      updatedCount: 0,
      failedCount: 0,
      totalCount: 0,
      message: "Сначала подключите Battle.net.",
    };
  }

  try {
    const accessToken = await getValidAccessToken(userId);
    const summaries = await fetchAccountCharacters(accessToken);

    let importedCount = 0;
    let updatedCount = 0;
    let failedCount = 0;

    const seenCharacterIds = summaries.map((item) => BigInt(item.id));

    for (const summary of summaries) {
      if (!summary.realm?.slug) {
        failedCount += 1;
        continue;
      }

      const realmSlug = summary.realm.slug;

      try {
        const [profile, equipment, media, publicSummary, existing] =
          await Promise.all([
            loadOptionalCharacterResource(() =>
              fetchCharacterProfile(accessToken, realmSlug, summary.name),
            ),
            loadOptionalCharacterResource(() =>
              fetchCharacterEquipment(accessToken, realmSlug, summary.name),
            ),
            loadOptionalCharacterResource(() =>
              fetchCharacterMedia(accessToken, realmSlug, summary.name),
            ),
            loadOptionalCharacterResource(() =>
              fetchPublicCharacterSummary(realmSlug, summary.name),
            ),
            prisma.character.findUnique({
              where: {
                userId_characterId: {
                  userId,
                  characterId: BigInt(summary.id),
                },
              },
            }),
          ]);

        const mapped = mapBlizzardCharacterToNormalized(
          summary,
          profile,
          equipment
            ? {
                ...equipment,
                equipped_item_level:
                  equipment.equipped_item_level ??
                  publicSummary?.itemLevel ??
                  undefined,
              }
            : publicSummary?.itemLevel
              ? { equipped_item_level: publicSummary.itemLevel }
              : null,
          media,
        );
        const activeSpec = mapped.activeSpec ?? publicSummary?.activeSpec ?? null;

        await prisma.character.upsert({
          where: {
            userId_characterId: {
              userId,
              characterId: mapped.characterId,
            },
          },
          create: {
            userId,
            characterId: mapped.characterId,
            name: mapped.name,
            realm: mapped.realm,
            realmSlug: mapped.realmSlug,
            className: mapped.className,
            raceName: mapped.raceName,
            factionName: mapped.factionName,
            level: mapped.level,
            activeSpec,
            itemLevel: mapped.itemLevel,
            thumbnailUrl: mapped.thumbnailUrl,
            avatarUrl: mapped.avatarUrl,
            isActive: true,
            lastSyncedAt: new Date(),
          },
          update: {
            name: mapped.name,
            realm: mapped.realm,
            realmSlug: mapped.realmSlug,
            className: mapped.className,
            raceName: mapped.raceName,
            factionName: mapped.factionName,
            level: mapped.level,
            activeSpec,
            itemLevel: mapped.itemLevel,
            thumbnailUrl: mapped.thumbnailUrl,
            avatarUrl: mapped.avatarUrl,
            isActive: true,
            lastSyncedAt: new Date(),
          },
        });

        if (existing) {
          updatedCount += 1;
        } else {
          importedCount += 1;
        }
      } catch (error) {
        if (error instanceof BattleNetAuthError) {
          return {
            status: "reauth",
            importedCount,
            updatedCount,
            failedCount,
            totalCount: summaries.length,
            message:
              "Battle.net отклонил запрос. Подключите аккаунт заново и повторите синхронизацию.",
          };
        }

        failedCount += 1;
      }
    }

    if (seenCharacterIds.length > 0) {
      await prisma.character.updateMany({
        where: {
          userId,
          characterId: {
            notIn: seenCharacterIds,
          },
        },
        data: {
          isActive: false,
        },
      });
    } else {
      await prisma.character.updateMany({
        where: { userId },
        data: { isActive: false },
      });
    }

    return {
      status: "success",
      importedCount,
      updatedCount,
      failedCount,
      totalCount: summaries.length,
      message:
        summaries.length > 0
          ? `Синхронизация завершена: ${summaries.length} персонажей обработано.`
          : "Персонажи не найдены в профиле Battle.net.",
    };
  } catch (error) {
    if (error instanceof BattleNetAuthError) {
      return {
        status: "reauth",
        importedCount: 0,
        updatedCount: 0,
        failedCount: 0,
        totalCount: 0,
        message:
          "Battle.net требует повторного входа. Переподключите аккаунт и запустите обновление ещё раз.",
      };
    }

    return {
      status: "error",
      importedCount: 0,
      updatedCount: 0,
      failedCount: 0,
      totalCount: 0,
      message: "Не удалось обновить персонажей.",
    };
  }
}
