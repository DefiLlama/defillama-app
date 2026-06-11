import type { NextApiRequest } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

const {
	fetchAdapterChainChartDataMock,
	fetchAdapterProtocolChartDataMock,
	resolveChainParamMock,
	resolveProtocolParamMock,
	fetchChainAssetsChartMock,
	getBridgeOverviewPageDataMock,
	fetchRaisesMock,
	getStablecoinOverviewChartSeriesMock,
	getProtocolUnlockUsdChartMock
} = vi.hoisted(() => ({
	fetchAdapterChainChartDataMock: vi.fn(),
	fetchAdapterProtocolChartDataMock: vi.fn(),
	resolveChainParamMock: vi.fn(),
	resolveProtocolParamMock: vi.fn(),
	fetchChainAssetsChartMock: vi.fn(),
	getBridgeOverviewPageDataMock: vi.fn(),
	fetchRaisesMock: vi.fn(),
	getStablecoinOverviewChartSeriesMock: vi.fn(),
	getProtocolUnlockUsdChartMock: vi.fn()
}))

vi.mock('~/containers/BridgedTVL/api', () => ({
	fetchChainAssetsChart: fetchChainAssetsChartMock
}))

vi.mock('~/containers/Bridges/queries.server', () => ({
	getBridgeOverviewPageData: getBridgeOverviewPageDataMock
}))

vi.mock('~/containers/AdapterMetrics/api', () => ({
	fetchAdapterChainChartData: fetchAdapterChainChartDataMock,
	fetchAdapterProtocolChartData: fetchAdapterProtocolChartDataMock
}))

vi.mock('~/containers/Raises/api', () => ({
	fetchRaises: fetchRaisesMock
}))

vi.mock('~/containers/Stablecoins/queries.server', () => ({
	getStablecoinOverviewChartSeries: getStablecoinOverviewChartSeriesMock
}))

vi.mock('~/containers/Unlocks/queries', () => ({
	getProtocolUnlockUsdChart: getProtocolUnlockUsdChartMock
}))

vi.mock('~/server/routeCache/protocols', () => ({
	resolveProtocolParam: resolveProtocolParamMock
}))

vi.mock('~/server/routeCache/chains', () => ({
	resolveChainParam: resolveChainParamMock
}))

import handler from '~/pages/api/public/charts/chain'

beforeEach(() => {
	vi.clearAllMocks()
	fetchAdapterChainChartDataMock.mockResolvedValue([])
	fetchAdapterProtocolChartDataMock.mockResolvedValue([])
	fetchChainAssetsChartMock.mockResolvedValue([])
	resolveChainParamMock.mockResolvedValue(null)
	resolveProtocolParamMock.mockResolvedValue({ canonicalSlug: 'aave', id: '1', metadata: { displayName: 'Aave' } })
})

describe('/api/public/charts/chain', () => {
	it('canonicalizes adapter protocol chart requests before fetching', async () => {
		const req = {
			method: 'GET',
			query: { kind: 'adapter-protocol', adapterType: 'fees', protocol: 'Aave V3' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(fetchAdapterProtocolChartDataMock).toHaveBeenCalledWith({ adapterType: 'fees', protocol: 'aave' })
		expect(res.status).toHaveBeenCalledWith(200)
	})

	it('does not fetch adapter protocol charts for unknown protocols', async () => {
		resolveProtocolParamMock.mockResolvedValue(null)
		resolveChainParamMock.mockResolvedValue(null)
		const req = {
			method: 'GET',
			query: { kind: 'adapter-protocol', adapterType: 'fees', protocol: 'missing' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(fetchAdapterProtocolChartDataMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(404)
		expect(res.json).toHaveBeenCalledWith({ error: 'protocol not found' })
	})

	it('allows chain-level fees through adapter protocol chart requests', async () => {
		resolveProtocolParamMock.mockResolvedValue(null)
		resolveChainParamMock.mockResolvedValue({
			canonicalName: 'Hyperliquid L1',
			canonicalSlug: 'hyperliquid-l1',
			metadata: { name: 'Hyperliquid L1', chainFees: true }
		})
		const req = {
			method: 'GET',
			query: { kind: 'adapter-protocol', entity: 'chain', adapterType: 'fees', protocol: 'hyperliquid-l1' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(resolveProtocolParamMock).not.toHaveBeenCalled()
		expect(fetchAdapterProtocolChartDataMock).toHaveBeenCalledWith({
			adapterType: 'fees',
			protocol: 'Hyperliquid L1'
		})
		expect(res.status).toHaveBeenCalledWith(200)
	})

	it('allows chain-level revenue through adapter protocol chart requests', async () => {
		resolveProtocolParamMock.mockResolvedValue(null)
		resolveChainParamMock.mockResolvedValue({
			canonicalName: 'Sui',
			canonicalSlug: 'sui',
			metadata: { name: 'Sui', chainRevenue: true }
		})
		const req = {
			method: 'GET',
			query: {
				kind: 'adapter-protocol',
				entity: 'chain',
				adapterType: 'fees',
				protocol: 'Sui',
				dataType: 'dailyRevenue'
			}
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(resolveProtocolParamMock).not.toHaveBeenCalled()
		expect(fetchAdapterProtocolChartDataMock).toHaveBeenCalledWith({
			adapterType: 'fees',
			protocol: 'Sui',
			dataType: 'dailyRevenue'
		})
		expect(res.status).toHaveBeenCalledWith(200)
	})

	it('does not fetch chain-level fees when the chain metadata flag is missing', async () => {
		resolveProtocolParamMock.mockResolvedValue(null)
		resolveChainParamMock.mockResolvedValue({
			canonicalName: 'Base',
			canonicalSlug: 'base',
			metadata: { name: 'Base' }
		})
		const req = {
			method: 'GET',
			query: { kind: 'adapter-protocol', entity: 'chain', adapterType: 'fees', protocol: 'Base' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(fetchAdapterProtocolChartDataMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(404)
		expect(res.json).toHaveBeenCalledWith({ error: 'protocol not found' })
	})

	it('does not use chain fallback for explicit protocol adapter protocol chart requests', async () => {
		resolveProtocolParamMock.mockResolvedValue(null)
		resolveChainParamMock.mockResolvedValue({
			canonicalName: 'Base',
			canonicalSlug: 'base',
			metadata: { name: 'Base', chainFees: true }
		})
		const req = {
			method: 'GET',
			query: { kind: 'adapter-protocol', entity: 'protocol', adapterType: 'fees', protocol: 'Base' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(resolveChainParamMock).not.toHaveBeenCalled()
		expect(fetchAdapterProtocolChartDataMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(404)
		expect(res.json).toHaveBeenCalledWith({ error: 'protocol not found' })
	})

	it('does not use chain fallback for non-chain-level adapter protocol chart requests', async () => {
		resolveProtocolParamMock.mockResolvedValue(null)
		resolveChainParamMock.mockResolvedValue({
			canonicalName: 'Base',
			canonicalSlug: 'base',
			metadata: { name: 'Base', chainFees: true }
		})
		const req = {
			method: 'GET',
			query: {
				kind: 'adapter-protocol',
				entity: 'chain',
				adapterType: 'fees',
				protocol: 'Base',
				dataType: 'dailyAppFees'
			}
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(resolveChainParamMock).not.toHaveBeenCalled()
		expect(fetchAdapterProtocolChartDataMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(404)
		expect(res.json).toHaveBeenCalledWith({ error: 'protocol not found' })
	})

	it('does not use chain fallback for all-chain adapter protocol chart requests', async () => {
		resolveProtocolParamMock.mockResolvedValue(null)
		const req = {
			method: 'GET',
			query: { kind: 'adapter-protocol', entity: 'chain', adapterType: 'fees', protocol: 'All' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(resolveChainParamMock).not.toHaveBeenCalled()
		expect(fetchAdapterProtocolChartDataMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(404)
		expect(res.json).toHaveBeenCalledWith({ error: 'protocol not found' })
	})

	const chainNativeProtocolRows = [
		{ label: 'Chain Fees', metadataFlag: 'chainFees', dataType: undefined },
		{ label: 'Chain Revenue', metadataFlag: 'chainRevenue', dataType: 'dailyRevenue' }
	] as const

	it.each(chainNativeProtocolRows)(
		'accepts $label as adapter-protocol entity=chain only with its metadata flag',
		async (row) => {
			resolveProtocolParamMock.mockResolvedValue(null)
			resolveChainParamMock.mockResolvedValue({
				canonicalName: 'Base',
				canonicalSlug: 'base',
				metadata: { name: 'Base', [row.metadataFlag]: true }
			})
			const req = {
				method: 'GET',
				query: {
					kind: 'adapter-protocol',
					entity: 'chain',
					adapterType: 'fees',
					protocol: 'Base',
					...(row.dataType ? { dataType: row.dataType } : null)
				}
			} as unknown as NextApiRequest
			const res = createMockNextApiResponse()

			await handler(req, res)

			expect(resolveProtocolParamMock).not.toHaveBeenCalled()
			expect(fetchAdapterProtocolChartDataMock).toHaveBeenCalledWith({
				adapterType: 'fees',
				protocol: 'Base',
				...(row.dataType ? { dataType: row.dataType } : null)
			})
			expect(res.status).toHaveBeenCalledWith(200)
		}
	)

	it.each(chainNativeProtocolRows)(
		'rejects $label as adapter-protocol entity=chain when its metadata flag is missing',
		async (row) => {
			resolveProtocolParamMock.mockResolvedValue(null)
			resolveChainParamMock.mockResolvedValue({
				canonicalName: 'Base',
				canonicalSlug: 'base',
				metadata: { name: 'Base' }
			})
			const req = {
				method: 'GET',
				query: {
					kind: 'adapter-protocol',
					entity: 'chain',
					adapterType: 'fees',
					protocol: 'Base',
					...(row.dataType ? { dataType: row.dataType } : null)
				}
			} as unknown as NextApiRequest
			const res = createMockNextApiResponse()

			await handler(req, res)

			expect(fetchAdapterProtocolChartDataMock).not.toHaveBeenCalled()
			expect(res.status).toHaveBeenCalledWith(404)
			expect(res.json).toHaveBeenCalledWith({ error: 'protocol not found' })
		}
	)

	const chainNativeFeeExtraRows = [
		{ label: 'Bribes Revenue', dataType: 'dailyBribesRevenue' },
		{ label: 'Token Tax', dataType: 'dailyTokenTaxes' }
	] as const

	it.each(chainNativeFeeExtraRows)(
		'accepts $label as adapter-protocol entity=chain when the chain has fee/revenue metadata',
		async (row) => {
			resolveProtocolParamMock.mockResolvedValue(null)
			resolveChainParamMock.mockResolvedValue({
				canonicalName: 'Base',
				canonicalSlug: 'base',
				metadata: { name: 'Base', chainFees: true }
			})
			const req = {
				method: 'GET',
				query: {
					kind: 'adapter-protocol',
					entity: 'chain',
					adapterType: 'fees',
					protocol: 'Base',
					dataType: row.dataType
				}
			} as unknown as NextApiRequest
			const res = createMockNextApiResponse()

			await handler(req, res)

			expect(resolveProtocolParamMock).not.toHaveBeenCalled()
			expect(fetchAdapterProtocolChartDataMock).toHaveBeenCalledWith({
				adapterType: 'fees',
				protocol: 'Base',
				dataType: row.dataType
			})
			expect(res.status).toHaveBeenCalledWith(200)
		}
	)

	it.each(chainNativeFeeExtraRows)(
		'rejects $label as adapter-protocol entity=chain when fee/revenue metadata is missing',
		async (row) => {
			resolveProtocolParamMock.mockResolvedValue(null)
			resolveChainParamMock.mockResolvedValue({
				canonicalName: 'Base',
				canonicalSlug: 'base',
				metadata: { name: 'Base' }
			})
			const req = {
				method: 'GET',
				query: {
					kind: 'adapter-protocol',
					entity: 'chain',
					adapterType: 'fees',
					protocol: 'Base',
					dataType: row.dataType
				}
			} as unknown as NextApiRequest
			const res = createMockNextApiResponse()

			await handler(req, res)

			expect(fetchAdapterProtocolChartDataMock).not.toHaveBeenCalled()
			expect(res.status).toHaveBeenCalledWith(404)
			expect(res.json).toHaveBeenCalledWith({ error: 'protocol not found' })
		}
	)

	it.each(chainNativeFeeExtraRows)('rejects all-chain $label adapter-protocol entity=chain requests', async (row) => {
		resolveProtocolParamMock.mockResolvedValue(null)
		const req = {
			method: 'GET',
			query: {
				kind: 'adapter-protocol',
				entity: 'chain',
				adapterType: 'fees',
				protocol: 'All',
				dataType: row.dataType
			}
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(resolveChainParamMock).not.toHaveBeenCalled()
		expect(fetchAdapterProtocolChartDataMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(404)
		expect(res.json).toHaveBeenCalledWith({ error: 'protocol not found' })
	})

	it.each(chainNativeProtocolRows)('does not use chain fallback for explicit protocol $label requests', async (row) => {
		resolveProtocolParamMock.mockResolvedValue(null)
		resolveChainParamMock.mockResolvedValue({
			canonicalName: 'Base',
			canonicalSlug: 'base',
			metadata: { name: 'Base', [row.metadataFlag]: true }
		})
		const req = {
			method: 'GET',
			query: {
				kind: 'adapter-protocol',
				entity: 'protocol',
				adapterType: 'fees',
				protocol: 'Base',
				...(row.dataType ? { dataType: row.dataType } : null)
			}
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(resolveChainParamMock).not.toHaveBeenCalled()
		expect(fetchAdapterProtocolChartDataMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(404)
		expect(res.json).toHaveBeenCalledWith({ error: 'protocol not found' })
	})

	it.each(chainNativeProtocolRows)('keeps legacy omitted-entity fallback for $label only', async (row) => {
		resolveProtocolParamMock.mockResolvedValue(null)
		resolveChainParamMock.mockResolvedValue({
			canonicalName: 'Base',
			canonicalSlug: 'base',
			metadata: { name: 'Base', [row.metadataFlag]: true }
		})
		const req = {
			method: 'GET',
			query: {
				kind: 'adapter-protocol',
				adapterType: 'fees',
				protocol: 'Base',
				...(row.dataType ? { dataType: row.dataType } : null)
			}
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(fetchAdapterProtocolChartDataMock).toHaveBeenCalledWith({
			adapterType: 'fees',
			protocol: 'Base',
			...(row.dataType ? { dataType: row.dataType } : null)
		})
		expect(res.status).toHaveBeenCalledWith(200)
	})

	const appProtocolRows = [
		{ label: 'App Fees', dataType: 'dailyAppFees' },
		{ label: 'App Revenue', dataType: 'dailyAppRevenue' }
	] as const

	it.each(appProtocolRows)('does not accept $label through adapter-protocol entity=chain', async (row) => {
		resolveProtocolParamMock.mockResolvedValue(null)
		resolveChainParamMock.mockResolvedValue({
			canonicalName: 'Base',
			canonicalSlug: 'base',
			metadata: { name: 'Base', chainFees: true, chainRevenue: true }
		})
		const req = {
			method: 'GET',
			query: {
				kind: 'adapter-protocol',
				entity: 'chain',
				adapterType: 'fees',
				protocol: 'Base',
				dataType: row.dataType
			}
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(resolveChainParamMock).not.toHaveBeenCalled()
		expect(fetchAdapterProtocolChartDataMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(404)
		expect(res.json).toHaveBeenCalledWith({ error: 'protocol not found' })
	})

	it.each(appProtocolRows)('does not use legacy omitted-entity chain fallback for $label', async (row) => {
		resolveProtocolParamMock.mockResolvedValue(null)
		resolveChainParamMock.mockResolvedValue({
			canonicalName: 'Base',
			canonicalSlug: 'base',
			metadata: { name: 'Base', chainFees: true, chainRevenue: true }
		})
		const req = {
			method: 'GET',
			query: {
				kind: 'adapter-protocol',
				adapterType: 'fees',
				protocol: 'Base',
				dataType: row.dataType
			}
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(resolveChainParamMock).not.toHaveBeenCalled()
		expect(fetchAdapterProtocolChartDataMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(404)
		expect(res.json).toHaveBeenCalledWith({ error: 'protocol not found' })
	})

	it('accepts Bridged TVL chart requests only for chainAssets chains', async () => {
		resolveChainParamMock.mockResolvedValue({
			canonicalName: 'Hyperliquid L1',
			canonicalSlug: 'hyperliquid-l1',
			metadata: { name: 'Hyperliquid L1', chainAssets: true }
		})
		fetchChainAssetsChartMock.mockResolvedValue([{ timestamp: 1_700_000_000, data: { total: '100' } }])
		const req = {
			method: 'GET',
			query: { kind: 'bridged-tvl', chain: 'hyperliquid-l1' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(fetchChainAssetsChartMock).toHaveBeenCalledWith('hyperliquid-l1')
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith([{ timestamp: 1_700_000_000, data: { total: '100' } }])
	})

	it('does not fetch Bridged TVL charts when chainAssets metadata is missing', async () => {
		resolveChainParamMock.mockResolvedValue({
			canonicalName: 'Base',
			canonicalSlug: 'base',
			metadata: { name: 'Base' }
		})
		const req = {
			method: 'GET',
			query: { kind: 'bridged-tvl', chain: 'base' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(fetchChainAssetsChartMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(404)
		expect(res.json).toHaveBeenCalledWith({ error: 'chain not found' })
	})

	it('rejects all-chain Bridged TVL chart requests', async () => {
		const req = {
			method: 'GET',
			query: { kind: 'bridged-tvl', chain: 'all' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(resolveChainParamMock).not.toHaveBeenCalled()
		expect(fetchChainAssetsChartMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(404)
		expect(res.json).toHaveBeenCalledWith({ error: 'chain not found' })
	})

	it('returns null when Bridged TVL historical data is unavailable upstream', async () => {
		resolveChainParamMock.mockResolvedValue({
			canonicalName: 'Base',
			canonicalSlug: 'base',
			metadata: { name: 'Base', chainAssets: true }
		})
		fetchChainAssetsChartMock.mockRejectedValue(new Error('missing chart'))
		const req = {
			method: 'GET',
			query: { kind: 'bridged-tvl', chain: 'base' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(fetchChainAssetsChartMock).toHaveBeenCalledWith('base')
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith(null)
	})

	it('accepts lowercase all for adapter chain charts', async () => {
		const req = {
			method: 'GET',
			query: { kind: 'adapter-chain', adapterType: 'fees', chain: 'all' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(fetchAdapterChainChartDataMock).toHaveBeenCalledWith({ adapterType: 'fees', chain: 'All' })
		expect(res.status).toHaveBeenCalledWith(200)
	})
})
