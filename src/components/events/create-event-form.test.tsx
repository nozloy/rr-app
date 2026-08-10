import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LocaleProvider } from '@/components/shell/locale-provider'
import { CreateEventForm } from './create-event-form'
import type { EventCatalog, EventCharacterOption } from './create-event-types'

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
			season: [],
		},
		'the-war-within': {
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
			season: [],
		},
	},
}

function renderCreateEventForm() {
	return render(
		<LocaleProvider locale='ru'>
			<CreateEventForm
				characters={characters}
				defaultDate='2026-06-28'
				displayName='NoZloy'
				eventCatalog={eventCatalog}
			/>
		</LocaleProvider>,
	)
}

describe('CreateEventForm', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('defaults to normal difficulty and updates the preview when changed', async () => {
		const user = userEvent.setup()

		renderCreateEventForm()

		const normalTrigger = screen.getByRole('button', { name: 'Нормал' })

		expect(normalTrigger).toBeInTheDocument()
		expect(screen.getByText('Нормал', { selector: 'strong' })).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Midnight' }))
		const warWithinButton = screen.getByRole('button', {
			name: 'The War Within',
		})

		await user.click(warWithinButton)

		expect(
			screen.getByRole('button', { name: 'The War Within' }),
		).toBeInTheDocument()

		await user.click(normalTrigger)
		expect(document.body).not.toHaveAttribute('data-scroll-locked')
		expect(document.body.style.overflow).not.toBe('hidden')

		const heroicButton = screen.getByRole('button', { name: 'Героик' })
		await user.click(heroicButton)

		expect(screen.getByText('Героик', { selector: 'strong' })).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Героик' }))
		const mythicButton = screen.getByRole('button', { name: 'Мифик' })
		await user.click(mythicButton)

		expect(screen.getByText('Мифик', { selector: 'strong' })).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Мифик' }))
		const flexMythicButton = screen.getByRole('button', {
			name: 'Гибкий Мифический',
		})
		await user.click(flexMythicButton)

		expect(
			screen.getByText('Гибкий Мифический', { selector: 'strong' }),
		).toBeInTheDocument()
	})

	it('publishes the draft and redirects to the profile events tab', async () => {
		const user = userEvent.setup()
		createScheduledEventActionMock.mockResolvedValue({
			eventId: 'event-1',
			message: 'Событие сохранено.',
			status: 'success',
		})

		renderCreateEventForm()

		await user.click(
			screen.getByRole('button', { name: 'Опубликовать событие' }),
		)

		await waitFor(() => {
			expect(createScheduledEventActionMock).toHaveBeenCalledWith(
				expect.objectContaining({
					activityType: 'raid',
					addon: 'midnight',
					characterId: 'character-1',
					date: '2026-06-28',
					difficulty: 'normal',
					selectedInstanceSlugs: ['march-on-queldanas'],
					time: '20:30',
				}),
			)
		})
		expect(pushMock).toHaveBeenCalledWith('/profile?tab=my-events')
	})

	it('shows a server error when publish fails', async () => {
		const user = userEvent.setup()
		createScheduledEventActionMock.mockResolvedValue({
			message: 'Одна или несколько выбранных активностей недоступны.',
			status: 'error',
		})

		renderCreateEventForm()

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
