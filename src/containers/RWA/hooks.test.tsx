import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IRWAAssetsOverview, IRWAInitialChartDatasetRow } from './api.types'
import { normalizeRwaAssetGroup } from './assetGroup'
import type { RWAChartAggregationMode } from './chartAggregation'
import {
	getRwaAssetChartQueryKey,
	getRwaOpenInterestChartQueryKey,
	hasActiveChartFilters,
	resolveRWAOverviewInclusionFlag,
	useRWAAssetCategoryPieChartData,
	useFilteredRwaAssets,
	useRwaAssetGroupPieChartData,
	useRwaChartDataset
} from './hooks'

const useQueryMock = vi.fn()
const fetchJsonMock = vi.fn()

vi.mock('@tanstack/react-query', () => ({
	useQuery: (options: unknown) => useQueryMock(options)
}))

vi.mock('~/utils/async', () => ({
	fetchJson: (...args: unknown[]) => fetchJsonMock(...args)
}))

function createSpotAsset(
	overrides: Partial<Extract<IRWAAssetsOverview['assets'][number], { kind: 'spot' }>> = {}
): Extract<IRWAAssetsOverview['assets'][number], { kind: 'spot' }> {
	return {
		id: '1',
		kind: 'spot',
		detailHref: '/rwa/asset/ondo%2Fusdy',
		canonicalMarketId: 'ondo/usdy',
		ticker: 'AAA',
		assetName: 'Alpha',
		primaryChain: null,
		chain: null,
		price: null,
		openInterest: null,
		volume24h: null,
		volume30d: null,
		assetGroup: null,
		parentPlatform: null,
		category: null,
		assetClass: null,
		accessModel: null,
		type: null,
		rwaClassification: null,
		issuer: null,
		redeemable: null,
		attestations: null,
		cexListed: null,
		kycForMintRedeem: null,
		kycAllowlistedWhitelistedToTransferHold: null,
		transferable: null,
		selfCustody: null,
		stablecoin: null,
		governance: null,
		trueRWA: false,
		onChainMcap: null,
		activeMcap: null,
		defiActiveTvl: null,
		...overrides
	}
}

function createPerpsAsset(
	overrides: Partial<Extract<IRWAAssetsOverview['assets'][number], { kind: 'perps' }>> = {}
): Extract<IRWAAssetsOverview['assets'][number], { kind: 'perps' }> {
	return {
		id: 'perps-1',
		kind: 'perps',
		detailHref: '/rwa/perps/contract/xyz%3Aalpha',
		contract: 'xyz:alpha',
		ticker: 'xyz:alpha',
		assetName: 'Alpha Perp',
		primaryChain: null,
		chain: null,
		price: 1,
		openInterest: 1,
		volume24h: 2,
		volume30d: 3,
		assetGroup: null,
		parentPlatform: null,
		category: null,
		assetClass: null,
		accessModel: null,
		type: 'Perp',
		rwaClassification: null,
		issuer: null,
		redeemable: null,
		attestations: null,
		cexListed: null,
		kycForMintRedeem: null,
		kycAllowlistedWhitelistedToTransferHold: null,
		transferable: null,
		selfCustody: null,
		stablecoin: null,
		governance: null,
		trueRWA: false,
		onChainMcap: null,
		activeMcap: null,
		defiActiveTvl: null,
		...overrides
	}
}

const assets: IRWAAssetsOverview['assets'] = [
	createSpotAsset({ id: '1', category: ['Treasuries'], parentPlatform: 'Centrifuge' }),
	createSpotAsset({
		id: '2',
		canonicalMarketId: 'superstate/ustb',
		detailHref: '/rwa/asset/superstate%2Fustb',
		ticker: 'BBB',
		assetName: 'Beta',
		category: ['Private Credit'],
		parentPlatform: 'Maple'
	})
]

function DatasetProbe({
	mode,
	chartAssets = assets,
	initialDataset = { source: [], dimensions: ['timestamp'] },
	initialOpenInterestDataset = null,
	selectedMetric = 'onChainMcap',
	includeStablecoins = false,
	includeGovernance = false,
	includeRwaPerps = false,
	useInitialDataset = false
}: {
	mode: RWAChartAggregationMode
	chartAssets?: IRWAAssetsOverview['assets']
	initialDataset?: { source: IRWAInitialChartDatasetRow[]; dimensions: string[] }
	initialOpenInterestDataset?: { source: IRWAInitialChartDatasetRow[]; dimensions: string[] } | null
	selectedMetric?: 'onChainMcap' | 'activeMcap' | 'defiActiveTvl'
	includeStablecoins?: boolean
	includeGovernance?: boolean
	includeRwaPerps?: boolean
	useInitialDataset?: boolean
}) {
	const { chartDataset } = useRwaChartDataset({
		selectedMetric,
		initialDataset,
		initialOpenInterestDataset,
		filteredAssets: chartAssets,
		mode,
		target: { kind: 'all' },
		includeStablecoins,
		includeGovernance,
		includeRwaPerps,
		useInitialDataset
	})

	return React.createElement('pre', null, chartDataset.dimensions.join('|'))
}

function AssetGroupProbe({ enabled, chartAssets }: { enabled: boolean; chartAssets: IRWAAssetsOverview['assets'] }) {
	const result = useRwaAssetGroupPieChartData({ enabled, assets: chartAssets })
	return React.createElement('script', {
		type: 'application/json',
		dangerouslySetInnerHTML: { __html: JSON.stringify(result) }
	})
}

function CategoryProbe({
	enabled,
	chartAssets,
	categories,
	selectedCategories
}: {
	enabled: boolean
	chartAssets: IRWAAssetsOverview['assets']
	categories: string[]
	selectedCategories: string[]
}) {
	const result = useRWAAssetCategoryPieChartData({
		enabled,
		assets: chartAssets,
		categories,
		selectedCategories
	})
	return React.createElement('script', {
		type: 'application/json',
		dangerouslySetInnerHTML: { __html: JSON.stringify(result) }
	})
}

function FilteredAssetsProbe({
	chartAssets,
	includeRwaPerps
}: {
	chartAssets: IRWAAssetsOverview['assets']
	includeRwaPerps: boolean
}) {
	const selectedCategories = Array.from(new Set(chartAssets.flatMap((asset) => asset.category ?? [])))
	const selectedPlatforms = Array.from(
		new Set(
			chartAssets.flatMap((asset) => {
				const platformRaw = asset.parentPlatform as unknown
				const platformCandidates = Array.isArray(platformRaw) ? platformRaw : [platformRaw]

				return platformCandidates.filter(
					(platform): platform is string => typeof platform === 'string' && platform.length > 0
				)
			})
		)
	)
	const selectedAssetGroups = Array.from(new Set(chartAssets.map((asset) => normalizeRwaAssetGroup(asset.assetGroup))))
	const selectedIssuers = Array.from(new Set(chartAssets.map((asset) => asset.issuer || 'Unknown')))

	const result = useFilteredRwaAssets({
		assets: chartAssets,
		isPlatformMode: false,
		selectedAssetNames: [],
		selectedTypes: ['Unknown', 'Perp'],
		selectedCategories,
		selectedPlatforms,
		selectedAssetGroups,
		selectedAssetClasses: [],
		selectedRwaClassifications: [],
		selectedAccessModels: [],
		selectedIssuers,
		selectedRedeemableStates: ['yes', 'no', 'unknown'],
		selectedAttestationsStates: ['yes', 'no', 'unknown'],
		selectedCexListedStates: ['yes', 'no', 'unknown'],
		selectedKycForMintRedeemStates: ['yes', 'no', 'unknown'],
		selectedKycAllowlistedWhitelistedToTransferHoldStates: ['yes', 'no', 'unknown'],
		selectedTransferableStates: ['yes', 'no', 'unknown'],
		selectedSelfCustodyStates: ['yes', 'no', 'unknown'],
		includeStablecoins: true,
		includeGovernance: true,
		includeRwaPerps,
		minDefiActiveTvlToOnChainMcapPct: null,
		maxDefiActiveTvlToOnChainMcapPct: null,
		minActiveMcapToOnChainMcapPct: null,
		maxActiveMcapToOnChainMcapPct: null,
		minDefiActiveTvlToActiveMcapPct: null,
		maxDefiActiveTvlToActiveMcapPct: null
	})

	return React.createElement('script', {
		type: 'application/json',
		dangerouslySetInnerHTML: {
			__html: JSON.stringify({
				kinds: result.filteredAssets.map((asset) => asset.kind),
				totalOpenInterest: result.totalOpenInterest
			})
		}
	})
}

function readJsonMarkup(markup: string) {
	const match = markup.match(/<script type="application\/json">([\s\S]*)<\/script>/)
	expect(match?.[1]).toBeTruthy()
	return JSON.parse(match![1])
}

describe('useRwaChartDataset', () => {
	beforeEach(() => {
		useQueryMock.mockReset()
		fetchJsonMock.mockReset()
		useQueryMock.mockImplementation((options: { queryKey: unknown[] }) => {
			if (options.queryKey[0] === 'rwa-perps-open-interest-chart') {
				return {
					data: {
						source: [{ timestamp: 1, 'xyz:alpha': 20, 'xyz:beta': 10 }],
						dimensions: ['timestamp', 'xyz:alpha', 'xyz:beta']
					},
					isLoading: false,
					error: null
				}
			}

			return {
				data: [{ timestamp: 1, 'ondo/usdy': 100, 'superstate/ustb': 80 }],
				isLoading: false,
				error: null
			}
		})
		fetchJsonMock.mockResolvedValue([{ timestamp: 1, 'ondo/usdy': 100, 'superstate/ustb': 80 }])
	})

	it('regroups cached ticker rows without changing the fetch key', () => {
		const categoryMarkup = renderToStaticMarkup(React.createElement(DatasetProbe, { mode: 'category' }))
		const platformMarkup = renderToStaticMarkup(React.createElement(DatasetProbe, { mode: 'platform' }))
		const totalMarkup = renderToStaticMarkup(React.createElement(DatasetProbe, { mode: 'total' }))

		expect(categoryMarkup).toContain('timestamp|Total Onchain Mcap|Treasuries|Private Credit')
		expect(platformMarkup).toContain('timestamp|Total Onchain Mcap|Centrifuge|Maple')
		expect(totalMarkup).toContain('timestamp|Total Onchain Mcap')
		expect(useQueryMock).toHaveBeenCalledTimes(6)
		expect(useQueryMock.mock.calls[0][0]).toMatchObject({
			queryKey: getRwaAssetChartQueryKey({ kind: 'all' }, 'onChainMcap', false, false)
		})
		expect(useQueryMock.mock.calls[1][0]).toMatchObject({
			queryKey: getRwaOpenInterestChartQueryKey(),
			enabled: false
		})
		expect(useQueryMock.mock.calls[2][0]).toMatchObject({
			queryKey: getRwaAssetChartQueryKey({ kind: 'all' }, 'onChainMcap', false, false)
		})
	})

	it('changes the fetch key when inclusion flags change', () => {
		renderToStaticMarkup(React.createElement(DatasetProbe, { mode: 'category', includeStablecoins: false }))
		renderToStaticMarkup(React.createElement(DatasetProbe, { mode: 'category', includeStablecoins: true }))

		expect(useQueryMock.mock.calls[0][0]).toMatchObject({
			queryKey: getRwaAssetChartQueryKey({ kind: 'all' }, 'onChainMcap', false, false)
		})
		expect(useQueryMock.mock.calls[1][0]).toMatchObject({
			queryKey: getRwaOpenInterestChartQueryKey(),
			enabled: false
		})
		expect(useQueryMock.mock.calls[2][0]).toMatchObject({
			queryKey: getRwaAssetChartQueryKey({ kind: 'all' }, 'onChainMcap', true, false)
		})
	})

	it('uses the primary category when regrouping category chart rows', () => {
		const multiCategoryAssets: IRWAAssetsOverview['assets'] = [
			createSpotAsset({
				category: ['Treasuries', 'Private Credit'],
				parentPlatform: 'Centrifuge'
			})
		]

		useQueryMock.mockReturnValueOnce({
			data: [{ timestamp: 1, 'ondo/usdy': 100 }],
			isLoading: false,
			error: null
		})

		const markup = renderToStaticMarkup(
			React.createElement(DatasetProbe, { mode: 'category', chartAssets: multiCategoryAssets })
		)

		expect(markup).toContain('timestamp|Total Onchain Mcap|Treasuries')
		expect(markup).not.toContain('Private Credit')
	})

	it('passes the resolved inclusion flags to the asset-breakdown fetcher', async () => {
		let capturedOptions: { queryFn: () => Promise<unknown> } | undefined
		useQueryMock.mockImplementation((options: { queryKey: unknown[]; queryFn: () => Promise<unknown> }) => {
			if (options.queryKey[0] === 'rwa-asset-chart') {
				capturedOptions = options
			}
			return {
				data: undefined,
				isLoading: false,
				error: null
			}
		})

		renderToStaticMarkup(
			React.createElement(DatasetProbe, {
				mode: 'category',
				includeStablecoins: true,
				includeGovernance: false
			})
		)

		await capturedOptions?.queryFn()

		expect(fetchJsonMock).toHaveBeenCalledWith(
			'/api/rwa/asset-breakdown?key=onChainMcap&includeStablecoin=true&includeGovernance=false'
		)
	})

	it('returns the prerendered dataset when runtime fetching is disabled', () => {
		useQueryMock.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: null
		})

		const markup = renderToStaticMarkup(
			React.createElement(DatasetProbe, {
				mode: 'category',
				initialDataset: {
					source: [{ timestamp: 1, Prerendered: 100, Total: 100 }],
					dimensions: ['timestamp', 'Prerendered']
				},
				useInitialDataset: true
			})
		)

		expect(markup).toContain('timestamp|Total Onchain Mcap|Prerendered')
		expect(useQueryMock).toHaveBeenCalledTimes(2)
		expect(useQueryMock.mock.calls[0][0]).toMatchObject({
			queryKey: getRwaAssetChartQueryKey({ kind: 'all' }, 'onChainMcap', false, false),
			enabled: false
		})
		expect(useQueryMock.mock.calls[1][0]).toMatchObject({
			queryKey: getRwaOpenInterestChartQueryKey(),
			enabled: false
		})
	})

	it('uses the prerendered RWA Perps OI dataset without runtime fetching in the default state', () => {
		useQueryMock.mockImplementation((options: { queryKey: unknown[] }) => ({
			data: undefined,
			isLoading: false,
			error: null,
			queryKey: options.queryKey
		}))

		const markup = renderToStaticMarkup(
			React.createElement(DatasetProbe, {
				mode: 'category',
				chartAssets: [createSpotAsset(), createPerpsAsset()],
				initialDataset: {
					source: [{ timestamp: 1, Treasuries: 100, Total: 100 }],
					dimensions: ['timestamp', 'Treasuries']
				},
				initialOpenInterestDataset: {
					source: [{ timestamp: 1, 'RWA Perps OI': 25 }],
					dimensions: ['timestamp', 'RWA Perps OI']
				},
				selectedMetric: 'activeMcap',
				includeRwaPerps: true,
				useInitialDataset: true
			})
		)

		expect(markup).toContain('timestamp|Total Active Mcap|Treasuries|RWA Perps OI')
		expect(useQueryMock).toHaveBeenCalledTimes(2)
		expect(useQueryMock.mock.calls[0][0]).toMatchObject({
			queryKey: getRwaAssetChartQueryKey({ kind: 'all' }, 'activeMcap', false, false),
			enabled: false
		})
		expect(useQueryMock.mock.calls[1][0]).toMatchObject({
			queryKey: getRwaOpenInterestChartQueryKey(),
			enabled: false
		})
	})

	it('reuses the prerendered dataset for Total by projecting the hidden Total column', () => {
		useQueryMock.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: null
		})

		const markup = renderToStaticMarkup(
			React.createElement(DatasetProbe, {
				mode: 'total',
				initialDataset: {
					source: [{ timestamp: 1, Treasuries: 100, Total: 100 }],
					dimensions: ['timestamp', 'Treasuries']
				},
				useInitialDataset: true
			})
		)

		expect(markup).toContain('timestamp|Total Onchain Mcap')
		expect(useQueryMock).toHaveBeenCalledTimes(2)
		expect(useQueryMock.mock.calls[0][0]).toMatchObject({
			queryKey: getRwaAssetChartQueryKey({ kind: 'all' }, 'onChainMcap', false, false),
			enabled: false
		})
		expect(useQueryMock.mock.calls[1][0]).toMatchObject({
			queryKey: getRwaOpenInterestChartQueryKey(),
			enabled: false
		})
	})

	it('overlays filtered RWA Perps OI on the selected chart metric', () => {
		const markup = renderToStaticMarkup(
			React.createElement(DatasetProbe, {
				mode: 'category',
				chartAssets: [
					createSpotAsset({
						onChainMcap: { total: 100, breakdown: [] },
						category: ['Treasuries'],
						parentPlatform: 'Centrifuge'
					}),
					createPerpsAsset({ contract: 'xyz:alpha', category: ['Treasuries'], parentPlatform: 'Centrifuge' })
				],
				selectedMetric: 'defiActiveTvl',
				includeRwaPerps: true
			})
		)

		expect(markup).toContain('timestamp|Total DeFi Active TVL|Treasuries|RWA Perps OI')
		expect(useQueryMock.mock.calls[0][0]).toMatchObject({
			queryKey: getRwaAssetChartQueryKey({ kind: 'all' }, 'defiActiveTvl', false, false),
			enabled: true
		})
		expect(useQueryMock.mock.calls[1][0]).toMatchObject({
			queryKey: getRwaOpenInterestChartQueryKey(),
			enabled: true
		})
	})
})

describe('resolveRWAOverviewInclusionFlag', () => {
	it('uses the page default when the query param is absent', () => {
		expect(resolveRWAOverviewInclusionFlag(undefined, true)).toBe(true)
		expect(resolveRWAOverviewInclusionFlag(undefined, false)).toBe(false)
	})

	it('lets an explicit false query override a true page default', () => {
		expect(resolveRWAOverviewInclusionFlag('false', true)).toBe(false)
		expect(resolveRWAOverviewInclusionFlag('true', false)).toBe(true)
	})
})

describe('hasActiveChartFilters', () => {
	it('ignores inclusion params that resolve to the current defaults', () => {
		expect(hasActiveChartFilters({ includeStablecoins: 'true' }, 'category', 'rwa-yield-wrapper')).toBe(false)
		expect(hasActiveChartFilters({ includeGovernance: 'true' }, 'category', 'rwa-yield-wrapper')).toBe(false)
		expect(hasActiveChartFilters({ includeStablecoins: 'false' }, 'chain', null)).toBe(false)
		expect(hasActiveChartFilters({ includeRwaPerps: 'false' }, 'chain', null)).toBe(false)
	})

	it('treats inclusion params as active when they override the current defaults', () => {
		expect(hasActiveChartFilters({ includeStablecoins: 'false' }, 'category', 'rwa-yield-wrapper')).toBe(true)
		expect(hasActiveChartFilters({ includeGovernance: 'false' }, 'category', 'rwa-yield-wrapper')).toBe(true)
		expect(hasActiveChartFilters({ includeStablecoins: 'true' }, 'chain', null)).toBe(true)
	})

	it('still treats non-inclusion query filters as active', () => {
		expect(hasActiveChartFilters({ minActiveMcapToOnChainMcapPct: '10' }, 'category', 'rwa-yield-wrapper')).toBe(true)
	})
})

describe('useFilteredRwaAssets', () => {
	it('filters perps rows when the RWA Perps toggle is disabled', () => {
		const chartAssets: IRWAAssetsOverview['assets'] = [
			createSpotAsset({ onChainMcap: { total: 100, breakdown: [] } }),
			createPerpsAsset()
		]

		expect(
			readJsonMarkup(
				renderToStaticMarkup(React.createElement(FilteredAssetsProbe, { chartAssets, includeRwaPerps: true }))
			)
		).toEqual({ kinds: ['spot', 'perps'], totalOpenInterest: 1 })
		expect(
			readJsonMarkup(
				renderToStaticMarkup(React.createElement(FilteredAssetsProbe, { chartAssets, includeRwaPerps: false }))
			)
		).toEqual({ kinds: ['spot'], totalOpenInterest: 0 })
	})
})

describe('useRwaAssetGroupPieChartData', () => {
	it('groups assets by normalized asset group and keeps Unknown', () => {
		const chartAssets: IRWAAssetsOverview['assets'] = [
			createSpotAsset({
				assetGroup: 'Stablecoins',
				category: ['Treasuries'],
				parentPlatform: 'Centrifuge',
				onChainMcap: { total: 100, breakdown: [] },
				activeMcap: { total: 90, breakdown: [] },
				defiActiveTvl: { total: 30, breakdown: [] }
			}),
			createSpotAsset({
				id: '2',
				canonicalMarketId: 'superstate/ustb',
				detailHref: '/rwa/asset/superstate%2Fustb',
				ticker: 'BBB',
				assetName: 'Beta',
				category: ['Private Credit'],
				parentPlatform: 'Maple',
				onChainMcap: { total: 50, breakdown: [] },
				activeMcap: { total: 20, breakdown: [] },
				defiActiveTvl: { total: 10, breakdown: [] }
			})
		]

		const data = readJsonMarkup(
			renderToStaticMarkup(React.createElement(AssetGroupProbe, { enabled: true, chartAssets }))
		)
		expect(data.assetGroupOnChainMcapPieChartData).toEqual([
			{ name: 'Stablecoins', value: 100 },
			{ name: 'Unknown', value: 50 }
		])
		expect(data.assetGroupActiveMcapPieChartData).toEqual([
			{ name: 'Stablecoins', value: 90 },
			{ name: 'Unknown', value: 20 }
		])
		expect(data.assetGroupDefiActiveTvlPieChartData).toEqual([
			{ name: 'Stablecoins', value: 30 },
			{ name: 'Unknown', value: 10 }
		])
	})

	it('returns empty data when disabled', () => {
		const data = readJsonMarkup(
			renderToStaticMarkup(React.createElement(AssetGroupProbe, { enabled: false, chartAssets: assets }))
		)
		expect(data.assetGroupOnChainMcapPieChartData).toEqual([])
		expect(data.assetGroupActiveMcapPieChartData).toEqual([])
		expect(data.assetGroupDefiActiveTvlPieChartData).toEqual([])
	})
})

describe('useRWAAssetCategoryPieChartData', () => {
	it('attributes category totals only to the primary category', () => {
		const chartAssets: IRWAAssetsOverview['assets'] = [
			createSpotAsset({
				category: ['Treasuries', 'Private Credit'],
				parentPlatform: 'Centrifuge',
				onChainMcap: { total: 100, breakdown: [] },
				activeMcap: { total: 90, breakdown: [] },
				defiActiveTvl: { total: 30, breakdown: [] }
			})
		]

		const data = readJsonMarkup(
			renderToStaticMarkup(
				React.createElement(CategoryProbe, {
					enabled: true,
					chartAssets,
					categories: ['Treasuries', 'Private Credit'],
					selectedCategories: ['Treasuries', 'Private Credit']
				})
			)
		)

		expect(data.assetCategoryOnChainMcapPieChartData).toEqual([{ name: 'Treasuries', value: 100 }])
		expect(data.assetCategoryActiveMcapPieChartData).toEqual([{ name: 'Treasuries', value: 90 }])
		expect(data.assetCategoryDefiActiveTvlPieChartData).toEqual([{ name: 'Treasuries', value: 30 }])
	})
})
