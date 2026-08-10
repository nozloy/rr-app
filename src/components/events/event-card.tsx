import Image from 'next/image'
import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import { CalendarBlank, User, UsersThree } from '@phosphor-icons/react/dist/ssr'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { formatInTimeZone } from '@/lib/event-time'
import type { AppLocale } from '@/lib/i18n'

export type EventCardData = Prisma.ScheduledEventGetPayload<{
	include: {
		activities: { include: { activity: true } }
		difficulty: true
	}
}>

export function eventTypeLabel(
	activityType: EventCardData['activityType'],
	locale: AppLocale,
) {
	if (activityType === 'RAID') return locale === 'ru' ? 'Рейд' : 'Raid'
	if (activityType === 'DUNGEON') return locale === 'ru' ? 'Подземелье' : 'Dungeon'
	return locale === 'ru' ? 'Мир' : 'World'
}

export function eventTitle(event: EventCardData, locale: AppLocale) {
	const names = event.activities.map(({ activity }) =>
		locale === 'ru' ? activity.nameRu : activity.nameEn,
	)

	return names.join(', ') || (locale === 'ru' ? 'Событие' : 'Event')
}

function formatRange(min: number, max: number) {
	return min === max ? String(min) : `${min}–${max}`
}

export function EventCard({ event, locale }: { event: EventCardData; locale: AppLocale }) {
	const primaryActivity = event.activities[0]?.activity
	const title = eventTitle(event, locale)
	const difficulty = locale === 'ru' ? event.difficulty.labelRu : event.difficulty.labelEn

	return (
		<Card className='overflow-hidden shadow-none'>
			<div className='relative aspect-[16/6] bg-muted'>
				{primaryActivity?.artPath ? (
					<Image alt='' className='object-cover' fill sizes='(max-width: 768px) 100vw, 33vw' src={primaryActivity.artPath} />
				) : null}
				<div className='absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent' />
			</div>
			<CardHeader className='flex flex-col gap-3 pt-4'>
				<div className='flex flex-wrap gap-2'>
					<Badge variant='secondary'>{eventTypeLabel(event.activityType, locale)}</Badge>
					<Badge variant='outline'>{difficulty}</Badge>
					{event.status === 'CANCELLED' ? <Badge variant='danger'>{locale === 'ru' ? 'Отменено' : 'Cancelled'}</Badge> : null}
				</div>
				<CardTitle className='text-lg leading-snug'>
					<Link className='hover:underline' href={`/events/${event.id}`}>{title}</Link>
				</CardTitle>
			</CardHeader>
			<CardContent className='flex flex-col gap-2 text-sm text-muted-foreground'>
				<span className='flex items-center gap-2'><CalendarBlank aria-hidden='true' />{formatInTimeZone(event.startsAt, event.timeZone, locale === 'ru' ? 'ru-RU' : 'en-US')} ({event.timeZone})</span>
				<span className='flex items-center gap-2'><User aria-hidden='true' />{event.leaderName}-{event.leaderRealm}</span>
				<span className='flex items-center gap-2'><UsersThree aria-hidden='true' />{formatRange(event.tankMin, event.tankMax)} / {formatRange(event.healerMin, event.healerMax)} / {formatRange(event.damageMin, event.damageMax)}</span>
			</CardContent>
			<CardFooter>
				<Button asChild className='w-full' variant='outline'>
					<Link href={`/events/${event.id}`}>{locale === 'ru' ? 'Подробнее' : 'Details'}</Link>
				</Button>
			</CardFooter>
		</Card>
	)
}
