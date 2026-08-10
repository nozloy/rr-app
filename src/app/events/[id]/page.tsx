import React from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { CalendarBlank, Coins, Crown, UsersThree } from '@phosphor-icons/react/dist/ssr'
import { AppHeader } from '@/components/shell/app-header'
import { EventOwnerActions } from '@/components/events/event-owner-actions'
import { eventTitle, eventTypeLabel } from '@/components/events/event-card'
import { ViewerLocalTime } from '@/components/events/viewer-local-time'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatInTimeZone } from '@/lib/event-time'
import { getRequestLocale } from '@/lib/i18n-server'
import { prisma } from '@/lib/prisma'
import { getOptionalSession } from '@/lib/session'

type EventDetailPageProps = { params: Promise<{ id: string }> }

async function getEvent(id: string) {
	return prisma.scheduledEvent.findUnique({
		include: {
			activities: { include: { activity: true }, orderBy: [{ sortOrder: 'asc' }] },
			deliveries: { orderBy: [{ target: 'asc' }] },
			difficulty: true,
		},
		where: { id },
	})
}

export async function generateMetadata({ params }: EventDetailPageProps): Promise<Metadata> {
	const { id } = await params
	const event = await getEvent(id)
	return { title: event ? `${event.activities[0]?.activity.nameRu ?? 'Событие'} | RaidReminder` : 'Событие не найдено | RaidReminder' }
}

function formatRange(min: number, max: number) {
	return min === max ? String(min) : `${min}–${max}`
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
	const [{ id }, locale, session] = await Promise.all([params, getRequestLocale(), getOptionalSession()])
	const event = await getEvent(id)

	if (!event) notFound()

	const title = eventTitle(event, locale)
	const primaryActivity = event.activities[0]?.activity
	const isOwner = session?.user?.id === event.userId
	const isCancelled = event.status === 'CANCELLED'
	const canEdit = isOwner && !isCancelled && event.startsAt.getTime() > Date.now()

	return (
		<main className='min-h-full' id='top'>
			<AppHeader />
			<div className='mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 py-8 lg:px-6 lg:py-10'>
				<section className='relative overflow-hidden rounded-xl border bg-card'>
					{primaryActivity?.artPath ? <Image alt='' className='object-cover opacity-45' fill priority sizes='1120px' src={primaryActivity.artPath} /> : null}
					<div className='absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/35' />
					<div className='relative flex min-h-64 flex-col justify-end gap-4 p-6 sm:p-10'>
						<div className='flex flex-wrap gap-2'>
							<Badge variant='secondary'>{eventTypeLabel(event.activityType, locale)}</Badge>
							<Badge variant='outline'>{locale === 'ru' ? event.difficulty.labelRu : event.difficulty.labelEn}</Badge>
							{event.publishTargets.includes('APP') ? <Badge>В каталоге</Badge> : <Badge variant='outline'>По ссылке</Badge>}
							{isCancelled ? <Badge variant='danger'>Отменено</Badge> : null}
						</div>
						<h1 className='max-w-4xl font-heading text-3xl font-semibold sm:text-4xl'>{title}</h1>
					</div>
				</section>

				{isCancelled ? <Alert variant='destructive'><AlertTitle>Событие отменено</AlertTitle><AlertDescription>Страница сохранена для истории. Внешние публикации помечены как отменённые.</AlertDescription></Alert> : null}

				<div className='grid gap-6 lg:grid-cols-[1.3fr_0.7fr]'>
					<Card className='shadow-none'>
						<CardHeader><CardTitle>Параметры события</CardTitle></CardHeader>
						<CardContent className='flex flex-col gap-5'>
							<div className='flex flex-col gap-2'><strong className='flex items-center gap-2'><CalendarBlank aria-hidden='true' />Дата и время</strong><span>{formatInTimeZone(event.startsAt, event.timeZone, locale === 'ru' ? 'ru-RU' : 'en-US')} ({event.timeZone})</span><ViewerLocalTime authorTimeZone={event.timeZone} startsAt={event.startsAt.toISOString()} /></div>
							<div className='flex flex-col gap-2'><strong className='flex items-center gap-2'><Crown aria-hidden='true' />Лидер</strong><span>{event.leaderName}-{event.leaderRealm}</span></div>
							<div className='flex flex-col gap-2'><strong className='flex items-center gap-2'><UsersThree aria-hidden='true' />Состав группы</strong><span>Танки {formatRange(event.tankMin, event.tankMax)} · Хиллеры {formatRange(event.healerMin, event.healerMax)} · Дамагеры {formatRange(event.damageMin, event.damageMax)}</span></div>
							{event.hasPaidSlots ? <div className='flex flex-col gap-2'><strong className='flex items-center gap-2'><Coins aria-hidden='true' />Платные места</strong><span>{event.paidSlots} мест · {event.paidSlotPrice.toLocaleString('ru-RU')} золота</span></div> : null}
							{event.hasUnroll ? <div className='flex flex-col gap-2'><strong>Анролл</strong><span>{event.unrollItemIds.length > 0 ? event.unrollItemIds.join(', ') : 'Включён'}</span></div> : null}
						</CardContent>
					</Card>

					<Card className='shadow-none'>
						<CardHeader><CardTitle>Инстансы</CardTitle></CardHeader>
						<CardContent className='flex flex-col gap-3'>
							{event.activities.map(({ activity }) => <div className='rounded-lg border p-3' key={activity.id}><strong>{locale === 'ru' ? activity.nameRu : activity.nameEn}</strong></div>)}
						</CardContent>
					</Card>
				</div>

				{isOwner ? <EventOwnerActions canEdit={canEdit} deliveries={event.deliveries.map(delivery => ({ lastAttemptAt: delivery.lastAttemptAt?.toISOString() ?? null, lastErrorMessage: delivery.lastErrorMessage, status: delivery.status, target: delivery.target }))} eventId={event.id} isCancelled={isCancelled} version={event.version} /> : null}
			</div>
		</main>
	)
}
