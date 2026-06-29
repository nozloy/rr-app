from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / "scripts" / "wow_realm_slugs_eu_us.md"
LOCK_PATH = ROOT / "scripts" / "wow_realm_code_lock.json"
TS_PATH = ROOT / "src" / "lib" / "realm-codes.ts"
LUA_PATH = ROOT / "addons" / "RaidReminder" / "RealmCodes.lua"

REGION_CODES = {"EU": ("eu", "e"), "US": ("us", "u")}
ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz"
ROW_RE = re.compile(
    r"^\|\s*(EU|US)\s*\|\s*(.*?)\s*\|\s*`([^`]*)`\s*\|\s*`([^`]*)`\s*\|"
)
REALM_ALIASES = {
    # The addon receives realm names from the local game client. Russian EU
    # clients return localized names, while the source table uses en_GB names.
    "eu": {
        "ashenvale": ["Ясеневый лес"],
        "azuregos": ["Азурегос"],
        "blackscar": ["Черный Шрам"],
        "booty-bay": ["Пиратская Бухта"],
        "borean-tundra": ["Борейская тундра"],
        "deathguard": ["Страж Смерти"],
        "deathweaver": ["Ткач Смерти"],
        "deepholm": ["Подземье"],
        "eversong": ["Вечная Песня"],
        "fordragon": ["Дракономор"],
        "galakrond": ["Галакронд"],
        "goldrinn": ["Голдринн"],
        "gordunni": ["Гордунни"],
        "greymane": ["Седогрив"],
        "grom": ["Гром"],
        "howling-fjord": ["Ревущий фьорд"],
        "lich-king": ["Король-лич"],
        "razuvious": ["Разувий"],
        "soulflayer": ["Свежеватель Душ"],
        "thermaplugg": ["Термоштепсель"],
    },
}

REALM_LOCALE_GROUPS = {
    "deDE": {
        ("eu", slug)
        for slug in {
            "aegwynn",
            "alexstrasza",
            "alleria",
            "amanthul",
            "ambossar",
            "anetheron",
            "antonidas",
            "area-52",
            "arygos",
            "baelgun",
            "blackhand",
            "blackmoore",
            "blackrock",
            "blutkessel",
            "der-abyssische-rat",
            "der-mithrilorden",
            "der-rat-von-dalaran",
            "destromath",
            "dethecus",
            "die-aldor",
            "die-arguswacht",
            "die-ewige-wacht",
            "die-nachtwache",
            "die-silberne-hand",
            "die-todeskrallen",
            "durotan",
            "echsenkessel",
            "eredar",
            "festung-der-stürme",
            "forscherliga",
            "frostwolf",
            "garrosh",
            "gilneas",
            "gorgonnash",
            "kargath",
            "khazgoroth",
            "kragjin",
            "kult-der-verdammten",
            "lothar",
            "madmortem",
            "malganis",
            "malfurion",
            "malorne",
            "mannoroth",
            "nathrezim",
            "nefarian",
            "nethersturm",
            "nozdormu",
            "onyxia",
            "perenolde",
            "proudmoore",
            "rexxar",
            "senjin",
            "shattrath",
            "taerar",
            "teldrassil",
            "terrordar",
            "theradras",
            "thrall",
            "tirion",
            "todeswache",
            "ungoro",
            "veklor",
            "wrathbringer",
            "ysera",
            "zirkel-des-cenarius",
            "zuluhed",
        }
    },
    "frFR": {
        ("eu", slug)
        for slug in {
            "arak-arahm",
            "archimonde",
            "chants-éternels",
            "chogall",
            "confrérie-du-thorium",
            "conseil-des-ombres",
            "culte-de-la-rive-noire",
            "dalaran",
            "drekthar",
            "eitrigg",
            "elune",
            "garona",
            "hyjal",
            "illidan",
            "kaelthas",
            "kirin-tor",
            "krasus",
            "la-croisade-écarlate",
            "les-clairvoyants",
            "les-sentinelles",
            "marécage-de-zangar",
            "medivh",
            "naxxramas",
            "nerzhul",
            "rashgarroth",
            "sargeras",
            "sinstralis",
            "suramar",
            "temple-noir",
            "throkferoth",
            "uldaman",
            "varimathras",
            "voljin",
            "ysondre",
        }
    },
    "esES": {
        ("eu", slug)
        for slug in {
            "cthun",
            "colinas-pardas",
            "dun-modr",
            "exodar",
            "los-errantes",
            "minahonda",
            "sanguino",
            "shendralar",
            "tyrande",
            "uldum",
            "zuljin",
        }
    },
    "esMX": {("us", slug) for slug in {"drakkari", "quelthalas", "ragnaros"}},
    "itIT": {("eu", slug) for slug in {"nemesis", "pozzo-delleternità"}},
    "ptBR": {
        ("eu", "aggra-português"),
        ("us", "azralon"),
        ("us", "gallywix"),
        ("us", "goldrinn"),
        ("us", "nemesis"),
        ("us", "tol-barad"),
    },
    "ruRU": {
        ("eu", slug)
        for slug in {
            "azuregos",
            "blackscar",
            "booty-bay",
            "borean-tundra",
            "deathguard",
            "deathweaver",
            "deepholm",
            "eversong",
            "fordragon",
            "galakrond",
            "gordunni",
            "greymane",
            "howling-fjord",
            "lich-king",
            "razuvious",
            "soulflayer",
        }
    },
}

REALM_LOCALE_BY_SLUG = {
    key: locale
    for locale, keys in REALM_LOCALE_GROUPS.items()
    for key in keys
}


def get_realm_locale(region: str, slug: str) -> str:
    return REALM_LOCALE_BY_SLUG.get((region, slug), "enUS")


def base36(value: int) -> str:
    if value == 0:
        return "0"

    result = ""
    while value:
        value, remainder = divmod(value, 36)
        result = ALPHABET[remainder] + result
    return result


def parse_source() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []

    for line in SOURCE_PATH.read_text(encoding="utf-8").splitlines():
        match = ROW_RE.match(line)
        if not match:
            continue

        source_region, realm_name, normalized_realm, slug = match.groups()
        region, region_code = REGION_CODES[source_region]
        slug = slug.strip()
        rows.append(
            {
                "region": region,
                "regionCode": region_code,
                "realmName": realm_name.strip(),
                "normalizedRealm": normalized_realm.strip(),
                "realmLocale": get_realm_locale(region, slug),
                "slug": slug,
            }
        )

    return rows


def load_lock() -> dict[str, dict[str, str]]:
    if not LOCK_PATH.exists():
        return {"eu": {}, "us": {}}

    data = json.loads(LOCK_PATH.read_text(encoding="utf-8"))
    return {
        "eu": dict(data.get("eu", {})),
        "us": dict(data.get("us", {})),
    }


def assign_codes(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    lock = load_lock()

    for region in ("eu", "us"):
        region_rows = [row for row in rows if row["region"] == region]
        used = set(lock[region].values())
        next_index = 0

        for row in region_rows:
            slug = row["slug"]
            code = lock[region].get(slug)

            if not code:
                while base36(next_index) in used:
                    next_index += 1

                code = base36(next_index)
                lock[region][slug] = code
                used.add(code)

            row["code"] = code

    LOCK_PATH.write_text(
        json.dumps(lock, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return rows


def js(value: object) -> str:
    return json.dumps(value, ensure_ascii=False)


def generate_ts(rows: list[dict[str, str]]) -> None:
    alias_rows = [
        (region, slug, aliases)
        for region, aliases_by_slug in REALM_ALIASES.items()
        for slug, aliases in aliases_by_slug.items()
    ]
    lines = [
        "// Generated by scripts/generate_realm_codes.py. Do not edit manually.",
        "",
        'export type RealmRegion = "eu" | "us";',
        'export type RealmRegionCode = "e" | "u";',
        'export type RealmLocale = "deDE" | "enUS" | "esES" | "esMX" | "frFR" | "itIT" | "ptBR" | "ruRU";',
        "",
        "export type RealmCodeEntry = {",
        "  code: string;",
        "  normalizedRealm: string;",
        "  realmLocale: RealmLocale;",
        "  realmName: string;",
        "  region: RealmRegion;",
        "  regionCode: RealmRegionCode;",
        "  slug: string;",
        "};",
        "",
        "export const REALM_CODE_TOTAL = %d;" % len(rows),
        "",
        "export const REALM_REGION_BY_CODE: Record<RealmRegionCode, RealmRegion> = {",
        '  e: "eu",',
        '  u: "us",',
        "};",
        "",
        "export const REALM_CODE_BY_REGION: Record<RealmRegion, RealmRegionCode> = {",
        '  eu: "e",',
        '  us: "u",',
        "};",
        "",
        "export const REALM_CODE_ENTRIES = [",
    ]

    for row in rows:
        lines.append(
            "  { code: %s, normalizedRealm: %s, realmLocale: %s, realmName: %s, region: %s, regionCode: %s, slug: %s },"
            % (
                js(row["code"]),
                js(row["normalizedRealm"]),
                js(row["realmLocale"]),
                js(row["realmName"]),
                js(row["region"]),
                js(row["regionCode"]),
                js(row["slug"]),
            )
        )

    lines.extend(
        [
            "] as const satisfies readonly RealmCodeEntry[];",
            "",
            "const realmByRegionAndCode = new Map<string, RealmCodeEntry>(",
            "  REALM_CODE_ENTRIES.map((entry) => [`${entry.region}:${entry.code}`, entry]),",
            ");",
            "",
            "const REALM_LOOKUP_ALIASES = [",
        ]
    )

    for region, slug, aliases in alias_rows:
        lines.append(
            "  { region: %s, slug: %s, aliases: %s },"
            % (js(region), js(slug), js(aliases))
        )

    lines.extend(
        [
            "] as const;",
            "",
            "function normalizeRealmLookup(value: string | null | undefined) {",
            "  const trimmed = value?.trim();",
            "",
            "  if (!trimmed) {",
            "    return null;",
            "  }",
            "",
            "  return trimmed",
            '    .normalize("NFKD")',
            '    .replace(/[\\u0300-\\u036f]/gu, "")',
            "    .toLowerCase()",
            '    .replace(/[^a-zа-я0-9]+/giu, "");',
            "}",
            "",
            "function getRealmLookupValues(entry: RealmCodeEntry) {",
            "  return [",
            "    entry.realmName,",
            "    entry.normalizedRealm,",
            "    entry.slug,",
            '    entry.realmName.replaceAll(" ", ""),',
            '    entry.normalizedRealm.replaceAll(" ", ""),',
            "  ];",
            "}",
            "",
            "const realmByRegionAndLookup = new Map<string, RealmCodeEntry>();",
            "",
            "for (const entry of REALM_CODE_ENTRIES) {",
            "  for (const value of getRealmLookupValues(entry)) {",
            "    const lookup = normalizeRealmLookup(value);",
            "    if (lookup) {",
            "      realmByRegionAndLookup.set(`${entry.region}:${lookup}`, entry);",
            "    }",
            "  }",
            "}",
            "",
            "for (const aliasGroup of REALM_LOOKUP_ALIASES) {",
            "  const entry = REALM_CODE_ENTRIES.find(",
            "    (item) => item.region === aliasGroup.region && item.slug === aliasGroup.slug,",
            "  );",
            "",
            "  if (!entry) {",
            "    continue;",
            "  }",
            "",
            "  for (const alias of aliasGroup.aliases) {",
            "    const lookup = normalizeRealmLookup(alias);",
            "    if (lookup) {",
            "      realmByRegionAndLookup.set(`${entry.region}:${lookup}`, entry);",
            "    }",
            "",
            '    const compactLookup = normalizeRealmLookup(alias.replaceAll(" ", ""));',
            "    if (compactLookup) {",
            "      realmByRegionAndLookup.set(`${entry.region}:${compactLookup}`, entry);",
            "    }",
            "  }",
            "}",
            "",
            "export function isRealmRegion(value: string): value is RealmRegion {",
            '  return value === "eu" || value === "us";',
            "}",
            "",
            "export function getRealmRegionByCode(value: string | null | undefined) {",
            "  return value === \"e\" || value === \"u\" ? REALM_REGION_BY_CODE[value] : null;",
            "}",
            "",
            "export function getRealmCodeEntry(region: RealmRegion, code: string) {",
            '  return realmByRegionAndCode.get(`${region}:${code.trim().toLowerCase()}`) ?? null;',
            "}",
            "",
            "export function getRealmCodeEntryByRegionCode(",
            "  regionCode: string | null | undefined,",
            "  code: string,",
            ") {",
            "  const region = getRealmRegionByCode(regionCode);",
            "  return region ? getRealmCodeEntry(region, code) : null;",
            "}",
            "",
            "export function getRealmCodeEntryByRealmName(",
            "  region: RealmRegion,",
            "  realmName: string | null | undefined,",
            ") {",
            "  const lookup = normalizeRealmLookup(realmName);",
            "  return lookup ? realmByRegionAndLookup.get(`${region}:${lookup}`) ?? null : null;",
            "}",
            "",
            "export function getRealmCodeEntryByRegionCodeAndRealmName(",
            "  regionCode: string | null | undefined,",
            "  realmName: string | null | undefined,",
            ") {",
            "  const region = getRealmRegionByCode(regionCode);",
            "  return region ? getRealmCodeEntryByRealmName(region, realmName) : null;",
            "}",
            "",
        ]
    )

    TS_PATH.write_text("\n".join(lines), encoding="utf-8")


def lua(value: str) -> str:
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def lua_aliases(row: dict[str, str]) -> list[str]:
    values = {
        row["realmName"],
        row["normalizedRealm"],
        row["slug"],
        row["realmName"].replace(" ", ""),
        row["normalizedRealm"].replace(" ", ""),
    }

    for alias in REALM_ALIASES.get(row["region"], {}).get(row["slug"], []):
        values.add(alias)
        values.add(alias.replace(" ", ""))

    ascii_values = set()
    for value in values:
        ascii_values.add(value.lower())
    values.update(ascii_values)

    return sorted(value for value in values if value)


def generate_lua(rows: list[dict[str, str]]) -> None:
    lines = [
        "-- Generated by scripts/generate_realm_codes.py. Do not edit manually.",
        "RaidReminderRealmCodes = {",
        "  byRegion = {",
    ]

    for region, region_code in (("eu", "e"), ("us", "u")):
        lines.append(f"    {region_code} = {{")
        for row in [item for item in rows if item["region"] == region]:
            value = "{ " + ", ".join(
                [lua(row["code"]), lua(row["slug"]), lua(row["realmName"]), lua(row["realmLocale"])]
            ) + " }"
            for alias in lua_aliases(row):
                lines.append(f"      [{lua(alias)}] = {value},")
        lines.append("    },")

    lines.extend(
        [
            "  },",
            "}",
            "",
        ]
    )

    LUA_PATH.write_text("\n".join(lines), encoding="utf-8")


def validate(rows: list[dict[str, str]]) -> None:
    if len(rows) != 494:
        raise SystemExit(f"Expected 494 realm rows, found {len(rows)}.")

    row_keys = {(row["region"], row["slug"]) for row in rows}
    for key in sorted(REALM_LOCALE_BY_SLUG):
        if key not in row_keys:
            raise SystemExit(f"Unknown realm locale mapping: {key[0]}:{key[1]}.")

    for region in ("eu", "us"):
        region_rows = [row for row in rows if row["region"] == region]
        codes = [row["code"] for row in region_rows]
        slugs = [row["slug"] for row in region_rows]

        if len(set(codes)) != len(codes):
            raise SystemExit(f"Duplicate realm code in {region}.")

        if len(set(slugs)) != len(slugs):
            raise SystemExit(f"Duplicate realm slug in {region}.")


def main() -> None:
    rows = assign_codes(parse_source())
    validate(rows)
    generate_ts(rows)
    generate_lua(rows)


if __name__ == "__main__":
    main()
