import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchChainAssetsChartMock } = vi.hoisted(() => ({
	fetchChainAssetsChartMock: vi.fn()
}))

vi.mock('~/containers/BridgedTVL/api', () => ({
	fetchChainAssetsChart: fetchChainAssetsChartMock
}))

import ChainCharts from '../services/ChainCharts'

describe('ChainCharts Bridged TVL', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		fetchChainAssetsChartMock.mockResolvedValue([{ timestamp: 1_700_000_000, data: { total: '42' } }])
	})

	it('queries chain asset charts with slugged display names', async () => {
		await expect(ChainCharts.bridgedTvl('Hyperliquid L1')).resolves.toEqual([[1_700_000_000, 42]])

		expect(fetchChainAssetsChartMock).toHaveBeenCalledTimes(1)
		expect(fetchChainAssetsChartMock).toHaveBeenCalledWith('hyperliquid-l1')
	})

	it('dedupes equivalent chain asset slugs before fetching', async () => {
		await expect(ChainCharts.bridgedTvl('hyperliquid-l1')).resolves.toEqual([[1_700_000_000, 42]])

		expect(fetchChainAssetsChartMock).toHaveBeenCalledTimes(1)
		expect(fetchChainAssetsChartMock).toHaveBeenCalledWith('hyperliquid-l1')
	})
})
