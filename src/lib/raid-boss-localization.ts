export type RaidCheckLocale = 'en' | 'ru'

export const DEFAULT_RAID_CHECK_LOCALE: RaidCheckLocale = 'ru'

type MidnightRaidSlug =
	| 'march-on-queldanas'
	| 'the-dreamrift'
	| 'the-voidspire'
	| 'sporefall'

type RaidBossNameEntry = {
	id?: number
	names: Record<RaidCheckLocale, string>
	provisional?: boolean
	raidSlug: MidnightRaidSlug
	sourceNames: string[]
}

const raidBossNameCatalog: RaidBossNameEntry[] = [
	{
		raidSlug: 'sporefall',
		names: {
			en: 'Rotmire',
			ru: 'Гнилотоп',
		},
		provisional: true,
		sourceNames: ['Rotmire'],
	},
	{
		raidSlug: 'the-voidspire',
		names: {
			en: 'Imperator Averzian',
			ru: 'Император Аверзиан',
		},
		provisional: true,
		sourceNames: ['Imperator Averzian'],
	},
	{
		raidSlug: 'the-voidspire',
		names: {
			en: 'Vorasius',
			ru: 'Ненасытникус',
		},
		provisional: true,
		sourceNames: ['Vorasius'],
	},
	{
		raidSlug: 'the-voidspire',
		names: {
			en: 'Fallen-King Salhadaar',
			ru: 'Падший король Салхадаар',
		},
		provisional: true,
		sourceNames: ['Fallen-King Salhadaar', 'Fallen King Salhadaar'],
	},
	{
		raidSlug: 'the-voidspire',
		names: {
			en: 'Vaelgor & Ezzorak',
			ru: 'Ваэлгор и Эззорак',
		},
		provisional: true,
		sourceNames: ['Vaelgor & Ezzorak', 'Vaelgor and Ezzorak'],
	},
	{
		raidSlug: 'the-voidspire',
		names: {
			en: 'Lightblinded Vanguard',
			ru: 'Ослепленный авангард',
		},
		provisional: true,
		sourceNames: ['Lightblinded Vanguard'],
	},
	{
		raidSlug: 'the-voidspire',
		names: {
			en: 'Crown of the Cosmos',
			ru: 'Корона Космоса',
		},
		provisional: true,
		sourceNames: ['Crown of the Cosmos'],
	},
	{
		raidSlug: 'the-dreamrift',
		names: {
			en: 'Chimaerus the Undreamt God',
			ru: 'Химерий',
		},
		provisional: true,
		sourceNames: [
			'Chimaerus',
			'Chimaerus the Undreamt God',
			'Chimaerus, the Undreamt God',
			'Chimaerus: the Undreamt God',
		],
	},
	{
		raidSlug: 'march-on-queldanas',
		names: {
			en: "Belo'ren, Child of Al'ar",
			ru: "Бело'рен, Дитя Ал'ара",
		},
		provisional: true,
		sourceNames: [
			"Belo'ren",
			"Belo'ren, Child of Al'ar",
			'Belo’ren, Child of Al’ar',
			'Beloren Child of Alar',
		],
	},
	{
		raidSlug: 'march-on-queldanas',
		names: {
			en: 'Midnight Falls',
			ru: 'Торжество Полуночи',
		},
		provisional: true,
		sourceNames: ['Midnight Falls'],
	},
]

function normalizeRaidBossName(value: string) {
	return value
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-zа-я0-9]+/giu, '')
}

const raidBossNameBySource = new Map(
	raidBossNameCatalog.flatMap(entry =>
		entry.sourceNames.map(sourceName => [
			normalizeRaidBossName(sourceName),
			entry,
		]),
	),
)

function getRaidBossNameEntry({
	id,
	name,
}: {
	id?: number | null
	name?: string | null
}) {
	if (typeof id === 'number') {
		const byId = raidBossNameCatalog.find(entry => entry.id === id)

		if (byId) {
			return byId
		}
	}

	return name ? raidBossNameBySource.get(normalizeRaidBossName(name)) : null
}

export function localizeRaidBossName(
	boss: {
		id?: number | null
		name?: string | null
	},
	locale: RaidCheckLocale = DEFAULT_RAID_CHECK_LOCALE,
) {
	const entry = getRaidBossNameEntry(boss)

	return (
		entry?.names[locale] ??
		boss.name ??
		(locale === 'ru' ? 'Неизвестный босс' : 'Unknown boss')
	)
}
