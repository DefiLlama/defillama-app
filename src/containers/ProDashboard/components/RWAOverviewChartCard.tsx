import { lazy, Suspense, useMemo } from 'react'
import { ChartPngExportButton } from '~/components/ButtonStyled/ChartPngExportButton'
import type {
	IHBarChartProps,
	IMultiSeriesChart2Props,
	IPieChartProps,
	ITreemapChartProps
} from '~/components/ECharts/types'
import { CHART_COLORS } from '~/constants/colors'
import { getChartMetricLabel } from '~/containers/RWA/chartState'
import { buildRwaTreemapTreeData } from '~/containers/RWA/treemap'
import { useChartImageExport } from '../hooks/useChartImageExport'
import { useProDashboardTime } from '../ProDashboardAPIContext'
import { filterDataByTimePeriod } from '../queries'
import type { RWAOverviewChartConfig, RWAOverviewChartBreakdown } from '../types'
import { useRWABreakdownChartData } from './datasets/RWADataset/useRWAChartData'
import { LoadingSpinner } from './LoadingSpinner'

const MultiSeriesChart2 = lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>
const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const HBarChart = lazy(() => import('~/components/ECharts/HBarChart')) as React.FC<IHBarChartProps>
const TreemapChart = lazy(() => import('~/components/ECharts/TreemapChart')) as React.FC<ITreemapChartProps>

const BREAKDOWN_LABELS: Record<RWAOverviewChartBreakdown, string> = {
	chain: 'Chain',
	category: 'Category',
	assetClass: 'Asset Class',
	assetName: 'Asset Name',
	platform: 'Platform',
	assetGroup: 'Asset Group'
}

const VIEW_LABELS: Record<string, string> = {
	timeSeries: 'Time Series',
	pie: 'Pie',
	treemap: 'Treemap',
	hbar: 'HBar'
}

interface RWAOverviewChartCardProps {
	config: RWAOverviewChartConfig
}

export function RWAOverviewChartCard({ config }: RWAOverviewChartCardProps) {
	const { metric, chartView, breakdown, chain } = config
	const { chartInstance, handleChartReady } = useChartImageExport()
	const { timePeriod, customTimePeriod } = useProDashboardTime()
	const { chartDataset: rawDataset, isLoading } = useRWABreakdownChartData(breakdown, metric, chain)

	const chartDataset = useMemo(() => {
		if (!rawDataset || !timePeriod || timePeriod === 'all') return rawDataset
		const points: [number, number][] = rawDataset.source.map((row: any) => [row.timestamp, 1])
		const filtered = filterDataByTimePeriod(points, timePeriod, customTimePeriod)
		const filteredTimestamps = new Set(filtered.map(([ts]) => ts))
		return {
			...rawDataset,
			source: rawDataset.source.filter((row: any) => filteredTimestamps.has(row.timestamp))
		}
	}, [rawDataset, timePeriod, customTimePeriod])

	const metricLabel = getChartMetricLabel(metric as any)
	const breakdownLabel = BREAKDOWN_LABELS[breakdown] || breakdown
	const chainLabel = chain ? chain : 'All Chains'
	const viewLabel = VIEW_LABELS[chartView] || chartView
	const imageTitle = `RWA ${metricLabel} - ${chainLabel} by ${breakdownLabel}`
	const imageFilename = `rwa-${chain || 'all'}-${metric}-${breakdown}-${chartView}`

	const pieData = useMemo(() => {
		if (!chartDataset || chartView !== 'pie') return []
		const lastRow = chartDataset.source[chartDataset.source.length - 1]
		if (!lastRow) return []
		return chartDataset.dimensions
			.filter((d) => d !== 'timestamp')
			.map((d) => ({ name: d, value: (lastRow as any)[d] || 0 }))
			.filter((d) => d.value > 0)
			.sort((a, b) => b.value - a.value)
	}, [chartDataset, chartView])

	const pieColors = useMemo(() => {
		const colors: Record<string, string> = {}
		for (const [idx, item] of pieData.entries()) {
			colors[item.name] = CHART_COLORS[idx % CHART_COLORS.length]
		}
		return colors
	}, [pieData])

	const barData = useMemo(() => {
		if (!chartDataset || chartView !== 'hbar') return { categories: [] as string[], values: [] as number[] }
		const lastRow = chartDataset.source[chartDataset.source.length - 1]
		if (!lastRow) return { categories: [] as string[], values: [] as number[] }
		const items = chartDataset.dimensions
			.filter((d) => d !== 'timestamp')
			.map((d) => ({ name: d, value: (lastRow as any)[d] || 0 }))
			.filter((d) => d.value > 0)
			.sort((a, b) => b.value - a.value)
			.slice(0, 20)
		return { categories: items.map((i) => i.name), values: items.map((i) => i.value) }
	}, [chartDataset, chartView])

	const treemapData = useMemo(() => {
		if (!chartDataset || chartView !== 'treemap') return []
		const lastRow = chartDataset.source[chartDataset.source.length - 1]
		if (!lastRow) return []
		const pieItems = chartDataset.dimensions
			.filter((d) => d !== 'timestamp')
			.map((d) => ({ name: d, value: (lastRow as any)[d] || 0 }))
			.filter((d) => d.value > 0)
		return buildRwaTreemapTreeData(pieItems, breakdownLabel)
	}, [chartDataset, chartView, breakdownLabel])

	if (isLoading) {
		return (
			<div className="flex h-full min-h-[360px] items-center justify-center">
				<LoadingSpinner />
			</div>
		)
	}

	const hasData = chartDataset && chartDataset.source.length > 0

	return (
		<div className="flex h-full flex-col p-2">
			<div className="mb-2 flex items-start justify-between gap-2">
				<div className="flex flex-col gap-1">
					<h3 className="text-sm font-semibold pro-text1">
						RWA {metricLabel} - {viewLabel}
					</h3>
					<p className="text-xs pro-text2">
						{chainLabel}
						{!chain ? ` by ${breakdownLabel}` : ''}
					</p>
				</div>
				{hasData && chartView !== 'pie' ? (
					<ChartPngExportButton chartInstance={chartInstance} filename={imageFilename} title={imageTitle} smol />
				) : null}
			</div>
			<div className="flex-1" key={`${chartView}-${breakdown}-${metric}`}>
				<Suspense
					fallback={
						<div className="flex h-[320px] items-center justify-center">
							<LoadingSpinner />
						</div>
					}
				>
					{chartView === 'timeSeries' && chartDataset ? (
						<MultiSeriesChart2
							dataset={chartDataset}
							hideDefaultLegend={false}
							stacked
							showTotalInTooltip
							onReady={handleChartReady}
						/>
					) : chartView === 'pie' && pieData.length > 0 ? (
						<PieChart chartData={pieData} stackColors={pieColors} />
					) : chartView === 'hbar' && barData.categories.length > 0 ? (
						<HBarChart
							categories={barData.categories}
							values={barData.values}
							valueSymbol="$"
							onReady={handleChartReady}
						/>
					) : chartView === 'treemap' && treemapData.length > 0 ? (
						<TreemapChart
							treeData={treemapData}
							variant="rwa"
							height="320px"
							onReady={handleChartReady}
							valueLabel={metricLabel}
						/>
					) : (
						<div className="flex h-[320px] items-center justify-center text-sm pro-text2">No data available</div>
					)}
				</Suspense>
			</div>
		</div>
	)
}
