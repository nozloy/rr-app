'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { FunnelSimple, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'

type CatalogFiltersProps = {
	date: string
	difficulties: Array<{ label: string; slug: string }>
	difficulty: string
	type: string
}

export function EventCatalogFilters({
	date: initialDate,
	difficulties,
	difficulty: initialDifficulty,
	type: initialType,
}: CatalogFiltersProps) {
	const router = useRouter()
	const [type, setType] = React.useState(initialType || 'all')
	const [difficulty, setDifficulty] = React.useState(initialDifficulty || 'all')
	const [date, setDate] = React.useState(initialDate)

	function applyFilters() {
		const params = new URLSearchParams()
		if (type !== 'all') params.set('type', type)
		if (difficulty !== 'all') params.set('difficulty', difficulty)
		if (date) params.set('date', date)
		router.push(`/events${params.size > 0 ? `?${params}` : ''}`)
	}

	function clearFilters() {
		setType('all')
		setDifficulty('all')
		setDate('')
		router.push('/events')
	}

	return (
		<div className='grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[1fr_1fr_1fr_auto_auto]'>
		<Select value={type} onValueChange={setType}>
			<SelectTrigger aria-label='Тип события'><SelectValue placeholder='Тип события' /></SelectTrigger>
			<SelectContent><SelectGroup>
				<SelectItem value='all'>Все типы</SelectItem>
				<SelectItem value='raid'>Рейд</SelectItem>
				<SelectItem value='dungeon'>Подземелье</SelectItem>
				<SelectItem value='world'>Мир</SelectItem>
			</SelectGroup></SelectContent>
		</Select>
		<Select value={difficulty} onValueChange={setDifficulty}>
			<SelectTrigger aria-label='Сложность'><SelectValue placeholder='Сложность' /></SelectTrigger>
			<SelectContent><SelectGroup>
				<SelectItem value='all'>Все сложности</SelectItem>
				{difficulties.map(option => <SelectItem key={option.slug} value={option.slug}>{option.label}</SelectItem>)}
			</SelectGroup></SelectContent>
		</Select>
		<Input aria-label='Дата события' onChange={event => setDate(event.currentTarget.value)} type='date' value={date} />
		<Button onClick={applyFilters} type='button'><FunnelSimple data-icon='inline-start' aria-hidden='true' />Применить</Button>
		<Button aria-label='Сбросить фильтры' onClick={clearFilters} type='button' variant='outline'><X aria-hidden='true' /></Button>
	</div>
	)
}
