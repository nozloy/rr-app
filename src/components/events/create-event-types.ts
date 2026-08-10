import type { LucideIcon } from 'lucide-react'
import type { EventChannelAvailability } from '@/lib/event-publication'
import type { EventTemplateDto } from '@/lib/event-templates'

export type EventActivityType = 'raid' | 'dungeon' | 'open-world'
export type EventContentScope = string
export type EventDifficulty = string

export type EventCharacterOption = {
	activeSpec?: string | null
	avatarUrl?: string | null
	className: string
	id: string
	itemLevel: number
	name: string
	realm: string
	thumbnailUrl?: string | null
}

export type LeaderMode = 'character' | 'manual'
export type EventRole = 'tank' | 'healer' | 'damage'
export type EventPublishTarget = 'discord' | 'telegram' | 'app'

export type RoleRange = {
	max: number
	min: number
}

export type EventInstanceOption = {
	activityType: EventActivityType
	artPath: string
	slug: string
	name: string
	shortName: string
	tag: string
}

export type UnrollTemplate = {
	className: string
	id: string
	itemIds: string[]
	label: string
	spec: string
}

export type CreateEventDraft = {
	addon: string
	activityType: EventActivityType
	clientRequestId: string
	contentScope: EventContentScope
	characterId: string
	date: string
	difficulty: EventDifficulty
	hasPaidSlots: boolean
	hasUnroll: boolean
	leaderMode: LeaderMode
	manualLeaderName: string
	manualLeaderRealm: string
	paidSlotPrice: number
	paidSlots: number
	publishTargets: Record<EventPublishTarget, boolean>
	roles: Record<EventRole, RoleRange>
	selectedInstanceSlugs: string[]
	time: string
	timeZone: string
	unrollInput: string
	unrollItemIds: string[]
	unrollTemplateId: string
}

export type CreateEventFormProps = {
	channelAvailability: EventChannelAvailability
	characters: EventCharacterOption[]
	defaultDate: string
	defaultTimeZone: string
	displayName: string
	eventId?: string
	eventCatalog: EventCatalog
	eventVersion?: number
	initialDraft?: CreateEventDraft
	mode?: 'create' | 'edit'
	templates: EventTemplateDto[]
}

export type ActivityTab = {
	icon: LucideIcon
	label: string
	type: EventActivityType
}

export type DifficultyOption = {
	difficulty: EventDifficulty
	label: string
}

export type EventAddonOption = {
	label: string
	value: string
}

export type EventContentScopeOption = {
	label: string
	value: EventContentScope
}

export type EventCatalog = {
	addons: EventAddonOption[]
	defaultAddon: string
	defaultContentScope: EventContentScope
	contentScopes: EventContentScopeOption[]
	difficulties: DifficultyOption[]
	difficultiesByActivitySlug: Record<string, DifficultyOption[]>
	optionsByAddon: Record<
		string,
		Record<
			EventContentScope,
			Record<EventActivityType, EventInstanceOption[]>
		>
	>
}

export type RoleField = {
	imageSrc: string
	key: EventRole
	label: string
	placeholder: string
}

export type PublishTargetIcon = 'discord' | 'telegram' | 'app'

export type PublishTargetField = {
	icon: PublishTargetIcon
	imageSrc?: string
	key: EventPublishTarget
	label: string
	note: string
}

export type RoleValidationResult = {
	error: string | null
	range: RoleRange | null
}
