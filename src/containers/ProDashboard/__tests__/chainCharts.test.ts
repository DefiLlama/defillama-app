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

	it('fetches once per unique slug when an alias maps to a distinct display name', async () => {
		fetchChainAssetsChartMock.mockImplementation(async (chainSlug: string) => {
			if (chainSlug === 'hyperliquid') return [{ timestamp: 1_700_000_000, data: { total: '10' } }]
			if (chainSlug === 'hyperliquid-l1') return [{ timestamp: 1_700_086_400, data: { total: '20' } }]
			return []
		})

		await expect(ChainCharts.bridgedTvl('Hyperliquid')).resolves.toEqual([
			[1_700_000_000, 10],
			[1_700_086_400, 20]
		])

		expect(fetchChainAssetsChartMock).toHaveBeenCalledTimes(2)
		expect(fetchChainAssetsChartMock).toHaveBeenNthCalledWith(1, 'hyperliquid')
		expect(fetchChainAssetsChartMock).toHaveBeenNthCalledWith(2, 'hyperliquid-l1')
	})

	it('returns an empty chart when the chain assets fetch fails', async () => {
		fetchChainAssetsChartMock.mockRejectedValue(new Error('missing chart'))

		await expect(ChainCharts.bridgedTvl('Base')).resolves.toEqual([])

		expect(fetchChainAssetsChartMock).toHaveBeenCalledTimes(1)
		expect(fetchChainAssetsChartMock).toHaveBeenCalledWith('base')
	})

	it('ignores failed alias fetches and keeps successful chain asset responses', async () => {
		fetchChainAssetsChartMock.mockImplementation(async (chainSlug: string) => {
			if (chainSlug === 'hyperliquid') throw new Error('missing alias chart')
			return [{ timestamp: 1_700_086_400, data: { total: '20' } }]
		})

		await expect(ChainCharts.bridgedTvl('Hyperliquid')).resolves.toEqual([[1_700_086_400, 20]])

		expect(fetchChainAssetsChartMock).toHaveBeenCalledTimes(2)
		expect(fetchChainAssetsChartMock).toHaveBeenNthCalledWith(1, 'hyperliquid')
		expect(fetchChainAssetsChartMock).toHaveBeenNthCalledWith(2, 'hyperliquid-l1')
	})

	it('returns an empty chart for empty chain inputs without fetching', async () => {
		await expect(ChainCharts.bridgedTvl('')).resolves.toEqual([])
		await expect(ChainCharts.bridgedTvl(null as unknown as string)).resolves.toEqual([])

		expect(fetchChainAssetsChartMock).not.toHaveBeenCalled()
	})

	it('slugifies unknown chain names before fetching', async () => {
		await expect(ChainCharts.bridgedTvl('Unknown Chain')).resolves.toEqual([[1_700_000_000, 42]])

		expect(fetchChainAssetsChartMock).toHaveBeenCalledTimes(1)
		expect(fetchChainAssetsChartMock).toHaveBeenCalledWith('unknown-chain')
	})
})
