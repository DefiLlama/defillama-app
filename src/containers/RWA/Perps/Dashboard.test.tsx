import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildRWAPerpsTimeSeriesCharts, RWAPerpsDashboard } from './Dashboard'

let routerQuery: Record<string, string> = {}
let lastTableWithSearchProps: any = null

vi.mock('next/router', () => ({
	useRouter: () => ({
		query: routerQuery,
		pathname: '/rwa/perps'
	})
}))

let queryState: { data: any; isLoading: boolean; error: any } = {
	data: null,
	isLoading: false,
	error: null
}

vi.mock('@tanstack/react-query', () => ({
	useQuery: () => queryState
}))

vi.mock('~/components/Select/Select', () => ({
	Select: ({ label }: { label: string }) => <div>{label}</div>
}))

vi.mock('~/components/ButtonStyled/ChartExportButtons', () => ({
	ChartExportButtons: () => <div>exports</div>
}))

vi.mock('~/components/Table/TableWithSearch', () => ({
	TableWithSearch: (props: any) => {
		lastTableWithSearchProps = props
		return <div>table</div>
	}
}))

vi.mock('~/components/RowLinksWithDropdown', () => ({
	RowLinksWithDropdown: () => <div>links</div>
}))

vi.mock('~/hooks/useGetChartInstance', () => ({
	useGetChartInstance: () => ({
		chartInstance: () => null,
		handleChartReady: () => {}
	})
}))

vi.mock('~/components/ECharts/PieChart', () => ({
	default: () => <div>pie</div>
}))

vi.mock('~/components/ECharts/HBarChart', () => ({
	default: () => <div>hbar</div>
}))

vi.mock('~/components/ECharts/TreemapChart', () => ({
	default: () => <div>treemap</div>
}))

vi.mock('~/components/ECharts/MultiSeriesChart2', () => ({
	default: () => <div>timeseries</div>
}))

const overviewData = {
	markets: [
		{
			id: 'xyz:meta',
			timestamp: 1775011512,
			contract: 'xyz:META',
			venue: 'xyz',
			openInterest: 100,
			volume24h: 50,
			price: 500,
			priceChange24h: 5,
			fundingRate: 0.00001,
			premium: 0.0002,
			cumulativeFunding: 10,
			referenceAsset: 'Meta',
			referenceAssetGroup: 'Equities',
			assetClass: ['Stock Perp'],
			parentPlatform: 'trade[XYZ]',
			pair: '',
			marginAsset: 'USDC',
			settlementAsset: 'USDC',
			category: ['RWA Perps'],
			issuer: 'XYZ',
			website: ['https://trade.xyz/'],
			oracleProvider: 'Pyth equity feed',
			description: 'Perpetual market',
			accessModel: 'Permissionless',
			rwaClassification: 'Programmable Finance',
			makerFeeRate: 0.0002,
			takerFeeRate: 0.0005,
			deployerFeeShare: 0.5,
			oraclePx: 501,
			midPx: 500.5,
			prevDayPx: 480,
			maxLeverage: 10,
			szDecimals: 2,
			volume7d: 300,
			volume30d: 1000,
			volumeAllTime: 5000,
			estimatedProtocolFees24h: 1,
			estimatedProtocolFees7d: 3,
			estimatedProtocolFees30d: 10,
			estimatedProtocolFeesAllTime: 50
		}
	],
	initialChartDataset: { source: [], dimensions: ['timestamp'] },
	totals: {
		openInterest: 100,
		openInterestChange24h: 25,
		volume24h: 50,
		volume24hChange24h: -10,
		markets: 1,
		protocolFees24h: 1,
		cumulativeFunding: 10
	}
}

const venueData = {
	venue: 'xyz',
	markets: overviewData.markets,
	initialChartDataset: overviewData.initialChartDataset,
	venueLinks: [{ label: 'All', to: '/rwa/perps/venues' }],
	totals: {
		openInterest: 100,
		openInterestChange24h: 25,
		volume24h: 50,
		volume24hChange24h: -10,
		markets: 1,
		protocolFees24h: 1
	}
}

const assetGroupData = {
	assetGroup: 'Equities',
	markets: overviewData.markets,
	initialChartDataset: overviewData.initialChartDataset,
	assetGroupLinks: [{ label: 'All', to: '/rwa/perps/asset-groups' }],
	totals: {
		openInterest: 100,
		openInterestChange24h: 25,
		volume24h: 50,
		volume24hChange24h: -10,
		markets: 1,
		protocolFees24h: 1
	}
}

describe('RWAPerpsDashboard treemap controls', () => {
	beforeEach(() => {
		routerQuery = {}
		lastTableWithSearchProps = null
		queryState = {
			data: null,
			isLoading: false,
			error: null
		}
	})

	it('shows treemap parent and nested-grouping controls plus reset in treemap view', () => {
		routerQuery = { chartView: 'treemap' }
		const html = renderToStaticMarkup(<RWAPerpsDashboard mode="overview" data={overviewData} />)

		expect(html).toContain('Asset Group')
		expect(html).toContain('Nested by: Base Asset')
		expect(html).toContain('reset')
	})

	it('shows treemap by default when no chart view is provided', () => {
		const html = renderToStaticMarkup(<RWAPerpsDashboard mode="overview" data={overviewData} />)

		expect(html).toContain('Asset Group')
		expect(html).toContain('Nested by: Base Asset')
		expect(html).toContain('reset')
	})

	it('hides the treemap nested-grouping selector when parent grouping is Contract', () => {
		routerQuery = { chartView: 'treemap', nonTimeSeriesChartBreakdown: 'contract' }
		const html = renderToStaticMarkup(<RWAPerpsDashboard mode="overview" data={overviewData} />)

		expect(html).toContain('Contract')
		expect(html).not.toContain('Nested by:')
		expect(html).toContain('reset')
	})

	it('shows the treemap nested-grouping selector when parent grouping is Base Asset', () => {
		routerQuery = { chartView: 'treemap', nonTimeSeriesChartBreakdown: 'baseAsset' }
		const html = renderToStaticMarkup(<RWAPerpsDashboard mode="overview" data={overviewData} />)

		expect(html).toContain('Base Asset')
		expect(html).toContain('Nested by: Contract')
		expect(html).toContain('reset')
	})

	it('shows asset-group treemap controls with a base-asset nested default', () => {
		routerQuery = { chartView: 'treemap', nonTimeSeriesChartBreakdown: 'assetGroup' }
		const html = renderToStaticMarkup(<RWAPerpsDashboard mode="overview" data={overviewData} />)

		expect(html).toContain('Asset Group')
		expect(html).toContain('Nested by: Base Asset')
		expect(html).toContain('reset')
	})

	it('keeps the no-grouping treemap state selectable for Base Asset breakdowns', () => {
		routerQuery = {
			chartView: 'treemap',
			nonTimeSeriesChartBreakdown: 'baseAsset',
			treemapNestedBy: 'none'
		}
		const html = renderToStaticMarkup(<RWAPerpsDashboard mode="overview" data={overviewData} />)

		expect(html).toContain('Base Asset')
		expect(html).toContain('Nested by: No Grouping')
		expect(html).toContain('reset')
	})

	it('shows parent grouping but hides treemap-only controls outside treemap view', () => {
		routerQuery = { chartView: 'pie' }
		const html = renderToStaticMarkup(<RWAPerpsDashboard mode="overview" data={overviewData} />)

		expect(html).toContain('Asset Group')
		expect(html).not.toContain('Nested by:')
		expect(html).not.toContain('reset')
	})

	it('keeps the requested overview table column order', () => {
		renderToStaticMarkup(<RWAPerpsDashboard mode="overview" data={overviewData} />)

		expect(lastTableWithSearchProps.columns.slice(0, 5).map((column: any) => column.header)).toEqual([
			'Contract',
			'Venue',
			'Base Asset',
			'Asset Group',
			'Asset Class'
		])
	})

	it('keeps the requested venue table column order', () => {
		renderToStaticMarkup(<RWAPerpsDashboard mode="venue" data={venueData} />)

		expect(lastTableWithSearchProps.columns.slice(0, 4).map((column: any) => column.header)).toEqual([
			'Contract',
			'Base Asset',
			'Asset Group',
			'Asset Class'
		])
	})

	it('shows asset-group detail tables with the venue column restored', () => {
		renderToStaticMarkup(<RWAPerpsDashboard mode="assetGroup" data={assetGroupData} />)

		expect(lastTableWithSearchProps.columns.slice(0, 4).map((column: any) => column.header)).toEqual([
			'Contract',
			'Venue',
			'Base Asset',
			'Asset Class'
		])
	})

	it('shows an explicit empty state when time-series data only has a single timestamp', () => {
		routerQuery = {
			chartView: 'timeSeries',
			timeSeriesChartBreakdown: 'assetClass'
		}
		queryState = {
			data: {
				source: [{ timestamp: 1774483200000, 'Stock Perp': 100 }],
				dimensions: ['timestamp', 'Stock Perp']
			},
			isLoading: false,
			error: null
		}

		const html = renderToStaticMarkup(<RWAPerpsDashboard mode="overview" data={overviewData} />)

		expect(html).toContain('Only a single snapshot is available')
		expect(html).not.toContain('timeseries')
	})

	it('renders fetched default time-series data when no server-preloaded dataset is available', () => {
		routerQuery = { chartView: 'timeSeries' }
		queryState = {
			data: {
				source: [
					{ timestamp: 1774483200000, Meta: 100 },
					{ timestamp: 1774569600000, Meta: 120 }
				],
				dimensions: ['timestamp', 'Meta']
			},
			isLoading: false,
			error: null
		}

		const html = renderToStaticMarkup(<RWAPerpsDashboard mode="overview" data={overviewData} />)

		expect(html).not.toContain('Only a single snapshot is available')
		expect(html).toContain('min-h-[360px]')
	})

	it('renders the time-series metric switch labels from metric option names', () => {
		routerQuery = { chartView: 'timeSeries' }
		const html = renderToStaticMarkup(<RWAPerpsDashboard mode="overview" data={overviewData} />)

		expect(html).toContain('Open Interest')
		expect(html).toContain('Volume')
		expect(html).toContain('Markets')
		expect(html).toContain('Total')
		expect(html).not.toContain('Grouped')
		expect(html).not.toContain('Breakdown')
	})

	it('renders the selected time-series breakdown label when selected', () => {
		routerQuery = {
			chartView: 'timeSeries',
			timeSeriesChartBreakdown: 'baseAsset',
			timeSeriesMode: 'breakdown'
		}

		const html = renderToStaticMarkup(<RWAPerpsDashboard mode="overview" data={overviewData} />)

		expect(html).toContain('Base Asset')
	})

	it('builds bar-series configs for time-series volume', () => {
		expect(
			buildRWAPerpsTimeSeriesCharts({
				metric: 'volume24h',
				dimensions: ['timestamp', 'Meta', 'NVIDIA'],
				timeSeriesMode: 'breakdown'
			})
		).toMatchObject([
			{ name: 'Meta', type: 'bar', encode: { x: 'timestamp', y: 'Meta' }, color: expect.any(String) },
			{ name: 'NVIDIA', type: 'bar', encode: { x: 'timestamp', y: 'NVIDIA' }, color: expect.any(String) }
		])
	})

	it('does not enable point markers on overview line-series configs', () => {
		expect(
			buildRWAPerpsTimeSeriesCharts({
				metric: 'openInterest',
				dimensions: ['timestamp', 'Meta'],
				timeSeriesMode: 'breakdown'
			})
		).toMatchObject([{ name: 'Meta', type: 'line', encode: { x: 'timestamp', y: 'Meta' }, color: expect.any(String) }])
		expect(
			buildRWAPerpsTimeSeriesCharts({
				metric: 'openInterest',
				dimensions: ['timestamp', 'Meta'],
				timeSeriesMode: 'breakdown'
			})[0]
		).not.toHaveProperty('showSymbol')
		expect(
			buildRWAPerpsTimeSeriesCharts({
				metric: 'openInterest',
				dimensions: ['timestamp', 'Meta'],
				timeSeriesMode: 'breakdown'
			})[0]
		).not.toHaveProperty('stack')
	})

	it('builds a grouped time-series series for total mode', () => {
		expect(
			buildRWAPerpsTimeSeriesCharts({
				metric: 'openInterest',
				dimensions: ['timestamp', 'Total'],
				timeSeriesMode: 'grouped'
			})
		).toEqual([
			{
				name: 'Total',
				type: 'line',
				encode: { x: 'timestamp', y: 'Total' },
				color: expect.any(String)
			}
		])
	})

	it('renders 24h changes inline on the overview open interest and volume cards', () => {
		const html = renderToStaticMarkup(<RWAPerpsDashboard mode="overview" data={overviewData} />)

		expect(html).toContain('+25.00%')
		expect(html).toContain('-10.00%')
	})

	it('renders 24h open interest and volume changes on venue stat cards', () => {
		const html = renderToStaticMarkup(<RWAPerpsDashboard mode="venue" data={venueData} />)

		expect(html).toContain('+25.00%')
		expect(html).toContain('-10.00%')
	})
})
