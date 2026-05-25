import { describe, expect, it } from 'vitest'
import type { AuthorizedFetch } from '~/containers/LlamaAI/api/transport'
import { fetchAlertExecutions, fetchAlerts } from '~/containers/LlamaAI/components/alerts/api'

function jsonResponse(body: unknown, init?: ResponseInit) {
	return new Response(JSON.stringify(body), {
		...init,
		headers: {
			'Content-Type': 'application/json',
			...init?.headers
		}
	})
}

describe('alerts API wrappers', () => {
	it('returns typed envelope fields directly', async () => {
		const alerts = [{ id: 'alert-1', title: 'Alert' }]
		const fetcher: AuthorizedFetch = async () => jsonResponse({ alerts })

		await expect(fetchAlerts(fetcher)).resolves.toEqual(alerts)
	})

	it('surfaces malformed typed envelopes instead of returning fallback arrays', async () => {
		const fetcher: AuthorizedFetch = async () => jsonResponse({})

		await expect(fetchAlertExecutions(fetcher, 'alert-1')).rejects.toThrow('Malformed alert executions response')
	})
})
