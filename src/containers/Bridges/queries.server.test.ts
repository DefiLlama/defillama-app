import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchJson } from '~/utils/async'
import { fetchBridgeVolumeByChain } from './api'
import { getBridgeChainNetInflows } from './queries.server'

vi.mock('~/utils/async', () => ({
	fetchJson: vi.fn()
}))

vi.mock('./api', () => ({
	fetchBridgeVolumeByChain: vi.fn()
}))

describe('getBridgeChainNetInflows', () => {
	beforeEach(() => {
		vi.mocked(fetchJson).mockReset()
		vi.mocked(fetchBridgeVolumeByChain).mockReset()
	})

	it('returns the latest chain deposit value without fetching bridge overview data', async () => {
		vi.mocked(fetchJson).mockResolvedValue({ chainCoingeckoIds: { XDC: ['xdc-network'] } })
		vi.mocked(fetchBridgeVolumeByChain).mockResolvedValue([
			{ date: '2026-04-27', depositUSD: 12, withdrawUSD: 3, depositTxs: 1, withdrawTxs: 1 },
			{ date: '2026-04-28', depositUSD: 42, withdrawUSD: 5, depositTxs: 2, withdrawTxs: 1 }
		])

		await expect(getBridgeChainNetInflows('XDC')).resolves.toEqual({ netInflows: 42 })
		expect(fetchBridgeVolumeByChain).toHaveBeenCalledOnce()
		expect(fetchBridgeVolumeByChain).toHaveBeenCalledWith('XDC')
	})

	it('keeps zero net inflows hidden', async () => {
		vi.mocked(fetchJson).mockResolvedValue({ chainCoingeckoIds: { XDC: ['xdc-network'] } })
		vi.mocked(fetchBridgeVolumeByChain).mockResolvedValue([
			{ date: '2026-04-28', depositUSD: 0, withdrawUSD: 5, depositTxs: 2, withdrawTxs: 1 }
		])

		await expect(getBridgeChainNetInflows('XDC')).resolves.toBeNull()
	})
})
