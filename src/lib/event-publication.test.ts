import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EventForPublication } from '@/lib/event-publication'

const { prismaMock } = vi.hoisted(() => ({
	prismaMock: {
		scheduledEvent: { findUnique: vi.fn() },
		scheduledEventDelivery: {
			create: vi.fn(),
			update: vi.fn(),
			updateMany: vi.fn(),
		},
	},
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

function delivery(overrides: Record<string, unknown> = {}) {
	return {
		attemptCount: 0,
		createdAt: new Date('2026-01-01T00:00:00Z'),
		destinationFingerprint: null,
		eventId: 'event-1',
		id: 'delivery-1',
		lastAttemptAt: null,
		lastErrorCode: null,
		lastErrorMessage: null,
		remoteMessageId: null,
		status: 'FAILED',
		target: 'DISCORD',
		updatedAt: new Date('2026-01-01T00:00:00Z'),
		...overrides,
	}
}

function event(overrides: Record<string, unknown> = {}) {
	return {
		activities: [{ activity: { nameRu: 'Марш на Кель’Данас' } }],
		activityType: 'RAID',
		addonSlug: 'midnight',
		cancelledAt: null,
		clientRequestId: null,
		contentScope: 'midnight-season-2',
		createdAt: new Date('2026-01-01T00:00:00Z'),
		damageMax: 12,
		damageMin: 9,
		deliveries: [delivery()],
		difficulty: { labelRu: 'Героик' },
		difficultyId: 'difficulty-1',
		hasPaidSlots: false,
		hasUnroll: false,
		healerMax: 3,
		healerMin: 3,
		id: 'event-1',
		leaderCharacterId: null,
		leaderMode: 'MANUAL',
		leaderName: 'NoZloy',
		leaderRealm: 'Гордунни',
		localDate: '2027-06-29',
		localTime: '20:30',
		paidSlotPrice: 0,
		paidSlots: 0,
		publishTargets: ['DISCORD'],
		startsAt: new Date('2027-06-29T17:30:00Z'),
		status: 'PUBLISHED',
		tankMax: 2,
		tankMin: 2,
		timeZone: 'Europe/Moscow',
		unrollItemIds: [],
		unrollTemplateId: null,
		updatedAt: new Date('2026-01-01T00:00:00Z'),
		userId: 'user-1',
		version: 1,
		...overrides,
	} as unknown as EventForPublication
}

describe('event publication', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		process.env.NEXTAUTH_URL = 'https://raid.test'
		process.env.DISCORD_EVENT_WEBHOOK_URL = 'https://discord.com/api/webhooks/123/token'
		process.env.TELEGRAM_EVENT_BOT_TOKEN = '123456:token_value'
		process.env.TELEGRAM_EVENT_CHAT_ID = '-100123'
		prismaMock.scheduledEventDelivery.updateMany.mockResolvedValue({ count: 1 })
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		vi.useRealTimers()
	})

	function mockEvent(value: EventForPublication) {
		prismaMock.scheduledEvent.findUnique.mockResolvedValue(value)
		prismaMock.scheduledEventDelivery.update.mockImplementation(({ data, where }: { data: Record<string, unknown>; where: { id: string } }) =>
			Promise.resolve({
				...(value.deliveries.find(item => item.id === where.id) ?? value.deliveries[0]),
				...data,
			}),
		)
	}

	it('sends a Discord message and stores its remote id', async () => {
		mockEvent(event())
		const fetchMock = vi.fn().mockResolvedValue({
			json: async () => ({ id: 'message-1' }),
			ok: true,
			status: 200,
		})
		vi.stubGlobal('fetch', fetchMock)
		const { deliverScheduledEvent } = await import('@/lib/event-publication')
		const result = await deliverScheduledEvent('event-1')

		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining('wait=true'),
			expect.objectContaining({ method: 'POST' }),
		)
		expect(prismaMock.scheduledEventDelivery.update).toHaveBeenLastCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ remoteMessageId: 'message-1', status: 'SENT' }) }),
		)
		expect(result[0]).toMatchObject({ status: 'SENT', target: 'DISCORD' })
	})

	it('edits the original Telegram message after an event update', async () => {
		const telegramDelivery = delivery({ remoteMessageId: '42', status: 'SENT', target: 'TELEGRAM' })
		mockEvent(event({ deliveries: [telegramDelivery], publishTargets: ['TELEGRAM'] }))
		const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ ok: true, result: true }), ok: true, status: 200 })
		vi.stubGlobal('fetch', fetchMock)
		const { deliverScheduledEvent } = await import('@/lib/event-publication')
		await deliverScheduledEvent('event-1')

		expect(fetchMock.mock.calls[0][0]).toContain('/editMessageText')
		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ message_id: 42 })
	})

	it('deletes the original Discord message when the target is removed', async () => {
		const discordDelivery = delivery({ remoteMessageId: 'message-1', status: 'SENT' })
		mockEvent(event({ deliveries: [discordDelivery], publishTargets: [] }))
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
		vi.stubGlobal('fetch', fetchMock)
		const { deliverScheduledEvent } = await import('@/lib/event-publication')
		const result = await deliverScheduledEvent('event-1')

		expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/messages/message-1'), expect.objectContaining({ method: 'DELETE' }))
		expect(result[0]).toMatchObject({ status: 'REMOVED' })
	})

	it('edits an existing message to mark the event as cancelled', async () => {
		const discordDelivery = delivery({ remoteMessageId: 'message-1', status: 'SENT' })
		mockEvent(event({ deliveries: [discordDelivery], status: 'CANCELLED' }))
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
		vi.stubGlobal('fetch', fetchMock)
		const { deliverScheduledEvent } = await import('@/lib/event-publication')
		const result = await deliverScheduledEvent('event-1')

		expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/messages/message-1'), expect.objectContaining({ method: 'PATCH' }))
		expect(JSON.parse(fetchMock.mock.calls[0][1].body).content).toContain('[ОТМЕНЕНО]')
		expect(result[0]).toMatchObject({ status: 'CANCELLED' })
	})

	it('records a sanitized channel error without rejecting the event operation', async () => {
		mockEvent(event())
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
		const { deliverScheduledEvent } = await import('@/lib/event-publication')
		const result = await deliverScheduledEvent('event-1')

		expect(result[0]).toMatchObject({ lastErrorCode: 'DISCORD_HTTP_500', status: 'FAILED' })
		expect(result[0].lastErrorMessage).not.toContain('token')
	})

	it('keeps a successful channel sent when another channel fails', async () => {
		const discordDelivery = delivery({ id: 'delivery-discord' })
		const telegramDelivery = delivery({
			id: 'delivery-telegram',
			target: 'TELEGRAM',
		})
		mockEvent(event({
			deliveries: [discordDelivery, telegramDelivery],
			publishTargets: ['DISCORD', 'TELEGRAM'],
		}))
		vi.stubGlobal('fetch', vi.fn((url: string) => {
			if (url.includes('discord.com')) {
				return Promise.resolve({ ok: false, status: 503 })
			}

			return Promise.resolve({
				json: async () => ({ ok: true, result: { message_id: 42 } }),
				ok: true,
				status: 200,
			})
		}))
		const { deliverScheduledEvent } = await import('@/lib/event-publication')
		const result = await deliverScheduledEvent('event-1')

		expect(result).toEqual(expect.arrayContaining([
			expect.objectContaining({ status: 'FAILED', target: 'DISCORD' }),
			expect.objectContaining({ status: 'SENT', target: 'TELEGRAM' }),
		]))
	})

	it('turns a request timeout into a safe retryable error', async () => {
		vi.useFakeTimers()
		mockEvent(event())
		vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) =>
			new Promise((_resolve, reject) => {
				init.signal?.addEventListener('abort', () => {
					const error = new Error('request contained a secret token')
					error.name = 'AbortError'
					reject(error)
				})
			}),
		))
		const { deliverScheduledEvent } = await import('@/lib/event-publication')
		const deliveryPromise = deliverScheduledEvent('event-1')

		await vi.advanceTimersByTimeAsync(8_000)
		const result = await deliveryPromise

		expect(result[0]).toMatchObject({
			lastErrorCode: 'DELIVERY_TIMEOUT',
			lastErrorMessage: 'Канал не ответил вовремя.',
			status: 'FAILED',
		})
	})

	it('does not start a second request while a recent attempt holds the lock', async () => {
		mockEvent(event({ deliveries: [delivery({
			lastAttemptAt: new Date(),
			status: 'PENDING',
		})] }))
		prismaMock.scheduledEventDelivery.updateMany.mockResolvedValue({ count: 0 })
		const fetchMock = vi.fn()
		vi.stubGlobal('fetch', fetchMock)
		const { deliverScheduledEvent } = await import('@/lib/event-publication')
		const result = await deliverScheduledEvent('event-1')

		expect(fetchMock).not.toHaveBeenCalled()
		expect(result[0]).toMatchObject({
			lastErrorCode: null,
			status: 'PENDING',
		})
	})
})
