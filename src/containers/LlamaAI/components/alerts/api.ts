import { AI_SERVER } from '~/constants'
import type { AuthorizedFetch } from '~/containers/LlamaAI/api/transport'
import type {
	Alert,
	AlertExecution,
	AlertExecutionDetail,
	UpdateAlertInput
} from '~/containers/LlamaAI/components/alerts/types'

export async function fetchAlerts(authorizedFetch: AuthorizedFetch): Promise<Alert[]> {
	const res = await authorizedFetch(`${AI_SERVER}/alerts`)
	if (!res) throw new Error('Not authenticated')
	if (!res.ok) {
		throw new Error('Failed to fetch alerts')
	}
	const data = (await res.json()) as { alerts?: Alert[] }
	if (data.alerts === undefined) throw new Error('Malformed alerts response')
	return data.alerts
}

export async function fetchAlertExecutions(
	authorizedFetch: AuthorizedFetch,
	alertId: string
): Promise<AlertExecution[]> {
	const encodedAlertId = encodeURIComponent(alertId)
	const res = await authorizedFetch(`${AI_SERVER}/alerts/${encodedAlertId}/executions`)
	if (!res?.ok) throw new Error('Failed to fetch executions')
	const data = (await res.json()) as { executions?: AlertExecution[] }
	if (data.executions === undefined) throw new Error('Malformed alert executions response')
	return data.executions
}

export async function fetchAlertExecutionDetail(
	authorizedFetch: AuthorizedFetch,
	alertId: string,
	executionId: string
): Promise<AlertExecutionDetail> {
	const encodedAlertId = encodeURIComponent(alertId)
	const encodedExecutionId = encodeURIComponent(executionId)
	const res = await authorizedFetch(`${AI_SERVER}/alerts/${encodedAlertId}/executions/${encodedExecutionId}`)
	if (!res?.ok) throw new Error('Failed to fetch execution detail')
	return res.json()
}

export async function setAlertEnabled(
	authorizedFetch: AuthorizedFetch,
	alertId: string,
	enabled: boolean
): Promise<boolean> {
	const encodedAlertId = encodeURIComponent(alertId)
	const res = await authorizedFetch(`${AI_SERVER}/alerts/${encodedAlertId}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ enabled })
	})
	if (!res) throw new Error('Not authenticated')
	if (!res.ok) {
		throw new Error('Failed to update alert')
	}
	return enabled
}

export async function deleteAlert(authorizedFetch: AuthorizedFetch, alertId: string): Promise<string> {
	const encodedAlertId = encodeURIComponent(alertId)
	const res = await authorizedFetch(`${AI_SERVER}/alerts/${encodedAlertId}`, { method: 'DELETE' })
	if (!res) throw new Error('Not authenticated')
	if (!res.ok) {
		throw new Error('Failed to delete alert')
	}
	return alertId
}

export async function updateAlert(
	authorizedFetch: AuthorizedFetch,
	{
		alertId,
		title: nextTitle,
		alertConfig,
		delivery_channel,
		slack_team_id,
		slack_channel_id,
		slack_channel_name
	}: UpdateAlertInput,
	conditionUpdate: { shouldInclude: boolean; value: string | null }
) {
	const encodedAlertId = encodeURIComponent(alertId)
	const res = await authorizedFetch(`${AI_SERVER}/alerts/${encodedAlertId}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			title: nextTitle,
			alertConfig,
			delivery_channel,
			...(delivery_channel === 'slack'
				? {
						slack_team_id: slack_team_id ?? null,
						slack_channel_id: slack_channel_id ?? null,
						slack_channel_name: slack_channel_name ?? null
					}
				: {}),
			...(conditionUpdate.shouldInclude ? { condition: conditionUpdate.value } : {})
		})
	})
	if (!res) throw new Error('Not authenticated')
	if (!res.ok) {
		const errBody = await res.json().catch(() => ({ error: res.statusText }))
		throw new Error(errBody.error || 'Failed to update alert')
	}
	return alertConfig
}
