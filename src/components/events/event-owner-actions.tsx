'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { EventDeliveryStatus, ExternalPublishTarget } from '@prisma/client'
import { ArrowClockwise, PencilSimple, Prohibit } from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
	cancelScheduledEventAction,
	retryScheduledEventDeliveryAction,
} from '@/actions/events'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'

type OwnerDelivery = {
	lastAttemptAt: string | null
	lastErrorMessage: string | null
	status: EventDeliveryStatus
	target: ExternalPublishTarget
}

const STALE_DELIVERY_MS = 120_000

function statusLabel(status: EventDeliveryStatus) {
	if (status === 'SENT') return 'Отправлено'
	if (status === 'FAILED') return 'Ошибка'
	if (status === 'PENDING') return 'Выполняется'
	if (status === 'REMOVED') return 'Удалено'
	return 'Отменено'
}

export function EventOwnerActions({
	canEdit,
	compact = false,
	deliveries,
	eventId,
	isCancelled,
	version,
}: {
	canEdit: boolean
	compact?: boolean
	deliveries: OwnerDelivery[]
	eventId: string
	isCancelled: boolean
	version: number
}) {
	const router = useRouter()
	const [isPending, startTransition] = React.useTransition()

	function cancelEvent() {
		startTransition(async () => {
			const result = await cancelScheduledEventAction({ eventId, version })

			if (result.status === 'error') {
				toast.error(result.message)
				return
			}

			if (result.warnings.length > 0) toast.warning(result.warnings.join(' '))
			else toast.success(result.message)
			router.refresh()
		})
	}

	function retry(target: ExternalPublishTarget) {
		startTransition(async () => {
			const result = await retryScheduledEventDeliveryAction({ eventId, target })

			if (result.status === 'error') {
				toast.error(result.message)
				return
			}

			if (result.warnings.length > 0) toast.error(result.warnings.join(' '))
			else toast.success(result.message)
			router.refresh()
		})
	}

	const controls = (
		<>
			<div className='flex flex-wrap gap-2'>
				{canEdit ? (
					<Button asChild variant='outline'><Link href={`/events/${eventId}/edit`}><PencilSimple data-icon='inline-start' aria-hidden='true' />Редактировать</Link></Button>
				) : null}
				{!isCancelled ? (
					<AlertDialog>
						<AlertDialogTrigger asChild><Button disabled={isPending} variant='destructive'><Prohibit data-icon='inline-start' aria-hidden='true' />Отменить</Button></AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader><AlertDialogTitle>Отменить событие?</AlertDialogTitle><AlertDialogDescription>Событие исчезнет из каталога, но его страница и история сохранятся. Сообщения в каналах будут помечены как отменённые.</AlertDialogDescription></AlertDialogHeader>
							<AlertDialogFooter><AlertDialogCancel>Назад</AlertDialogCancel><AlertDialogAction disabled={isPending} onClick={cancelEvent} variant='destructive'>Отменить событие</AlertDialogAction></AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				) : null}
			</div>

			{deliveries.length > 0 ? (
				<div className='flex flex-col gap-2'>
					{deliveries.map(delivery => {
						const isStale =
							delivery.status === 'PENDING' &&
							(!delivery.lastAttemptAt || Date.now() - Date.parse(delivery.lastAttemptAt) >= STALE_DELIVERY_MS)
						const canRetry = delivery.status === 'FAILED' || isStale

						return <div className='flex flex-wrap items-center gap-2 rounded-lg border p-3' key={delivery.target}>
							<strong>{delivery.target === 'DISCORD' ? 'Discord' : 'Telegram'}</strong>
							<Badge variant={canRetry ? 'danger' : 'secondary'}>{isStale ? 'Попытка зависла' : statusLabel(delivery.status)}</Badge>
							{delivery.lastErrorMessage ? <span className='min-w-0 flex-1 text-sm text-muted-foreground'>{delivery.lastErrorMessage}</span> : <span className='flex-1' />}
							{canRetry ? <Button disabled={isPending} onClick={() => retry(delivery.target)} size='sm' type='button' variant='outline'><ArrowClockwise data-icon='inline-start' aria-hidden='true' />Повторить</Button> : null}
						</div>
					})}
				</div>
			) : null}
		</>
	)

	if (compact) {
		return <div className='flex flex-col gap-3'>{controls}</div>
	}

	return (
		<Card className='shadow-none'>
			<CardHeader>
				<CardTitle>Управление событием</CardTitle>
				<CardDescription>Редактирование доступно до начала. Отмена сохраняет страницу и историю.</CardDescription>
			</CardHeader>
			<CardContent className='flex flex-col gap-4'>{controls}</CardContent>
		</Card>
	)
}
