import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LocaleProvider } from '@/components/shell/locale-provider'
import { CreateEventForm } from './create-event-form'
import type { EventCatalog, EventCharacterOption } from './create-event-types'

type MockImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
	fill?: boolean
	priority?: boolean
	src: string
}

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
	optionsByAddon: {
		midnight: {
			dungeon: [],
			'open-world': [
				{
					activityType: 'open-world',
					artPath: '/activities/farm_styled_16x9.jpg',
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
					artPath: '/activities/farm_styled_16x9.jpg',
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
	})
})
