'use client'

import { Crown, Save, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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

export type { EventCharacterOption } from './create-event-types'

export function CreateEventForm(props: CreateEventFormProps) {
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
					<Badge className={eventUi.premiumBadge} variant='success'>
						<Crown className='size-3.5' aria-hidden='true' />
						Премиум активен
					</Badge>
					<h1 className={eventUi.heroTitle}>Создание нового события</h1>
					<p className={eventUi.heroCopy}>
						Создайте рейд, подземелье или активность в открытом мире и соберите
						группу с нужным составом.
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

					<div className={eventUi.topGrid}>
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
					</div>

					<InstancesSection
						instanceOptions={instanceOptions}
						onInstanceRemove={dispatchers.removeInstance}
						onInstanceToggle={dispatchers.toggleInstance}
						selectedInstanceSlugs={draft.selectedInstanceSlugs}
						selectedInstances={selectedInstances}
					/>

					<div className={eventUi.bottomGrid}>
						<RoleCompositionSection
							hasRoleError={hasRoleError}
							onRoleRangeInputChange={dispatchers.updateRoleRangeInput}
							roleErrors={roleErrors}
							roleInputValues={roleInputValues}
							roleValidation={roleValidation}
						/>
						<UnrollSection
							draft={draft}
							onUnrollEnabledChange={dispatchers.setUnrollEnabled}
							onUnrollInputChange={dispatchers.updateUnrollInput}
							onUnrollTemplateChange={dispatchers.selectUnrollTemplate}
						/>
					</div>
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

					<PaidSlotsSection
						draft={draft}
						onPaidSlotPriceChange={dispatchers.setPaidSlotPrice}
						onPaidSlotsChange={dispatchers.setPaidSlots}
						onPaidSlotsEnabledChange={dispatchers.setPaidSlotsEnabled}
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
						Опубликовать событие
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
						Сохранить как шаблон
					</Button>

					{statusMessage ? (
						<p className={eventUi.statusNote}>{statusMessage}</p>
					) : (
						<p className={eventUi.previewFootnote}>
							Шаблоны доступны в разделе активностей после подключения
							серверного сохранения.
						</p>
					)}
				</aside>
			</div>
		</div>
	)
}
