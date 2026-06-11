import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchJson } from '~/utils/async'
import { fetchForkProtocolBreakdownChart } from '../api'

vi.mock('~/utils/async', () => ({
	fetchJson: vi.fn()
}))

describe('fetchForkProtocolBreakdownChart', () => {
	beforeEach(() => {
		vi.mocked(fetchJson).mockReset()
	})

	it('returns an empty chart for 200 error envelopes', async () => {
		vi.mocked(fetchJson).mockResolvedValue({ error: 'temporary outage' })

		await expect(fetchForkProtocolBreakdownChart()).resolves.toEqual([])
	})
})
