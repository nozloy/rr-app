'use client'

import Image from 'next/image'
import { useState, type ReactNode, type SVGProps } from 'react'
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
	IdCard,
	MapPin,
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
	activityTabs,
	addons,
	calendarMonthNames,
	calendarWeekdays,
	publishTargetFields,
	roleFields,
	timeHours,
	timeMinutes,
	unrollTemplates,
} from './create-event-data'
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
	const [isCharacterMenuOpen, setIsCharacterMenuOpen] = useState(false)

	return (
		<section className={eventUi.panel}>
			<div className={eventUi.panelHead}>
				<SectionTitle number={1}>Лидер события</SectionTitle>
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
							<strong className='text-base font-extrabold text-white'>
								Мой персонаж
							</strong>
							<small className='mt-1 block text-sm text-event-copy'>
								{characters.length > 1
									? 'Нажмите на карточку, чтобы выбрать другого персонажа'
									: 'Выберите одного из ваших персонажей'}
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
										aria-label='Выбрать персонажа'
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
							Синхронизируйте персонажа в кабинете
						</span>
					)}
				</div>

				<div className={eventUi.choiceCard(draft.leaderMode === 'manual')}>
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
							<strong className='text-base font-extrabold text-white'>
								Указать вручную
							</strong>
							<Badge className={eventUi.premiumBadge} variant='arcane'>
								<Crown className='size-3' aria-hidden='true' />
								Premium
							</Badge>
							<small className='text-sm text-event-copy'>
								Укажите данные рейд-лидера вручную
							</small>
						</span>
					</button>

					<div className={eventUi.inlineFields}>
						<label>
							<span>Ник рейд-лидера</span>
							<Input
								disabled={draft.leaderMode !== 'manual'}
								onChange={event =>
									onManualLeaderNameChange(event.currentTarget.value)
								}
								value={draft.manualLeaderName}
							/>
						</label>
						<label>
							<span>Сервер</span>
							<Input
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

	return (
		<section className={eventUi.panel}>
			<SectionTitle number={2}>Дата и время</SectionTitle>
			<div className={eventUi.inlineFields}>
				<div className={eventUi.stackField}>
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
										aria-label='Предыдущий месяц'
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
										aria-label='Следующий месяц'
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
				<label className={eventUi.stackField}>
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
									<span className={eventUi.timeColumnLabel}>Часы</span>
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
									<span className={eventUi.timeColumnLabel}>Минуты</span>
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
			</div>
			<div className={eventUi.dateShortcuts}>
				<Button
					onClick={() => setDateTimeFromDate(new Date())}
					size='sm'
					type='button'
					variant='outline'
				>
					Сейчас
				</Button>
				<Button
					onClick={() => {
						const nextDate = new Date()
						nextDate.setMinutes(nextDate.getMinutes() + 15)
						setDateTimeFromDate(nextDate)
					}}
					size='sm'
					type='button'
					variant='outline'
				>
					Через 15 минут
				</Button>
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
	const [isAddonMenuOpen, setIsAddonMenuOpen] = useState(false)

	return (
		<section className={eventUi.panel}>
			<SectionTitle number={3}>Дополнение</SectionTitle>
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

				<div className={eventUi.typeTabs} role='group' aria-label='Вид сбора'>
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
								<Icon className='size-4' aria-hidden='true' />
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
	return (
		<section className={eventUi.panel}>
			<div className={eventUi.panelHead}>
				<div>
					<SectionTitle number={4}>Инстансы</SectionTitle>
					<p className={eventUi.copy}>
						Выберите один или несколько инстансов соответствующего типа.
					</p>
				</div>
				<span className={eventUi.selectedCount}>
					Выбрано: {selectedInstances.length}
				</span>
			</div>

			<div className={eventUi.chipRow} aria-label='Выбранные инстансы'>
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
	return (
		<section className={eventUi.panel}>
			<SectionTitle number={5}>Состав группы</SectionTitle>
			<p className={eventUi.copy}>
				Укажите минимальное и максимальное количество игроков по ролям через
				тире или одним числом.
			</p>

			<div className={eventUi.roleGrid}>
				{roleFields.map(role => {
					const roleError = roleValidation[role.key].error

					return (
						<div className={eventUi.roleCard} key={role.key}>
							<div className={eventUi.roleHeader}>
								<span className={eventUi.roleIcon} aria-hidden='true'>
									<Image alt='' height={38} src={role.imageSrc} width={38} />
								</span>
								<strong className='text-base font-extrabold text-white'>
									{role.label}
								</strong>
							</div>
							<label className={eventUi.field}>
								<span>Количество</span>
								<Input
									aria-invalid={Boolean(roleError)}
									autoComplete='off'
									className={eventUi.roleInput(Boolean(roleError))}
									onChange={event =>
										onRoleRangeInputChange(role.key, event.currentTarget.value)
									}
									placeholder={role.placeholder}
									value={roleInputValues[role.key]}
								/>
							</label>
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
	return (
		<section className={eventUi.panel}>
			<div className={eventUi.sectionRow}>
				<div className='flex items-center gap-4 justify-start'>
					<SectionTitle number={7}>Платные слоты</SectionTitle>
					<Switch
						aria-label='Включить платные слоты'
						checked={draft.hasPaidSlots}
						className={eventUi.paidSwitch}
						onCheckedChange={onPaidSlotsEnabledChange}
					/>
				</div>
				<Badge className={eventUi.premiumBadge} variant='arcane'>
					<Crown className='size-3' aria-hidden='true' />
					Premium
				</Badge>
			</div>

			<div className={eventUi.paidSlotsControls}>
				<label className={eventUi.paidField}>
					<span className={eventUi.inputIcon}>
						<UserRound className='size-4' aria-hidden='true' />
						<Input
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
	return (
		<section className={eventUi.panel}>
			<SectionTitle number={6}>Анролл</SectionTitle>
			<label className={eventUi.checkbox}>
				<input
					checked={draft.hasUnroll}
					onChange={event => onUnrollEnabledChange(event.currentTarget.checked)}
					type='checkbox'
				/>
				Есть анролл
			</label>

			<label className={eventUi.stackField}>
				<span>ID предметов</span>
				<Input
					disabled={!draft.hasUnroll}
					onChange={event => onUnrollInputChange(event.currentTarget.value)}
					value={draft.unrollInput}
				/>
			</label>

			<div className={eventUi.chipRow}>
				{draft.unrollItemIds.map(id => (
					<span className={eventUi.idChip} key={id}>
						<IdCard className='size-3.5' aria-hidden='true' />
						ID: {id}
					</span>
				))}
			</div>

			<div className={eventUi.templateSplit}>
				<span>или</span>
			</div>

			<label className={eventUi.stackField}>
				<span>Шаблон</span>
				<select
					className={eventUi.select}
					disabled={!draft.hasUnroll}
					onChange={event => onUnrollTemplateChange(event.currentTarget.value)}
					value={draft.unrollTemplateId}
				>
					<option value='custom'>Без шаблона</option>
					{unrollTemplates.map(template => (
						<option key={template.id} value={template.id}>
							{template.label}
						</option>
					))}
				</select>
			</label>
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
	return (
		<section className={eventUi.previewCard}>
			<div className={eventUi.previewHead}>
				<span className={eventUi.previewIcon}>
					<Dice5 className='size-5' aria-hidden='true' />
				</span>
				<h2 className='font-serif text-[1.18rem] font-bold leading-none text-white'>
					Предпросмотр события
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
				<span className={eventUi.previewCoverOverlay} aria-hidden='true' />
				<div className={eventUi.previewCoverText}>
					<strong className={eventUi.previewCoverTitle}>
						{activityTabs.find(tab => tab.type === draft.activityType)?.label}
					</strong>
					<span className={eventUi.previewCoverValue}>
						{selectedInstances.length} инст.
					</span>
				</div>
			</div>

			<div className={eventUi.previewSummary}>
				<div className={eventUi.previewSummaryItem}>
					<UserRound className='size-4' aria-hidden='true' />
					<span className={eventUi.previewSummaryLabel}>Лидер</span>
					<strong className={eventUi.previewSummaryValue}>
						{leaderName || 'Не указан'}
						{leaderRealm ? ` · ${leaderRealm}` : ''}
					</strong>
				</div>
				<div className={eventUi.previewSummaryItem}>
					<CalendarDays className='size-4' aria-hidden='true' />
					<span className={eventUi.previewSummaryLabel}>Дата и время</span>
					<strong className={eventUi.previewSummaryValue}>
						{formatDate(draft.date)} в {draft.time}
					</strong>
				</div>
				<div className={eventUi.previewSummaryItem}>
					<MapPin className='size-4' aria-hidden='true' />
					<span className={eventUi.previewSummaryLabel}>Инстансы</span>
					<strong className={eventUi.previewSummaryValue}>
						{selectedInstances.length} выбрано
					</strong>
				</div>
				<div className={eventUi.previewSummaryItem}>
					<UsersRound className='size-4' aria-hidden='true' />
					<span className={eventUi.previewSummaryLabel}>Состав группы</span>
					<strong className={eventUi.previewSummaryValue}>
						Танки {formatRange(draft.roles.tank)} · Хиллеры{' '}
						{formatRange(draft.roles.healer)} · Дамагеры{' '}
						{formatRange(draft.roles.damage)}
					</strong>
				</div>
				<div className={eventUi.previewSummaryItem}>
					<Coins className='size-4' aria-hidden='true' />
					<span className={eventUi.previewSummaryLabel}>Платные слоты</span>
					<strong className={eventUi.previewSummaryValue}>
						{draft.hasPaidSlots
							? `${draft.paidSlots} слота, ${formatGold(draft.paidSlotPrice)} золота`
							: 'Нет'}
					</strong>
				</div>
				<div className={eventUi.previewSummaryItem}>
					<Dice5 className='size-4' aria-hidden='true' />
					<span className={eventUi.previewSummaryLabel}>Анролл</span>
					<strong className={eventUi.previewSummaryValue}>
						{draft.hasUnroll
							? `${draft.unrollItemIds.length} ID${
									selectedTemplate ? ` · ${selectedTemplate.label}` : ''
								}`
							: 'Нет'}
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
	return (
		<section className={eventUi.publishBox} aria-label='Каналы публикации'>
			<div className={eventUi.publishTargets} aria-label='Каналы публикации'>
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
				aria-label='Настроить каналы публикации'
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
