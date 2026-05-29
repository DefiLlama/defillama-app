import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '../constants'

const { fetchJsonMock, fetchProtocolsMock } = vi.hoisted(() => ({
	fetchJsonMock: vi.fn(),
	fetchProtocolsMock: vi.fn()
}))

vi.mock('~/utils/async', () => ({
	fetchJson: fetchJsonMock
}))

vi.mock('~/containers/Protocols/api', () => ({
	fetchProtocols: fetchProtocolsMock
}))

import { getAdapterByChainPageData, getChainsByAdapterChartData, getChainsByAdapterPageData } from '../queries'

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
		fetchProtocolsMock.mockReset()
		fetchProtocolsMock.mockResolvedValue({ protocols: [], parentProtocols: [] })
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

	it('keeps main DEX chain page fetch failures loud', async () => {
		fetchJsonMock.mockRejectedValue(new Error('backend contract failed'))

		await expect(
			getAdapterByChainPageData({
				adapterType: ADAPTER_TYPES.DEXS,
				chain: 'Litecoin',
				route: 'dexs',
				metricName: 'DEX Volume'
			})
		).rejects.toThrow('backend contract failed')
	})
})
