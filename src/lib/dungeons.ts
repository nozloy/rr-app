export type DungeonDefinition = {
  slug: string;
  name: string;
  shortName: string;
  artPath: string;
};

export const currentSeasonDungeons: DungeonDefinition[] = [
  {
    slug: "magisters-terrace",
    name: "Терраса Магистров",
    shortName: "Терраса",
    artPath: "/dungeons/Magisters_Terrace_styled_16x9.jpg",
  },
  {
    slug: "maisara-caverns",
    name: "Пещеры Майсары",
    shortName: "Майсара",
    artPath: "/dungeons/Maisara_Caverns_styled_16x9.jpg",
  },
  {
    slug: "nexus-point-xenas",
    name: "Нексус-Пойнт Зенас",
    shortName: "Зенас",
    artPath: "/dungeons/Nexus_Point_Xenas_styled_16x9.jpg",
  },
  {
    slug: "windrunner-spire",
    name: "Шпиль Ветрокрылых",
    shortName: "Шпиль",
    artPath: "/dungeons/windrunner_spire_styled_16x9.jpg",
  },
  {
    slug: "algethar-academy",
    name: "Академия Алгет'ар",
    shortName: "Алгет'ар",
    artPath: "/dungeons/Algethar_Academy_styled_16x9.jpg",
  },
  {
    slug: "seat-of-the-triumvirate",
    name: "Престол Триумвирата",
    shortName: "Престол",
    artPath: "/dungeons/The_Seat_of_the_Triumvirate_styled_16x9.jpg",
  },
  {
    slug: "skyreach",
    name: "Небесный Путь",
    shortName: "Skyreach",
    artPath: "/dungeons/Skyreach_styled_16x9.jpg",
  },
  {
    slug: "pit-of-saron",
    name: "Яма Сарона",
    shortName: "Сарон",
    artPath: "/dungeons/Pit_of_Saron_styled_16x9.jpg",
  },
];

export function getDungeonBySlug(slug: string) {
  return currentSeasonDungeons.find((dungeon) => dungeon.slug === slug);
}
