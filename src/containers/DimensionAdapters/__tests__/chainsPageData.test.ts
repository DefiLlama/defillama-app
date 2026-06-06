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

import {
	getAdapterByChainPageData,
	getChainsByAdapterChartData,
	getChainsByAdapterPageData,
	getChainsByFeesAdapterPageData
} from '../queries'

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

const feeRevenueChainMetadata = {
	base: {
		id: 'base',
		name: 'Base',
		fees: true,
		revenue: true,
		chainFees: true
	},
	sui: {
		id: 'sui',
		name: 'Sui',
		fees: true,
		revenue: true,
		chainRevenue: true
	},
	appOnly: {
		id: 'app-only',
		name: 'App Only',
		fees: true,
		revenue: true
	}
}

function mockFeesAdapterMetrics() {
	fetchJsonMock.mockImplementation((url: string) => {
		const dataType = new URL(url).searchParams.get('dataType')

		if (dataType === ADAPTER_DATA_TYPES.DAILY_BRIBES_REVENUE) {
			return Promise.resolve({
				protocols: [
					{ name: 'Base', slug: 'base', protocolType: 'chain', total24h: 500, total7d: 3500, total30d: 15_000 },
					{ name: 'Sui', slug: 'sui', protocolType: 'chain', total24h: 600, total7d: 4200, total30d: 18_000 }
				]
			})
		}

		if (dataType === ADAPTER_DATA_TYPES.DAILY_TOKEN_TAXES) {
			return Promise.resolve({
				protocols: [
					{ name: 'Base', slug: 'base', protocolType: 'chain', total24h: 50, total7d: 350, total30d: 1500 },
					{ name: 'Sui', slug: 'sui', protocolType: 'chain', total24h: 60, total7d: 420, total30d: 1800 }
				]
			})
		}

		return Promise.resolve({
			protocols: [
				{ name: 'Base', slug: 'base', protocolType: 'chain', total24h: 100, total7d: 700, total30d: 3000 },
				{ name: 'Sui', slug: 'sui', protocolType: 'chain', total24h: 200, total7d: 1400, total30d: 6000 },
				{ name: 'App Only', slug: 'app-only', protocolType: 'chain', total24h: 300, total7d: 2100, total30d: 9000 },
				{ name: 'Protocol Row', slug: 'protocol-row', protocolType: 'protocol', total24h: 400 }
			]
		})
	})
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

	it('uses chainFees metadata to qualify Chain Fees rankings without summing bribes or token taxes into totals', async () => {
		mockFeesAdapterMetrics()

		const data = await getChainsByFeesAdapterPageData({
			adapterType: ADAPTER_TYPES.FEES,
			dataType: ADAPTER_DATA_TYPES.DAILY_FEES,
			chainMetadata: feeRevenueChainMetadata
		})

		expect(data.chains).toHaveLength(1)
		expect(data.allChains).toEqual(['Base'])
		expect(data.chains[0]).toMatchObject({
			name: 'Base',
			total24h: 100,
			total7d: 700,
			total30d: 3000,
			bribes: { total24h: 500, total7d: 3500, total30d: 15_000 },
			tokenTax: { total24h: 50, total7d: 350, total30d: 1500 }
		})
	})

	it('uses chainRevenue metadata to qualify Chain Revenue rankings and excludes app-only chains', async () => {
		mockFeesAdapterMetrics()

		const data = await getChainsByFeesAdapterPageData({
			adapterType: ADAPTER_TYPES.FEES,
			dataType: ADAPTER_DATA_TYPES.DAILY_REVENUE,
			chainMetadata: feeRevenueChainMetadata
		})

		expect(data.chains).toHaveLength(1)
		expect(data.allChains).toEqual(['Sui'])
		expect(data.chains[0]).toMatchObject({
			name: 'Sui',
			total24h: 200,
			total7d: 1400,
			total30d: 6000
		})
		expect(data.chains.map((chain) => chain.name)).not.toContain('App Only')
	})
})
