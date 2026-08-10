import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { CreateEventForm } from '@/components/events/create-event-form'
import type { CreateEventDraft, EventActivityType } from '@/components/events/create-event-types'
import styles from '@/components/events/create-event-form.module.css'
import { AppHeader } from '@/components/shell/app-header'
import { getEventCatalog } from '@/lib/activity-catalog'
import { getEventChannelAvailability } from '@/lib/event-publication'
import { toEventTemplateDto } from '@/lib/event-templates'
import { DEFAULT_EVENT_TIME_ZONE } from '@/lib/event-time'
import { t } from '@/lib/i18n'
import { getRequestLocale } from '@/lib/i18n-server'
import { getPreferredCharacter, orderCharactersByPreference } from '@/lib/main-character'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'

export const metadata: Metadata = { title: 'Редактировать событие | RaidReminder' }

function toActivityType(value: string): EventActivityType {
	if (value === 'DUNGEON') return 'dungeon'
	if (value === 'OPEN_WORLD') return 'open-world'
	return 'raid'
}

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
	const [{ id }, locale, session] = await Promise.all([params, getRequestLocale(), requireSession()])
	const event = await prisma.scheduledEvent.findFirst({
		include: {
			activities: { include: { activity: true }, orderBy: [{ sortOrder: 'asc' }] },
			difficulty: true,
		},
		where: { id, userId: session.user.id },
	})

	if (!event) notFound()
	if (event.status === 'CANCELLED' || event.startsAt.getTime() <= Date.now()) redirect(`/events/${event.id}`)

	const [account, rawCharacters, eventCatalog, rawTemplates] = await Promise.all([
		prisma.user.findUnique({ select: { mainCharacterId: true, timeZone: true }, where: { id: session.user.id } }),
		prisma.character.findMany({
			orderBy: [{ itemLevel: 'desc' }, { name: 'asc' }],
			select: { activeSpec: true, avatarUrl: true, className: true, id: true, isActive: true, itemLevel: true, name: true, realm: true, thumbnailUrl: true },
			where: { isActive: true, userId: session.user.id },
		}),
		getEventCatalog(locale),
		prisma.eventTemplate.findMany({ orderBy: [{ updatedAt: 'desc' }], where: { userId: session.user.id } }),
	])
	const characters = orderCharactersByPreference(rawCharacters, account?.mainCharacterId)
	const topCharacter = getPreferredCharacter(characters, account?.mainCharacterId)
	const displayName = topCharacter?.name ?? session.user.name ?? t(locale, 'header.playerFallback')
	const channelAvailability = getEventChannelAvailability()
	const defaultTimeZone = account?.timeZone ?? DEFAULT_EVENT_TIME_ZONE
	const initialDraft: CreateEventDraft = {
		activityType: toActivityType(event.activityType),
		addon: event.addonSlug,
		characterId: event.leaderCharacterId ?? characters[0]?.id ?? '',
		clientRequestId: randomUUID(),
		contentScope: event.contentScope,
		date: event.localDate,
		difficulty: event.difficulty.slug,
		hasPaidSlots: event.hasPaidSlots,
		hasUnroll: event.hasUnroll,
		leaderMode: event.leaderMode === 'CHARACTER' ? 'character' : 'manual',
		manualLeaderName: event.leaderName,
		manualLeaderRealm: event.leaderRealm,
		paidSlotPrice: event.paidSlotPrice,
		paidSlots: event.paidSlots,
		publishTargets: {
			app: event.publishTargets.includes('APP'),
			discord: event.publishTargets.includes('DISCORD') && channelAvailability.discord,
			telegram: event.publishTargets.includes('TELEGRAM') && channelAvailability.telegram,
		},
		roles: {
			damage: { max: event.damageMax, min: event.damageMin },
			healer: { max: event.healerMax, min: event.healerMin },
			tank: { max: event.tankMax, min: event.tankMin },
		},
		selectedInstanceSlugs: event.activities.map(({ activity }) => activity.slug),
		time: event.localTime,
		timeZone: event.timeZone,
		unrollInput: event.unrollItemIds.join(', '),
		unrollItemIds: event.unrollItemIds,
		unrollTemplateId: event.unrollTemplateId ?? 'custom',
	}
	const templates = rawTemplates.map(toEventTemplateDto).filter((template): template is NonNullable<typeof template> => template !== null)
	const headerUser = {
		avatarUrl: topCharacter?.avatarUrl ?? topCharacter?.thumbnailUrl ?? session.user.image ?? null,
		displayName,
		isAdmin: session.user.isAdmin,
	}

	return (
		<main className={styles.createEventPage} id='top'>
			<AppHeader user={headerUser} />
			<CreateEventForm
				channelAvailability={channelAvailability}
				characters={characters}
				defaultDate={event.localDate}
				defaultTimeZone={defaultTimeZone}
				displayName={displayName}
				eventCatalog={eventCatalog}
				eventId={event.id}
				eventVersion={event.version}
				initialDraft={initialDraft}
				mode='edit'
				templates={templates}
			/>
		</main>
	)
}
