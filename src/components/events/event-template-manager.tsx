'use client'

import React from 'react'
import {
	FloppyDisk,
	FolderOpen,
	PencilSimple,
	Trash,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
	deleteEventTemplateAction,
	renameEventTemplateAction,
	saveEventTemplateAction,
} from '@/actions/event-templates'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { EventTemplatePayload } from '@/lib/event-schema'
import type { EventTemplateDto } from '@/lib/event-templates'
import { getTomorrowInputDate, isValidTimeZone } from '@/lib/event-time'
import type {
	CreateEventDraft,
	CreateEventFormProps,
	EventActivityType,
} from './create-event-types'

type TemplateManagerProps = Pick<
	CreateEventFormProps,
	'channelAvailability' | 'characters' | 'defaultTimeZone' | 'eventCatalog'
> & {
	disabled?: boolean
	draft: CreateEventDraft
	onLoad: (draft: CreateEventDraft, message?: string) => void
	templates: EventTemplateDto[]
}

function createRequestId() {
	return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

function toTemplatePayload(draft: CreateEventDraft): EventTemplatePayload {
	const { clientRequestId: _clientRequestId, date: _date, ...payload } = draft
	void _clientRequestId
	void _date
	return payload
}

function firstAvailableActivityType(
	options: Record<EventActivityType, Array<{ slug: string }>>,
) {
	return (
		(['raid', 'dungeon', 'open-world'] as const).find(
			activityType => options[activityType].length > 0,
		) ?? 'raid'
	)
}

function reconcileTemplate({
	channelAvailability,
	characters,
	defaultTimeZone,
	eventCatalog,
	payload,
}: Pick<
	TemplateManagerProps,
	'channelAvailability' | 'characters' | 'defaultTimeZone' | 'eventCatalog'
> & {
	payload: EventTemplatePayload
}) {
	const warnings: string[] = []
	const addon = eventCatalog.optionsByAddon[payload.addon]
		? payload.addon
		: eventCatalog.defaultAddon

	if (addon !== payload.addon) warnings.push('Дополнение было заменено на актуальное.')

	const scopes = eventCatalog.optionsByAddon[addon] ?? {}
	const contentScope = scopes[payload.contentScope]
		? payload.contentScope
		: scopes[eventCatalog.defaultContentScope]
			? eventCatalog.defaultContentScope
			: Object.keys(scopes)[0] ?? 'expansion'

	if (contentScope !== payload.contentScope) warnings.push('Сезон шаблона больше недоступен.')

	const optionsByType = scopes[contentScope] ?? {
		dungeon: [],
		'open-world': [],
		raid: [],
	}
	const activityType = optionsByType[payload.activityType]?.length
		? payload.activityType
		: firstAvailableActivityType(optionsByType)

	if (activityType !== payload.activityType) {
		warnings.push('Тип активности был заменён на доступный.')
	}

	const validSlugs = new Set(optionsByType[activityType].map(option => option.slug))
	let selectedInstanceSlugs = payload.selectedInstanceSlugs.filter(slug => validSlugs.has(slug))
	const discardedInstanceCount =
		payload.selectedInstanceSlugs.length - selectedInstanceSlugs.length

	if (selectedInstanceSlugs.length === 0 && optionsByType[activityType][0]) {
		selectedInstanceSlugs = [optionsByType[activityType][0].slug]
	}

	if (discardedInstanceCount > 0) {
		warnings.push('Недоступные инстансы были исключены.')
	}

	const configuredDifficulties = selectedInstanceSlugs.map(slug => {
		const options = eventCatalog.difficultiesByActivitySlug[slug]

		return options && options.length > 0 ? options : eventCatalog.difficulties
	})
	const difficultyOptions =
		activityType === 'raid' && configuredDifficulties.length > 0
			? configuredDifficulties[0].filter(option =>
					configuredDifficulties.every(options =>
						options.some(candidate => candidate.difficulty === option.difficulty),
					),
				)
			: eventCatalog.difficulties
	const safeDifficultyOptions =
		difficultyOptions.length > 0 ? difficultyOptions : eventCatalog.difficulties
	const difficulty = safeDifficultyOptions.some(
		option => option.difficulty === payload.difficulty,
	)
		? payload.difficulty
		: safeDifficultyOptions[0]?.difficulty ?? 'normal'
	const characterId = characters.some(character => character.id === payload.characterId)
		? payload.characterId
		: characters[0]?.id ?? ''
	const timeZone = isValidTimeZone(payload.timeZone)
		? payload.timeZone
		: defaultTimeZone

	if (difficulty !== payload.difficulty) warnings.push('Сложность была заменена на доступную.')
	if (characterId !== payload.characterId && payload.leaderMode === 'character') {
		warnings.push('Персонаж-лидер шаблона больше недоступен.')
	}
	if (timeZone !== payload.timeZone) {
		warnings.push('Часовой пояс был заменён на доступный.')
	}
	if (payload.publishTargets.discord && !channelAvailability.discord) {
		warnings.push('Discord отключён, потому что канал не настроен.')
	}
	if (payload.publishTargets.telegram && !channelAvailability.telegram) {
		warnings.push('Telegram отключён, потому что канал не настроен.')
	}

	return {
		draft: {
			...payload,
			activityType,
			addon,
			characterId,
			clientRequestId: createRequestId(),
			contentScope,
			date: getTomorrowInputDate(timeZone),
			difficulty,
			leaderMode:
				payload.leaderMode === 'character' && !characterId
					? 'manual'
					: payload.leaderMode,
			publishTargets: {
				app: payload.publishTargets.app,
				discord: payload.publishTargets.discord && channelAvailability.discord,
				telegram: payload.publishTargets.telegram && channelAvailability.telegram,
			},
			roles: {
				damage: { ...payload.roles.damage },
				healer: { ...payload.roles.healer },
				tank: { ...payload.roles.tank },
			},
			selectedInstanceSlugs,
			timeZone,
		},
		warnings,
	}
}

export function EventTemplateManager({
	channelAvailability,
	characters,
	defaultTimeZone,
	disabled = false,
	draft,
	eventCatalog,
	onLoad,
	templates: initialTemplates,
}: TemplateManagerProps) {
	const [templates, setTemplates] = React.useState(initialTemplates)
	const [saveOpen, setSaveOpen] = React.useState(false)
	const [manageOpen, setManageOpen] = React.useState(false)
	const [templateName, setTemplateName] = React.useState('')
	const [renameTemplate, setRenameTemplate] = React.useState<EventTemplateDto | null>(null)
	const [renameValue, setRenameValue] = React.useState('')
	const [deleteTemplate, setDeleteTemplate] = React.useState<EventTemplateDto | null>(null)
	const [replaceConflict, setReplaceConflict] = React.useState<{
		name: string
		payload: EventTemplatePayload
	} | null>(null)
	const [isPending, startTransition] = React.useTransition()

	function saveTemplate(replace = false) {
		const name = replaceConflict?.name ?? templateName
		const payload = replaceConflict?.payload ?? toTemplatePayload(draft)

		startTransition(async () => {
			const result = await saveEventTemplateAction({ name, payload, replace })

			if (result.status === 'conflict') {
				setReplaceConflict({ name, payload })
				return
			}

			if (result.status === 'error') {
				toast.error(result.message)
				return
			}

			if (result.template) {
				setTemplates(current => [
					result.template!,
					...current.filter(template => template.id !== result.template!.id),
				])
			}
			setReplaceConflict(null)
			setSaveOpen(false)
			setTemplateName('')
			toast.success(result.message)
		})
	}

	function loadTemplate(template: EventTemplateDto) {
		const reconciled = reconcileTemplate({
			channelAvailability,
			characters,
			defaultTimeZone,
			eventCatalog,
			payload: template.payload,
		})
		onLoad(
			reconciled.draft,
			reconciled.warnings.length > 0
				? reconciled.warnings.join(' ')
				: `Шаблон «${template.name}» загружен.`,
		)
		setManageOpen(false)
		if (reconciled.warnings.length > 0) {
			toast.warning(reconciled.warnings.join(' '))
		} else {
			toast.success(`Шаблон «${template.name}» загружен.`)
		}
	}

	function submitRename() {
		if (!renameTemplate) return

		startTransition(async () => {
			const result = await renameEventTemplateAction({
				id: renameTemplate.id,
				name: renameValue,
			})

			if (result.status !== 'success') {
				toast.error(result.message)
				return
			}

			setTemplates(current =>
				current.map(template =>
					template.id === renameTemplate.id
						? { ...template, name: renameValue.trim() }
						: template,
				),
			)
			setRenameTemplate(null)
			toast.success(result.message)
		})
	}

	function confirmDelete() {
		if (!deleteTemplate) return

		startTransition(async () => {
			const result = await deleteEventTemplateAction(deleteTemplate.id)

			if (result.status !== 'success') {
				toast.error(result.message)
				return
			}

			setTemplates(current => current.filter(template => template.id !== deleteTemplate.id))
			setDeleteTemplate(null)
			toast.success(result.message)
		})
	}

	return (
		<div className='flex flex-col gap-2'>
			<Dialog open={saveOpen} onOpenChange={setSaveOpen}>
				<DialogTrigger asChild>
					<Button disabled={disabled || isPending} size='lg' type='button' variant='outline'>
						<FloppyDisk data-icon='inline-start' aria-hidden='true' />
						Сохранить как шаблон
					</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Новый шаблон события</DialogTitle>
						<DialogDescription>
							Сохраняются все параметры, кроме даты. При загрузке будет выбрано завтра.
						</DialogDescription>
					</DialogHeader>
					<label className='flex flex-col gap-2'>
						<span className='font-medium'>Название</span>
						<Input
							autoFocus
							maxLength={60}
							onChange={event => setTemplateName(event.currentTarget.value)}
							placeholder='Например, Рейд в среду'
							value={templateName}
						/>
					</label>
					<DialogFooter>
						<Button disabled={isPending || !templateName.trim()} onClick={() => saveTemplate()} type='button'>
							Сохранить
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={manageOpen} onOpenChange={setManageOpen}>
				<DialogTrigger asChild>
					<Button disabled={isPending} size='lg' type='button' variant='ghost'>
						<FolderOpen data-icon='inline-start' aria-hidden='true' />
						Шаблоны ({templates.length})
					</Button>
				</DialogTrigger>
				<DialogContent className='sm:max-w-lg'>
					<DialogHeader>
						<DialogTitle>Мои шаблоны</DialogTitle>
						<DialogDescription>Загрузите, переименуйте или удалите сохранённую конфигурацию.</DialogDescription>
					</DialogHeader>
					{templates.length === 0 ? (
						<Empty className='min-h-56 border'>
							<EmptyHeader>
								<EmptyMedia variant='icon'><FolderOpen aria-hidden='true' /></EmptyMedia>
								<EmptyTitle>Шаблонов пока нет</EmptyTitle>
								<EmptyDescription>Сохраните текущие параметры первым шаблоном.</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : (
						<ScrollArea className='max-h-[28rem]'>
							<div className='flex flex-col gap-2 pr-3'>
								{templates.map(template => (
									<div className='flex items-center gap-2 border p-3' key={template.id}>
										<Button className='min-w-0 flex-1 justify-start' onClick={() => loadTemplate(template)} type='button' variant='ghost'>
											<span className='truncate'>{template.name}</span>
										</Button>
										<Button aria-label='Переименовать шаблон' onClick={() => { setRenameTemplate(template); setRenameValue(template.name) }} size='icon' type='button' variant='outline'>
											<PencilSimple aria-hidden='true' />
										</Button>
										<Button aria-label='Удалить шаблон' onClick={() => setDeleteTemplate(template)} size='icon' type='button' variant='outline'>
											<Trash aria-hidden='true' />
										</Button>
									</div>
								))}
							</div>
						</ScrollArea>
					)}
				</DialogContent>
			</Dialog>

			<AlertDialog open={replaceConflict !== null} onOpenChange={open => !open && setReplaceConflict(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Заменить существующий шаблон?</AlertDialogTitle>
						<AlertDialogDescription>Шаблон «{replaceConflict?.name}» уже существует. Его параметры будут полностью заменены.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Отмена</AlertDialogCancel>
						<AlertDialogAction disabled={isPending} onClick={() => saveTemplate(true)}>Заменить</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<Dialog open={renameTemplate !== null} onOpenChange={open => !open && setRenameTemplate(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Переименовать шаблон</DialogTitle>
						<DialogDescription>Новое имя должно быть уникальным среди ваших шаблонов.</DialogDescription>
					</DialogHeader>
					<Input maxLength={60} onChange={event => setRenameValue(event.currentTarget.value)} value={renameValue} />
					<DialogFooter>
						<Button disabled={isPending || !renameValue.trim()} onClick={submitRename} type='button'>Сохранить</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog open={deleteTemplate !== null} onOpenChange={open => !open && setDeleteTemplate(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Удалить шаблон?</AlertDialogTitle>
						<AlertDialogDescription>Шаблон «{deleteTemplate?.name}» будет удалён без возможности восстановления.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Отмена</AlertDialogCancel>
						<AlertDialogAction disabled={isPending} onClick={confirmDelete} variant='destructive'>Удалить</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
