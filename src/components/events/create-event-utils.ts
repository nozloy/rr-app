import {
	allDungeonInstances,
	currentSeasonDungeons,
	getLocalizedDungeonName,
} from '@/lib/dungeons'
import { getLocalizedRaidName, allRaidInstances } from '@/lib/raids'
import { t, type AppLocale } from '@/lib/i18n'
import { resolveEventAddon, type EventAddon } from './create-event-data'
import type {
	EventCharacterOption,
	EventInstanceOption,
	RoleRange,
	RoleValidationResult,
} from './create-event-types'

export function getCharacterImage(character?: EventCharacterOption | null) {
	return character?.avatarUrl ?? character?.thumbnailUrl ?? null
}

export function getInitial(value: string) {
	return value.trim().slice(0, 1).toUpperCase() || 'R'
}

const raidExpansionByAddon: Record<EventAddon, string> = {
	Dragonflight: 'Dragonflight',
	Midnight: 'Midnight',
	'The War Within': 'The War Within',
}

const dungeonSlugsByAddon: Record<EventAddon, string[]> = {
	Dragonflight: ['algethar-academy'],
	Midnight: [
		'magisters-terrace',
		'maisara-caverns',
		'nexus-point-xenas',
		'windrunner-spire',
		'blinding-vale',
		'den-of-nalorakk',
		'murder-row',
		'voidscar-arena',
	],
	'The War Within': ['seat-of-the-triumvirate', 'skyreach', 'pit-of-saron'],
}

export function getRaidOptions(
	addon: string = 'Midnight',
	locale: AppLocale = 'ru',
): EventInstanceOption[] {
	const resolvedAddon = resolveEventAddon(addon)
	const expansion = raidExpansionByAddon[resolvedAddon]

	return allRaidInstances
		.filter(raid => raid.expansion === expansion)
		.map(raid => ({
		activityType: 'raid',
		artPath: raid.artPath,
		name: getLocalizedRaidName(raid, locale),
		shortName: raid.shortName,
		slug: raid.slug,
		tag: t(locale, 'events.typeRaid').toUpperCase(),
		}))
}

export function getDungeonOptions(
	addon: string = 'Midnight',
	locale: AppLocale = 'ru',
): EventInstanceOption[] {
	const resolvedAddon = resolveEventAddon(addon)
	const allowedSlugs = new Set(dungeonSlugsByAddon[resolvedAddon])

	return allDungeonInstances
		.filter(dungeon => allowedSlugs.has(dungeon.slug))
		.map(dungeon => ({
		activityType: 'dungeon',
		artPath: dungeon.artPath,
		name: getLocalizedDungeonName(dungeon, locale),
		shortName: dungeon.shortName,
		slug: dungeon.slug,
		tag: t(locale, 'events.typeDungeon').toUpperCase(),
		}))
}

export function getSeasonDungeonOptions(
	locale: AppLocale = 'ru',
): EventInstanceOption[] {
	return currentSeasonDungeons.map(dungeon => ({
		activityType: 'season',
		artPath: dungeon.artPath,
		name: getLocalizedDungeonName(dungeon, locale),
		shortName: dungeon.shortName,
		slug: dungeon.slug,
		tag: t(locale, 'events.typeDungeon').toUpperCase(),
	}))
}

export function parseItemIds(value: string) {
	const ids = value
		.split(/[,\s;]+/)
		.map(part => part.replace(/\D/g, ''))
		.filter(Boolean)

	return Array.from(new Set(ids))
}

export function readNumber(value: string, fallback = 0) {
	const parsed = Number.parseInt(value, 10)

	if (!Number.isFinite(parsed)) {
		return fallback
	}

	return Math.max(0, parsed)
}

export function formatDate(value: string) {
	const [year, month, day] = value.split('-')

	if (!year || !month || !day) {
		return value
	}

	return `${day}.${month}.${year}`
}

export function toDateInputValue(date: Date) {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')

	return `${year}-${month}-${day}`
}

export function toTimeInputValue(date: Date) {
	const hours = String(date.getHours()).padStart(2, '0')
	const minutes = String(date.getMinutes()).padStart(2, '0')

	return `${hours}:${minutes}`
}

export function parseInputDate(value: string) {
	const [year, month, day] = value.split('-').map(Number)

	if (!year || !month || !day) {
		return new Date()
	}

	return new Date(year, month - 1, day)
}

export function getMonthStart(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function addMonths(date: Date, amount: number) {
	return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

export function getCalendarDays(monthDate: Date) {
	const monthStart = getMonthStart(monthDate)
	const firstWeekday = (monthStart.getDay() + 6) % 7
	const startDate = new Date(monthStart)
	startDate.setDate(monthStart.getDate() - firstWeekday)

	return Array.from({ length: 42 }, (_, index) => {
		const date = new Date(startDate)
		date.setDate(startDate.getDate() + index)

		return date
	})
}

export function formatGold(value: number, locale: AppLocale = 'ru') {
	return new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US').format(value)
}

export function formatRange(range: RoleRange) {
	return range.min === range.max
		? String(range.min)
		: `${range.min}-${range.max}`
}

export function parseRoleRangeInput(
	value: string,
	locale: AppLocale = 'ru',
): RoleValidationResult {
	const normalized = value.trim().replace(/[–—]/g, '-').replace(/\s+/g, '')

	if (!normalized) {
		return {
			error: t(locale, 'events.roleErrorEmpty'),
			range: null,
		}
	}

	const match = /^(\d+)(?:-(\d+))?$/.exec(normalized)

	if (!match) {
		return {
			error: t(locale, 'events.roleErrorFormat'),
			range: null,
		}
	}

	const min = Number.parseInt(match[1], 10)
	const max = match[2] ? Number.parseInt(match[2], 10) : min

	if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) {
		return {
			error: t(locale, 'events.roleErrorNumbers'),
			range: null,
		}
	}

	if (min > max) {
		return {
			error: t(locale, 'events.roleErrorMinMax'),
			range: null,
		}
	}

	return {
		error: null,
		range: { max, min },
	}
}
