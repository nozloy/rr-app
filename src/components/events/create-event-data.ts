import { Globe2, Shield, Swords } from 'lucide-react'
import type {
	ActivityTab,
	EventInstanceOption,
	EventRole,
	PublishTargetField,
	RoleField,
	RoleRange,
	UnrollTemplate,
} from './create-event-types'

export const addons = ['Midnight', 'The War Within', 'Dragonflight']

export const calendarMonthNames = [
	'Январь',
	'Февраль',
	'Март',
	'Апрель',
	'Май',
	'Июнь',
	'Июль',
	'Август',
	'Сентябрь',
	'Октябрь',
	'Ноябрь',
	'Декабрь',
]

export const calendarWeekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export const timeHours = Array.from({ length: 24 }, (_, index) =>
	String(index).padStart(2, '0'),
)

export const timeMinutes = Array.from({ length: 60 }, (_, index) =>
	String(index).padStart(2, '0'),
)

export const activityTabs = [
	{ icon: Swords, label: 'Рейд', type: 'raid' },
	{ icon: Shield, label: 'Подземелье', type: 'dungeon' },
	{ icon: Globe2, label: 'Открытый мир', type: 'open-world' },
] satisfies ActivityTab[]

export const openWorldActivities: EventInstanceOption[] = [
	{
		activityType: 'open-world',
		artPath: '/home/hero-midnight-citadel.jpg',
		name: "Контракты добычи Кель'Таласа",
		shortName: 'Контракты',
		slug: 'quelthalas-prey-contracts',
		tag: 'ОТКРЫТЫЙ МИР',
	},
	{
		activityType: 'open-world',
		artPath: '/raids/march_on_queldanas_styled_16x9.jpg',
		name: 'Патрули Серебряной Луны',
		shortName: 'Патрули',
		slug: 'silvermoon-patrols',
		tag: 'ОТКРЫТЫЙ МИР',
	},
	{
		activityType: 'open-world',
		artPath: '/raids/the_voidspire_styled_16x9.jpg',
		name: 'Разломы Бездны',
		shortName: 'Разломы',
		slug: 'void-rifts',
		tag: 'ОТКРЫТЫЙ МИР',
	},
	{
		activityType: 'open-world',
		artPath: '/raids/the_dreamrift_styled_16x9.jpg',
		name: 'Охота за редкими целями',
		shortName: 'Редкие цели',
		slug: 'rare-hunt',
		tag: 'ОТКРЫТЫЙ МИР',
	},
]

export const unrollTemplates: UnrollTemplate[] = [
	{
		className: 'Паладин',
		id: 'paladin-retribution',
		itemIds: ['228764', '228765', '228766', '228767'],
		label: 'Паладин - Воздаяние',
		spec: 'Воздаяние',
	},
	{
		className: 'Охотник на демонов',
		id: 'demon-hunter-devourer',
		itemIds: ['229110', '229111', '229112', '229113'],
		label: 'Охотник на демонов - Devourer',
		spec: 'Devourer',
	},
	{
		className: 'Друид',
		id: 'druid-balance',
		itemIds: ['228701', '228702', '228703'],
		label: 'Друид - Баланс',
		spec: 'Баланс',
	},
	{
		className: 'Монах',
		id: 'monk-mistweaver',
		itemIds: ['228721', '228722', '228723'],
		label: 'Монах - Ткач туманов',
		spec: 'Ткач туманов',
	},
	{
		className: 'Рыцарь смерти',
		id: 'death-knight-blood',
		itemIds: ['228741', '228742', '228743'],
		label: 'Рыцарь смерти - Кровь',
		spec: 'Кровь',
	},
]

export const roleFields = [
	{
		imageSrc: '/roles/tank-clean.png',
		key: 'tank',
		label: 'Танки',
		placeholder: '2-3',
	},
	{
		imageSrc: '/roles/healer-clean.png',
		key: 'healer',
		label: 'Хиллеры',
		placeholder: '4-5',
	},
	{
		imageSrc: '/roles/dps-clean.png',
		key: 'damage',
		label: 'Дамагеры',
		placeholder: '10-12',
	},
] satisfies RoleField[]

export const defaultRoleRanges: Record<EventRole, RoleRange> = {
	damage: { max: 12, min: 9 },
	healer: { max: 3, min: 3 },
	tank: { max: 2, min: 2 },
}

export const publishTargetFields = [
	{
		icon: 'discord',
		key: 'discord',
		label: 'Discord',
		note: 'Канал сервера',
	},
	{
		icon: 'telegram',
		key: 'telegram',
		label: 'Telegram',
		note: 'Пост в чат',
	},
	{
		icon: 'app',
		imageSrc: '/home/raid-reminder-mark.png',
		key: 'app',
		label: 'Приложение',
		note: 'Raid Reminder',
	},
	{
		icon: 'custom',
		key: 'custom',
		label: 'Свои каналы',
		note: 'Пользовательские площадки',
	},
] satisfies PublishTargetField[]
