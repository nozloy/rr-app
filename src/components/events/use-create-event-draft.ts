'use client'

import { useMemo, useReducer } from 'react'
import {
	defaultRoleRanges,
	openWorldActivities,
	roleFields,
	unrollTemplates,
} from './create-event-data'
import type {
	CreateEventDraft,
	CreateEventFormProps,
	EventActivityType,
	EventPublishTarget,
	EventRole,
	LeaderMode,
	RoleRange,
	UnrollTemplate,
} from './create-event-types'
import {
	formatRange,
	getDungeonOptions,
	getRaidOptions,
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
	| { type: 'toggle-instance'; slug: string }
	| { type: 'remove-instance'; slug: string }
	| { type: 'set-addon'; addon: string }
	| { type: 'set-date'; date: string }
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
	raidSlugs,
}: CreateEventFormProps & { raidSlugs: string[] }): CreateEventDraftState {
	const defaultTemplate = unrollTemplates[0]

	return {
		draft: {
			activityType: 'raid',
			addon: 'Midnight',
			characterId: characters[0]?.id ?? '',
			date: defaultDate,
			hasPaidSlots: false,
			hasUnroll: true,
			leaderMode: characters.length > 0 ? 'character' : 'manual',
			manualLeaderName: characters[0]?.name ?? displayName,
			manualLeaderRealm: characters[0]?.realm ?? 'Silvermoon',
			paidSlotPrice: 50000,
			paidSlots: 2,
			publishTargets: {
				app: true,
				custom: false,
				discord: true,
				telegram: true,
			},
			roles: {
				damage: { ...defaultRoleRanges.damage },
				healer: { ...defaultRoleRanges.healer },
				tank: { ...defaultRoleRanges.tank },
			},
			selectedInstanceSlugs: raidSlugs,
			time: '20:30',
			unrollInput: defaultTemplate.itemIds.join(', '),
			unrollItemIds: defaultTemplate.itemIds,
			unrollTemplateId: defaultTemplate.id,
		},
		roleInputValues: {
			damage: formatRange(defaultRoleRanges.damage),
			healer: formatRange(defaultRoleRanges.healer),
			tank: formatRange(defaultRoleRanges.tank),
		},
		statusMessage: null,
	}
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
		case 'set-activity-type':
			return {
				...current,
				draft: {
					...current.draft,
					activityType: action.activityType,
					selectedInstanceSlugs: action.selectedInstanceSlugs,
				},
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
		case 'set-addon':
			return {
				...current,
				draft: {
					...current.draft,
					addon: action.addon,
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

export function useCreateEventDraft({
	characters,
	defaultDate,
	displayName,
}: CreateEventFormProps) {
	const raidOptions = useMemo(() => getRaidOptions(), [])
	const dungeonOptions = useMemo(() => getDungeonOptions(), [])
	const instanceOptionsByType = useMemo(
		() => ({
			dungeon: dungeonOptions,
			'open-world': openWorldActivities,
			raid: raidOptions,
		}),
		[dungeonOptions, raidOptions],
	)
	const [state, dispatch] = useReducer(
		createEventDraftReducer,
		{ characters, defaultDate, displayName, raidSlugs: raidOptions.map(option => option.slug) },
		createInitialState,
	)
	const { draft, roleInputValues, statusMessage } = state
	const selectedCharacter =
		characters.find(character => character.id === draft.characterId) ??
		characters[0] ??
		null
	const instanceOptions = instanceOptionsByType[draft.activityType]
	const selectedInstances = instanceOptions.filter(instance =>
		draft.selectedInstanceSlugs.includes(instance.slug),
	)
	const previewInstance =
		selectedInstances[0] ?? instanceOptions[0] ?? openWorldActivities[0]
	const selectedTemplate =
		unrollTemplates.find(template => template.id === draft.unrollTemplateId) ??
		null
	const roleValidation = {
		damage: parseRoleRangeInput(roleInputValues.damage),
		healer: parseRoleRangeInput(roleInputValues.healer),
		tank: parseRoleRangeInput(roleInputValues.tank),
	}
	const roleErrors = roleFields
		.map(role => {
			const error = roleValidation[role.key].error

			return error ? `${role.label}: ${error}` : null
		})
		.filter((error): error is string => error !== null)
	const hasRoleError = roleErrors.length > 0
	const hasPublishTarget = Object.values(draft.publishTargets).some(Boolean)
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
	const canPublish = canSubmit && hasPublishTarget

	return {
		canPublish,
		canSubmit,
		dispatchers: {
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
			setAddon: (addon: string) =>
				dispatch({ addon, type: 'set-addon' }),
			setCharacter: (characterId: string) =>
				dispatch({ characterId, type: 'set-character' }),
			setDate: (date: string) => dispatch({ date, type: 'set-date' }),
			setDateTime: (date: Date) =>
				dispatch({ date, type: 'set-date-time' }),
			setLeaderMode: (mode: LeaderMode) =>
				dispatch({ mode, type: 'set-leader-mode' }),
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
							? 'Событие подготовлено к публикации локально. Серверное сохранение появится в следующей версии.'
							: 'Шаблон собран локально. В этой версии он не записывается в базу.',
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
