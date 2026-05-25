import type { AlertProposedData } from '~/containers/LlamaAI/types'

export type PersistedAlertIntent = {
	frequency?: 'daily' | 'weekly'
	hour?: number
	timezone?: string
	dayOfWeek?: number
	dataQuery?: string
	title?: string
	deliveryChannel?: 'email' | 'telegram' | 'slack'
	slackTeamId?: string | null
	slackTeamName?: string | null
	slackChannelId?: string | null
	slackChannelName?: string | null
}

export type RestoredAlertMetadata = {
	alertIntent?: PersistedAlertIntent
	savedAlertId?: string
	savedAlertIds?: string[]
	saveableAlertIds?: string[]
	deliveryChannel?: 'email' | 'telegram' | 'slack'
}

function getFirstAlertMarkerId(content?: string) {
	return content?.match(/\[ALERT:([^\]]+)\]/)?.[1]
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value)
}

function normalizeDeliveryChannel(value: unknown): 'email' | 'telegram' | 'slack' | undefined {
	return value === 'email' || value === 'telegram' || value === 'slack' ? value : undefined
}

function getStringValue(...values: unknown[]): string | null {
	for (const value of values) {
		if (typeof value === 'string') return value
	}
	return null
}

export function normalizeAlertProposedData(value: unknown): AlertProposedData {
	const outerEvent = isRecord(value) ? value : {}
	const event = isRecord(outerEvent.content) ? outerEvent.content : outerEvent
	const rawIntent = isRecord(event.alertIntent) ? event.alertIntent : {}
	const restoredDeliveryChannel =
		normalizeDeliveryChannel(rawIntent.deliveryChannel) ||
		normalizeDeliveryChannel(event.deliveryChannel) ||
		normalizeDeliveryChannel(event.delivery_channel)

	return {
		alertId: typeof event.alertId === 'string' && event.alertId ? event.alertId : 'alert_proposed_fallback',
		title:
			(typeof event.title === 'string' && event.title) ||
			(typeof rawIntent.title === 'string' && rawIntent.title) ||
			(typeof rawIntent.dataQuery === 'string' ? rawIntent.dataQuery : ''),
		alertIntent: {
			frequency: rawIntent.frequency === 'weekly' ? 'weekly' : 'daily',
			hour: typeof rawIntent.hour === 'number' ? rawIntent.hour : 9,
			timezone: typeof rawIntent.timezone === 'string' && rawIntent.timezone ? rawIntent.timezone : 'UTC',
			dayOfWeek: typeof rawIntent.dayOfWeek === 'number' ? rawIntent.dayOfWeek : undefined,
			deliveryChannel: restoredDeliveryChannel,
			...(restoredDeliveryChannel === 'slack'
				? {
						slackTeamId: getStringValue(
							rawIntent.slackTeamId,
							rawIntent.slack_team_id,
							event.slackTeamId,
							event.slack_team_id
						),
						slackTeamName: getStringValue(
							rawIntent.slackTeamName,
							rawIntent.slack_team_name,
							event.slackTeamName,
							event.slack_team_name
						),
						slackChannelId: getStringValue(
							rawIntent.slackChannelId,
							rawIntent.slack_channel_id,
							event.slackChannelId,
							event.slack_channel_id
						),
						slackChannelName: getStringValue(
							rawIntent.slackChannelName,
							rawIntent.slack_channel_name,
							event.slackChannelName,
							event.slack_channel_name
						)
					}
				: {})
		},
		schedule_expression: typeof event.schedule_expression === 'string' ? event.schedule_expression : '',
		next_run_at: typeof event.next_run_at === 'string' ? event.next_run_at : ''
	}
}

// Rebuild alert artifacts from persisted assistant metadata when restoring a session.
export function buildRestoredAlerts({
	content,
	messageId,
	metadata,
	savedAlertIds
}: {
	content?: string
	messageId?: string
	metadata?: RestoredAlertMetadata
	savedAlertIds?: string[]
}): AlertProposedData[] | undefined {
	if (!metadata?.alertIntent) return undefined
	const persistedAlertId =
		getFirstAlertMarkerId(content) ||
		metadata.saveableAlertIds?.[0] ||
		metadata.savedAlertIds?.[0] ||
		savedAlertIds?.[0] ||
		metadata.savedAlertId ||
		`restored_${messageId}`

	// PR #38 added deliveryChannel after Telegram support; older saved alert metadata may omit it.
	const restoredDeliveryChannel = metadata.alertIntent.deliveryChannel || metadata.deliveryChannel
	return [
		{
			alertId: persistedAlertId,
			title: metadata.alertIntent.title || metadata.alertIntent.dataQuery || '',
			alertIntent: {
				frequency: metadata.alertIntent.frequency || 'daily',
				hour: metadata.alertIntent.hour ?? 9,
				timezone: metadata.alertIntent.timezone || 'UTC',
				dayOfWeek: metadata.alertIntent.dayOfWeek,
				deliveryChannel: restoredDeliveryChannel,
				...(restoredDeliveryChannel === 'slack'
					? {
							slackTeamId: metadata.alertIntent.slackTeamId ?? null,
							slackTeamName: metadata.alertIntent.slackTeamName ?? null,
							slackChannelId: metadata.alertIntent.slackChannelId ?? null,
							slackChannelName: metadata.alertIntent.slackChannelName ?? null
						}
					: {})
			},
			schedule_expression: '',
			next_run_at: ''
		}
	]
}
