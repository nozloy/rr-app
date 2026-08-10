'use client'

import { useEffect, useMemo, useReducer } from 'react'
import { useAppLocale } from '@/components/shell/locale-provider'
import { t } from '@/lib/i18n'
import {
	defaultRoleRanges,
	dungeonRoleRanges,
	getRoleFields,
	unrollTemplates,
} from './create-event-data'
import type {
	CreateEventDraft,
	CreateEventFormProps,
	DifficultyOption,
	EventActivityType,
	EventContentScope,
	EventDifficulty,
	EventInstanceOption,
	EventPublishTarget,
	EventRole,
	LeaderMode,
	RoleRange,
	UnrollTemplate,
} from './create-event-types'
import {
	formatRange,
	parseItemIds,
	parseRoleRangeInput,
	toDateInputValue,
	toTimeInputValue,
} from './create-event-utils'

type SubmitAction = 'publish' | 'template'

type CreateEventDraftState = {
	draft: CreateEventDraft
	roleInputValues: Record<EventRole, string>
	statusMessage: string | null
}

type CreateEventDraftAction =
	| { type: 'set-leader-mode'; mode: LeaderMode }
	| { type: 'set-character'; characterId: string }
	| {
			type: 'set-manual-leader'
			field: 'manualLeaderName' | 'manualLeaderRealm'
			value: string
	  }
	| {
			type: 'set-activity-type'
			activityType: EventActivityType
			selectedInstanceSlugs: string[]
	  }
	| {
			type: 'set-content-scope'
			contentScope: EventContentScope
			activityType: EventActivityType
			selectedInstanceSlugs: string[]
	  }
	| { type: 'toggle-instance'; slug: string }
	| { type: 'remove-instance'; slug: string }
	| {
			type: 'set-addon'
			addon: string
			activityType: EventActivityType
			contentScope: EventContentScope
			selectedInstanceSlugs: string[]
	  }
	| { type: 'set-difficulty'; difficulty: EventDifficulty }
	| { type: 'set-date'; date: string }
	| { type: 'set-time-zone'; timeZone: string }
	| { type: 'set-date-time'; date: Date }
	| { type: 'set-time-part'; part: 'hour' | 'minute'; value: string }
	| { type: 'update-role-input'; role: EventRole; value: string }
	| { type: 'set-paid-slots-enabled'; checked: boolean }
	| { type: 'set-paid-slots'; paidSlots: number }
	| { type: 'set-paid-slot-price'; paidSlotPrice: number }
	| { type: 'set-unroll-enabled'; checked: boolean }
	| { type: 'set-unroll-input'; value: string }
	| { type: 'select-unroll-template'; template: UnrollTemplate | null }
	| {
			type: 'toggle-publish-target'
			target: EventPublishTarget
			checked: boolean
	  }
	| { type: 'replace-draft'; draft: CreateEventDraft; message?: string }
	| { type: 'submit'; message: string }

function clearStatus(state: CreateEventDraftState): CreateEventDraftState {
	if (!state.statusMessage) {
		return state
	}

	return {
		...state,
		statusMessage: null,
	}
}

function createInitialState({
	characters,
	defaultDate,
	displayName,
	eventCatalog,
	initialDraft,
	defaultTimeZone,
}: Pick<
	CreateEventFormProps,
	'characters' | 'defaultDate' | 'defaultTimeZone' | 'displayName' | 'eventCatalog' | 'initialDraft'
>): CreateEventDraftState {
	const defaultTemplate = unrollTemplates[0] ?? null
	const defaultUnrollItemIds = defaultTemplate?.itemIds ?? ['249343']
	const defaultUnrollTemplateId = defaultTemplate?.id ?? 'custom'
	const defaultAddon =
		eventCatalog.defaultAddon || eventCatalog.addons[0]?.value || ''
	const defaultContentScope =
		eventCatalog.defaultContentScope ||
		eventCatalog.contentScopes[0]?.value ||
		'expansion'
	const defaultOptionsByType =
		eventCatalog.optionsByAddon[defaultAddon]?.[defaultContentScope] ??
		emptyInstanceOptions
	const defaultActivityType = resolveActivityType(defaultOptionsByType, 'raid')
	const defaultInstanceOptions = defaultOptionsByType[defaultActivityType]
	const defaultDifficulty =
		eventCatalog.difficulties[0]?.difficulty ?? 'normal'

	const draft: CreateEventDraft = initialDraft ?? {
			activityType: defaultActivityType,
			addon: defaultAddon,
			clientRequestId: crypto.randomUUID(),
			contentScope: defaultContentScope,
			characterId: characters[0]?.id ?? '',
			date: defaultDate,
			difficulty: defaultDifficulty,
			hasPaidSlots: false,
			hasUnroll: true,
			leaderMode: characters.length > 0 ? 'character' : 'manual',
			manualLeaderName: characters[0]?.name ?? displayName,
			manualLeaderRealm: characters[0]?.realm ?? 'Silvermoon',
			paidSlotPrice: 50000,
			paidSlots: 2,
			publishTargets: {
				app: true,
				discord: false,
				telegram: false,
			},
			roles: {
				damage: { ...defaultRoleRanges.damage },
				healer: { ...defaultRoleRanges.healer },
				tank: { ...defaultRoleRanges.tank },
			},
			selectedInstanceSlugs: defaultInstanceOptions.map(option => option.slug),
			time: '20:30',
			timeZone: defaultTimeZone,
			unrollInput: defaultUnrollItemIds.join(', '),
			unrollItemIds: defaultUnrollItemIds,
			unrollTemplateId: defaultUnrollTemplateId,
		}

	return {
		draft,
		roleInputValues: {
			damage: formatRange(draft.roles.damage),
			healer: formatRange(draft.roles.healer),
			tank: formatRange(draft.roles.tank),
		},
		statusMessage: null,
	}
}

function getDifficultyKey(option: DifficultyOption) {
	return option.difficulty
}

function getDifficultyOptionsForSelection({
	activityType,
	defaultDifficulties,
	difficultiesByActivitySlug,
	selectedInstances,
}: {
	activityType: EventActivityType
	defaultDifficulties: DifficultyOption[]
	difficultiesByActivitySlug: CreateEventFormProps['eventCatalog']['difficultiesByActivitySlug']
	selectedInstances: Array<{ slug: string }>
}) {
	if (activityType !== 'raid' || selectedInstances.length === 0) {
		return defaultDifficulties
	}

	const allowedByRaid = selectedInstances.map(instance => {
		const configured = difficultiesByActivitySlug[instance.slug]

		return configured && configured.length > 0 ? configured : defaultDifficulties
	})
	const allowedKeys = allowedByRaid.map(options =>
		new Set(options.map(getDifficultyKey)),
	)
	const mergedOptions = new Map<string, DifficultyOption>()

	for (const options of allowedByRaid) {
		for (const option of options) {
			mergedOptions.set(option.difficulty, option)
		}
	}

	const firstAllowed = allowedKeys[0]

	if (!firstAllowed) {
		return defaultDifficulties
	}

	const intersection = Array.from(mergedOptions.values())
		.filter(option => allowedKeys.every(keys => keys.has(option.difficulty)))
		.sort((a, b) => {
			const defaultA = defaultDifficulties.findIndex(
				option => option.difficulty === a.difficulty,
			)
			const defaultB = defaultDifficulties.findIndex(
				option => option.difficulty === b.difficulty,
			)

			if (defaultA !== -1 || defaultB !== -1) {
				return (defaultA === -1 ? 999 : defaultA) - (defaultB === -1 ? 999 : defaultB)
			}

			return a.label.localeCompare(b.label)
		})

	return intersection.length > 0 ? intersection : defaultDifficulties
}

function updateRole(
	roles: Record<EventRole, RoleRange>,
	role: EventRole,
	value: string,
) {
	const { range } = parseRoleRangeInput(value)

	if (!range) {
		return roles
	}

	return {
		...roles,
		[role]: range,
	}
}

function getDungeonRolePreset(
	currentActivityType: EventActivityType,
	nextActivityType: EventActivityType,
) {
	if (currentActivityType === 'dungeon' || nextActivityType !== 'dungeon') {
		return null
	}

	return {
		roleInputValues: {
			damage: formatRange(dungeonRoleRanges.damage),
			healer: formatRange(dungeonRoleRanges.healer),
			tank: formatRange(dungeonRoleRanges.tank),
		},
		roles: {
			damage: { ...dungeonRoleRanges.damage },
			healer: { ...dungeonRoleRanges.healer },
			tank: { ...dungeonRoleRanges.tank },
		},
	}
}

function createEventDraftReducer(
	state: CreateEventDraftState,
	action: CreateEventDraftAction,
): CreateEventDraftState {
	if (action.type === 'submit') {
		return {
			...state,
			statusMessage: action.message,
		}
	}

	if (action.type === 'replace-draft') {
		return {
			draft: action.draft,
			roleInputValues: {
				damage: formatRange(action.draft.roles.damage),
				healer: formatRange(action.draft.roles.healer),
				tank: formatRange(action.draft.roles.tank),
			},
			statusMessage: action.message ?? null,
		}
	}

	const current = clearStatus(state)

	switch (action.type) {
		case 'set-leader-mode':
			return {
				...current,
				draft: {
					...current.draft,
					leaderMode: action.mode,
				},
			}
		case 'set-character':
			return {
				...current,
				draft: {
					...current.draft,
					characterId: action.characterId,
				},
			}
		case 'set-manual-leader':
			return {
				...current,
				draft: {
					...current.draft,
					[action.field]: action.value,
				},
			}
		case 'set-activity-type': {
			const dungeonRolePreset = getDungeonRolePreset(
				current.draft.activityType,
				action.activityType,
			)

			return {
				...current,
				draft: {
					...current.draft,
					activityType: action.activityType,
					roles: dungeonRolePreset?.roles ?? current.draft.roles,
					selectedInstanceSlugs: action.selectedInstanceSlugs,
				},
				roleInputValues:
					dungeonRolePreset?.roleInputValues ?? current.roleInputValues,
			}
		}
		case 'set-content-scope': {
			const dungeonRolePreset = getDungeonRolePreset(
				current.draft.activityType,
				action.activityType,
			)

			return {
				...current,
				draft: {
					...current.draft,
					activityType: action.activityType,
					contentScope: action.contentScope,
					roles: dungeonRolePreset?.roles ?? current.draft.roles,
					selectedInstanceSlugs: action.selectedInstanceSlugs,
				},
				roleInputValues:
					dungeonRolePreset?.roleInputValues ?? current.roleInputValues,
			}
		}
		case 'toggle-instance': {
			const isSelected =
				current.draft.selectedInstanceSlugs.includes(action.slug)
			const selectedInstanceSlugs = isSelected
				? current.draft.selectedInstanceSlugs.filter(
						value => value !== action.slug,
					)
				: [...current.draft.selectedInstanceSlugs, action.slug]

			return {
				...current,
				draft: {
					...current.draft,
					selectedInstanceSlugs:
						selectedInstanceSlugs.length > 0
							? selectedInstanceSlugs
							: [action.slug],
				},
			}
		}
		case 'remove-instance': {
			if (current.draft.selectedInstanceSlugs.length <= 1) {
				return current
			}

			return {
				...current,
				draft: {
					...current.draft,
					selectedInstanceSlugs: current.draft.selectedInstanceSlugs.filter(
						value => value !== action.slug,
					),
				},
			}
		}
		case 'set-addon': {
			const dungeonRolePreset = getDungeonRolePreset(
				current.draft.activityType,
				action.activityType,
			)

			return {
				...current,
				draft: {
					...current.draft,
					activityType: action.activityType,
					addon: action.addon,
					contentScope: action.contentScope,
					roles: dungeonRolePreset?.roles ?? current.draft.roles,
					selectedInstanceSlugs: action.selectedInstanceSlugs,
				},
				roleInputValues:
					dungeonRolePreset?.roleInputValues ?? current.roleInputValues,
			}
		}
		case 'set-difficulty':
			return {
				...current,
				draft: {
					...current.draft,
					difficulty: action.difficulty,
				},
			}
		case 'set-date':
			return {
				...current,
				draft: {
					...current.draft,
					date: action.date,
				},
			}
		case 'set-time-zone':
			return {
				...current,
				draft: {
					...current.draft,
					timeZone: action.timeZone,
				},
			}
		case 'set-date-time':
			return {
				...current,
				draft: {
					...current.draft,
					date: toDateInputValue(action.date),
					time: toTimeInputValue(action.date),
				},
			}
		case 'set-time-part': {
			const [currentHour = '00', currentMinute = '00'] =
				current.draft.time.split(':')
			const time =
				action.part === 'hour'
					? `${action.value}:${currentMinute}`
					: `${currentHour}:${action.value}`

			return {
				...current,
				draft: {
					...current.draft,
					time,
				},
			}
		}
		case 'update-role-input':
			return {
				...current,
				draft: {
					...current.draft,
					roles: updateRole(
						current.draft.roles,
						action.role,
						action.value,
					),
				},
				roleInputValues: {
					...current.roleInputValues,
					[action.role]: action.value,
				},
			}
		case 'set-paid-slots-enabled':
			return {
				...current,
				draft: {
					...current.draft,
					hasPaidSlots: action.checked,
				},
			}
		case 'set-paid-slots':
			return {
				...current,
				draft: {
					...current.draft,
					paidSlots: action.paidSlots,
				},
			}
		case 'set-paid-slot-price':
			return {
				...current,
				draft: {
					...current.draft,
					paidSlotPrice: action.paidSlotPrice,
				},
			}
		case 'set-unroll-enabled':
			return {
				...current,
				draft: {
					...current.draft,
					hasUnroll: action.checked,
				},
			}
		case 'set-unroll-input':
			return {
				...current,
				draft: {
					...current.draft,
					unrollInput: action.value,
					unrollItemIds: parseItemIds(action.value),
					unrollTemplateId: 'custom',
				},
			}
		case 'select-unroll-template':
			if (!action.template) {
				return {
					...current,
					draft: {
						...current.draft,
						unrollTemplateId: 'custom',
					},
				}
			}

			return {
				...current,
				draft: {
					...current.draft,
					hasUnroll: true,
					unrollInput: action.template.itemIds.join(', '),
					unrollItemIds: action.template.itemIds,
					unrollTemplateId: action.template.id,
				},
			}
		case 'toggle-publish-target':
			return {
				...current,
				draft: {
					...current.draft,
					publishTargets: {
						...current.draft.publishTargets,
						[action.target]: action.checked,
					},
				},
			}
		default:
			return current
	}
}

type InstanceOptionsByType = Record<EventActivityType, EventInstanceOption[]>

const emptyInstanceOptions: InstanceOptionsByType = {
	dungeon: [],
	'open-world': [],
	raid: [],
}

function resolveActivityType(
	optionsByType: InstanceOptionsByType,
	preferredType: EventActivityType,
) {
	if (optionsByType[preferredType].length > 0) {
		return preferredType
	}

	return (
		(['raid', 'dungeon', 'open-world'] as const).find(
			activityType => optionsByType[activityType].length > 0,
		) ?? preferredType
	)
}

export function useCreateEventDraft({
	characters,
	defaultDate,
	defaultTimeZone,
	displayName,
	eventCatalog,
	initialDraft,
}: CreateEventFormProps) {
	const locale = useAppLocale()
	const roleFields = useMemo(() => getRoleFields(locale), [locale])
	const [state, dispatch] = useReducer(
		createEventDraftReducer,
		{ characters, defaultDate, defaultTimeZone, displayName, eventCatalog, initialDraft },
		createInitialState,
	)
	const { draft, roleInputValues, statusMessage } = state
	const instanceOptionsByScope =
		eventCatalog.optionsByAddon[draft.addon] ??
		eventCatalog.optionsByAddon[eventCatalog.defaultAddon] ?? {
			expansion: emptyInstanceOptions,
		}
	const instanceOptionsByType =
		instanceOptionsByScope[draft.contentScope] ?? emptyInstanceOptions
	const selectedCharacter =
		characters.find(character => character.id === draft.characterId) ??
		characters[0] ??
		null
	const instanceOptions = instanceOptionsByType[draft.activityType]
	const selectedInstances = instanceOptions.filter(instance =>
		draft.selectedInstanceSlugs.includes(instance.slug),
	)
	const difficultyOptions = useMemo(
		() =>
			getDifficultyOptionsForSelection({
				activityType: draft.activityType,
				defaultDifficulties: eventCatalog.difficulties,
				difficultiesByActivitySlug: eventCatalog.difficultiesByActivitySlug,
				selectedInstances,
			}),
		[
			draft.activityType,
			eventCatalog.difficulties,
			eventCatalog.difficultiesByActivitySlug,
			selectedInstances,
		],
	)
	const hasSelectedDifficulty = difficultyOptions.some(
		option => option.difficulty === draft.difficulty,
	)

	useEffect(() => {
		if (!hasSelectedDifficulty && difficultyOptions[0]) {
			dispatch({
				difficulty: difficultyOptions[0].difficulty,
				type: 'set-difficulty',
			})
		}
	}, [draft.difficulty, difficultyOptions, hasSelectedDifficulty])
	const fallbackOpenWorldInstance =
		instanceOptionsByType['open-world'][0] ??
		Object.values(eventCatalog.optionsByAddon)
			.flatMap(optionsByScope => Object.values(optionsByScope))
			.find(optionsByType => optionsByType['open-world'][0])
			?.['open-world'][0]
	const previewInstance =
		selectedInstances[0] ??
		instanceOptions[0] ??
		fallbackOpenWorldInstance ?? {
			activityType: 'open-world',
			artPath: '/home/raid-reminder-mark.png',
			name: 'Raid Reminder',
			shortName: 'RR',
			slug: 'raid-reminder',
			tag: 'APP',
		}
	const selectedTemplate =
		unrollTemplates.find(template => template.id === draft.unrollTemplateId) ??
		null
	const roleValidation = {
		damage: parseRoleRangeInput(roleInputValues.damage, locale),
		healer: parseRoleRangeInput(roleInputValues.healer, locale),
		tank: parseRoleRangeInput(roleInputValues.tank, locale),
	}
	const roleErrors = roleFields
		.map(role => {
			const error = roleValidation[role.key].error

			return error ? `${role.label}: ${error}` : null
		})
		.filter((error): error is string => error !== null)
	const hasRoleError = roleErrors.length > 0
	const leaderName =
		draft.leaderMode === 'character'
			? (selectedCharacter?.name ?? '')
			: draft.manualLeaderName.trim()
	const leaderRealm =
		draft.leaderMode === 'character'
			? (selectedCharacter?.realm ?? '')
			: draft.manualLeaderRealm.trim()
	const canSubmit =
		leaderName.length > 0 &&
		leaderRealm.length > 0 &&
		selectedInstances.length > 0 &&
		!hasRoleError
	const canPublish = canSubmit

	return {
		canPublish,
		canSubmit,
		difficultyOptions,
			dispatchers: {
			replaceDraft: (nextDraft: CreateEventDraft, message?: string) =>
				dispatch({ draft: nextDraft, message, type: 'replace-draft' }),
			removeInstance: (slug: string) =>
				dispatch({ slug, type: 'remove-instance' }),
			selectUnrollTemplate: (templateId: string) =>
				dispatch({
					template:
						unrollTemplates.find(template => template.id === templateId) ??
						null,
					type: 'select-unroll-template',
				}),
			setActivityType: (activityType: EventActivityType) => {
				const nextOptions = instanceOptionsByType[activityType]

				dispatch({
					activityType,
					selectedInstanceSlugs: nextOptions[0] ? [nextOptions[0].slug] : [],
					type: 'set-activity-type',
				})
			},
			setContentScope: (contentScope: EventContentScope) => {
				const nextOptionsByType =
					instanceOptionsByScope[contentScope] ?? emptyInstanceOptions
				const activityType = resolveActivityType(
					nextOptionsByType,
					draft.activityType,
				)
				const nextOptions = nextOptionsByType[activityType]

				dispatch({
					activityType,
					contentScope,
					selectedInstanceSlugs: nextOptions[0] ? [nextOptions[0].slug] : [],
					type: 'set-content-scope',
				})
			},
			setAddon: (addon: string) => {
				const nextOptionsByScope =
					eventCatalog.optionsByAddon[addon] ?? instanceOptionsByScope
				const contentScope = nextOptionsByScope[draft.contentScope]
					? draft.contentScope
					: 'expansion'
				const nextOptionsByType =
					nextOptionsByScope[contentScope] ?? emptyInstanceOptions
				const activityType = resolveActivityType(
					nextOptionsByType,
					draft.activityType,
				)
				const nextOptions = nextOptionsByType[activityType]

				dispatch({
					activityType,
					addon,
					contentScope,
					selectedInstanceSlugs: nextOptions[0] ? [nextOptions[0].slug] : [],
					type: 'set-addon',
				})
			},
			setDifficulty: (difficulty: EventDifficulty) =>
				dispatch({ difficulty, type: 'set-difficulty' }),
			setCharacter: (characterId: string) =>
				dispatch({ characterId, type: 'set-character' }),
			setDate: (date: string) => dispatch({ date, type: 'set-date' }),
			setDateTime: (date: Date) =>
				dispatch({ date, type: 'set-date-time' }),
			setLeaderMode: (mode: LeaderMode) =>
				dispatch({ mode, type: 'set-leader-mode' }),
			setStatusMessage: (message: string) =>
				dispatch({ message, type: 'submit' }),
			setManualLeaderName: (value: string) =>
				dispatch({
					field: 'manualLeaderName',
					type: 'set-manual-leader',
					value,
				}),
			setManualLeaderRealm: (value: string) =>
				dispatch({
					field: 'manualLeaderRealm',
					type: 'set-manual-leader',
					value,
				}),
			setPaidSlotPrice: (paidSlotPrice: number) =>
				dispatch({ paidSlotPrice, type: 'set-paid-slot-price' }),
			setPaidSlots: (paidSlots: number) =>
				dispatch({ paidSlots, type: 'set-paid-slots' }),
			setPaidSlotsEnabled: (checked: boolean) =>
				dispatch({ checked, type: 'set-paid-slots-enabled' }),
			setTimePart: (part: 'hour' | 'minute', value: string) =>
				dispatch({ part, type: 'set-time-part', value }),
			setTimeZone: (timeZone: string) =>
				dispatch({ timeZone, type: 'set-time-zone' }),
			setUnrollEnabled: (checked: boolean) =>
				dispatch({ checked, type: 'set-unroll-enabled' }),
			submitDraft: (action: SubmitAction) => {
				if (action === 'publish' && !canPublish) {
					return
				}

				if (action === 'template' && !canSubmit) {
					return
				}

				dispatch({
					message:
						action === 'publish'
							? t(locale, 'events.statusPublishReady')
							: t(locale, 'events.statusTemplateReady'),
					type: 'submit',
				})
			},
			toggleInstance: (slug: string) =>
				dispatch({ slug, type: 'toggle-instance' }),
			togglePublishTarget: (
				target: EventPublishTarget,
				checked: boolean,
			) =>
				dispatch({
					checked,
					target,
					type: 'toggle-publish-target',
				}),
			updateRoleRangeInput: (role: EventRole, value: string) =>
				dispatch({ role, type: 'update-role-input', value }),
			updateUnrollInput: (value: string) =>
				dispatch({ type: 'set-unroll-input', value }),
		},
		draft,
		hasRoleError,
		instanceOptions,
		leaderName,
		leaderRealm,
		previewInstance,
		roleErrors,
		roleInputValues,
		roleValidation,
		selectedCharacter,
		selectedInstances,
		selectedTemplate,
		statusMessage,
	}
}
