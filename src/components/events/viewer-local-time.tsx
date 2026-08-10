'use client'

import React from 'react'
import { Clock } from '@phosphor-icons/react'

export function ViewerLocalTime({
	authorTimeZone,
	startsAt,
}: {
	authorTimeZone: string
	startsAt: string
}) {
	const [viewerTime, setViewerTime] = React.useState<string | null>(null)

	React.useEffect(() => {
		const viewerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

		if (!viewerTimeZone || viewerTimeZone === authorTimeZone) {
			setViewerTime(null)
			return
		}

		setViewerTime(
			`${new Intl.DateTimeFormat('ru-RU', {
				dateStyle: 'long',
				timeStyle: 'short',
				timeZone: viewerTimeZone,
			}).format(new Date(startsAt))} (${viewerTimeZone})`,
		)
	}, [authorTimeZone, startsAt])

	if (!viewerTime) return null

	return (
		<p className='flex items-center gap-2 text-sm text-muted-foreground'>
			<Clock aria-hidden='true' />
			Ваше время: {viewerTime}
		</p>
	)
}
