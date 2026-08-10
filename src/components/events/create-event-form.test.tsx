import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LocaleProvider } from '@/components/shell/locale-provider'
import { CreateEventForm } from './create-event-form'
import type { EventCatalog, EventCharacterOption } from './create-event-types'
import type { EventTemplateDto } from '@/lib/event-templates'

type MockImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
	fill?: boolean
	priority?: boolean
	src: string
}

const { createScheduledEventActionMock, pushMock } = vi.hoisted(() => ({
	createScheduledEventActionMock: vi.fn(),
	pushMock: vi.fn(),
}))

vi.mock('@/actions/events', () => ({
	createScheduledEventAction: createScheduledEventActionMock,
	updateScheduledEventAction: vi.fn(),
}))

vi.mock('@/actions/event-templates', () => ({
	deleteEventTemplateAction: vi.fn(),
	renameEventTemplateAction: vi.fn(),
	saveEventTemplateAction: vi.fn(),
}))

vi.mock('next/navigation', () => ({
	useRouter: () => ({
		push: pushMock,
	}),
}))

vi.mock('next/image', async () => {
	const ReactModule = await import('react')

	return {
		default: (props: MockImageProps) => {
			const imageProps = { ...props }
			delete imageProps.fill
			delete imageProps.priority

			return ReactModule.createElement('img', imageProps)
		},
	}
})

const characters: EventCharacterOption[] = [
	{
		activeSpec: 'Fire',
		avatarUrl: null,
		className: 'Mage',
		id: 'character-1',
		itemLevel: 520,
		name: 'Avayn',
		realm: 'Tarren Mill',
		thumbnailUrl: null,
	},
]

const eventCatalog: EventCatalog = {
	addons: [
		{ label: 'Midnight', value: 'midnight' },
		{ label: 'The War Within', value: 'the-war-within' },
	],
	defaultAddon: 'midnight',
	defaultContentScope: 'midnight-season-2',
	contentScopes: [
		{ label: 'Сезон 2', value: 'midnight-season-2' },
		{ label: 'Сезон 1', value: 'midnight-season-1' },
		{ label: 'Все', value: 'expansion' },
	],
	difficulties: [
		{ difficulty: 'normal', label: 'Нормал' },
		{ difficulty: 'heroic', label: 'Героик' },
		{ difficulty: 'mythic', label: 'Мифик' },
	],
	difficultiesByActivitySlug: {
		'march-on-queldanas': [
			{ difficulty: 'normal', label: 'Нормал' },
			{ difficulty: 'heroic', label: 'Героик' },
			{ difficulty: 'mythic', label: 'Мифик' },
			{ difficulty: 'flex-mythic', label: 'Гибкий Мифический' },
		],
		'nerubar-palace': [
			{ difficulty: 'normal', label: 'Нормал' },
			{ difficulty: 'heroic', label: 'Героик' },
			{ difficulty: 'mythic', label: 'Мифик' },
			{ difficulty: 'flex-mythic', label: 'Гибкий Мифический' },
		],
	},
	optionsByAddon: {
		midnight: {
			expansion: {
				dungeon: [],
				'open-world': [
					{
						activityType: 'open-world',
						artPath: '/activities/farm_styled_16x9.png',
						name: 'Фарм',
						shortName: 'Фарм',
						slug: 'farm',
						tag: 'МИР',
					},
				],
				raid: [
					{
						activityType: 'raid',
						artPath: '/raids/march_on_queldanas_styled_16x9.png',
						name: "Марш на Кель'Данас",
						shortName: 'MQD',
						slug: 'march-on-queldanas',
						tag: 'РЕЙД',
					},
				],
			},
			'midnight-season-2': {
				dungeon: [
					{
						activityType: 'dungeon',
						artPath: '/dungeons/altar_of_fangs_styled_16x9.jpg',
						name: 'Алтарь Клыков',
						shortName: 'AF',
						slug: 'altar-of-fangs',
						tag: 'ПОДЗЕМЕЛЬЕ',
					},
				],
				'open-world': [],
				raid: [
					{
						activityType: 'raid',
						artPath: '/raids/venomous_abyss_styled_16x9.png',
						name: 'Ядовитая бездна',
						shortName: 'TVA',
						slug: 'venomous-abyss',
						tag: 'РЕЙД',
					},
				],
			},
			'midnight-season-1': {
				dungeon: [
					{
						activityType: 'dungeon',
						artPath: '/dungeons/season-dungeon.png',
						name: 'Сезонное подземелье',
						shortName: 'СП',
						slug: 'season-dungeon',
						tag: 'ПОДЗЕМЕЛЬЕ',
					},
				],
				'open-world': [],
				raid: [
					{
						activityType: 'raid',
						artPath: '/raids/march_on_queldanas_styled_16x9.png',
						name: "Марш на Кель'Данас",
						shortName: 'MQD',
						slug: 'march-on-queldanas',
						tag: 'РЕЙД',
					},
				],
			},
		},
		'the-war-within': {
			expansion: {
				dungeon: [],
				'open-world': [
					{
						activityType: 'open-world',
						artPath: '/activities/farm_styled_16x9.png',
						name: 'Фарм',
						shortName: 'Фарм',
						slug: 'farm',
						tag: 'МИР',
					},
				],
				raid: [
					{
						activityType: 'raid',
						artPath: '/raids/nerubar_palace_styled_16x9.png',
						name: "Неруб'арский дворец",
						shortName: "Неруб'ар",
						slug: 'nerubar-palace',
						tag: 'РЕЙД',
					},
				],
			},
		},
	},
}

function renderCreateEventForm(
	channelAvailability = { discord: true, telegram: true },
	templates: EventTemplateDto[] = [],
) {
	return render(
		<LocaleProvider locale='ru'>
			<CreateEventForm
				channelAvailability={channelAvailability}
				characters={characters}
				defaultDate='2026-06-28'
				defaultTimeZone='Europe/Moscow'
				displayName='NoZloy'
				eventCatalog={eventCatalog}
				templates={templates}
			/>
		</LocaleProvider>,
	)
}

describe('CreateEventForm', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('defaults to season 2 and switches between season scopes and all activities', async () => {
		const user = userEvent.setup()

		renderCreateEventForm()

		expect(screen.getByRole('button', { name: 'Сезон 2' })).toBeInTheDocument()
		expect(screen.getByRole('radio', { name: 'Рейд' })).toBeInTheDocument()
		expect(screen.getByRole('radio', { name: 'Подземелье' })).toBeInTheDocument()
		expect(screen.getByRole('radio', { name: 'Мир' })).toBeInTheDocument()
		expect(screen.getByRole('radio', { name: 'Рейд' })).toHaveAttribute(
			'aria-checked',
			'true',
		)
		expect(screen.queryByText('Сезонное подземелье')).toBeNull()
		expect(screen.getAllByText('Ядовитая бездна').length).toBeGreaterThan(0)

		await user.click(screen.getByRole('button', { name: 'Сезон 2' }))
		expect(screen.getByRole('menuitem', { name: 'Сезон 2' })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: 'Сезон 1' })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: 'Все' })).toBeInTheDocument()

		await user.click(screen.getByRole('menuitem', { name: 'Сезон 1' }))

		expect(screen.getByRole('button', { name: 'Сезон 1' })).toBeInTheDocument()
		expect(screen.getByRole('radio', { name: 'Рейд' })).toHaveAttribute(
			'aria-checked',
			'true',
		)
		expect(screen.getAllByText("Марш на Кель'Данас").length).toBeGreaterThan(0)

		await user.click(screen.getByRole('radio', { name: 'Подземелье' }))

		expect(screen.getByText('Сезонное подземелье')).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Сезон 1' }))
		await user.click(screen.getByRole('menuitem', { name: 'Все' }))

		expect(screen.getByRole('button', { name: 'Все' })).toBeInTheDocument()
	})

	it('defaults to normal difficulty and updates the preview when changed', async () => {
		const user = userEvent.setup()

		renderCreateEventForm()
		await user.click(screen.getByRole('button', { name: 'Сезон 2' }))
		await user.click(screen.getByRole('menuitem', { name: 'Все' }))

		const normalTrigger = screen.getByRole('button', { name: 'Нормал' })

		expect(normalTrigger).toBeInTheDocument()
		expect(screen.getByText('Нормал', { selector: 'strong' })).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Midnight' }))
		const warWithinButton = screen.getByRole('menuitem', {
			name: 'The War Within',
		})

		await user.click(warWithinButton)

		expect(
			screen.getByRole('button', { name: 'The War Within' }),
		).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Все' })).toBeInTheDocument()
		await user.click(screen.getByRole('button', { name: 'Все' }))
		expect(screen.queryByRole('menuitem', { name: 'Сезон 2' })).toBeNull()
		await user.keyboard('{Escape}')

		await user.click(normalTrigger)
		expect(document.body).not.toHaveAttribute('data-scroll-locked')
		expect(document.body.style.overflow).not.toBe('hidden')

		const heroicButton = screen.getByRole('menuitem', { name: 'Героик' })
		await user.click(heroicButton)

		expect(screen.getByText('Героик', { selector: 'strong' })).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Героик' }))
		const mythicButton = screen.getByRole('menuitem', { name: 'Мифик' })
		await user.click(mythicButton)

		expect(screen.getByText('Мифик', { selector: 'strong' })).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Мифик' }))
		const flexMythicButton = screen.getByRole('menuitem', {
			name: 'Гибкий Мифический',
		})
		await user.click(flexMythicButton)

		expect(
			screen.getByText('Гибкий Мифический', { selector: 'strong' }),
		).toBeInTheDocument()
	})

	it('sets the group composition to 1-1-3 when switching to a dungeon', async () => {
		const user = userEvent.setup()

		renderCreateEventForm()

		expect(screen.getByRole('textbox', { name: 'Количество Танки' })).toHaveValue(
			'2',
		)
		expect(
			screen.getByRole('textbox', { name: 'Количество Хиллеры' }),
		).toHaveValue('3')
		expect(
			screen.getByRole('textbox', { name: 'Количество Дамагеры' }),
		).toHaveValue('9-12')

		await user.click(screen.getByRole('radio', { name: 'Подземелье' }))

		expect(screen.getByRole('textbox', { name: 'Количество Танки' })).toHaveValue(
			'1',
		)
		expect(
			screen.getByRole('textbox', { name: 'Количество Хиллеры' }),
		).toHaveValue('1')
		expect(
			screen.getByRole('textbox', { name: 'Количество Дамагеры' }),
		).toHaveValue('3')
	})

	it('defaults to the catalog and explains unavailable external channels', () => {
		renderCreateEventForm({ discord: false, telegram: false })

		expect(screen.getByRole('button', { name: /Каталог:/ })).toHaveAttribute(
			'aria-pressed',
			'true',
		)
		expect(screen.getByRole('button', { name: /Discord: не настроен/ })).toBeDisabled()
		expect(screen.getByRole('button', { name: /Telegram: не настроен/ })).toBeDisabled()
		expect(
			screen.getByText('Недоступные каналы не настроены администратором'),
		).toBeInTheDocument()
		expect(screen.queryByText('Свой канал')).not.toBeInTheDocument()
	})

	it('searches and selects an IANA time zone', async () => {
		const user = userEvent.setup()
		renderCreateEventForm()

		await user.click(screen.getByRole('combobox'))
		await user.type(screen.getByLabelText('Поиск часового пояса'), 'Almaty')
		await user.click(screen.getByRole('option', { name: /Asia\/Almaty/ }))

		expect(screen.getByRole('combobox')).toHaveTextContent('Asia/Almaty')
	})

	it('loads a stale template with safe fallbacks and a warning', async () => {
		const user = userEvent.setup()
		const staleTemplate: EventTemplateDto = {
			id: 'template-stale',
			name: 'Устаревший',
			payload: {
				activityType: 'raid',
				addon: 'removed-addon',
				characterId: 'removed-character',
				contentScope: 'removed-season',
				difficulty: 'removed-difficulty',
				hasPaidSlots: false,
				hasUnroll: false,
				leaderMode: 'character',
				manualLeaderName: '',
				manualLeaderRealm: '',
				paidSlotPrice: 0,
				paidSlots: 0,
				publishTargets: { app: true, discord: true, telegram: false },
				roles: {
					damage: { max: 12, min: 9 },
					healer: { max: 3, min: 3 },
					tank: { max: 2, min: 2 },
				},
				selectedInstanceSlugs: ['removed-instance'],
				time: '20:30',
				timeZone: 'Mars/Olympus',
				unrollInput: '',
				unrollItemIds: [],
				unrollTemplateId: 'custom',
			},
			updatedAt: '2026-08-10T00:00:00.000Z',
		}

		renderCreateEventForm(
			{ discord: false, telegram: true },
			[staleTemplate],
		)
		await user.click(screen.getByRole('button', { name: 'Шаблоны (1)' }))
		await user.click(screen.getByRole('button', { name: 'Устаревший' }))

		expect(screen.getByRole('button', { name: 'Сезон 2' })).toBeInTheDocument()
		expect(screen.getAllByText('Ядовитая бездна').length).toBeGreaterThan(0)
		expect(
			screen.getByText(/Недоступные инстансы были исключены/),
		).toBeInTheDocument()
		expect(screen.getByText(/Discord отключён/)).toBeInTheDocument()
		expect(screen.getByText(/Часовой пояс был заменён/)).toBeInTheDocument()
	})

	it('publishes the draft and redirects to the public event page', async () => {
		const user = userEvent.setup()
		createScheduledEventActionMock.mockResolvedValue({
			eventId: 'event-1',
			message: 'Событие сохранено.',
			status: 'success',
			version: 1,
			warnings: [],
			deliveries: [],
		})

		renderCreateEventForm()
		await user.click(screen.getByRole('button', { name: 'Сезон 2' }))
		await user.click(screen.getByRole('menuitem', { name: 'Сезон 1' }))

		await user.click(
			screen.getByRole('button', { name: 'Опубликовать событие' }),
		)

		await waitFor(() => {
			expect(createScheduledEventActionMock).toHaveBeenCalledWith(
				expect.objectContaining({
					activityType: 'raid',
					addon: 'midnight',
					characterId: 'character-1',
					clientRequestId: expect.any(String),
					contentScope: 'midnight-season-1',
					date: '2026-06-28',
					difficulty: 'normal',
					selectedInstanceSlugs: ['march-on-queldanas'],
					time: '20:30',
					timeZone: 'Europe/Moscow',
					publishTargets: {
						app: true,
						discord: false,
						telegram: false,
					},
				}),
			)
		})
		expect(pushMock).toHaveBeenCalledWith('/events/event-1?created=1')
	})

	it('shows a server error when publish fails', async () => {
		const user = userEvent.setup()
		createScheduledEventActionMock.mockResolvedValue({
			message: 'Одна или несколько выбранных активностей недоступны.',
			status: 'error',
		})

		renderCreateEventForm()
		await user.click(screen.getByRole('button', { name: 'Сезон 2' }))
		await user.click(screen.getByRole('menuitem', { name: 'Сезон 1' }))

		await user.click(
			screen.getByRole('button', { name: 'Опубликовать событие' }),
		)

		expect(
			await screen.findByText(
				'Одна или несколько выбранных активностей недоступны.',
			),
		).toBeInTheDocument()
		expect(pushMock).not.toHaveBeenCalled()
	})
})
