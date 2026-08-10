import React from 'react'
import type { Metadata } from 'next'
import { Prisma } from '@prisma/client'
import { Plus } from '@phosphor-icons/react/dist/ssr'
import Link from 'next/link'
import { AppHeader } from '@/components/shell/app-header'
import { EventCard } from '@/components/events/event-card'
import { EventCatalogFilters } from '@/components/events/event-catalog-filters'
import { Button } from '@/components/ui/button'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from '@/components/ui/empty'
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from '@/components/ui/pagination'
import { getRequestLocale } from '@/lib/i18n-server'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
	title: 'События | RaidReminder',
	description: 'Публичный каталог рейдов, подземелий и событий мира.',
}

const PAGE_SIZE = 12

type EventsPageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

function first(value: string | string[] | undefined) {
	return typeof value === 'string' ? value : ''
}

function pageHref(params: { date: string; difficulty: string; type: string }, page: number) {
	const query = new URLSearchParams()
	if (params.type) query.set('type', params.type)
	if (params.difficulty) query.set('difficulty', params.difficulty)
	if (params.date) query.set('date', params.date)
	if (page > 1) query.set('page', String(page))
	return `/events${query.size > 0 ? `?${query}` : ''}`
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
	const [locale, params] = await Promise.all([getRequestLocale(), searchParams])
	const type = first(params.type)
	const date = first(params.date)
	const difficulty = first(params.difficulty)
	const requestedPage = Number.parseInt(first(params.page), 10)
	const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
	const activityType = type === 'raid' ? 'RAID' : type === 'dungeon' ? 'DUNGEON' : type === 'world' ? 'OPEN_WORLD' : undefined
	const where: Prisma.ScheduledEventWhereInput = {
		startsAt: { gt: new Date() },
		status: 'PUBLISHED',
		publishTargets: { has: 'APP' },
		...(activityType ? { activityType } : {}),
		...(date ? { localDate: date } : {}),
		...(difficulty ? { difficulty: { slug: difficulty } } : {}),
	}
	const [total, events, difficulties] = await Promise.all([
		prisma.scheduledEvent.count({ where }),
		prisma.scheduledEvent.findMany({
			include: {
				activities: { include: { activity: true }, orderBy: [{ sortOrder: 'asc' }] },
				difficulty: true,
			},
			orderBy: [{ startsAt: 'asc' }],
			skip: (page - 1) * PAGE_SIZE,
			take: PAGE_SIZE,
			where,
		}),
		prisma.eventDifficultyOption.findMany({
			orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }],
			where: { isActive: true },
		}),
	])
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
	const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
		candidate => candidate === 1 || candidate === totalPages || Math.abs(candidate - page) <= 2,
	)

	return (
		<main className='min-h-full' id='top'>
			<AppHeader />
			<div className='mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-8 lg:px-6 lg:py-10'>
				<header className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
					<div className='flex flex-col gap-2'>
						<h1 className='font-heading text-3xl font-semibold'>{locale === 'ru' ? 'События' : 'Events'}</h1>
						<p className='text-muted-foreground'>{locale === 'ru' ? 'Ближайшие рейды, подземелья и события мира.' : 'Upcoming raids, dungeons and world events.'}</p>
					</div>
					<Button asChild><Link href='/events/new'><Plus data-icon='inline-start' aria-hidden='true' />{locale === 'ru' ? 'Создать событие' : 'Create event'}</Link></Button>
				</header>

				<EventCatalogFilters
					date={date}
					difficulties={difficulties.map(option => ({ label: locale === 'ru' ? option.labelRu : option.labelEn, slug: option.slug }))}
					difficulty={difficulty}
					type={type}
				/>

				{events.length > 0 ? (
					<div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
						{events.map(event => <EventCard event={event} key={event.id} locale={locale} />)}
					</div>
				) : (
					<Empty className='min-h-80 border'>
						<EmptyHeader><EmptyTitle>{locale === 'ru' ? 'События не найдены' : 'No events found'}</EmptyTitle><EmptyDescription>{locale === 'ru' ? 'Измените фильтры или создайте новое событие.' : 'Change the filters or create a new event.'}</EmptyDescription></EmptyHeader>
						<EmptyContent><Button asChild variant='outline'><Link href='/events/new'>{locale === 'ru' ? 'Создать событие' : 'Create event'}</Link></Button></EmptyContent>
					</Empty>
				)}

				{totalPages > 1 ? (
					<Pagination>
						<PaginationContent>
							{page > 1 ? <PaginationItem><PaginationPrevious href={pageHref({ date, difficulty, type }, page - 1)} text='Назад' /></PaginationItem> : null}
							{visiblePages.map(candidate => <PaginationItem key={candidate}><PaginationLink href={pageHref({ date, difficulty, type }, candidate)} isActive={candidate === page}>{candidate}</PaginationLink></PaginationItem>)}
							{page < totalPages ? <PaginationItem><PaginationNext href={pageHref({ date, difficulty, type }, page + 1)} text='Далее' /></PaginationItem> : null}
						</PaginationContent>
					</Pagination>
				) : null}
			</div>
		</main>
	)
}
