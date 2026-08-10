'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import {
	createScheduledEventAction,
	updateScheduledEventAction,
} from '@/actions/events'
import { useAppLocale } from '@/components/shell/locale-provider'
import { Button } from '@/components/ui/button'
import { EventTemplateManager } from './event-template-manager'
import {
	DateTimeSection,
	EventParamsSection,
	EventPreviewCard,
	InstancesSection,
	LeaderSection,
	PaidSlotsSection,
	PublishTargetsBar,
	RoleCompositionSection,
	UnrollSection,
} from './create-event-sections'
import type { CreateEventFormProps } from './create-event-types'
import { eventUi } from './create-event-ui'
import { useCreateEventDraft } from './use-create-event-draft'
import { t } from '@/lib/i18n'

export type { EventCharacterOption } from './create-event-types'

export function CreateEventForm(props: CreateEventFormProps) {
	const locale = useAppLocale()
	const router = useRouter()
	const [isPublishing, startPublishingTransition] = React.useTransition()
	const {
		canPublish,
		canSubmit,
		difficultyOptions,
		dispatchers,
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
	} = useCreateEventDraft(props)

	function handlePublish() {
		if (!canPublish || isPublishing) {
			return
		}

		startPublishingTransition(async () => {
			const result =
				props.mode === 'edit' && props.eventId && props.eventVersion
					? await updateScheduledEventAction({
							...draft,
							eventId: props.eventId,
							version: props.eventVersion,
						})
					: await createScheduledEventAction(draft)

			if (result.status === 'success') {
				if (result.warnings.length > 0) {
					toast.warning(result.warnings.join(' '))
				} else {
					toast.success(result.message)
				}
				router.push(`/events/${result.eventId}${props.mode === 'edit' ? '?updated=1' : '?created=1'}`)
				return
			}

			dispatchers.setStatusMessage(result.message)
			toast.error(result.message)
		})
	}

	return (
		<div className={eventUi.shell}>
			<section className={eventUi.hero}>
				<div>
					<h1 className={eventUi.heroTitle}>
						{props.mode === 'edit'
							? locale === 'ru'
								? 'Редактировать событие'
								: 'Edit event'
							: t(locale, 'events.heroTitle')}
					</h1>
					<p className={eventUi.heroCopy}>
						{t(locale, 'events.heroCopy')}
					</p>
				</div>
			</section>

			<div className={eventUi.layout}>
				<div className={eventUi.main}>
					<LeaderSection
						characters={props.characters}
						draft={draft}
						onCharacterChange={dispatchers.setCharacter}
						onLeaderModeChange={dispatchers.setLeaderMode}
						onManualLeaderNameChange={dispatchers.setManualLeaderName}
						onManualLeaderRealmChange={dispatchers.setManualLeaderRealm}
						selectedCharacter={selectedCharacter}
					/>

					<DateTimeSection
						date={draft.date}
						onDateChange={dispatchers.setDate}
						onDateTimeChange={dispatchers.setDateTime}
						onTimePartChange={dispatchers.setTimePart}
						onTimeZoneChange={dispatchers.setTimeZone}
						time={draft.time}
						timeZone={draft.timeZone}
					/>

					<EventParamsSection
						activityType={draft.activityType}
						addon={draft.addon}
						addons={props.eventCatalog.addons}
						contentScope={draft.contentScope}
						contentScopes={props.eventCatalog.contentScopes.filter(option =>
							Boolean(
								props.eventCatalog.optionsByAddon[draft.addon]?.[option.value],
							),
						)}
						difficulty={draft.difficulty}
						difficultyOptions={difficultyOptions}
						onActivityTypeChange={dispatchers.setActivityType}
						onAddonChange={dispatchers.setAddon}
						onContentScopeChange={dispatchers.setContentScope}
						onDifficultyChange={dispatchers.setDifficulty}
					/>

					<InstancesSection
						instanceOptions={instanceOptions}
						onInstanceRemove={dispatchers.removeInstance}
						onInstanceToggle={dispatchers.toggleInstance}
						selectedInstanceSlugs={draft.selectedInstanceSlugs}
						selectedInstances={selectedInstances}
					/>

					<RoleCompositionSection
						hasRoleError={hasRoleError}
						onRoleRangeInputChange={dispatchers.updateRoleRangeInput}
						roleErrors={roleErrors}
						roleInputValues={roleInputValues}
						roleValidation={roleValidation}
					/>

					<PaidSlotsSection
						draft={draft}
						onPaidSlotPriceChange={dispatchers.setPaidSlotPrice}
						onPaidSlotsChange={dispatchers.setPaidSlots}
						onPaidSlotsEnabledChange={dispatchers.setPaidSlotsEnabled}
					/>

					<UnrollSection
						draft={draft}
						onUnrollEnabledChange={dispatchers.setUnrollEnabled}
						onUnrollInputChange={dispatchers.updateUnrollInput}
						onUnrollTemplateChange={dispatchers.selectUnrollTemplate}
					/>
				</div>

				<aside className={eventUi.previewStack}>
					<EventPreviewCard
						difficultyOptions={difficultyOptions}
						draft={draft}
						leaderName={leaderName}
						leaderRealm={leaderRealm}
						previewInstance={previewInstance}
						selectedInstances={selectedInstances}
						selectedTemplate={selectedTemplate}
					/>

					<PublishTargetsBar
						channelAvailability={props.channelAvailability}
						onTargetToggle={dispatchers.togglePublishTarget}
						publishTargets={draft.publishTargets}
					/>

					<Button
						className={eventUi.actionPrimary}
						aria-busy={isPublishing}
						disabled={!canPublish || isPublishing}
						onClick={handlePublish}
						size='lg'
						type='button'
					>
						<Sparkles className='size-5' aria-hidden='true' />
						{isPublishing
							? props.mode === 'edit'
								? 'Сохраняем…'
								: t(locale, 'events.publishingEvent')
							: props.mode === 'edit'
								? 'Сохранить изменения'
								: t(locale, 'events.publishEvent')}
					</Button>
					<EventTemplateManager
						channelAvailability={props.channelAvailability}
						characters={props.characters}
						defaultTimeZone={props.defaultTimeZone}
						disabled={!canSubmit || isPublishing}
						draft={draft}
						eventCatalog={props.eventCatalog}
						onLoad={dispatchers.replaceDraft}
						templates={props.templates}
					/>

					{statusMessage ? (
						<p className={eventUi.statusNote}>{statusMessage}</p>
					) : (
						<p className={eventUi.previewFootnote}>
							{t(locale, 'events.templatesFootnote')}
						</p>
					)}
				</aside>
			</div>
		</div>
	)
}
