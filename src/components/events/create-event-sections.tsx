'use client'

import Image from 'next/image'
import { useEffect, useState, type ReactNode, type SVGProps } from 'react'
import {
	CalendarDays,
	Check,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Clock,
	Coins,
	Crown,
	Dice5,
	Info,
	MapPin,
	Minus,
	Package,
	Plus,
	Settings,
	UserRound,
	UsersRound,
	X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import {
	addons,
	getActivityTabs,
	getCalendarMonthNames,
	getCalendarWeekdays,
	getPublishTargetFields,
	getRoleFields,
	timeHours,
	timeMinutes,
	unrollTemplates,
} from './create-event-data'
import { useAppLocale } from '@/components/shell/locale-provider'
import { t } from '@/lib/i18n'
import type {
	CreateEventDraft,
	EventActivityType,
	EventCharacterOption,
	EventInstanceOption,
	EventPublishTarget,
	EventRole,
	LeaderMode,
	RoleValidationResult,
	UnrollTemplate,
} from './create-event-types'
import { eventUi } from './create-event-ui'
import {
	addMonths,
	formatDate,
	formatGold,
	formatRange,
	getCalendarDays,
	getCharacterImage,
	getInitial,
	getMonthStart,
	parseInputDate,
	readNumber,
	toDateInputValue,
} from './create-event-utils'

const WOWHEAD_TOOLTIP_SCRIPT_ID = 'raid-reminder-wowhead-tooltips'

type WowheadTooltipSize = 'tiny' | 'small' | 'medium' | 'large'

type WowheadTooltipOptions = {
	colorLinks?: boolean
	colorlinks?: boolean
	iconSize?: WowheadTooltipSize
	iconizeLinks?: boolean
	iconizelinks?: boolean
	renameLinks?: boolean
	renamelinks?: boolean
}

type WowheadWindow = Window &
	typeof globalThis & {
		$WowheadPower?: {
			refreshLinks?: (force?: boolean) => void
		}
		WH?: {
			Tooltips?: {
				refreshLinks?: (force?: boolean) => void
			}
		}
		whTooltips?: WowheadTooltipOptions
		wowhead_tooltips?: WowheadTooltipOptions
	}

function configureWowheadTooltips() {
	const wowheadWindow = window as WowheadWindow

	wowheadWindow.whTooltips = {
		colorLinks: false,
		iconSize: 'medium',
		iconizeLinks: true,
		renameLinks: false,
	}
	wowheadWindow.wowhead_tooltips = {
		colorlinks: false,
		iconSize: 'medium',
		iconizelinks: true,
		renamelinks: false,
	}
}

function refreshWowheadLinks() {
	const wowheadWindow = window as WowheadWindow
	const refreshLinks =
		wowheadWindow.$WowheadPower?.refreshLinks ??
		wowheadWindow.WH?.Tooltips?.refreshLinks

	refreshLinks?.(true)
}

function WowheadTooltipLoader({ refreshKey }: { refreshKey: string }) {
	useEffect(() => {
		configureWowheadTooltips()

		const existingScript = document.getElementById(WOWHEAD_TOOLTIP_SCRIPT_ID)

		if (existingScript) {
			refreshWowheadLinks()
			return
		}

		const script = document.createElement('script')
		script.id = WOWHEAD_TOOLTIP_SCRIPT_ID
		script.async = true
		script.src = 'https://wow.zamimg.com/js/tooltips.js'
		script.addEventListener('load', refreshWowheadLinks)

		document.head.append(script)

		return () => {
			script.removeEventListener('load', refreshWowheadLinks)
		}
	}, [])

	useEffect(() => {
		const refreshTimer = window.setTimeout(refreshWowheadLinks, 80)

		return () => window.clearTimeout(refreshTimer)
	}, [refreshKey])

	return null
}

type RoleValidationMap = Record<EventRole, RoleValidationResult>

export function SectionTitle({
	children,
	number,
}: {
	children: ReactNode
	number: number
}) {
	return (
		<div className={eventUi.sectionTitle}>
			<span className={eventUi.sectionTitleBadge}>{number}</span>
			<h2>{children}</h2>
		</div>
	)
}

type LeaderSectionProps = {
	characters: EventCharacterOption[]
	draft: CreateEventDraft
	onCharacterChange: (characterId: string) => void
	onLeaderModeChange: (mode: LeaderMode) => void
	onManualLeaderNameChange: (value: string) => void
	onManualLeaderRealmChange: (value: string) => void
	selectedCharacter: EventCharacterOption | null
}

export function LeaderSection({
	characters,
	draft,
	onCharacterChange,
	onLeaderModeChange,
	onManualLeaderNameChange,
	onManualLeaderRealmChange,
	selectedCharacter,
}: LeaderSectionProps) {
	const locale = useAppLocale()
	const [isCharacterMenuOpen, setIsCharacterMenuOpen] = useState(false)

	return (
		<section className={eventUi.panel}>
			<div className={eventUi.panelHead}>
				<SectionTitle number={1}>{t(locale, 'events.sectionLeader')}</SectionTitle>
			</div>

			<div className={cn(eventUi.grid, 'mt-3 min-[761px]:grid-cols-2')}>
				<div
					className={eventUi.choiceCard(draft.leaderMode === 'character')}
					data-disabled={characters.length === 0 ? 'true' : undefined}
				>
					<button
						aria-pressed={draft.leaderMode === 'character'}
						className={eventUi.choiceToggle}
						disabled={characters.length === 0}
						onClick={() => onLeaderModeChange('character')}
						type='button'
					>
						<span
							className={eventUi.choiceRadio(draft.leaderMode === 'character')}
							aria-hidden='true'
						/>
						<span>
							<strong className='text-base font-semibold text-white'>
								{t(locale, 'events.myCharacter')}
							</strong>
							<small className='mt-1 block text-sm text-event-copy'>
								{characters.length > 1
									? t(locale, 'events.myCharacterHintMulti')
									: t(locale, 'events.myCharacterHintSingle')}
							</small>
						</span>
					</button>

					{selectedCharacter ? (
						characters.length > 1 ? (
							<DropdownMenu
								open={isCharacterMenuOpen}
								onOpenChange={setIsCharacterMenuOpen}
							>
								<DropdownMenuTrigger asChild>
									<button
										aria-label={t(locale, 'events.chooseCharacter')}
										className={cn(
											eventUi.characterSelect,
											eventUi.characterSelectTrigger,
										)}
										disabled={draft.leaderMode !== 'character'}
										type='button'
									>
										<CharacterAvatar character={selectedCharacter} />
										<span>
											<p className={eventUi.characterName}>
												{selectedCharacter.name}
											</p>
											<CharacterMeta character={selectedCharacter} />
										</span>
										<ChevronDown className='size-4' aria-hidden='true' />
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align='start'
									className={cn(eventUi.characterDropdown)}
									sideOffset={6}
								>
									<ScrollArea className={eventUi.characterScroll}>
										<div className={eventUi.characterOptions}>
											{characters.map(character => {
												const isSelected = character.id === draft.characterId

												return (
													<button
														className={eventUi.characterOption(isSelected)}
														key={character.id}
														onClick={() => {
															onCharacterChange(character.id)
															setIsCharacterMenuOpen(false)
														}}
														type='button'
													>
														<span className={eventUi.characterOptionLayout}>
															<CharacterAvatar character={character} />
															<span className={eventUi.characterOptionCopy}>
																<strong className={eventUi.characterName}>
																	{character.name}
																</strong>
																<CharacterMeta character={character} />
															</span>
															<span
																className={eventUi.characterOptionMark}
																aria-hidden='true'
															>
																{isSelected ? (
																	<Check className='size-4' />
																) : null}
															</span>
														</span>
													</button>
												)
											})}
										</div>
									</ScrollArea>
								</DropdownMenuContent>
							</DropdownMenu>
						) : (
							<span className={eventUi.characterSelectStatic}>
								<CharacterAvatar character={selectedCharacter} />
								<span>
									<strong className={eventUi.characterName}>
										{selectedCharacter.name}
									</strong>
									<CharacterMeta character={selectedCharacter} />
								</span>
							</span>
						)
					) : (
						<span className={eventUi.emptyNote}>
							{t(locale, 'events.characterSyncHint')}
						</span>
					)}
				</div>

				<div className={eventUi.choiceCard(draft.leaderMode === 'manual')}>
					<div className={eventUi.choiceHeader}>
						<button
							aria-pressed={draft.leaderMode === 'manual'}
							className={eventUi.choiceToggle}
							onClick={() => onLeaderModeChange('manual')}
							type='button'
						>
							<span
								className={eventUi.choiceRadio(draft.leaderMode === 'manual')}
								aria-hidden='true'
							/>
							<span className={eventUi.choiceTitle}>
								<strong className='text-base font-semibold text-white'>
									{t(locale, 'events.manualLeader')}
								</strong>
								<small className='text-sm text-event-copy'>
									{t(locale, 'events.manualLeaderHint')}
								</small>
							</span>
						</button>
						<Badge className={eventUi.premiumBadge} variant='arcane'>
							<Crown className='size-3' aria-hidden='true' />
							Premium
						</Badge>
					</div>

					<div className={eventUi.inlineFields}>
						<label>
							<span>{t(locale, 'events.leaderName')}</span>
							<Input
								className={eventUi.textInput}
								disabled={draft.leaderMode !== 'manual'}
								onChange={event =>
									onManualLeaderNameChange(event.currentTarget.value)
								}
								value={draft.manualLeaderName}
							/>
						</label>
						<label>
							<span>{t(locale, 'events.leaderRealm')}</span>
							<Input
								className={eventUi.textInput}
								disabled={draft.leaderMode !== 'manual'}
								onChange={event =>
									onManualLeaderRealmChange(event.currentTarget.value)
								}
								value={draft.manualLeaderRealm}
							/>
						</label>
					</div>
				</div>
			</div>
		</section>
	)
}

function CharacterAvatar({ character }: { character: EventCharacterOption }) {
	const characterImage = getCharacterImage(character)

	return (
		<span className={eventUi.characterAvatar} aria-hidden='true'>
			{characterImage ? (
				<Image
					alt=''
					className='size-full object-cover'
					height={44}
					src={characterImage}
					unoptimized
					width={44}
				/>
			) : (
				getInitial(character.name)
			)}
		</span>
	)
}

function CharacterMeta({ character }: { character: EventCharacterOption }) {
	return (
		<small className={eventUi.characterMeta}>
			{character.className}
			{character.activeSpec ? ` - ${character.activeSpec}` : ''} ·{' '}
			{character.realm}
		</small>
	)
}

type DateTimeSectionProps = {
	date: string
	onDateChange: (date: string) => void
	onDateTimeChange: (date: Date) => void
	onTimePartChange: (part: 'hour' | 'minute', value: string) => void
	time: string
}

export function DateTimeSection({
	date,
	onDateChange,
	onDateTimeChange,
	onTimePartChange,
	time,
}: DateTimeSectionProps) {
	const locale = useAppLocale()
	const calendarMonthNames = getCalendarMonthNames(locale)
	const calendarWeekdays = getCalendarWeekdays(locale)
	const [isDateCalendarOpen, setIsDateCalendarOpen] = useState(false)
	const [isTimePickerOpen, setIsTimePickerOpen] = useState(false)
	const [calendarMonth, setCalendarMonth] = useState(() =>
		getMonthStart(parseInputDate(date)),
	)

	function selectDate(nextDate: Date) {
		onDateChange(toDateInputValue(nextDate))
		setCalendarMonth(getMonthStart(nextDate))
		setIsDateCalendarOpen(false)
	}

	function setDateTimeFromDate(nextDate: Date) {
		onDateTimeChange(nextDate)
		setCalendarMonth(getMonthStart(nextDate))
	}

	function setDateTimeWithOffset(minutes: number) {
		const nextDate = new Date()
		nextDate.setMinutes(nextDate.getMinutes() + minutes)
		setDateTimeFromDate(nextDate)
	}

	function setTodayEvening() {
		const nextDate = new Date()
		nextDate.setHours(20, 30, 0, 0)
		setDateTimeFromDate(nextDate)
	}

	return (
		<section className={eventUi.panel}>
			<SectionTitle number={2}>{t(locale, 'events.sectionDateTime')}</SectionTitle>
			<div className={eventUi.dateTimeRow}>
				<div className={eventUi.dateTimeField}>
					<DropdownMenu
						open={isDateCalendarOpen}
						onOpenChange={setIsDateCalendarOpen}
					>
						<DropdownMenuTrigger asChild>
							<Button
								className={eventUi.dateTrigger}
								type='button'
								variant='ghost'
							>
								<CalendarDays className='size-4' aria-hidden='true' />
								<span>{formatDate(date)}</span>
								<ChevronDown className='size-4' aria-hidden='true' />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align='start'
							className={eventUi.calendarPopover}
							sideOffset={6}
						>
							<div className={eventUi.calendar}>
								<div className={eventUi.calendarHead}>
									<Button
										aria-label={t(locale, 'events.previousMonth')}
										className={eventUi.calendarNav}
										onClick={() =>
											setCalendarMonth(current => addMonths(current, -1))
										}
										size='icon'
										type='button'
										variant='ghost'
									>
										<ChevronLeft className='size-4' aria-hidden='true' />
									</Button>
									<strong className={eventUi.calendarMonth}>
										{calendarMonthNames[calendarMonth.getMonth()]}{' '}
										{calendarMonth.getFullYear()}
									</strong>
									<Button
										aria-label={t(locale, 'events.nextMonth')}
										className={eventUi.calendarNav}
										onClick={() =>
											setCalendarMonth(current => addMonths(current, 1))
										}
										size='icon'
										type='button'
										variant='ghost'
									>
										<ChevronRight className='size-4' aria-hidden='true' />
									</Button>
								</div>
								<div className={eventUi.calendarWeekdays}>
									{calendarWeekdays.map(weekday => (
										<span key={weekday}>{weekday}</span>
									))}
								</div>
								<div className={eventUi.calendarGrid}>
									{getCalendarDays(calendarMonth).map(calendarDate => {
										const dateValue = toDateInputValue(calendarDate)
										const isSelected = dateValue === date
										const isOutside =
											calendarDate.getMonth() !== calendarMonth.getMonth()

										return (
											<button
												aria-pressed={isSelected}
												className={eventUi.calendarDay(isSelected, isOutside)}
												key={dateValue}
												onClick={() => selectDate(calendarDate)}
												type='button'
											>
												{calendarDate.getDate()}
											</button>
										)
									})}
								</div>
							</div>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
				<label className={eventUi.dateTimeField}>
					<DropdownMenu
						open={isTimePickerOpen}
						onOpenChange={setIsTimePickerOpen}
					>
						<DropdownMenuTrigger asChild>
							<Button
								className={eventUi.timeTrigger}
								type='button'
								variant='ghost'
							>
								<Clock className='size-4' aria-hidden='true' />
								<span>{time}</span>
								<ChevronDown className='size-4' aria-hidden='true' />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align='start'
							className={eventUi.timePopover}
							sideOffset={6}
						>
							<div className={eventUi.timePicker}>
								<div className={eventUi.timeColumn}>
									<span className={eventUi.timeColumnLabel}>{t(locale, 'events.hours')}</span>
									<ScrollArea className={eventUi.timeScroll}>
										<div className={eventUi.timeOptions}>
											{timeHours.map(hour => (
												<button
													aria-pressed={time.startsWith(`${hour}:`)}
													className={eventUi.timeOption(
														time.startsWith(`${hour}:`),
													)}
													key={hour}
													onClick={() => onTimePartChange('hour', hour)}
													type='button'
												>
													{hour}
												</button>
											))}
										</div>
									</ScrollArea>
								</div>
								<div className={eventUi.timeColumn}>
									<span className={eventUi.timeColumnLabel}>{t(locale, 'events.minutes')}</span>
									<ScrollArea className={eventUi.timeScroll}>
										<div className={eventUi.timeOptions}>
											{timeMinutes.map(minute => (
												<button
													aria-pressed={time.endsWith(`:${minute}`)}
													className={eventUi.timeOption(
														time.endsWith(`:${minute}`),
													)}
													key={minute}
													onClick={() => onTimePartChange('minute', minute)}
													type='button'
												>
													{minute}
												</button>
											))}
										</div>
									</ScrollArea>
								</div>
							</div>
						</DropdownMenuContent>
					</DropdownMenu>
				</label>
				<div className={eventUi.dateShortcuts}>
					<Button
						className={eventUi.shortcutButton}
						onClick={() => setDateTimeFromDate(new Date())}
						size='sm'
						type='button'
						variant='outline'
					>
						{t(locale, 'common.now')}
					</Button>
					<Button
						className={eventUi.shortcutButton}
						onClick={() => setDateTimeWithOffset(15)}
						size='sm'
						type='button'
						variant='outline'
					>
						{t(locale, 'events.in15MinutesShort')}
					</Button>
					<Button
						className={eventUi.shortcutButton}
						onClick={() => setDateTimeWithOffset(30)}
						size='sm'
						type='button'
						variant='outline'
					>
						{t(locale, 'events.in30MinutesShort')}
					</Button>
					<Button
						className={eventUi.shortcutButton}
						onClick={setTodayEvening}
						size='sm'
						type='button'
						variant='outline'
					>
						{t(locale, 'events.todayEvening')}
					</Button>
				</div>
			</div>
		</section>
	)
}

type EventParamsSectionProps = {
	activityType: EventActivityType
	addon: string
	onActivityTypeChange: (activityType: EventActivityType) => void
	onAddonChange: (addon: string) => void
}

export function EventParamsSection({
	activityType,
	addon,
	onActivityTypeChange,
	onAddonChange,
}: EventParamsSectionProps) {
	const locale = useAppLocale()
	const activityTabs = getActivityTabs(locale)
	const [isAddonMenuOpen, setIsAddonMenuOpen] = useState(false)

	return (
		<section className={eventUi.panel}>
			<SectionTitle number={3}>{t(locale, 'events.sectionAddon')}</SectionTitle>
			<div className={eventUi.paramsGrid}>
				<label>
					<DropdownMenu
						open={isAddonMenuOpen}
						onOpenChange={setIsAddonMenuOpen}
					>
						<DropdownMenuTrigger asChild>
							<Button
								className={eventUi.addonTrigger}
								type='button'
								variant='ghost'
							>
								<span>{addon}</span>
								<ChevronDown className='size-4' aria-hidden='true' />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align='start'
							className={eventUi.addonDropdown}
							sideOffset={6}
						>
							<div className={eventUi.addonOptions}>
								{addons.map(option => {
									const isSelected = option === addon

									return (
										<button
											aria-pressed={isSelected}
											className={eventUi.addonOption(isSelected)}
											key={option}
											onClick={() => {
												onAddonChange(option)
												setIsAddonMenuOpen(false)
											}}
											type='button'
										>
											<span>{option}</span>
											{isSelected ? (
												<Check className='size-4' aria-hidden='true' />
											) : null}
										</button>
									)
								})}
							</div>
						</DropdownMenuContent>
					</DropdownMenu>
				</label>

				<div className={eventUi.typeTabs} role='group' aria-label={t(locale, 'events.activityTypeAria')}>
					{activityTabs.map(tab => {
						const Icon = tab.icon

						return (
							<button
								aria-pressed={activityType === tab.type}
								className={eventUi.typeTab(activityType === tab.type)}
								key={tab.type}
								onClick={() => onActivityTypeChange(tab.type)}
								type='button'
							>
								<Icon className='size-4 shrink-0' aria-hidden='true' />
								{tab.label}
							</button>
						)
					})}
				</div>
			</div>
		</section>
	)
}

type InstancesSectionProps = {
	instanceOptions: EventInstanceOption[]
	onInstanceRemove: (slug: string) => void
	onInstanceToggle: (slug: string) => void
	selectedInstanceSlugs: string[]
	selectedInstances: EventInstanceOption[]
}

export function InstancesSection({
	instanceOptions,
	onInstanceRemove,
	onInstanceToggle,
	selectedInstanceSlugs,
	selectedInstances,
}: InstancesSectionProps) {
	const locale = useAppLocale()

	return (
		<section className={eventUi.panel}>
			<div className={eventUi.panelHead}>
				<div className='flex items-center gap-2'>
					<SectionTitle number={4}>{t(locale, 'events.sectionInstances')}</SectionTitle>
					<div className={eventUi.infoHintWrapper}>
						<button
							aria-label={t(locale, 'events.sectionInstances')}
							className={eventUi.infoHintTrigger}
							title={t(locale, 'events.sectionInstances')}
							type='button'
						>
							<Info className='size-3.5' aria-hidden='true' />
						</button>
						<span className={eventUi.infoHintBubble} role='tooltip'>
							{t(locale, 'events.instancesHint')}
						</span>
					</div>
				</div>
			</div>

			<div className={eventUi.chipRow} aria-label={t(locale, 'events.selectedInstancesAria')}>
				{selectedInstances.map(instance => (
					<button
						className={eventUi.selectedChip}
						disabled={selectedInstances.length <= 1}
						key={instance.slug}
						onClick={() => onInstanceRemove(instance.slug)}
						type='button'
					>
						{instance.shortName}
						<X className='size-3.5' aria-hidden='true' />
					</button>
				))}
			</div>

			<div className={eventUi.instanceGrid}>
				{instanceOptions.map(instance => {
					const isSelected = selectedInstanceSlugs.includes(instance.slug)

					return (
						<button
							aria-pressed={isSelected}
							className={eventUi.instanceCard(isSelected)}
							key={instance.slug}
							onClick={() => onInstanceToggle(instance.slug)}
							style={{
								backgroundImage: `url(${instance.artPath})`,
							}}
							type='button'
						>
							<span className={eventUi.instanceCopy}>
								<strong className={eventUi.instanceName}>
									{instance.name}
								</strong>
								<small className={eventUi.instanceTag}>{instance.tag}</small>
							</span>
							{isSelected ? (
								<span className={eventUi.instanceCheck} aria-hidden='true'>
									<Check className='size-4' />
								</span>
							) : null}
						</button>
					)
				})}
			</div>
		</section>
	)
}

type RoleCompositionSectionProps = {
	hasRoleError: boolean
	onRoleRangeInputChange: (role: EventRole, value: string) => void
	roleErrors: string[]
	roleInputValues: Record<EventRole, string>
	roleValidation: RoleValidationMap
}

export function RoleCompositionSection({
	hasRoleError,
	onRoleRangeInputChange,
	roleErrors,
	roleInputValues,
	roleValidation,
}: RoleCompositionSectionProps) {
	const locale = useAppLocale()
	const roleFields = getRoleFields(locale)

	function adjustRoleRange(role: EventRole, offset: number) {
		const currentRange = roleValidation[role].range

		if (!currentRange) {
			return
		}

		const min = Math.max(0, currentRange.min + offset)
		const max = Math.max(min, currentRange.max + offset)

		onRoleRangeInputChange(role, formatRange({ min, max }))
	}

	return (
		<section className={eventUi.panel}>
			<div className='flex items-center gap-2'>
				<SectionTitle number={5}>{t(locale, 'events.sectionRoles')}</SectionTitle>
				<div className={eventUi.infoHintWrapper}>
					<button
						aria-label={t(locale, 'events.sectionRoles')}
						className={eventUi.infoHintTrigger}
						title={t(locale, 'events.sectionRoles')}
						type='button'
					>
						<Info className='size-3.5' aria-hidden='true' />
					</button>
					<span className={eventUi.infoHintBubble} role='tooltip'>
						{t(locale, 'events.roleHint')}
					</span>
				</div>
			</div>

			<div className={eventUi.roleGrid}>
				{roleFields.map(role => {
					const roleError = roleValidation[role.key].error
					const roleRange = roleValidation[role.key].range
					const canAdjustRole = Boolean(roleRange)
					const canDecreaseRole = Boolean(roleRange && roleRange.max > 0)

					return (
						<div className={eventUi.roleCard} key={role.key}>
							<div className={eventUi.roleHeader}>
								<span className={eventUi.roleIcon} aria-hidden='true'>
									<Image alt='' height={38} src={role.imageSrc} width={38} />
								</span>
								<strong className='text-base font-semibold text-white'>
									{role.label}
								</strong>
							</div>
							<div className={eventUi.roleStepper(Boolean(roleError))}>
								<Button
									aria-label={t(locale, 'events.decreaseRoleCount', {
										role: role.label,
									})}
									className={eventUi.roleStepButton}
									disabled={!canDecreaseRole}
									onClick={() => adjustRoleRange(role.key, -1)}
									size='icon'
									type='button'
									variant='ghost'
								>
									<Minus className='size-4' aria-hidden='true' />
								</Button>
								<Input
									aria-invalid={Boolean(roleError)}
									aria-label={t(locale, 'events.countForRole', {
										role: role.label,
									})}
									autoComplete='off'
									className={eventUi.roleInput(Boolean(roleError))}
									onChange={event =>
										onRoleRangeInputChange(role.key, event.currentTarget.value)
									}
									placeholder={role.placeholder}
									value={roleInputValues[role.key]}
								/>
								<Button
									aria-label={t(locale, 'events.increaseRoleCount', {
										role: role.label,
									})}
									className={eventUi.roleStepButton}
									disabled={!canAdjustRole}
									onClick={() => adjustRoleRange(role.key, 1)}
									size='icon'
									type='button'
									variant='ghost'
								>
									<Plus className='size-4' aria-hidden='true' />
								</Button>
							</div>
						</div>
					)
				})}
			</div>

			{hasRoleError ? (
				<p className={eventUi.errorNote}>{roleErrors[0]}</p>
			) : null}
		</section>
	)
}

type PaidSlotsSectionProps = {
	draft: CreateEventDraft
	onPaidSlotPriceChange: (paidSlotPrice: number) => void
	onPaidSlotsChange: (paidSlots: number) => void
	onPaidSlotsEnabledChange: (checked: boolean) => void
}

export function PaidSlotsSection({
	draft,
	onPaidSlotPriceChange,
	onPaidSlotsChange,
	onPaidSlotsEnabledChange,
}: PaidSlotsSectionProps) {
	const locale = useAppLocale()

	return (
		<section className={eventUi.panel}>
			<div className={eventUi.sectionRow}>
				<div className='flex flex-wrap items-center justify-start gap-4'>
					<SectionTitle number={6}>
						{t(locale, 'events.sectionPaidSlots')}
					</SectionTitle>
					<Switch
						aria-label={t(locale, 'events.paidSlotsToggle')}
						checked={draft.hasPaidSlots}
						className={cn(eventUi.paidSwitch, 'origin-left scale-[0.82]')}
						onCheckedChange={onPaidSlotsEnabledChange}
						thumbClassName={eventUi.paidSwitchThumb}
					/>
					<Badge className={eventUi.premiumBadge} variant='arcane'>
						<Crown className='size-3' aria-hidden='true' />
						Premium
					</Badge>
				</div>
			</div>

			<div className={eventUi.paidSlotsControls}>
				<label className={eventUi.paidField}>
					<span className={eventUi.inputIcon}>
						<UserRound className='size-4' aria-hidden='true' />
						<Input
							className={eventUi.embeddedInput}
							disabled={!draft.hasPaidSlots}
							min={0}
							onChange={event =>
								onPaidSlotsChange(readNumber(event.currentTarget.value))
							}
							type='number'
							value={draft.paidSlots}
						/>
					</span>
				</label>
				<label className={eventUi.paidField}>
					<span className={eventUi.goldInputIcon}>
						<Coins className='size-4' aria-hidden='true' />
						<Input
							className={eventUi.embeddedInput}
							disabled={!draft.hasPaidSlots}
							min={0}
							onChange={event =>
								onPaidSlotPriceChange(readNumber(event.currentTarget.value))
							}
							type='number'
							value={draft.paidSlotPrice}
						/>
					</span>
				</label>
			</div>
		</section>
	)
}

type UnrollSectionProps = {
	draft: CreateEventDraft
	onUnrollEnabledChange: (checked: boolean) => void
	onUnrollInputChange: (value: string) => void
	onUnrollTemplateChange: (templateId: string) => void
}

export function UnrollSection({
	draft,
	onUnrollEnabledChange,
	onUnrollInputChange,
	onUnrollTemplateChange,
}: UnrollSectionProps) {
	const locale = useAppLocale()
	const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false)
	const unrollRefreshKey = draft.unrollItemIds.join(',')
	const isUnrollDisabled = !draft.hasUnroll
	const selectedUnrollTemplate =
		unrollTemplates.find(template => template.id === draft.unrollTemplateId) ?? null
	const selectedUnrollTemplateLabel =
		selectedUnrollTemplate?.label ?? t(locale, 'events.unrollTemplateNone')

	useEffect(() => {
		if (isUnrollDisabled) {
			setIsTemplateMenuOpen(false)
		}
	}, [isUnrollDisabled])

	return (
		<section className={eventUi.panel}>
			<WowheadTooltipLoader refreshKey={unrollRefreshKey} />
			<div className={eventUi.sectionRow}>
				<div className='flex flex-wrap items-center justify-start gap-4'>
					<SectionTitle number={7}>{t(locale, 'events.sectionUnroll')}</SectionTitle>
					<Switch
						aria-label={t(locale, 'events.unrollToggle')}
						checked={draft.hasUnroll}
						className={cn(eventUi.paidSwitch, 'origin-left scale-[0.82]')}
						onCheckedChange={onUnrollEnabledChange}
						thumbClassName={eventUi.paidSwitchThumb}
					/>
					<Badge className={eventUi.premiumBadge} variant='arcane'>
						<Crown className='size-3' aria-hidden='true' />
						Premium
					</Badge>
				</div>
			</div>

			<div
				aria-disabled={isUnrollDisabled}
				className={cn(isUnrollDisabled && eventUi.unrollControlsDisabled)}
			>
				<label className={eventUi.stackField}>
					<span>{t(locale, 'events.unrollItemIds')}</span>
					<Input
						className={eventUi.textInput}
						disabled={isUnrollDisabled}
						onChange={event => onUnrollInputChange(event.currentTarget.value)}
						value={draft.unrollInput}
					/>
				</label>

				<div className={eventUi.itemIconRow}>
					{draft.unrollItemIds.map(id => (
						<a
							aria-disabled={isUnrollDisabled}
							aria-label={t(locale, 'events.wowheadItem', { id })}
							className={eventUi.itemIconLink}
							data-wh-icon-size='medium'
							data-wh-iconize-link='true'
							data-wh-rename-link='false'
							data-wowhead={`item=${id}${locale === 'ru' ? '&domain=ru' : ''}`}
							href={
								isUnrollDisabled
									? undefined
									: `https://www.wowhead.com/${locale === 'ru' ? 'ru/' : ''}item=${id}`
							}
							key={id}
							rel={isUnrollDisabled ? undefined : 'noreferrer'}
							tabIndex={isUnrollDisabled ? -1 : undefined}
							target={isUnrollDisabled ? undefined : '_blank'}
						>
							<span className={eventUi.itemIconFallback} aria-hidden='true'>
								<Package className='size-4' />
							</span>
							<span className='sr-only'>{t(locale, 'events.itemId', { id })}</span>
						</a>
					))}
				</div>

				<div className={eventUi.templateSplit}>
					<span>{t(locale, 'events.or')}</span>
				</div>

				<div className={eventUi.stackField}>
					<div className={eventUi.unrollTemplateHeader}>
						<span>{t(locale, 'events.unrollTemplate')}</span>
						<button
							aria-label={t(locale, 'events.unrollTemplateEdit')}
							className={eventUi.unrollTemplateEditButton}
							disabled={isUnrollDisabled}
							title={t(locale, 'events.unrollTemplateSoon')}
							type='button'
						>
							<Settings className='size-4' aria-hidden='true' />
						</button>
					</div>
					<DropdownMenu
						onOpenChange={open => {
							setIsTemplateMenuOpen(isUnrollDisabled ? false : open)
						}}
						open={isTemplateMenuOpen}
					>
						<DropdownMenuTrigger asChild>
							<button
								aria-label={t(locale, 'events.unrollTemplateSelect')}
								className={eventUi.unrollTemplateTrigger}
								disabled={isUnrollDisabled}
								type='button'
							>
								<span className='truncate'>{selectedUnrollTemplateLabel}</span>
								<ChevronDown className='size-4' aria-hidden='true' />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align='start'
							className={eventUi.unrollTemplateDropdown}
							sideOffset={6}
						>
							<ScrollArea className={eventUi.unrollTemplateScroll}>
								<div className={eventUi.unrollTemplateOptions}>
									<button
										className={eventUi.unrollTemplateOption(
											draft.unrollTemplateId === 'custom',
										)}
										onClick={() => {
											onUnrollTemplateChange('custom')
											setIsTemplateMenuOpen(false)
										}}
										type='button'
									>
										<span className='block truncate text-sm font-semibold text-white'>
											{t(locale, 'events.unrollTemplateNone')}
										</span>
									</button>
									{unrollTemplates.map(template => {
										const isSelected = draft.unrollTemplateId === template.id

										return (
											<button
												className={eventUi.unrollTemplateOption(isSelected)}
												key={template.id}
												onClick={() => {
													onUnrollTemplateChange(template.id)
													setIsTemplateMenuOpen(false)
												}}
												type='button'
											>
												<span className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2'>
													<span className='block truncate text-sm font-semibold text-white'>
														{template.label}
													</span>
													{isSelected ? (
														<Check
															aria-hidden='true'
															className='size-4 text-[#d7b6ff]'
														/>
													) : null}
												</span>
											</button>
										)
									})}
								</div>
							</ScrollArea>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</section>
	)
}

type EventPreviewCardProps = {
	draft: CreateEventDraft
	leaderName: string
	leaderRealm: string
	previewInstance: EventInstanceOption
	selectedInstances: EventInstanceOption[]
	selectedTemplate: UnrollTemplate | null
}

export function EventPreviewCard({
	draft,
	leaderName,
	leaderRealm,
	previewInstance,
	selectedInstances,
	selectedTemplate,
}: EventPreviewCardProps) {
	const locale = useAppLocale()
	const activityTabs = getActivityTabs(locale)

	return (
		<section className={eventUi.previewCard}>
			<div className={eventUi.previewHead}>
				<span className={eventUi.previewIcon}>
					<Dice5 className='size-5' aria-hidden='true' />
				</span>
				<h2 className='font-serif text-[1.12rem] font-semibold leading-none text-white'>
					{t(locale, 'events.sectionPreview')}
				</h2>
			</div>

			<div className={eventUi.previewCover}>
				<Image
					alt=''
					fill
					sizes='420px'
					src={previewInstance.artPath}
					priority
				/>
				<div className={eventUi.previewCoverText}>
					<strong className={eventUi.previewCoverTitle}>
						{activityTabs.find(tab => tab.type === draft.activityType)?.label}
					</strong>
					<span className={eventUi.previewCoverValue}>
						{t(locale, 'events.previewInstancesCount', {
							count: selectedInstances.length,
						})}
					</span>
				</div>
			</div>

			<div className={eventUi.previewSummary}>
				<div className={eventUi.previewSummaryItem}>
					<UserRound className='size-4' aria-hidden='true' />
					<span className={eventUi.previewSummaryLabel}>{t(locale, 'events.previewLeader')}</span>
					<strong className={eventUi.previewSummaryValue}>
						{leaderName || t(locale, 'events.previewNotSet')}
						{leaderRealm ? ` · ${leaderRealm}` : ''}
					</strong>
				</div>
				<div className={eventUi.previewSummaryItem}>
					<CalendarDays className='size-4' aria-hidden='true' />
					<span className={eventUi.previewSummaryLabel}>{t(locale, 'events.previewDateTime')}</span>
					<strong className={eventUi.previewSummaryValue}>
						{formatDate(draft.date)} {locale === 'ru' ? 'в' : 'at'} {draft.time}
					</strong>
				</div>
				<div className={eventUi.previewSummaryItem}>
					<MapPin className='size-4' aria-hidden='true' />
					<span className={eventUi.previewSummaryLabel}>{t(locale, 'events.previewInstances')}</span>
					<strong className={eventUi.previewSummaryValue}>
						{t(locale, 'events.previewSelectedCount', {
							count: selectedInstances.length,
						})}
					</strong>
				</div>
				<div className={eventUi.previewSummaryItem}>
					<UsersRound className='size-4' aria-hidden='true' />
					<span className={eventUi.previewSummaryLabel}>{t(locale, 'events.previewComposition')}</span>
					<strong className={eventUi.previewSummaryValue}>
						{t(locale, 'events.roleTanks')} {formatRange(draft.roles.tank)} · {t(locale, 'events.roleHealers')}{' '}
						{formatRange(draft.roles.healer)} · {t(locale, 'events.roleDamage')}{' '}
						{formatRange(draft.roles.damage)}
					</strong>
				</div>
				<div className={eventUi.previewSummaryItem}>
					<Coins className='size-4' aria-hidden='true' />
					<span className={eventUi.previewSummaryLabel}>{t(locale, 'events.previewPaidSlots')}</span>
					<strong className={eventUi.previewSummaryValue}>
						{draft.hasPaidSlots
							? locale === 'ru'
								? `${draft.paidSlots} слота, ${formatGold(draft.paidSlotPrice, locale)} золота`
								: `${draft.paidSlots} slots, ${formatGold(draft.paidSlotPrice, locale)} gold`
							: t(locale, 'events.previewNo')}
					</strong>
				</div>
				<div className={eventUi.previewSummaryItem}>
					<Dice5 className='size-4' aria-hidden='true' />
					<span className={eventUi.previewSummaryLabel}>{t(locale, 'events.previewUnroll')}</span>
					<strong className={eventUi.previewSummaryValue}>
						{draft.hasUnroll
							? `${t(locale, 'events.previewUnrollIds', {
									count: draft.unrollItemIds.length,
								})}${
									selectedTemplate ? ` · ${selectedTemplate.label}` : ''
								}`
							: t(locale, 'events.previewNo')}
					</strong>
				</div>
			</div>
		</section>
	)
}

type PublishTargetsBarProps = {
	onTargetToggle: (target: EventPublishTarget, checked: boolean) => void
	publishTargets: Record<EventPublishTarget, boolean>
}

export function PublishTargetsBar({
	onTargetToggle,
	publishTargets,
}: PublishTargetsBarProps) {
	const locale = useAppLocale()
	const publishTargetFields = getPublishTargetFields(locale)

	return (
		<section className={eventUi.publishBox} aria-label={t(locale, 'events.publishChannelsAria')}>
			<div className={eventUi.publishTargets} aria-label={t(locale, 'events.publishChannelsAria')}>
				{publishTargetFields.map(target => {
					const Icon = publishIconComponents[target.icon]
					const isChecked = publishTargets[target.key]

					return (
						<Button
							aria-label={target.label}
							aria-pressed={isChecked}
							className={eventUi.publishTarget(target.key, isChecked)}
							key={target.key}
							onClick={() => onTargetToggle(target.key, !isChecked)}
							size='icon'
							title={target.label}
							type='button'
							variant='ghost'
						>
							<span className={eventUi.publishIcon}>
								{target.imageSrc ? (
									<Image alt='' height={28} src={target.imageSrc} width={28} />
								) : Icon ? (
									<Icon className='size-4' aria-hidden='true' />
								) : null}
							</span>
						</Button>
					)
				})}
			</div>
			<Button
				aria-label={t(locale, 'events.publishChannelsSettings')}
				className={eventUi.publishSettings}
				size='icon'
				type='button'
				variant='ghost'
			>
				<Settings className='size-5' aria-hidden='true' />
			</Button>
		</section>
	)
}

type PublishIconComponent = (props: SVGProps<SVGSVGElement>) => ReactNode

const publishIconComponents: Record<string, PublishIconComponent | null> = {
	app: null,
	custom: CustomChannelsIcon,
	discord: DiscordIcon,
	telegram: TelegramIcon,
}

function DiscordIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg fill='none' viewBox='0 0 24 24' {...props}>
			<path
				d='M7.15 7.45A12 12 0 0 1 10.4 6.4l.48.92a9.2 9.2 0 0 1 2.24 0l.48-.92a12 12 0 0 1 3.25 1.05c1.5 2.22 2.08 4.38 1.88 6.5a11.7 11.7 0 0 1-4 2.04l-.8-1.08a7.4 7.4 0 0 0 1.25-.6 6.95 6.95 0 0 1-6.36 0c.4.25.82.45 1.25.6l-.8 1.08a11.7 11.7 0 0 1-4-2.04c-.2-2.12.38-4.28 1.88-6.5Z'
				stroke='currentColor'
				strokeLinejoin='round'
				strokeWidth='1.7'
			/>
			<path
				d='M9.65 12.1h.02M14.33 12.1h.02'
				stroke='currentColor'
				strokeLinecap='round'
				strokeWidth='2.5'
			/>
		</svg>
	)
}

function TelegramIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg fill='none' viewBox='0 0 24 24' {...props}>
			<path
				d='m4.7 11.55 13.9-6.2c.82-.36 1.62.34 1.32 1.18l-4.08 11.42c-.3.84-1.38 1.08-2.02.46l-2.58-2.48-1.68 1.62c-.42.4-1.12.1-1.12-.48v-2.65l7.1-6.08-8.46 5.1-2.42-.72c-.78-.23-.84-.84.04-1.17Z'
				stroke='currentColor'
				strokeLinecap='round'
				strokeLinejoin='round'
				strokeWidth='1.7'
			/>
		</svg>
	)
}

function CustomChannelsIcon(props: SVGProps<SVGSVGElement>) {
	return <Plus {...props} />
}
