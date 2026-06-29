import { cn } from '@/lib/utils'
import type { EventPublishTarget } from './create-event-types'

const panelSurface =
	'border border-event-panel-border bg-[linear-gradient(180deg,rgba(13,30,57,0.94),rgba(5,15,31,0.96))] shadow-event-panel'
const fieldSurface =
	'border border-event-panel-border bg-[rgba(3,13,27,0.62)] text-white outline-none transition-colors focus-visible:border-event-cyan/60 focus-visible:ring-1 focus-visible:ring-event-cyan/30'
const textInputSurface = cn(
	fieldSurface,
	'h-12 rounded-lg px-3 py-2 font-medium shadow-none placeholder:text-event-copy/50 disabled:bg-[rgba(3,13,27,0.46)] disabled:text-event-copy disabled:opacity-70',
)
const embeddedInputSurface =
	'h-11 border-0 bg-transparent px-2 text-white shadow-none placeholder:text-event-copy/50 focus-visible:ring-0 disabled:bg-transparent disabled:text-event-copy disabled:opacity-70'
const iconButtonBase =
	'grid size-[2.15rem] min-h-0 place-items-center rounded-md border p-0 leading-none opacity-60 shadow-[inset_0_0_14px_rgba(63,127,235,0.06)] transition-[border-color,background,box-shadow,opacity,color] duration-150 hover:opacity-90'

export const eventUi = {
	actionPrimary:
		'h-[3.6rem] w-full rounded-[7px] border border-[#a56bff]/75 bg-[linear-gradient(180deg,rgba(126,71,255,0.95),rgba(63,27,146,0.95))] text-lg font-semibold text-white shadow-[inset_0_0_18px_rgba(255,255,255,0.14),0_0_22px_rgba(126,71,255,0.28)] hover:bg-[linear-gradient(180deg,rgba(149,92,255,0.98),rgba(74,33,166,0.98))]',
	actionSecondary:
		'h-[3.15rem] w-full rounded-[7px] border-event-panel-border-strong bg-[rgba(3,13,27,0.52)] text-base font-medium text-[#eaf2ff]',
	addonDropdown:
		'w-[var(--radix-dropdown-menu-trigger-width)] min-w-0 rounded-lg border border-[#8f5cff] bg-[#061327] p-1 shadow-[0_18px_46px_rgba(0,0,0,0.45),0_0_0_1px_rgba(143,92,255,0.22)]',
	difficultyDropdown:
		'w-[var(--radix-dropdown-menu-trigger-width)] min-w-0 rounded-lg border border-[#8f5cff] bg-[#061327] p-1 shadow-[0_18px_46px_rgba(0,0,0,0.45),0_0_0_1px_rgba(143,92,255,0.22)]',
	addonOption: (isSelected: boolean) =>
		cn(
			'flex min-h-[3.1rem] w-full items-center justify-between gap-3 rounded-md border border-event-panel-border px-3 text-left text-[1.08rem] font-semibold text-[#eaf2ff] transition-colors hover:border-event-cyan/55 hover:bg-[#0c1f40]',
			isSelected &&
				'border-[#9f6bff] bg-[linear-gradient(90deg,rgba(126,71,255,0.28),rgba(70,46,141,0.28))] text-[#f1e7ff]',
		),
	addonOptions: 'grid gap-1',
	addonTrigger: cn(
		fieldSurface,
		'grid h-12 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-4 text-left font-medium text-white hover:bg-[rgba(3,13,27,0.72)] hover:text-white [&_svg]:text-event-copy-strong',
	),
	calendar:
		'grid gap-3 rounded-lg border border-event-panel-border bg-[#061327] p-3',
	calendarDay: (isSelected: boolean, isOutside: boolean) =>
		cn(
			'grid size-9 place-items-center rounded-md border border-transparent text-sm font-bold text-[#eaf2ff] transition-colors hover:border-event-cyan/45 hover:bg-[#0c1f40]',
			isOutside && 'text-event-copy/45',
			isSelected &&
				'border-[#9f6bff] bg-[linear-gradient(180deg,#8d56ff,#572ed0)] text-white shadow-[0_0_16px_rgba(126,71,255,0.34)]',
		),
	calendarGrid: 'grid grid-cols-7 gap-1',
	calendarHead: 'flex items-center justify-between gap-3',
	calendarMonth: 'font-serif text-base font-semibold text-white',
	calendarNav:
		'size-8 rounded-md text-event-copy hover:bg-[#0c1f40] hover:text-white',
	calendarPopover:
		'w-[19rem] rounded-lg border border-event-panel-border bg-[#061327] p-0 shadow-[0_18px_46px_rgba(0,0,0,0.45)]',
	calendarWeekdays:
		'grid grid-cols-7 gap-1 text-center text-[0.68rem] font-extrabold uppercase text-event-copy/65',
	characterAvatar:
		'grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#8f5cff]/45 bg-[#170d38] text-sm font-extrabold text-[#d7b6ff]',
	characterDropdown:
		'w-[var(--radix-dropdown-menu-trigger-width)] min-w-[20rem] overflow-hidden rounded-lg border border-[#8f5cff] bg-[#061327] p-1 shadow-[0_18px_46px_rgba(0,0,0,0.45),0_0_0_1px_rgba(143,92,255,0.22)]',
	characterMeta: 'mt-1 block text-sm text-event-copy',
	characterName: 'block text-base font-semibold text-white',
	characterOption: (isSelected: boolean) =>
		cn(
			'w-full rounded-lg border border-event-panel-border bg-[#041125] p-2 text-left transition-colors hover:border-event-cyan/50 hover:bg-[#0c1f40]',
			isSelected &&
				'border-[#9f6bff] bg-[linear-gradient(90deg,rgba(126,71,255,0.32),rgba(70,46,141,0.28))]',
		),
	characterOptionCopy: 'grid min-w-0 gap-1 text-left',
	characterOptionLayout:
		'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3',
	characterOptionMark: 'grid size-6 place-items-center text-[#d7b6ff]',
	characterOptions: 'grid gap-2 p-1 pr-2',
	characterScroll:
		'h-[23rem] max-h-[var(--radix-dropdown-menu-content-available-height)] rounded-lg pr-2',
	characterSelect:
		'mt-3 grid min-h-[4.5rem] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-event-panel-border bg-[#041125] px-3 py-2 text-left text-white [&_svg]:text-event-copy-strong',
	characterSelectStatic:
		'mt-3 grid min-h-[4.5rem] w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg border border-event-panel-border bg-[#041125] px-3 py-2',
	characterSelectTrigger:
		'transition-colors hover:border-event-cyan/55 hover:bg-[#071a36] focus-visible:border-event-cyan/55 focus-visible:ring-1 focus-visible:ring-event-cyan/30 disabled:pointer-events-none disabled:opacity-60',
	checkbox:
		'mt-3 flex items-center gap-2 text-sm font-bold text-white [&_input]:size-4 [&_input]:accent-[#8f5cff]',
	chipRow: 'mt-3 flex flex-wrap gap-2',
	choiceCard: (isSelected: boolean) =>
		cn(
			'rounded-lg border border-event-panel-border bg-[rgba(3,13,27,0.44)] p-3 transition-colors',
			isSelected &&
				'border-[#8f5cff] bg-[rgba(126,71,255,0.08)] shadow-[inset_0_0_20px_rgba(126,71,255,0.14)]',
		),
	choiceRadio: (isSelected: boolean) =>
		cn(
			'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-event-copy',
			isSelected &&
				'border-[#9f6bff] bg-[radial-gradient(circle_at_center,#d7b6ff_0_35%,transparent_38%)] shadow-[0_0_12px_rgba(126,71,255,0.35)]',
		),
	choiceTitle: 'grid min-w-0 gap-1',
	choiceHeader: 'flex items-start justify-between gap-3',
	choiceToggle:
		'flex w-full items-start gap-3 border-0 bg-transparent p-0 text-left disabled:pointer-events-none disabled:opacity-55',
	copy: 'mt-2 text-sm leading-relaxed text-event-copy',
	infoHintWrapper: 'group relative inline-flex items-center',
	infoHintTrigger:
		'grid size-6 place-items-center rounded-full border border-event-panel-border bg-[rgba(3,13,27,0.62)] text-event-copy transition-colors hover:border-event-cyan/55 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-event-cyan/45',
	infoHintBubble:
		'pointer-events-none invisible absolute left-0 top-[calc(100%+0.45rem)] z-20 w-[min(24rem,calc(100vw-3rem))] rounded-md border border-event-panel-border bg-[#061327] px-3 py-2 text-xs leading-relaxed text-[#d9e8ff] opacity-0 shadow-[0_14px_34px_rgba(0,0,0,0.45)] transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100',
	dateTimeField: 'grid min-w-0 gap-2',
	dateTimeRow:
		'mt-3 grid items-center gap-3 min-[1180px]:grid-cols-[minmax(15rem,0.9fr)_minmax(12rem,0.72fr)_minmax(30rem,1.6fr)] min-[761px]:grid-cols-2 max-[760px]:grid-cols-1',
	dateShortcuts:
		'grid min-w-0 grid-cols-2 gap-2 min-[1180px]:grid-cols-4 min-[761px]:col-span-2 min-[1180px]:col-span-1',
	shortcutButton:
		'h-12 min-w-0 rounded-lg border-event-panel-border-strong bg-transparent px-2 text-sm font-medium text-[#eaf2ff] hover:border-event-cyan/55 hover:bg-[#0c1f40] hover:text-white',
	dateTrigger: cn(
		fieldSurface,
		'grid h-12 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-4 text-left font-medium text-white hover:bg-[rgba(3,13,27,0.72)] hover:text-white [&_span]:justify-self-start [&_svg]:text-event-copy-strong',
	),
	emptyNote: 'mt-3 block text-sm leading-relaxed text-event-copy',
	errorNote:
		'mt-3 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200',
	field: 'grid min-w-0 gap-2 text-sm font-medium text-[#cfe4ff]',
	grid: 'grid gap-3',
	hero: 'flex min-h-[150px] items-start justify-between gap-4 py-6 max-[760px]:min-h-32',
	heroCopy:
		'mt-3 max-w-[760px] text-[0.98rem] leading-relaxed text-[#e8f1ff]/90',
	heroTitle:
		'mt-3 font-serif text-[2.25rem] leading-none text-white [letter-spacing:0] shadow-black drop-shadow-[0_4px_24px_rgba(0,0,0,0.78)] max-[760px]:text-[1.9rem]',
	itemIconFallback:
		'rr-wowhead-item-fallback grid size-full place-items-center rounded-lg bg-event-cyan/10 text-event-cyan',
	itemIconLink:
		'grid size-10 place-items-center overflow-hidden rounded-lg border border-event-panel-border bg-[rgba(3,13,27,0.62)] text-event-cyan transition-[border-color,background,box-shadow,transform] hover:border-event-cyan/60 hover:bg-event-cyan/10 hover:shadow-[0_0_14px_rgba(110,219,255,0.16)] data-[wh-icon-added=true]:border-transparent data-[wh-icon-added=true]:bg-transparent data-[wh-icon-added=true]:shadow-none data-[wh-icon-added=true]:[&_.rr-wowhead-item-fallback]:hidden [&_.iconmedium]:!m-0 [&_.iconmedium]:!align-middle',
	itemIconRow: 'mt-3 flex flex-wrap gap-2',
	inlineFields:
		'mt-3 grid gap-3 min-[761px]:grid-cols-2 [&_label]:grid [&_label]:gap-2 [&_label]:text-sm [&_label]:font-medium [&_label]:text-[#cfe4ff]',
	inputIcon:
		'flex h-12 items-center rounded-lg border border-event-panel-border bg-[rgba(3,13,27,0.62)] px-3 text-white focus-within:border-event-cyan/55 [&_svg]:text-event-copy',
	goldInputIcon:
		'flex h-12 items-center rounded-lg border border-event-panel-border bg-[rgba(3,13,27,0.62)] px-3 text-white focus-within:border-event-cyan/55 [&_svg]:text-[#ffd05d]',
	instanceCard: (isSelected: boolean) =>
		cn(
			"group relative min-h-[6rem] overflow-hidden rounded-lg border border-event-panel-border bg-cover bg-center p-4 text-left transition-[border-color,box-shadow,transform] duration-150 before:absolute before:inset-0 before:bg-[linear-gradient(90deg,rgba(3,9,20,0.34),rgba(3,9,20,0.02)),linear-gradient(180deg,rgba(3,9,20,0.02),rgba(3,9,20,0.2))] before:content-[''] hover:border-event-cyan/55",
			isSelected &&
				'border-[#9f6bff] shadow-[0_0_0_1px_rgba(143,92,255,0.44),inset_0_0_22px_rgba(126,71,255,0.16)]',
		),
	instanceCheck:
		'absolute right-3 top-1/2 z-[1] grid size-8 -translate-y-1/2 place-items-center rounded-full bg-[#8d56ff] text-white shadow-[0_0_16px_rgba(126,71,255,0.42)]',
	instanceCopy: 'relative z-[1] grid min-w-0 gap-2 pr-10',
	instanceGrid:
		'mt-3 grid gap-3 min-[1041px]:grid-cols-3 max-[1040px]:grid-cols-2 max-[760px]:grid-cols-1',
	instanceName:
		'overflow-hidden text-ellipsis whitespace-nowrap font-serif text-xl font-semibold leading-tight text-white',
	instanceTag:
		'w-fit rounded border border-event-cyan/55 bg-event-cyan/12 px-1.5 py-0.5 text-[0.66rem] font-semibold uppercase leading-none tracking-[0.02em] text-event-cyan',
	layout:
		'grid items-start gap-4 min-[1321px]:grid-cols-[minmax(0,1fr)_minmax(380px,440px)]',
	main: 'grid gap-3',
	panel: cn(panelSurface, 'min-w-0 rounded-lg p-[0.9rem]'),
	panelHead:
		'flex items-center justify-between gap-3 max-[760px]:items-start max-[760px]:flex-col',
	paidField: 'grid min-w-0 gap-2 text-sm font-medium text-[#cfe4ff]',
	paidSlotsControls:
		'mt-4 grid w-full max-w-[27rem] grid-cols-[9.5rem_13rem] items-end gap-3 max-[520px]:max-w-full max-[520px]:grid-cols-1',
	paidSwitch:
		'data-[size=default]:!h-[1.55rem] data-[size=default]:!w-[3rem] !border-event-panel-border-strong !bg-[rgba(3,13,27,0.76)] !p-[3px] !shadow-[inset_0_0_14px_rgba(63,127,235,0.10)] data-checked:!border-[#b88dff]/80 data-checked:!bg-[linear-gradient(90deg,rgba(126,71,255,0.95),rgba(76,35,166,0.92))] data-checked:!shadow-[inset_0_0_14px_rgba(215,182,255,0.24),0_0_12px_rgba(126,71,255,0.18)]',
	paidSwitchField: 'flex h-12 items-end',
	paidSwitchThumb:
		'!size-[1.05rem] !bg-[radial-gradient(circle_at_35%_30%,#ffffff,#d9ccff_58%,#bba1ff)] !shadow-[0_0_10px_rgba(215,182,255,0.48)] group-data-checked/switch:!translate-x-[1.55rem]',
	paramsGrid:
		'mt-3 grid gap-3 min-[1180px]:grid-cols-[12.5rem_12.5rem_minmax(0,1fr)] min-[761px]:grid-cols-[12.5rem_12.5rem]',
	premiumBadge:
		'!inline-flex !w-fit items-center gap-1 !border-event-legendary/60 !bg-event-legendary/15 !text-[#ffb45c] shadow-[inset_0_0_14px_rgba(255,128,0,0.12),0_0_12px_rgba(255,128,0,0.10)]',
	previewCard: cn(panelSurface, 'min-w-0 rounded-lg p-4'),
	previewCover:
		'relative mt-4 min-h-[9.4rem] overflow-hidden rounded-lg border border-event-panel-border bg-[#020814] [&_img]:object-cover',
	previewCoverText:
		'absolute inset-x-0 bottom-0 z-[1] flex items-end justify-between gap-4 p-4',
	previewCoverTitle:
		'font-serif text-[1.45rem] font-semibold leading-none text-white',
	previewCoverValue: 'text-sm font-bold text-[#e8f1ff]/80',
	previewFootnote: 'text-center text-sm leading-relaxed text-event-copy',
	previewHead: 'flex items-center gap-3',
	previewIcon:
		'grid size-9 place-items-center rounded-full border border-event-cyan/40 bg-event-cyan/10 text-event-cyan',
	previewStack:
		'grid gap-3 min-[1321px]:sticky min-[1321px]:top-4 [&>.event-primary-action]:w-full [&>.event-secondary-action]:w-full',
	previewSummary: 'mt-4 grid gap-3',
	previewSummaryItem:
		'grid grid-cols-[auto_minmax(112px,0.72fr)_minmax(0,1fr)] items-center gap-3 text-sm text-event-copy max-[760px]:grid-cols-[auto_minmax(0,1fr)]',
	previewSummaryLabel: 'max-[760px]:col-start-2',
	previewSummaryValue:
		'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-event-copy-strong max-[760px]:col-start-2 max-[760px]:whitespace-normal',
	publishBox:
		'flex min-h-[3.1rem] items-center justify-between gap-3 rounded-lg border border-event-panel-border-strong bg-[radial-gradient(circle_at_18%_0%,rgba(72,160,255,0.14),transparent_46%),linear-gradient(180deg,rgba(11,31,59,0.88),rgba(4,15,32,0.94))] px-3 py-2',
	publishIcon:
		'grid size-full place-items-center rounded-[inherit] leading-none text-white [&_img]:block [&_img]:size-6 [&_img]:object-contain [&_img]:drop-shadow-[0_0_8px_rgba(126,71,255,0.55)] [&_svg]:block [&_svg]:size-4',
	publishSettings:
		'grid size-[2.15rem] min-h-0 place-items-center rounded-md bg-transparent p-0 text-event-copy leading-none hover:bg-[#6f9ee1]/10 hover:text-white',
	publishTarget: (target: EventPublishTarget, isSelected: boolean) =>
		cn(
			iconButtonBase,
			'border-event-panel-border/80 bg-event-panel-surface-soft text-white',
			target === 'discord' && 'bg-[#5865f2]/10',
			target === 'telegram' && 'bg-[#38bdf8]/10',
			target === 'app' &&
				'border-[#7e47ff]/30 bg-[radial-gradient(circle_at_50%_42%,rgba(126,71,255,0.30),rgba(3,12,27,0.92)_68%)]',
			target === 'custom' &&
				'border-event-panel-border-strong bg-event-panel-surface-soft text-event-copy hover:border-event-legendary/40 hover:bg-event-legendary/10 hover:text-[#ffb45c]',
			isSelected &&
				'border-event-fel/70 bg-[linear-gradient(180deg,rgba(102,255,0,0.24),rgba(13,78,19,0.44))] text-[#eaffd1] opacity-100 shadow-event-fel',
			target === 'custom' &&
				isSelected &&
				'border-event-legendary/80 bg-[linear-gradient(180deg,rgba(255,128,0,0.30),rgba(87,42,0,0.42))] text-[#fff6e8] shadow-event-legendary',
		),
	publishTargets: 'flex items-center gap-2',
	roleCard:
		'grid min-h-[3.7rem] grid-cols-[minmax(0,1fr)_minmax(9.4rem,0.62fr)] items-center gap-3 rounded-lg border border-event-panel-border bg-[rgba(3,13,27,0.34)] p-2.5',
	roleGrid: 'mt-3 grid gap-3 min-[761px]:grid-cols-3',
	roleHeader: 'flex min-w-0 items-center gap-3',
	roleIcon:
		'grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#041125] shadow-[inset_0_0_12px_rgba(143,92,255,0.12)] [&_img]:size-9 [&_img]:object-contain',
	roleStepper: (hasError: boolean) =>
		cn(
			'grid min-w-0 grid-cols-[2.25rem_minmax(3.2rem,1fr)_2.25rem] items-center overflow-hidden rounded-lg border border-event-panel-border bg-[rgba(3,13,27,0.62)] text-white transition-colors focus-within:border-event-cyan/55',
			hasError && 'border-red-400/65',
		),
	roleStepButton:
		'grid size-9 min-h-0 place-items-center rounded-none border-0 bg-transparent p-0 text-event-copy transition-colors hover:bg-[#10254a] hover:text-white disabled:pointer-events-none disabled:opacity-40',
	roleInput: (hasError: boolean) =>
		cn(
			'h-9 min-w-0 rounded-none border-0 bg-transparent px-1 text-center font-semibold text-white shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
			hasError && 'text-red-200',
		),
	sectionRow:
		'flex items-center justify-between gap-3 max-[760px]:items-start max-[760px]:flex-col',
	sectionTitle:
		'flex items-center gap-3 [&_h2]:m-0 [&_h2]:font-serif [&_h2]:text-[1.12rem] [&_h2]:font-semibold [&_h2]:leading-none [&_h2]:text-white',
	sectionTitleBadge:
		'grid size-6 place-items-center rounded-full border border-[#a971ff]/70 bg-[#7e47ff]/25 text-xs font-extrabold text-[#d7b6ff] shadow-[inset_0_0_14px_rgba(126,71,255,0.34)]',
	select:
		'h-11 w-full rounded-lg border border-event-panel-border bg-[rgba(3,13,27,0.62)] px-3 text-white outline-none focus:border-event-cyan/55',
	selectedChip:
		'inline-flex items-center gap-2 rounded-md border border-[#8f5cff]/60 bg-[#7e47ff]/20 px-3 py-1.5 text-sm font-medium text-[#e8ddff] disabled:pointer-events-none disabled:opacity-60',
	selectedCount: 'text-sm font-bold text-event-copy',
	shell:
		'mx-auto w-[calc(100%_-_3rem)] max-w-[1600px] max-[760px]:w-[calc(100%_-_1.75rem)]',
	stackField: 'mt-3 grid gap-2 text-sm font-medium text-[#cfe4ff]',
	statusNote:
		'rounded-lg border border-event-cyan/25 bg-event-cyan/10 px-3 py-2 text-center text-sm font-bold text-event-cyan',
	templateSplit:
		'my-3 flex items-center gap-3 text-xs font-bold uppercase text-event-copy before:h-px before:flex-1 before:bg-event-panel-border after:h-px after:flex-1 after:bg-event-panel-border',
	unrollControlsDisabled: 'pointer-events-none opacity-55',
	unrollTemplateDropdown:
		'w-[var(--radix-dropdown-menu-trigger-width)] min-w-[18rem] overflow-hidden rounded-lg border border-[#8f5cff] bg-[#061327] p-1 shadow-[0_18px_46px_rgba(0,0,0,0.45),0_0_0_1px_rgba(143,92,255,0.22)]',
	unrollTemplateOption: (isSelected: boolean) =>
		cn(
			'w-full rounded-lg border border-event-panel-border bg-[#041125] px-3 py-2 text-left transition-colors hover:border-event-cyan/50 hover:bg-[#0c1f40]',
			isSelected &&
				'border-[#9f6bff] bg-[linear-gradient(90deg,rgba(126,71,255,0.32),rgba(70,46,141,0.28))]',
		),
	unrollTemplateOptions: 'grid gap-2 p-1 pr-2',
	unrollTemplateScroll:
		'max-h-[14rem] max-h-[var(--radix-dropdown-menu-content-available-height)] rounded-lg pr-2',
	unrollTemplateHeader: 'flex items-center justify-between gap-2',
	unrollTemplateEditButton:
		'grid size-8 shrink-0 place-items-center rounded-md border border-event-panel-border bg-[rgba(3,13,27,0.62)] text-event-copy transition-colors hover:border-event-cyan/55 hover:bg-[#0c1f40] hover:text-white disabled:pointer-events-none disabled:opacity-60',
	unrollTemplateTrigger: cn(
		fieldSurface,
		'grid h-11 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 text-left font-medium text-white hover:bg-[rgba(3,13,27,0.72)] hover:text-white [&_svg]:text-event-copy-strong disabled:pointer-events-none disabled:opacity-70',
	),
	timeColumn: 'grid min-w-0 gap-2',
	timeColumnLabel: 'text-xs font-extrabold uppercase text-event-copy',
	timeOptions: 'grid gap-1',
	timeOption: (isSelected: boolean) =>
		cn(
			'grid h-9 place-items-center rounded-md border border-transparent text-sm font-bold text-[#eaf2ff] transition-colors hover:border-event-cyan/45 hover:bg-[#0c1f40]',
			isSelected &&
				'border-[#9f6bff] bg-[linear-gradient(180deg,#8d56ff,#572ed0)] text-white',
		),
	timePicker: 'grid grid-cols-2 gap-3 p-3',
	timePopover:
		'w-[13.5rem] rounded-lg border border-event-panel-border bg-[#061327] p-0 shadow-[0_18px_46px_rgba(0,0,0,0.45)]',
	timeScroll: 'h-[13.5rem] rounded-md pr-2',
	timeTrigger: cn(
		fieldSurface,
		'grid h-12 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-4 text-left font-medium text-white hover:bg-[rgba(3,13,27,0.72)] hover:text-white [&_span]:justify-self-start [&_svg]:text-event-copy-strong',
	),
	textInput: textInputSurface,
	embeddedInput: embeddedInputSurface,
	typeTabs:
		'grid overflow-hidden rounded-lg border border-event-panel-border min-[761px]:col-span-2 min-[1180px]:col-span-1 min-[761px]:grid-cols-[0.85fr_1.25fr_0.9fr_0.9fr] max-[760px]:grid-cols-1',
	typeTab: (isActive: boolean) =>
		cn(
			'flex h-12 items-center justify-center gap-2 border-r border-event-panel-border bg-[rgba(3,13,27,0.62)] px-3 font-medium text-event-copy transition-colors last:border-r-0 hover:bg-[#0c1f40] hover:text-white max-[760px]:justify-start max-[760px]:border-b max-[760px]:border-r-0 max-[760px]:last:border-b-0',
			isActive &&
				'bg-[linear-gradient(180deg,#8d56ff,#572ed0)] text-white shadow-[inset_0_0_18px_rgba(255,255,255,0.12)]',
		),
}
