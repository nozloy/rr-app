'use client'

import { Save, Sparkles } from 'lucide-react'
import { useAppLocale } from '@/components/shell/locale-provider'
import { Button } from '@/components/ui/button'
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
	const {
		canPublish,
		canSubmit,
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

	return (
		<div className={eventUi.shell}>
			<section className={eventUi.hero}>
				<div>
					<h1 className={eventUi.heroTitle}>{t(locale, 'events.heroTitle')}</h1>
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
						time={draft.time}
					/>

					<EventParamsSection
						activityType={draft.activityType}
						addon={draft.addon}
						onActivityTypeChange={dispatchers.setActivityType}
						onAddonChange={dispatchers.setAddon}
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
						draft={draft}
						leaderName={leaderName}
						leaderRealm={leaderRealm}
						previewInstance={previewInstance}
						selectedInstances={selectedInstances}
						selectedTemplate={selectedTemplate}
					/>

					<PublishTargetsBar
						onTargetToggle={dispatchers.togglePublishTarget}
						publishTargets={draft.publishTargets}
					/>

					<Button
						className={eventUi.actionPrimary}
						disabled={!canPublish}
						onClick={() => dispatchers.submitDraft('publish')}
						size='lg'
						type='button'
					>
						<Sparkles className='size-5' aria-hidden='true' />
						{t(locale, 'events.publishEvent')}
					</Button>
					<Button
						className={eventUi.actionSecondary}
						disabled={!canSubmit}
						onClick={() => dispatchers.submitDraft('template')}
						size='lg'
						type='button'
						variant='outline'
					>
						<Save className='size-5' aria-hidden='true' />
						{t(locale, 'events.saveAsTemplate')}
					</Button>

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
