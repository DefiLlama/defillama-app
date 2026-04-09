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
			assetClass: ['Single stock synthetic perp'],
			parentPlatform: 'trade[XYZ]',
			pair: '',
			marginAsset: 'USDC',
			settlementAsset: 'USDC',
			category: ['RWA Perpetuals'],
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
		volume24h: 50,
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

	it('shows an explicit empty state when time-series data only has a single timestamp', () => {
		routerQuery = {
			chartView: 'timeSeries',
			timeSeriesChartBreakdown: 'assetClass'
		}
		queryState = {
			data: {
				source: [{ timestamp: 1774483200000, 'Single stock synthetic perp': 100 }],
				dimensions: ['timestamp', 'Single stock synthetic perp']
			},
			isLoading: false,
			error: null
		}

		const html = renderToStaticMarkup(<RWAPerpsDashboard mode="overview" data={overviewData} />)

		expect(html).toContain('Only a single snapshot is available')
		expect(html).not.toContain('timeseries')
	})

	it('renders the time-series metric switch labels from metric option names', () => {
		const html = renderToStaticMarkup(<RWAPerpsDashboard mode="overview" data={overviewData} />)

		expect(html).toContain('Open Interest')
		expect(html).toContain('Volume')
		expect(html).toContain('Markets')
	})

	it('builds bar-series configs for time-series volume', () => {
		expect(
			buildRWAPerpsTimeSeriesCharts({
				metric: 'volume24h',
				dimensions: ['timestamp', 'Meta', 'NVIDIA']
			})
		).toMatchObject([
			{ name: 'Meta', type: 'bar', stack: 'A' },
			{ name: 'NVIDIA', type: 'bar', stack: 'A' }
		])
	})

	it('does not enable point markers on overview line-series configs', () => {
		expect(
			buildRWAPerpsTimeSeriesCharts({
				metric: 'openInterest',
				dimensions: ['timestamp', 'Meta']
			})
		).toMatchObject([{ name: 'Meta', type: 'line', stack: 'A' }])
		expect(
			buildRWAPerpsTimeSeriesCharts({
				metric: 'openInterest',
				dimensions: ['timestamp', 'Meta']
			})[0]
		).not.toHaveProperty('showSymbol')
	})

	it('renders 24h changes inline on the overview open interest and volume cards', () => {
		const html = renderToStaticMarkup(<RWAPerpsDashboard mode="overview" data={overviewData} />)

		expect(html).toContain('+25.00%')
		expect(html).toContain('-10.00%')
	})

	it('does not render overview delta text on venue stat cards', () => {
		const html = renderToStaticMarkup(<RWAPerpsDashboard mode="venue" data={venueData} />)

		expect(html).not.toContain('+25.00%')
		expect(html).not.toContain('-10.00%')
	})
})
