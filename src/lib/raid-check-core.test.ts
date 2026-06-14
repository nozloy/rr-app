import type { BlizzardCharacterRaidEncounters } from '@/lib/blizzard-api'
import {
	getEuWeeklyResetStart,
	getKilledBossesForRaidDifficulty,
	getRaidCheckDifficultyById,
} from '@/lib/raid-check-core'
import type { RaidDefinition } from '@/lib/raids'
import { describe, it } from 'node:test'
import { expect } from 'vitest'

const raid: RaidDefinition = {
	slug: 'the-voidspire',
	name: 'Шпиль Бездны',
	shortName: 'Бездны',
	expansion: 'Midnight',
	artPath: '/raids/the_voidspire_styled_16x9.png',
	aliases: ['The Voidspire', 'Voidspire'],
}

function makeEncounters({
	afterReset,
	beforeReset,
}: {
	afterReset?: number
	beforeReset?: number
}): BlizzardCharacterRaidEncounters {
	return {
		expansions: [
			{
				instances: [
					{
						instance: {
							name: 'The Voidspire',
						},
						modes: [
							{
								difficulty: {
									type: 'HEROIC',
									name: 'Heroic',
								},
								progress: {
									encounters: [
										{
											encounter: {
												name: 'Imperator Averzian',
											},
											completed_count: afterReset ? 1 : 0,
											last_kill_timestamp: afterReset,
										},
										{
											encounter: {
												id: 102,
												name: 'Old Boss',
											},
											completed_count: beforeReset ? 1 : 0,
											last_kill_timestamp: beforeReset,
										},
									],
								},
							},
						],
					},
				],
			},
		],
	}
}

describe('raid check core', () => {
	it('calculates EU weekly reset start on and around Wednesday reset', () => {
		expect(
			getEuWeeklyResetStart(new Date('2026-05-20T03:59:00.000Z')).toISOString(),
		).toBe('2026-05-13T04:00:00.000Z')
		expect(
			getEuWeeklyResetStart(new Date('2026-05-20T04:00:00.000Z')).toISOString(),
		).toBe('2026-05-20T04:00:00.000Z')
		expect(
			getEuWeeklyResetStart(new Date('2026-05-22T12:00:00.000Z')).toISOString(),
		).toBe('2026-05-20T04:00:00.000Z')
	})

	it('returns only bosses killed after current reset', () => {
		const killed = getKilledBossesForRaidDifficulty({
			encounters: makeEncounters({
				afterReset: Date.parse('2026-05-20T06:00:00.000Z'),
				beforeReset: Date.parse('2026-05-13T03:00:00.000Z'),
			}),
			raid,
			difficulty: getRaidCheckDifficultyById(15),
			resetStart: new Date('2026-05-20T04:00:00.000Z'),
		})

		expect(killed).toEqual([
			{
				id: null,
				name: 'Император Аверзиан',
				sourceName: 'Imperator Averzian',
				lastKillTimestamp: Date.parse('2026-05-20T06:00:00.000Z'),
			},
		])
	})

	it('treats characters with no current-reset kills as clean', () => {
		const killed = getKilledBossesForRaidDifficulty({
			encounters: makeEncounters({
				beforeReset: Date.parse('2026-05-13T03:00:00.000Z'),
			}),
			raid,
			difficulty: getRaidCheckDifficultyById(15),
			resetStart: new Date('2026-05-20T04:00:00.000Z'),
		})

		expect(killed).toEqual([])
	})
})
