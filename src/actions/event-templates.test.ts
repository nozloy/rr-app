import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EventTemplatePayload } from '@/lib/event-schema'

const { authMock, prismaMock, revalidatePathMock } = vi.hoisted(() => ({
	authMock: { getServerSession: vi.fn() },
	prismaMock: {
		eventTemplate: {
			create: vi.fn(),
			deleteMany: vi.fn(),
			findFirst: vi.fn(),
			findUnique: vi.fn(),
			update: vi.fn(),
			updateMany: vi.fn(),
		},
	},
	revalidatePathMock: vi.fn(),
}))

vi.mock('next-auth', () => ({ getServerSession: authMock.getServerSession }))
vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

function payload(): EventTemplatePayload {
	return {
		activityType: 'raid',
		addon: 'midnight',
		characterId: 'character-1',
		contentScope: 'midnight-season-2',
		difficulty: 'heroic',
		hasPaidSlots: false,
		hasUnroll: true,
		leaderMode: 'character',
		manualLeaderName: '',
		manualLeaderRealm: '',
		paidSlotPrice: 0,
		paidSlots: 0,
		publishTargets: { app: true, discord: false, telegram: false },
		roles: {
			damage: { max: 12, min: 9 },
			healer: { max: 3, min: 3 },
			tank: { max: 2, min: 2 },
		},
		selectedInstanceSlugs: ['march-on-queldanas'],
		time: '20:30',
		timeZone: 'Europe/Moscow',
		unrollInput: '249343',
		unrollItemIds: ['249343'],
		unrollTemplateId: 'custom',
	}
}

function storedTemplate(overrides: Record<string, unknown> = {}) {
	return {
		createdAt: new Date('2026-01-01T00:00:00Z'),
		id: 'template-1',
		name: 'Рейд в среду',
		normalizedName: 'рейд в среду',
		payload: payload(),
		schemaVersion: 1,
		updatedAt: new Date('2026-01-01T00:00:00Z'),
		userId: 'user-1',
		...overrides,
	}
}

describe('event template actions', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		authMock.getServerSession.mockResolvedValue({ user: { id: 'user-1' } })
	})

	it('requires authentication for template mutations', async () => {
		authMock.getServerSession.mockResolvedValue(null)
		const { saveEventTemplateAction } = await import('@/actions/event-templates')
		const result = await saveEventTemplateAction({ name: 'Рейд', payload: payload() })

		expect(result).toMatchObject({ status: 'error' })
		expect(prismaMock.eventTemplate.create).not.toHaveBeenCalled()
	})

	it('saves a server-side template without a date', async () => {
		prismaMock.eventTemplate.findUnique.mockResolvedValue(null)
		prismaMock.eventTemplate.create.mockResolvedValue(storedTemplate())
		const { saveEventTemplateAction } = await import('@/actions/event-templates')
		const result = await saveEventTemplateAction({ name: '  Рейд в среду  ', payload: payload() })

		expect(result.status).toBe('success')
		expect(prismaMock.eventTemplate.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				name: 'Рейд в среду',
				normalizedName: 'рейд в среду',
				userId: 'user-1',
			}),
		})
	})

	it('asks for confirmation when the normalized name already exists', async () => {
		prismaMock.eventTemplate.findUnique.mockResolvedValue({ id: 'template-1' })
		const { saveEventTemplateAction } = await import('@/actions/event-templates')
		const result = await saveEventTemplateAction({ name: 'РЕЙД В СРЕДУ', payload: payload() })

		expect(result).toMatchObject({ existingTemplateId: 'template-1', status: 'conflict' })
		expect(prismaMock.eventTemplate.update).not.toHaveBeenCalled()
	})

	it('replaces a colliding template only after explicit confirmation', async () => {
		prismaMock.eventTemplate.findUnique.mockResolvedValue({ id: 'template-1' })
		prismaMock.eventTemplate.update.mockResolvedValue(storedTemplate())
		const { saveEventTemplateAction } = await import('@/actions/event-templates')
		const result = await saveEventTemplateAction({ name: 'Рейд в среду', payload: payload(), replace: true })

		expect(result.status).toBe('success')
		expect(prismaMock.eventTemplate.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'template-1' } }))
	})

	it('renames and deletes only templates belonging to the current user', async () => {
		prismaMock.eventTemplate.findFirst.mockResolvedValue(null)
		prismaMock.eventTemplate.updateMany.mockResolvedValue({ count: 1 })
		prismaMock.eventTemplate.deleteMany.mockResolvedValue({ count: 1 })
		const { deleteEventTemplateAction, renameEventTemplateAction } = await import('@/actions/event-templates')

		expect(await renameEventTemplateAction({ id: 'template-1', name: 'Прогресс' })).toMatchObject({ status: 'success' })
		expect(prismaMock.eventTemplate.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'template-1', userId: 'user-1' } }))
		expect(await deleteEventTemplateAction('template-1')).toMatchObject({ status: 'success' })
		expect(prismaMock.eventTemplate.deleteMany).toHaveBeenCalledWith({ where: { id: 'template-1', userId: 'user-1' } })
	})
})
