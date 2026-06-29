import { existsSync } from 'node:fs'
import path from 'node:path'
import {
	formatDate,
	formatRange,
	getCalendarDays,
	getDungeonOptions,
	getRaidOptions,
	getSeasonDungeonOptions,
	parseItemIds,
	parseRoleRangeInput,
} from './create-event-utils'
import { currentExpansionDungeons, currentSeasonDungeons } from '@/lib/dungeons'
import {
	addons,
	eventDifficulties,
	getDifficultyOptions,
	getOpenWorldActivitiesForAddon,
} from './create-event-data'

describe('create event utils', () => {
	it('parses single role counts as fixed ranges', () => {
		expect(parseRoleRangeInput('2')).toEqual({
			error: null,
			range: { max: 2, min: 2 },
		})
	})

	it('parses role ranges and normalizes spacing and long dashes', () => {
		expect(parseRoleRangeInput(' 9 — 12 ')).toEqual({
			error: null,
			range: { max: 12, min: 9 },
		})
	})

	it('rejects invalid role ranges', () => {
		expect(parseRoleRangeInput('12-9').error).toBe(
			'Минимум не может быть больше максимума.',
		)
		expect(parseRoleRangeInput('ten').error).toBe(
			'Используйте формат 2 или 10-12.',
		)
	})

	it('normalizes item id chips from mixed separators', () => {
		expect(parseItemIds('228764, item:228765; 228764 abc228766')).toEqual([
			'228764',
			'228765',
			'228766',
		])
	})

	it('formats dates and ranges for the preview', () => {
		expect(formatDate('2026-05-29')).toBe('29.05.2026')
		expect(formatRange({ max: 2, min: 2 })).toBe('2')
		expect(formatRange({ max: 12, min: 9 })).toBe('9-12')
	})

	it('keeps event difficulty options in normal heroic mythic order', () => {
		expect(eventDifficulties).toEqual(['normal', 'heroic', 'mythic'])
		expect(getDifficultyOptions('ru').map(option => option.label)).toEqual([
			'Нормал',
			'Героик',
			'Мифик',
		])
	})

	it('returns farm and achievements for every open world addon tab', () => {
		for (const addon of addons) {
			const ruOptions = getOpenWorldActivitiesForAddon(addon, 'ru')
			const enOptions = getOpenWorldActivitiesForAddon(addon, 'en')

			expect(ruOptions.map(option => option.slug)).toEqual([
				'farm',
				'achievements',
			])
			expect(ruOptions.map(option => option.name)).toEqual([
				'Фарм',
				'Достижения',
			])
			expect(enOptions.map(option => option.name)).toEqual([
				'Farm',
				'Achievements',
			])

			for (const option of ruOptions) {
				const assetPath = path.join(process.cwd(), 'public', option.artPath)

				expect(existsSync(assetPath)).toBe(true)
				expect(option.artPath).toMatch(/^\/activities\/.+_styled_16x9\.jpg$/)
			}
		}
	})

	it('builds a six-week calendar grid starting on monday', () => {
		const days = getCalendarDays(new Date(2026, 4, 1))

		expect(days).toHaveLength(42)
		expect(days[0].getDay()).toBe(1)
		expect(days.some(day => day.getMonth() === 4 && day.getDate() === 29)).toBe(
			true,
		)
	})

	it('returns all current season dungeons for the season activity tab', () => {
		const options = getSeasonDungeonOptions()

		expect(options).toHaveLength(currentSeasonDungeons.length)
		expect(options.every(option => option.activityType === 'season')).toBe(true)
		expect(new Set(options.map(option => option.slug))).toEqual(
			new Set(currentSeasonDungeons.map(dungeon => dungeon.slug)),
		)
	})

	it('returns all Midnight expansion dungeons for the dungeon addon tab', () => {
		const options = getDungeonOptions('Midnight')

		expect(options).toHaveLength(currentExpansionDungeons.length)
		expect(options.every(option => option.activityType === 'dungeon')).toBe(true)
		expect(new Set(options.map(option => option.slug))).toEqual(
			new Set(currentExpansionDungeons.map(dungeon => dungeon.slug)),
		)
	})

	it('keeps Altar of Fangs out of the current season dungeon tab', () => {
		expect(currentExpansionDungeons.map(dungeon => dungeon.slug)).toContain(
			'altar-of-fangs',
		)
		expect(currentSeasonDungeons.map(dungeon => dungeon.slug)).not.toContain(
			'altar-of-fangs',
		)
	})

	it('uses english raid abbreviations for midnight raid short labels', () => {
		const options = getRaidOptions('Midnight')

		expect(options.find(option => option.slug === 'march-on-queldanas')?.shortName).toBe(
			'MQD',
		)
		expect(options.find(option => option.slug === 'the-dreamrift')?.shortName).toBe(
			'DR',
		)
		expect(options.find(option => option.slug === 'the-voidspire')?.shortName).toBe(
			'VS',
		)
		expect(options.find(option => option.slug === 'sporefall')?.shortName).toBe(
			'SF',
		)
	})
})
