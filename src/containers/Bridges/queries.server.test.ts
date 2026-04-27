import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchBridgeVolumeByChain } from './api'
import { getBridgeNetInflowsForChain } from './queries.server'

vi.mock('./api', async (importOriginal) => ({
	...(await importOriginal<typeof import('./api')>()),
	fetchBridgeVolumeByChain: vi.fn()
}))

const fetchBridgeVolumeByChainMock = vi.mocked(fetchBridgeVolumeByChain)

describe('getBridgeNetInflowsForChain', () => {
	afterEach(() => {
		vi.clearAllMocks()
		vi.restoreAllMocks()
	})

	it('uses the latest chain bridge deposit without fetching per-bridge charts', async () => {
		fetchBridgeVolumeByChainMock.mockResolvedValue([
			{ date: '1', depositUSD: 10, withdrawUSD: 3, depositTxs: 1, withdrawTxs: 1 },
			{ date: '2', depositUSD: 25, withdrawUSD: 5, depositTxs: 1, withdrawTxs: 1 }
		])

		await expect(getBridgeNetInflowsForChain('Arbitrum')).resolves.toEqual({ netInflows: 25 })
		expect(fetchBridgeVolumeByChainMock).toHaveBeenCalledOnce()
		expect(fetchBridgeVolumeByChainMock).toHaveBeenCalledWith('Arbitrum')
	})

	it('keeps zero latest inflows hidden', async () => {
		fetchBridgeVolumeByChainMock.mockResolvedValue([
			{ date: '1', depositUSD: 10, withdrawUSD: 3, depositTxs: 1, withdrawTxs: 1 },
			{ date: '2', depositUSD: 0, withdrawUSD: 5, depositTxs: 1, withdrawTxs: 1 }
		])

		await expect(getBridgeNetInflowsForChain('Optimism')).resolves.toBe(null)
	})

	it('does not retry the lightweight chain overview bridge lookup', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => undefined)
		fetchBridgeVolumeByChainMock.mockRejectedValue(new Error('timeout'))

		await expect(getBridgeNetInflowsForChain('Abstract')).resolves.toBe(null)
		expect(fetchBridgeVolumeByChainMock).toHaveBeenCalledOnce()
	})
})
