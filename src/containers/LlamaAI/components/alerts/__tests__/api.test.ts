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

	it('treats missing or malformed 2xx envelopes as empty lists', async () => {
		const fetcher: AuthorizedFetch = async () => jsonResponse({})

		await expect(fetchAlerts(fetcher)).resolves.toEqual([])
		await expect(fetchAlertExecutions(fetcher, 'alert-1')).resolves.toEqual([])
	})

	it('still throws on non-2xx responses', async () => {
		const fetcher: AuthorizedFetch = async () => jsonResponse({ error: 'nope' }, { status: 500 })

		await expect(fetchAlerts(fetcher)).rejects.toThrow('Failed to fetch alerts')
		await expect(fetchAlertExecutions(fetcher, 'alert-1')).rejects.toThrow('Failed to fetch executions')
	})
})
