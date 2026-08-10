import { describe, expect, it } from 'vitest'
import {
	getTomorrowInputDate,
	isValidTimeZone,
	parseEventDateTime,
} from '@/lib/event-time'

describe('event time', () => {
	it('converts author-local Moscow time to UTC', () => {
		const result = parseEventDateTime('2027-06-29', '20:30', 'Europe/Moscow')
		expect(result?.startsAt.toISOString()).toBe('2027-06-29T17:30:00.000Z')
	})

	it('rejects a non-existent spring-forward local time', () => {
		expect(parseEventDateTime('2026-03-08', '02:30', 'America/New_York')).toBeNull()
	})

	it('uses the first occurrence of an ambiguous fall-back time', () => {
		const result = parseEventDateTime('2026-11-01', '01:30', 'America/New_York')
		expect(result?.startsAt.toISOString()).toBe('2026-11-01T05:30:00.000Z')
	})

	it('calculates tomorrow in the selected time zone', () => {
		const now = new Date('2026-12-31T22:30:00.000Z')
		expect(getTomorrowInputDate('Europe/Moscow', now)).toBe('2027-01-02')
	})

	it('validates IANA time zone identifiers', () => {
		expect(isValidTimeZone('Asia/Almaty')).toBe(true)
		expect(isValidTimeZone('Not/AZone')).toBe(false)
	})
})
