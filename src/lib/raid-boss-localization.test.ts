import { localizeRaidBossName } from '@/lib/raid-boss-localization'
import { describe, it } from 'node:test'
import { expect } from 'vitest'

const midnightBosses = [
	['Imperator Averzian', 'Император Аверзиан'],
	['Vorasius', 'Ненасытникус'],
	['Fallen-King Salhadaar', 'Падший король Салхадаар'],
	['Vaelgor & Ezzorak', 'Ваэлгор и Эззорак'],
	['Lightblinded Vanguard', 'Ослепленный авангард'],
	['Crown of the Cosmos', 'Корона Космоса'],
	['Chimaerus the Undreamt God', 'Химерий, Неприснившийся Бог'],
	["Belo'ren, Child of Al'ar", "Бело'рен, Дитя Ал'ара"],
	['Midnight Falls', 'Торжество Полуночи'],
] as const

describe('raid boss localization', () => {
	it('localizes every current Midnight boss to Russian', () => {
		for (const [sourceName, russianName] of midnightBosses) {
			expect(localizeRaidBossName({ name: sourceName }, 'ru')).toBe(russianName)
		}
	})

	it('keeps English display names for the future English UI', () => {
		for (const [sourceName] of midnightBosses) {
			expect(localizeRaidBossName({ name: sourceName }, 'en')).toBe(sourceName)
		}
	})

	it('falls back to normalized alias matches', () => {
		expect(localizeRaidBossName({ name: 'Vaelgor and Ezzorak' }, 'ru')).toBe(
			'Ваэлгор и Эззорак',
		)
		expect(
			localizeRaidBossName({ name: 'Belo’ren, Child of Al’ar' }, 'ru'),
		).toBe("Бело'рен, Дитя Ал'ара")
		expect(
			localizeRaidBossName({ name: 'Chimaerus, the Undreamt God' }, 'ru'),
		).toBe('Химерий')
	})

	it('keeps the API name for unknown bosses', () => {
		expect(
			localizeRaidBossName(
				{
					id: 404,
					name: 'Unknown Midnight Boss',
				},
				'ru',
			),
		).toBe('Unknown Midnight Boss')
	})
})
