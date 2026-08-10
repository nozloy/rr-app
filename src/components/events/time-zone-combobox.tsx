'use client'

import React from 'react'
import { CaretUpDown, Check, MagnifyingGlass } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

const fallbackTimeZones = [
	'Europe/Moscow',
	'Europe/Kaliningrad',
	'Europe/Berlin',
	'Europe/London',
	'Asia/Almaty',
	'Asia/Tbilisi',
	'Asia/Yerevan',
	'Asia/Dubai',
	'Asia/Tashkent',
	'America/New_York',
	'America/Chicago',
	'America/Denver',
	'America/Los_Angeles',
	'UTC',
]

function getTimeZones() {
	try {
		return Intl.supportedValuesOf('timeZone')
	} catch {
		return fallbackTimeZones
	}
}

const timeZones = getTimeZones()

function displayTimeZone(value: string) {
	return value.replaceAll('_', ' ')
}

export function TimeZoneCombobox({
	onChange,
	value,
}: {
	onChange: (value: string) => void
	value: string
}) {
	const [open, setOpen] = React.useState(false)
	const [query, setQuery] = React.useState('')
	const filteredTimeZones = React.useMemo(() => {
		const normalizedQuery = query.trim().toLocaleLowerCase()

		if (!normalizedQuery) {
			return timeZones
		}

		return timeZones.filter(timeZone =>
			displayTimeZone(timeZone).toLocaleLowerCase().includes(normalizedQuery),
		)
	}, [query])

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					aria-expanded={open}
					className='h-12 w-full justify-between border-event-panel-border bg-[rgba(3,13,27,0.62)] px-4 font-medium text-white hover:bg-[rgba(3,13,27,0.72)] hover:text-white'
					role='combobox'
					type='button'
					variant='outline'
				>
					<span className='truncate'>{displayTimeZone(value)}</span>
					<CaretUpDown data-icon='inline-end' aria-hidden='true' />
				</Button>
			</PopoverTrigger>
			<PopoverContent align='start' className='w-[var(--radix-popover-trigger-width)] border-event-panel-border bg-[#061327] p-2'>
				<div className='flex flex-col gap-2'>
					<label className='relative block'>
						<MagnifyingGlass className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-event-copy' aria-hidden='true' />
						<Input
							aria-label='Поиск часового пояса'
							autoFocus
							className='border-event-panel-border bg-[rgba(3,13,27,0.62)] pl-9 text-white'
							onChange={event => setQuery(event.currentTarget.value)}
							placeholder='Найти часовой пояс'
							value={query}
						/>
					</label>
					<ScrollArea className='h-64'>
						<div className='flex flex-col gap-1 pr-3'>
							{filteredTimeZones.map(timeZone => (
								<Button
									aria-selected={timeZone === value}
									className={cn(
										'w-full justify-start text-left text-event-copy hover:bg-[#0c1f40] hover:text-white',
										timeZone === value && 'bg-[#0c1f40] text-white',
									)}
									key={timeZone}
									onClick={() => {
										onChange(timeZone)
										setOpen(false)
										setQuery('')
									}}
									role='option'
									type='button'
									variant='ghost'
								>
									<Check
										data-icon='inline-start'
										className={cn(timeZone !== value && 'invisible')}
										aria-hidden='true'
									/>
									<span className='truncate'>{displayTimeZone(timeZone)}</span>
								</Button>
							))}
						</div>
					</ScrollArea>
				</div>
			</PopoverContent>
		</Popover>
	)
}
