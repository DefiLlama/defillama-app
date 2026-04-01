import { useQuery } from '@tanstack/react-query'
import { createColumnHelper, type VisibilityState } from '@tanstack/react-table'
import { useRouter } from 'next/router'
import { lazy, Suspense, useDeferredValue, useMemo } from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { ChartRestoreButton } from '~/components/ButtonStyled/ChartRestoreButton'
import type {
	IHBarChartProps,
	IMultiSeriesChart2Props,
	IPieChartProps,
	ITreemapChartProps,
	MultiSeriesChart2Dataset
} from '~/components/ECharts/types'
import { preparePieChartData } from '~/components/ECharts/utils'
import { BasicLink } from '~/components/Link'
import { LoadingDots } from '~/components/Loaders'
import { PercentChange } from '~/components/PercentChange'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { Select } from '~/components/Select/Select'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { CHART_COLORS } from '~/constants/colors'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { formattedNum } from '~/utils'
import { fetchJson } from '~/utils/async'
import { getErrorMessage } from '~/utils/error'
import { pushShallowQuery } from '~/utils/routerQuery'
import {
	getDefaultRWAPerpsChartBreakdown,
	getRWAPerpsBreakdownLabel,
	getRWAPerpsChartBreakdownOptions,
	getRWAPerpsChartBreakdownQueryValue,
	getRWAPerpsChartMetricLabel,
	getRWAPerpsChartMetricOptions,
	getRWAPerpsChartMetricQueryValue,
	getRWAPerpsTreemapNestedByLabel,
	getRWAPerpsTreemapNestedByOptions,
	getRWAPerpsTreemapNestedByQueryValue,
	getRWAPerpsChartViewOptions,
	getRWAPerpsChartViewQueryValue,
	parseRWAPerpsChartState,
	setRWAPerpsChartBreakdown,
	setRWAPerpsTreemapNestedBy,
	setRWAPerpsChartView
} from './chartState'
import {
	buildRWAPerpsOverviewSnapshotBreakdownTotals,
	buildRWAPerpsVenueSnapshotBreakdownTotals,
	hasEnoughTimeSeriesHistory
} from './queries'
import { buildRWAPerpsTreemapTreeData } from './treemap'
import type {
	IRWAPerpsOverviewBreakdownRequest,
	IRWAPerpsOverviewPageData,
	IRWAPerpsVenueBreakdownRequest,
	IRWAPerpsVenuePageData,
	RWAPerpsOverviewNonTimeSeriesBreakdown,
	RWAPerpsOverviewTreemapBreakdown,
	RWAPerpsVenueNonTimeSeriesBreakdown,
	RWAPerpsVenueTreemapBreakdown
} from './types'

const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const MultiSeriesChart2 = lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>
const HBarChart = lazy(() => import('~/components/ECharts/HBarChart')) as React.FC<IHBarChartProps>
const TreemapChart = lazy(() => import('~/components/ECharts/TreemapChart')) as React.FC<ITreemapChartProps>

const EMPTY_DATASET: MultiSeriesChart2Dataset = { source: [], dimensions: ['timestamp'] }
const PIE_CHART_RADIUS = ['50%', '70%'] as [string, string]
const MAX_HORIZONTAL_BARS = 9

type RWAPerpsDashboardProps =
	| {
			mode: 'overview'
			data: IRWAPerpsOverviewPageData
	  }
	| {
			mode: 'venue'
			data: IRWAPerpsVenuePageData
	  }

const overviewColumnHelper = createColumnHelper<IRWAPerpsOverviewPageData['markets'][number]>()
const venueColumnHelper = createColumnHelper<IRWAPerpsVenuePageData['markets'][number]>()

const overviewColumns = [
	overviewColumnHelper.accessor((row) => row.coin, {
		id: 'coin',
		header: 'Coin',
		enableSorting: false,
		cell: (info) => (
			<span className="flex items-center gap-2">
				<span className="vf-row-index shrink-0" aria-hidden="true" />
				<BasicLink
					href={`/rwa/perps/coin/${encodeURIComponent(info.row.original.coin)}`}
					className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
				>
					{info.row.original.coin}
				</BasicLink>
			</span>
		),
		size: 220
	}),
	overviewColumnHelper.accessor((row) => row.referenceAsset ?? '', {
		id: 'referenceAsset',
		header: 'Ref Asset',
		enableSorting: false,
		size: 180
	}),
	overviewColumnHelper.accessor((row) => row.venue, {
		id: 'venue',
		header: 'Venue',
		cell: (info) => (
			<BasicLink
				href={`/rwa/perps/venue/${encodeURIComponent(info.getValue())}`}
				className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
			>
				{info.getValue()}
			</BasicLink>
		),
		size: 120
	}),
	overviewColumnHelper.accessor((row) => row.category.join(', '), {
		id: 'category',
		header: 'Category',
		enableSorting: false,
		size: 180
	}),
	overviewColumnHelper.accessor((row) => row.assetClass, {
		id: 'assetClass',
		header: 'Asset Class',
		enableSorting: false,
		size: 220
	}),
	overviewColumnHelper.accessor((row) => row.openInterest, {
		id: 'openInterest',
		header: 'Open Interest',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 160
	}),
	overviewColumnHelper.accessor((row) => row.volume24h, {
		id: 'volume24h',
		header: '24h Volume',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 160
	}),
	overviewColumnHelper.accessor((row) => row.price, {
		id: 'price',
		header: 'Price',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 120
	}),
	overviewColumnHelper.accessor((row) => row.priceChange24h, {
		id: 'priceChange24h',
		header: '24h Change',
		cell: (info) => <PercentChange percent={info.getValue()} />,
		meta: { align: 'end' },
		size: 130
	}),
	overviewColumnHelper.accessor((row) => row.fundingRate * 100, {
		id: 'fundingRate',
		header: 'Funding Rate',
		cell: (info) => `${formattedNum(info.getValue(), false)}%`,
		meta: { align: 'end' },
		size: 130
	}),
	overviewColumnHelper.accessor((row) => row.premium * 100, {
		id: 'premium',
		header: 'Premium',
		cell: (info) => `${formattedNum(info.getValue(), false)}%`,
		meta: { align: 'end' },
		size: 120
	}),
	overviewColumnHelper.accessor((row) => row.maxLeverage, {
		id: 'maxLeverage',
		header: 'Max Leverage',
		cell: (info) => `${formattedNum(info.getValue(), false)}x`,
		meta: { align: 'end' },
		size: 120
	}),
	overviewColumnHelper.accessor((row) => row.parentPlatform, {
		id: 'parentPlatform',
		header: 'Parent Platform',
		enableSorting: false,
		size: 180
	}),
	overviewColumnHelper.accessor((row) => row.issuer ?? '', {
		id: 'issuer',
		header: 'Issuer',
		enableSorting: false,
		size: 120
	}),
	overviewColumnHelper.accessor((row) => row.oracleProvider ?? '', {
		id: 'oracleProvider',
		header: 'Oracle Provider',
		enableSorting: false,
		size: 240
	}),
	overviewColumnHelper.accessor((row) => row.rwaClassification ?? '', {
		id: 'rwaClassification',
		header: 'RWA Classification',
		enableSorting: false,
		size: 180
	}),
	overviewColumnHelper.accessor((row) => row.accessModel ?? '', {
		id: 'accessModel',
		header: 'Access Model',
		enableSorting: false,
		size: 150
	}),
	overviewColumnHelper.accessor((row) => row.makerFeeRate * 100, {
		id: 'makerFeeRate',
		header: 'Maker Fee',
		cell: (info) => `${formattedNum(info.getValue(), false)}%`,
		meta: { align: 'end' },
		size: 120
	}),
	overviewColumnHelper.accessor((row) => row.takerFeeRate * 100, {
		id: 'takerFeeRate',
		header: 'Taker Fee',
		cell: (info) => `${formattedNum(info.getValue(), false)}%`,
		meta: { align: 'end' },
		size: 120
	}),
	overviewColumnHelper.accessor((row) => (row.deployerFeeShare == null ? null : row.deployerFeeShare * 100), {
		id: 'deployerFeeShare',
		header: 'Deployer Fee Share',
		cell: (info) => (info.getValue() == null ? '-' : `${formattedNum(info.getValue(), false)}%`),
		meta: { align: 'end' },
		size: 170
	}),
	overviewColumnHelper.accessor((row) => row.cumulativeFunding, {
		id: 'cumulativeFunding',
		header: 'Cumulative Funding',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 170
	}),
	overviewColumnHelper.accessor((row) => row.oraclePx, {
		id: 'oraclePx',
		header: 'Oracle Px',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 120
	}),
	overviewColumnHelper.accessor((row) => row.midPx, {
		id: 'midPx',
		header: 'Mid Px',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 120
	}),
	overviewColumnHelper.accessor((row) => row.prevDayPx, {
		id: 'prevDayPx',
		header: 'Prev Day Px',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 130
	}),
	overviewColumnHelper.accessor((row) => row.volume7d, {
		id: 'volume7d',
		header: 'Volume 7d',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 140
	}),
	overviewColumnHelper.accessor((row) => row.volume30d, {
		id: 'volume30d',
		header: 'Volume 30d',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 150
	}),
	overviewColumnHelper.accessor((row) => row.volumeAllTime, {
		id: 'volumeAllTime',
		header: 'Volume All Time',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 170
	}),
	overviewColumnHelper.accessor((row) => row.estimatedProtocolFees24h, {
		id: 'estimatedProtocolFees24h',
		header: 'Protocol Fees 24h',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 170
	}),
	overviewColumnHelper.accessor((row) => row.estimatedProtocolFees7d, {
		id: 'estimatedProtocolFees7d',
		header: 'Protocol Fees 7d',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 170
	}),
	overviewColumnHelper.accessor((row) => row.estimatedProtocolFees30d, {
		id: 'estimatedProtocolFees30d',
		header: 'Protocol Fees 30d',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 180
	}),
	overviewColumnHelper.accessor((row) => row.estimatedProtocolFeesAllTime, {
		id: 'estimatedProtocolFeesAllTime',
		header: 'Protocol Fees All Time',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 200
	})
]

const venueColumns = [
	venueColumnHelper.accessor((row) => row.coin, {
		id: 'coin',
		header: 'Coin',
		enableSorting: false,
		cell: (info) => (
			<span className="flex items-center gap-2">
				<span className="vf-row-index shrink-0" aria-hidden="true" />
				<BasicLink
					href={`/rwa/perps/coin/${encodeURIComponent(info.row.original.coin)}`}
					className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
				>
					{info.row.original.coin}
				</BasicLink>
			</span>
		),
		size: 220
	}),
	venueColumnHelper.accessor((row) => row.referenceAsset ?? '', {
		id: 'referenceAsset',
		header: 'Ref Asset',
		enableSorting: false,
		size: 180
	}),
	venueColumnHelper.accessor((row) => row.category.join(', '), {
		id: 'category',
		header: 'Category',
		enableSorting: false,
		size: 180
	}),
	venueColumnHelper.accessor((row) => row.assetClass, {
		id: 'assetClass',
		header: 'Asset Class',
		enableSorting: false,
		size: 220
	}),
	venueColumnHelper.accessor((row) => row.issuer ?? '', {
		id: 'issuer',
		header: 'Issuer',
		enableSorting: false,
		size: 120
	}),
	venueColumnHelper.accessor((row) => row.openInterest, {
		id: 'openInterest',
		header: 'Open Interest',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 160
	}),
	venueColumnHelper.accessor((row) => row.volume24h, {
		id: 'volume24h',
		header: '24h Volume',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 160
	}),
	venueColumnHelper.accessor((row) => row.price, {
		id: 'price',
		header: 'Price',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 120
	}),
	venueColumnHelper.accessor((row) => row.priceChange24h, {
		id: 'priceChange24h',
		header: '24h Change',
		cell: (info) => <PercentChange percent={info.getValue()} />,
		meta: { align: 'end' },
		size: 130
	}),
	venueColumnHelper.accessor((row) => row.fundingRate * 100, {
		id: 'fundingRate',
		header: 'Funding Rate',
		cell: (info) => `${formattedNum(info.getValue(), false)}%`,
		meta: { align: 'end' },
		size: 130
	}),
	venueColumnHelper.accessor((row) => row.premium * 100, {
		id: 'premium',
		header: 'Premium',
		cell: (info) => `${formattedNum(info.getValue(), false)}%`,
		meta: { align: 'end' },
		size: 120
	}),
	venueColumnHelper.accessor((row) => row.maxLeverage, {
		id: 'maxLeverage',
		header: 'Max Leverage',
		cell: (info) => `${formattedNum(info.getValue(), false)}x`,
		meta: { align: 'end' },
		size: 120
	}),
	venueColumnHelper.accessor((row) => row.rwaClassification ?? '', {
		id: 'rwaClassification',
		header: 'RWA Classification',
		enableSorting: false,
		size: 180
	}),
	venueColumnHelper.accessor((row) => row.accessModel ?? '', {
		id: 'accessModel',
		header: 'Access Model',
		enableSorting: false,
		size: 150
	}),
	venueColumnHelper.accessor((row) => row.oracleProvider ?? '', {
		id: 'oracleProvider',
		header: 'Oracle Provider',
		enableSorting: false,
		size: 240
	}),
	venueColumnHelper.accessor((row) => row.makerFeeRate * 100, {
		id: 'makerFeeRate',
		header: 'Maker Fee',
		cell: (info) => `${formattedNum(info.getValue(), false)}%`,
		meta: { align: 'end' },
		size: 120
	}),
	venueColumnHelper.accessor((row) => row.takerFeeRate * 100, {
		id: 'takerFeeRate',
		header: 'Taker Fee',
		cell: (info) => `${formattedNum(info.getValue(), false)}%`,
		meta: { align: 'end' },
		size: 120
	}),
	venueColumnHelper.accessor((row) => row.cumulativeFunding, {
		id: 'cumulativeFunding',
		header: 'Cumulative Funding',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 170
	}),
	venueColumnHelper.accessor((row) => row.estimatedProtocolFees24h, {
		id: 'estimatedProtocolFees24h',
		header: 'Protocol Fees 24h',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 170
	})
]

const overviewColumnVisibility: VisibilityState = {
	category: false,
	parentPlatform: false,
	issuer: false,
	oracleProvider: false,
	rwaClassification: false,
	accessModel: false,
	makerFeeRate: false,
	takerFeeRate: false,
	deployerFeeShare: false,
	cumulativeFunding: false,
	oraclePx: false,
	midPx: false,
	prevDayPx: false,
	volume7d: false,
	volume30d: false,
	volumeAllTime: false,
	estimatedProtocolFees24h: false,
	estimatedProtocolFees7d: false,
	estimatedProtocolFees30d: false,
	estimatedProtocolFeesAllTime: false
}

const venueColumnVisibility: VisibilityState = {
	category: false,
	rwaClassification: false,
	accessModel: false,
	oracleProvider: false,
	makerFeeRate: false,
	takerFeeRate: false,
	cumulativeFunding: false,
	estimatedProtocolFees24h: false
}

const StatCard = ({ label, value }: { label: string; value: React.ReactNode }) => (
	<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
		<span className="text-(--text-label)">{label}</span>
		<span className="font-jetbrains text-2xl font-medium">{value}</span>
	</p>
)

function fetchOverviewTimeSeriesDataset(request: IRWAPerpsOverviewBreakdownRequest) {
	const searchParams = new URLSearchParams({
		breakdown: request.breakdown,
		key: request.key
	})

	return fetchJson<MultiSeriesChart2Dataset>(`/api/rwa/perps/overview-breakdown?${searchParams.toString()}`)
}

function fetchVenueTimeSeriesDataset(request: IRWAPerpsVenueBreakdownRequest) {
	const searchParams = new URLSearchParams({
		venue: request.venue,
		breakdown: request.breakdown,
		key: request.key
	})

	return fetchJson<MultiSeriesChart2Dataset>(`/api/rwa/perps/venue-breakdown?${searchParams.toString()}`)
}

export function RWAPerpsDashboard(props: RWAPerpsDashboardProps) {
	const router = useRouter()
	const chartState = parseRWAPerpsChartState(router.query, props.mode)
	const chartMetricLabel = getRWAPerpsChartMetricLabel(chartState.metric)
	const chartMetricOptions = getRWAPerpsChartMetricOptions()
	const chartViewOptions = getRWAPerpsChartViewOptions()
	const chartBreakdownOptions = getRWAPerpsChartBreakdownOptions(chartState)
	const showBreakdownSelect = chartBreakdownOptions.length > 1
	const treemapBreakdown = chartState.breakdown as RWAPerpsOverviewTreemapBreakdown | RWAPerpsVenueTreemapBreakdown
	const treemapNestedByOptions = getRWAPerpsTreemapNestedByOptions(props.mode, treemapBreakdown)
	const showTreemapNestedBySelect = chartState.view === 'treemap' && treemapNestedByOptions.length > 1
	const treemapNestedByLabel = getRWAPerpsTreemapNestedByLabel(chartState.treemapNestedBy)
	const breakdownLabel = getRWAPerpsBreakdownLabel(chartState.breakdown)
	const isOverviewMode = props.mode === 'overview'
	const currentRows = props.data.markets
	const initialChartDataset = props.data.initialChartDataset
	const venueLabel = props.mode === 'venue' ? props.data.venue : undefined
	const isDefaultTimeSeriesState =
		chartState.view === 'timeSeries' &&
		chartState.metric === 'openInterest' &&
		chartState.breakdown === getDefaultRWAPerpsChartBreakdown(props.mode, 'timeSeries')

	const timeSeriesQuery = useQuery({
		queryKey: [
			'rwa-perps-chart',
			props.mode,
			chartState.metric,
			chartState.breakdown,
			props.mode === 'venue' ? props.data.venue : 'all'
		],
		queryFn: () =>
			props.mode === 'overview'
				? fetchOverviewTimeSeriesDataset({
						breakdown: chartState.breakdown as IRWAPerpsOverviewBreakdownRequest['breakdown'],
						key: chartState.metric
					})
				: fetchVenueTimeSeriesDataset({
						venue: props.data.venue,
						breakdown: chartState.breakdown as IRWAPerpsVenueBreakdownRequest['breakdown'],
						key: chartState.metric
					}),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 1,
		enabled: chartState.view === 'timeSeries' && !isDefaultTimeSeriesState
	})

	const selectedTimeSeriesDataset =
		chartState.view === 'timeSeries' && isDefaultTimeSeriesState
			? initialChartDataset
			: (timeSeriesQuery.data ?? EMPTY_DATASET)

	const snapshotBreakdownRows = useMemo(
		() =>
			isOverviewMode
				? buildRWAPerpsOverviewSnapshotBreakdownTotals({
						rows: currentRows,
						breakdown: chartState.breakdown as RWAPerpsOverviewNonTimeSeriesBreakdown,
						key: chartState.metric
					})
				: buildRWAPerpsVenueSnapshotBreakdownTotals({
						rows: currentRows,
						breakdown: chartState.breakdown as RWAPerpsVenueNonTimeSeriesBreakdown,
						key: chartState.metric
					}),
		[chartState.breakdown, chartState.metric, currentRows, isOverviewMode]
	)

	const pieChartData = useMemo(
		() => preparePieChartData({ data: snapshotBreakdownRows, limit: 10 }),
		[snapshotBreakdownRows]
	)
	const deferredPieChartData = useDeferredValue(pieChartData)
	const deferredTimeSeriesDataset = useDeferredValue(selectedTimeSeriesDataset)
	const hasTimeSeriesHistory = useMemo(
		() => hasEnoughTimeSeriesHistory(deferredTimeSeriesDataset),
		[deferredTimeSeriesDataset]
	)
	const pieChartColors = useMemo(() => {
		const colorMap: Record<string, string> = {}
		for (const [index, item] of deferredPieChartData.entries()) {
			colorMap[item.name] = CHART_COLORS[index % CHART_COLORS.length]
		}
		return colorMap
	}, [deferredPieChartData])

	const barChartData = useMemo(() => {
		let othersValue = 0
		const sorted = [...deferredPieChartData].filter((item) => Number.isFinite(item.value) && item.value > 0)
		for (const item of sorted) {
			if (item.name === 'Others') {
				othersValue += item.value
			}
		}

		const withoutOthers = sorted.filter((item) => item.name !== 'Others')
		if (withoutOthers.length <= MAX_HORIZONTAL_BARS - (othersValue > 0 ? 1 : 0)) {
			return othersValue > 0 ? [...withoutOthers, { name: 'Others', value: othersValue }] : withoutOthers
		}

		const limited = withoutOthers.slice(0, MAX_HORIZONTAL_BARS - 1)
		const overflowValue =
			withoutOthers.slice(MAX_HORIZONTAL_BARS - 1).reduce((sum, item) => sum + item.value, 0) + othersValue
		return overflowValue > 0 ? [...limited, { name: 'Others', value: overflowValue }] : limited
	}, [deferredPieChartData])

	const treemapTreeData = useMemo(
		() =>
			buildRWAPerpsTreemapTreeData({
				mode: props.mode,
				markets: currentRows,
				metric: chartState.metric,
				parentGrouping: treemapBreakdown,
				nestedBy: chartState.treemapNestedBy,
				venueLabel
			}),
		[chartState.metric, chartState.treemapNestedBy, currentRows, props.mode, treemapBreakdown, venueLabel]
	)
	const { chartInstance: timeSeriesChartInstance, handleChartReady: handleTimeSeriesChartReady } = useGetChartInstance()
	const { chartInstance: pieChartInstance, handleChartReady: handlePieChartReady } = useGetChartInstance()
	const { chartInstance: barChartInstance, handleChartReady: handleBarChartReady } = useGetChartInstance()
	const { chartInstance: treemapChartInstance, handleChartReady: handleTreemapChartReady } = useGetChartInstance()

	const nonTimeSeriesChartInstance =
		chartState.view === 'treemap'
			? treemapChartInstance
			: chartState.view === 'hbar'
				? barChartInstance
				: pieChartInstance
	const valueSymbol = chartState.metric === 'markets' ? '' : '$'
	const pageLabel = props.mode === 'overview' ? 'RWA Perps' : `${props.data.venue} RWA Perps`
	const timeSeriesFilename = `${props.mode === 'overview' ? 'rwa-perps-overview' : `rwa-perps-venue-${props.data.venue}`}-time-series-${chartState.metric}-${chartState.breakdown}`
	const nonTimeSeriesFilename = `${props.mode === 'overview' ? 'rwa-perps-overview' : `rwa-perps-venue-${props.data.venue}`}-${chartState.view}-${chartState.metric}-${chartState.breakdown}`

	const onSelectView = (value: string | string[]) => {
		const selectedView = (Array.isArray(value) ? value[0] : value) as typeof chartState.view
		const nextState = setRWAPerpsChartView(chartState, selectedView)
		void pushShallowQuery(router, {
			chartView: getRWAPerpsChartViewQueryValue(nextState.view),
			timeSeriesChartBreakdown:
				nextState.view === 'timeSeries' ? getRWAPerpsChartBreakdownQueryValue(nextState) : undefined,
			nonTimeSeriesChartBreakdown:
				nextState.view === 'timeSeries' ? undefined : getRWAPerpsChartBreakdownQueryValue(nextState)
		})
	}

	const onSelectBreakdown = (value: string | string[]) => {
		const selectedBreakdown = (Array.isArray(value) ? value[0] : value) as typeof chartState.breakdown
		const nextState = setRWAPerpsChartBreakdown(chartState, selectedBreakdown)
		void pushShallowQuery(router, {
			timeSeriesChartBreakdown:
				nextState.view === 'timeSeries' ? getRWAPerpsChartBreakdownQueryValue(nextState) : undefined,
			nonTimeSeriesChartBreakdown:
				nextState.view === 'timeSeries' ? undefined : getRWAPerpsChartBreakdownQueryValue(nextState)
		})
	}

	const onSelectTreemapNestedBy = (value: string | string[]) => {
		const selectedNestedBy = (Array.isArray(value) ? value[0] : value) as typeof chartState.treemapNestedBy
		const nextState = setRWAPerpsTreemapNestedBy(chartState, selectedNestedBy)
		void pushShallowQuery(router, {
			treemapNestedBy: getRWAPerpsTreemapNestedByQueryValue(nextState)
		})
	}

	const timeSeriesMetricSwitch = (
		<div className="mr-auto flex flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
			{chartMetricOptions.map(({ key, label }) => (
				<button
					key={`rwa-perps-chart-metric-${key}`}
					className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
					data-active={chartState.metric === key}
					onClick={() => {
						void pushShallowQuery(router, {
							chartType: getRWAPerpsChartMetricQueryValue(key)
						})
					}}
				>
					{label}
				</button>
			))}
		</div>
	)

	const statCards =
		props.mode === 'overview'
			? [
					{ label: 'Total Open Interest', value: formattedNum(props.data.totals.openInterest, true) },
					{ label: 'Total 24h Volume', value: formattedNum(props.data.totals.volume24h, true) },
					{ label: 'Total Markets', value: formattedNum(props.data.totals.markets, false) },
					{ label: 'Total Cumulative Funding', value: formattedNum(props.data.totals.cumulativeFunding, true) }
				]
			: [
					{ label: 'Open Interest', value: formattedNum(props.data.totals.openInterest, true) },
					{ label: '24h Volume', value: formattedNum(props.data.totals.volume24h, true) },
					{ label: 'Markets', value: formattedNum(props.data.totals.markets, false) },
					{ label: 'Protocol Fees 24h', value: formattedNum(props.data.totals.protocolFees24h, true) }
				]

	return (
		<div className="flex flex-col gap-2">
			{props.mode === 'venue' ? (
				<RowLinksWithDropdown links={props.data.venueLinks} activeLink={props.data.venue} />
			) : null}
			<div className="flex flex-col gap-2 md:flex-row md:items-center">
				{statCards.map((card) => (
					<StatCard key={card.label} label={card.label} value={card.value} />
				))}
			</div>
			{chartState.view === 'timeSeries' ? (
				<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="flex flex-wrap items-center justify-end gap-2 p-3">
						{timeSeriesMetricSwitch}
						<Select
							allValues={chartViewOptions}
							selectedValues={chartState.view}
							setSelectedValues={onSelectView}
							label={
								chartViewOptions.find((option) => option.key === chartState.view)?.name ?? chartViewOptions[0].name
							}
							labelType="none"
							variant="filter"
						/>
						{showBreakdownSelect ? (
							<Select
								allValues={chartBreakdownOptions}
								selectedValues={chartState.breakdown}
								setSelectedValues={onSelectBreakdown}
								label={breakdownLabel}
								labelType="none"
								variant="filter"
							/>
						) : null}
						<ChartExportButtons
							chartInstance={timeSeriesChartInstance}
							filename={timeSeriesFilename}
							title={`${pageLabel} ${chartMetricLabel}`}
							smol
						/>
					</div>
					{timeSeriesQuery.error ? (
						<p className="flex min-h-[360px] items-center justify-center text-xs text-(--error)">
							{getErrorMessage(timeSeriesQuery.error)}
						</p>
					) : timeSeriesQuery.isLoading && !isDefaultTimeSeriesState ? (
						<p className="flex min-h-[360px] items-center justify-center gap-1">
							Loading
							<LoadingDots />
						</p>
					) : !hasTimeSeriesHistory ? (
						<p className="flex min-h-[360px] items-center justify-center text-sm text-(--text-secondary)">
							Only a single snapshot is available; time-series history is not available for this selection yet.
						</p>
					) : (
						<Suspense fallback={<div className="min-h-[360px]" />}>
							<MultiSeriesChart2
								dataset={deferredTimeSeriesDataset}
								stacked
								showTotalInTooltip
								valueSymbol={valueSymbol}
								onReady={handleTimeSeriesChartReady}
							/>
						</Suspense>
					)}
				</div>
			) : (
				<div
					className={`flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) ${chartState.view === 'treemap' ? 'min-h-[652px]' : 'min-h-[412px]'}`}
				>
					<div className="flex flex-wrap items-center justify-end gap-2 p-3 pb-0">
						{timeSeriesMetricSwitch}
						<Select
							allValues={chartViewOptions}
							selectedValues={chartState.view}
							setSelectedValues={onSelectView}
							label={
								chartViewOptions.find((option) => option.key === chartState.view)?.name ?? chartViewOptions[0].name
							}
							labelType="none"
							variant="filter"
						/>
						{showBreakdownSelect ? (
							<Select
								allValues={chartBreakdownOptions}
								selectedValues={chartState.breakdown}
								setSelectedValues={onSelectBreakdown}
								label={breakdownLabel}
								labelType="none"
								variant="filter"
							/>
						) : null}
						{showTreemapNestedBySelect ? (
							<Select
								allValues={treemapNestedByOptions}
								selectedValues={chartState.treemapNestedBy}
								setSelectedValues={onSelectTreemapNestedBy}
								label={`Nested by: ${treemapNestedByLabel}`}
								labelType="none"
								variant="filter"
							/>
						) : null}
						{chartState.view === 'treemap' ? <ChartRestoreButton chartInstance={treemapChartInstance} /> : null}
						<ChartExportButtons
							chartInstance={nonTimeSeriesChartInstance}
							filename={nonTimeSeriesFilename}
							title={`${pageLabel} ${chartMetricLabel}`}
							smol
						/>
					</div>
					{snapshotBreakdownRows.length === 0 ? (
						<p className="flex min-h-[360px] items-center justify-center text-sm text-(--text-secondary)">
							No chart data available.
						</p>
					) : (
						<Suspense fallback={<div className={chartState.view === 'treemap' ? 'min-h-[600px]' : 'min-h-[360px]'} />}>
							{chartState.view === 'pie' ? (
								<PieChart
									chartData={deferredPieChartData}
									stackColors={pieChartColors}
									radius={PIE_CHART_RADIUS}
									onReady={handlePieChartReady}
									valueSymbol={valueSymbol}
								/>
							) : chartState.view === 'hbar' ? (
								<HBarChart
									categories={barChartData.map((item) => item.name)}
									values={barChartData.map((item) => item.value)}
									colors={barChartData.map((item) => pieChartColors[item.name] ?? CHART_COLORS[0])}
									valueSymbol={valueSymbol}
									onReady={handleBarChartReady}
								/>
							) : (
								<TreemapChart
									treeData={treemapTreeData}
									variant="rwa"
									height="600px"
									onReady={handleTreemapChartReady}
									valueLabel={chartMetricLabel}
									valueSymbol={valueSymbol}
								/>
							)}
						</Suspense>
					)}
				</div>
			)}
			<TableWithSearch
				data={currentRows}
				columns={props.mode === 'overview' ? overviewColumns : venueColumns}
				placeholder={props.mode === 'overview' ? 'Search markets or assets...' : 'Search venue markets...'}
				columnToSearch="coin"
				header={props.mode === 'overview' ? 'Markets Rankings' : `${props.data.venue} Markets`}
				headingAs="h1"
				sortingState={[{ id: 'openInterest', desc: true }]}
				columnVisibility={props.mode === 'overview' ? overviewColumnVisibility : venueColumnVisibility}
				rowSize={56}
				compact
				showColumnSelect
				csvFileName={props.mode === 'overview' ? 'rwa-perps-overview-markets' : `rwa-perps-${props.data.venue}-markets`}
			/>
		</div>
	)
}
