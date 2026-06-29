import type { LucideIcon } from 'lucide-react'

export type EventActivityType = 'raid' | 'dungeon' | 'season' | 'open-world'
export type EventDifficulty = 'normal' | 'heroic' | 'mythic'

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
export type EventPublishTarget = 'discord' | 'telegram' | 'app' | 'custom'

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
	unrollInput: string
	unrollItemIds: string[]
	unrollTemplateId: string
}

export type CreateEventFormProps = {
	characters: EventCharacterOption[]
	defaultDate: string
	displayName: string
	eventCatalog: EventCatalog
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

export type EventCatalog = {
	addons: EventAddonOption[]
	defaultAddon: string
	difficulties: DifficultyOption[]
	optionsByAddon: Record<
		string,
		Record<EventActivityType, EventInstanceOption[]>
	>
}

export type RoleField = {
	imageSrc: string
	key: EventRole
	label: string
	placeholder: string
}

export type PublishTargetIcon = 'discord' | 'telegram' | 'app' | 'custom'

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
