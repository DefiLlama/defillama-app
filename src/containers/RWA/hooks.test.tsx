import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IRWAAssetsOverview } from './api.types'
import type { RWAChartAggregationMode } from './chartAggregation'
import {
	getRwaTickerChartQueryKey,
	hasActiveChartFilters,
	resolveRWAOverviewInclusionFlag,
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

const assets: IRWAAssetsOverview['assets'] = [
	{
		id: '1',
		ticker: 'AAA',
		assetName: 'Alpha',
		category: ['Treasuries'],
		parentPlatform: 'Centrifuge',
		trueRWA: false,
		onChainMcap: null,
		activeMcap: null,
		defiActiveTvl: null
	},
	{
		id: '2',
		ticker: 'BBB',
		assetName: 'Beta',
		category: ['Private Credit'],
		parentPlatform: 'Maple',
		trueRWA: false,
		onChainMcap: null,
		activeMcap: null,
		defiActiveTvl: null
	}
]

function DatasetProbe({
	mode,
	initialDataset = { source: [], dimensions: ['timestamp'] },
	includeStablecoins = false,
	includeGovernance = false,
	useInitialDataset = false
}: {
	mode: RWAChartAggregationMode
	initialDataset?: { source: Array<{ timestamp: number }>; dimensions: string[] }
	includeStablecoins?: boolean
	includeGovernance?: boolean
	useInitialDataset?: boolean
}) {
	const { chartDataset } = useRwaChartDataset({
		selectedMetric: 'onChainMcap',
		initialDataset,
		filteredAssets: assets,
		mode,
		target: { kind: 'all' },
		includeStablecoins,
		includeGovernance,
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

function readJsonMarkup(markup: string) {
	const match = markup.match(/<script type="application\/json">([\s\S]*)<\/script>/)
	expect(match?.[1]).toBeTruthy()
	return JSON.parse(match![1])
}

describe('useRwaChartDataset', () => {
	beforeEach(() => {
		useQueryMock.mockReset()
		fetchJsonMock.mockReset()
		useQueryMock.mockReturnValue({
			data: [{ timestamp: 1, AAA: 100, BBB: 80 }],
			isLoading: false,
			error: null
		})
		fetchJsonMock.mockResolvedValue([{ timestamp: 1, AAA: 100, BBB: 80 }])
	})

	it('regroups cached ticker rows without changing the fetch key', () => {
		const categoryMarkup = renderToStaticMarkup(React.createElement(DatasetProbe, { mode: 'category' }))
		const platformMarkup = renderToStaticMarkup(React.createElement(DatasetProbe, { mode: 'platform' }))

		expect(categoryMarkup).toContain('timestamp|Treasuries|Private Credit')
		expect(platformMarkup).toContain('timestamp|Centrifuge|Maple')
		expect(useQueryMock).toHaveBeenCalledTimes(2)
		expect(useQueryMock.mock.calls[0][0]).toMatchObject({
			queryKey: getRwaTickerChartQueryKey({ kind: 'all' }, 'onChainMcap', false, false)
		})
		expect(useQueryMock.mock.calls[1][0]).toMatchObject({
			queryKey: getRwaTickerChartQueryKey({ kind: 'all' }, 'onChainMcap', false, false)
		})
	})

	it('changes the fetch key when inclusion flags change', () => {
		renderToStaticMarkup(React.createElement(DatasetProbe, { mode: 'category', includeStablecoins: false }))
		renderToStaticMarkup(React.createElement(DatasetProbe, { mode: 'category', includeStablecoins: true }))

		expect(useQueryMock.mock.calls[0][0]).toMatchObject({
			queryKey: getRwaTickerChartQueryKey({ kind: 'all' }, 'onChainMcap', false, false)
		})
		expect(useQueryMock.mock.calls[1][0]).toMatchObject({
			queryKey: getRwaTickerChartQueryKey({ kind: 'all' }, 'onChainMcap', true, false)
		})
	})

	it('passes the resolved inclusion flags to the ticker-breakdown fetcher', async () => {
		let capturedOptions: { queryFn: () => Promise<unknown> } | undefined
		useQueryMock.mockImplementation((options: { queryFn: () => Promise<unknown> }) => {
			capturedOptions = options
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
			'/api/rwa/ticker-breakdown?key=onChainMcap&includeStablecoin=true&includeGovernance=false'
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
					source: [{ timestamp: 1 }],
					dimensions: ['timestamp', 'Prerendered']
				},
				useInitialDataset: true
			})
		)

		expect(markup).toContain('timestamp|Prerendered')
		expect(useQueryMock).toHaveBeenCalledTimes(1)
		expect(useQueryMock.mock.calls[0][0]).toMatchObject({
			queryKey: getRwaTickerChartQueryKey({ kind: 'all' }, 'onChainMcap', false, false),
			enabled: false
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

describe('useRwaAssetGroupPieChartData', () => {
	it('groups assets by normalized asset group and keeps Unknown', () => {
		const chartAssets: IRWAAssetsOverview['assets'] = [
			{
				id: '1',
				ticker: 'AAA',
				assetName: 'Alpha',
				assetGroup: 'Stablecoins',
				category: ['Treasuries'],
				parentPlatform: 'Centrifuge',
				trueRWA: false,
				onChainMcap: { total: 100, breakdown: [] },
				activeMcap: { total: 90, breakdown: [] },
				defiActiveTvl: { total: 30, breakdown: [] }
			},
			{
				id: '2',
				ticker: 'BBB',
				assetName: 'Beta',
				assetGroup: null,
				category: ['Private Credit'],
				parentPlatform: 'Maple',
				trueRWA: false,
				onChainMcap: { total: 50, breakdown: [] },
				activeMcap: { total: 20, breakdown: [] },
				defiActiveTvl: { total: 10, breakdown: [] }
			}
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
