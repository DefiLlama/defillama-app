import type { AlertProposedData } from '~/containers/LlamaAI/types'

export type PersistedAlertIntent = {
	frequency?: 'daily' | 'weekly'
	hour?: number
	timezone?: string
	dayOfWeek?: number
	dataQuery?: string
	title?: string
	deliveryChannel?: 'email' | 'telegram'
}

export type RestoredAlertMetadata = {
	alertIntent?: PersistedAlertIntent
	savedAlertId?: string
	savedAlertIds?: string[]
	saveableAlertIds?: string[]
	deliveryChannel?: 'email' | 'telegram'
}

function getFirstAlertMarkerId(content?: string) {
	return content?.match(/\[ALERT:([^\]]+)\]/)?.[1]
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

	return [
		{
			alertId: persistedAlertId,
			title: metadata.alertIntent.title || metadata.alertIntent.dataQuery || '',
			alertIntent: {
				frequency: metadata.alertIntent.frequency || 'daily',
				hour: metadata.alertIntent.hour ?? 9,
				timezone: metadata.alertIntent.timezone || 'UTC',
				dayOfWeek: metadata.alertIntent.dayOfWeek,
				deliveryChannel: metadata.alertIntent.deliveryChannel || metadata.deliveryChannel
			},
			schedule_expression: '',
			next_run_at: ''
		}
	]
}
