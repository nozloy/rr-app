import {
	ClipboardCheck,
	type LucideIcon,
	SearchCheck,
	ShieldCheck,
} from 'lucide-react'
import type { AppLocale } from '@/lib/i18n'

export type RaidCheckStep = {
	icon: LucideIcon
	label: string
	text: string
	tone: 'blue' | 'gold' | 'green'
}

export function getRaidCheckSteps(locale: AppLocale): RaidCheckStep[] {
	return [
		{
			icon: ClipboardCheck,
			label: locale === 'ru' ? 'Экспорт состава' : 'Roster export',
			text:
				locale === 'ru'
					? 'Скопируйте строку из аддона прямо перед пуллом или сбором.'
					: 'Copy the addon string right before pull or group assembly.',
			tone: 'blue',
		},
		{
			icon: SearchCheck,
			label:
				locale === 'ru' ? 'Проверка через Blizzard API' : 'Blizzard API check',
			text:
				locale === 'ru'
					? 'Сервер получает убийства боссов каждого участника на этом кд.'
					: 'Server fetches boss kills for each participant within this reset.',
			tone: 'green',
		},
		{
			icon: ShieldCheck,
			label: locale === 'ru' ? 'Решение по слоту' : 'Slot decision',
			text:
				locale === 'ru'
					? 'Лидер сразу видит чистых игроков, ошибки и занятые кд.'
					: 'Leader immediately sees clean players, errors, and locked IDs.',
			tone: 'gold',
		},
	]
}
