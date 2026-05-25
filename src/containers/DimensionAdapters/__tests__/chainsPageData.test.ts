import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '../constants'

const { fetchJsonMock } = vi.hoisted(() => ({
	fetchJsonMock: vi.fn()
}))

vi.mock('~/utils/async', () => ({
	fetchJson: fetchJsonMock
}))

import { getChainsByAdapterChartData, getChainsByAdapterPageData } from '../queries'

const chainMetadata = {
	ethereum: {
		id: 'ethereum',
		name: 'Ethereum',
		dexs: true,
		dimAgg: {
			dexs: {
				dv: {
					'24h': 100,
					'7d': 700,
					'30d': 3000
				}
			}
		}
	}
}

describe('chains by adapter page data', () => {
	beforeEach(() => {
		fetchJsonMock.mockReset()
	})

	it('omits chart data when includeChartData is false', async () => {
		const data = await getChainsByAdapterPageData({
			adapterType: ADAPTER_TYPES.DEXS,
			dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME,
			chainMetadata,
			includeChartData: false
		})

		expect(fetchJsonMock).not.toHaveBeenCalled()
		expect(data.chartData).toEqual({ dimensions: ['timestamp'], source: [] })
		expect(data.chains).toEqual([
			expect.objectContaining({
				name: 'Ethereum',
				total24h: 100,
				total7d: 700,
				total30d: 3000
			})
		])
	})

	it('builds the chart data shape used by the page', async () => {
		fetchJsonMock.mockResolvedValue([
			[2, { Ethereum: 20 }],
			[1, { Ethereum: 10, Optimism: 5 }]
		])

		const chartData = await getChainsByAdapterChartData({
			adapterType: ADAPTER_TYPES.DEXS,
			dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME,
			allChains: ['Ethereum', 'Optimism']
		})

		expect(chartData).toEqual({
			dimensions: ['timestamp', 'Ethereum', 'Optimism'],
			source: [
				{ timestamp: 1000, Ethereum: 10, Optimism: 5 },
				{ timestamp: 2000, Ethereum: 20, Optimism: null }
			]
		})
	})

	it('throws chart fetch failures by default so API routes do not cache empty charts', async () => {
		fetchJsonMock.mockRejectedValue(new Error('upstream failed'))

		await expect(
			getChainsByAdapterChartData({
				adapterType: ADAPTER_TYPES.DEXS,
				dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME,
				allChains: ['Ethereum']
			})
		).rejects.toThrow('upstream failed')
	})

	it('can explicitly tolerate chart fetch failures for static page generation', async () => {
		fetchJsonMock.mockRejectedValue(new Error('upstream failed'))

		const chartData = await getChainsByAdapterChartData({
			adapterType: ADAPTER_TYPES.DEXS,
			dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME,
			allChains: ['Ethereum'],
			allowEmptyOnError: true
		})

		expect(chartData).toEqual({
			dimensions: ['timestamp', 'Ethereum'],
			source: []
		})
	})
})
