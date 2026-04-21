import { lazy, Suspense, useMemo } from 'react'
import type {
	IHBarChartProps,
	IMultiSeriesChart2Props,
	IPieChartProps,
	ITreemapChartProps
} from '~/components/ECharts/types'
import { LocalLoader } from '~/components/Loaders'
import { CHART_COLORS } from '~/constants/colors'
import {
	useRWAAssetChartData,
	useRWAAssetsList,
	useRWABreakdownChartData,
	useRWAChainsList
} from '~/containers/ProDashboard/components/datasets/RWADataset/useRWAChartData'
import { isRwaTotalSeriesLabel } from '~/containers/RWA/chartAggregation'
import { getChartMetricOptions, getChartViewOptions, getChartMetricLabel } from '~/containers/RWA/chartState'
import { buildRwaTreemapTreeData } from '~/containers/RWA/treemap'
import { useAuthContext } from '~/containers/Subscription/auth'
import { formattedNum } from '~/utils'
import type { RWAOverviewChartBreakdown, RWAOverviewChartMetric, RWAOverviewChartView } from '../../types'
import { AriakitSelect } from '../AriakitSelect'
import { AriakitVirtualizedSelect, type VirtualizedSelectOption } from '../AriakitVirtualizedSelect'
import { PremiumFeatureGate } from '../PremiumFeatureGate'

const MultiSeriesChart2 = lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>
const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const HBarChart = lazy(() => import('~/components/ECharts/HBarChart')) as React.FC<IHBarChartProps>
const TreemapChart = lazy(() => import('~/components/ECharts/TreemapChart')) as React.FC<ITreemapChartProps>

interface RWAChartTabProps {
	rwaMode: 'overview' | 'asset'
	selectedRwaMetric: RWAOverviewChartMetric
	selectedRwaChartView: RWAOverviewChartView
	selectedRwaBreakdown: RWAOverviewChartBreakdown
	selectedRwaTreemapNestedBy: string
	selectedRwaAssetId: string | null
	selectedRwaAssetName: string | null
	selectedRwaAssetMetrics: RWAOverviewChartMetric[]
	onRwaModeChange: (mode: 'overview' | 'asset') => void
	onSelectedRwaMetricChange: (metric: RWAOverviewChartMetric) => void
	onSelectedRwaChartViewChange: (view: RWAOverviewChartView) => void
	onSelectedRwaBreakdownChange: (breakdown: RWAOverviewChartBreakdown) => void
	onSelectedRwaTreemapNestedByChange: (nestedBy: string) => void
	onSelectedRwaAssetIdChange: (id: string | null) => void
	onSelectedRwaAssetNameChange: (name: string | null) => void
	onSelectedRwaAssetMetricsChange: (metrics: RWAOverviewChartMetric[]) => void
	[key: string]: any
}

const BREAKDOWN_OPTIONS = [
	{ value: 'chain', label: 'Chain' },
	{ value: 'category', label: 'Category' },
	{ value: 'platform', label: 'Platform' },
	{ value: 'assetGroup', label: 'Asset Group' }
]

const ALL_METRICS: RWAOverviewChartMetric[] = ['activeMcap', 'onChainMcap', 'defiActiveTvl']

const METRIC_LABELS: Record<RWAOverviewChartMetric, string> = {
	activeMcap: 'Active Mcap',
	onChainMcap: 'Onchain Mcap',
	defiActiveTvl: 'DeFi Active TVL'
}

export function RWAChartTab(props: RWAChartTabProps) {
	const { hasActiveSubscription } = useAuthContext()

	if (!hasActiveSubscription) {
		return (
			<PremiumFeatureGate featureName="RWA Charts" paywallReason="pro-feature">
				{null}
			</PremiumFeatureGate>
		)
	}

	return <RWAChartTabInner {...props} />
}

function RWAChartTabInner({
	rwaMode,
	selectedRwaMetric,
	selectedRwaChartView,
	selectedRwaBreakdown,
	selectedRwaTreemapNestedBy: _selectedRwaTreemapNestedBy,
	selectedRwaAssetId,
	selectedRwaAssetName,
	selectedRwaAssetMetrics,
	onRwaModeChange,
	onSelectedRwaMetricChange,
	onSelectedRwaChartViewChange,
	onSelectedRwaBreakdownChange,
	onSelectedRwaTreemapNestedByChange: _onSelectedRwaTreemapNestedByChange,
	onSelectedRwaAssetIdChange,
	onSelectedRwaAssetNameChange,
	onSelectedRwaAssetMetricsChange,
	...rest
}: RWAChartTabProps) {
	const selectedRwaChain: string = (rest as any).selectedRwaChain ?? 'All'
	const onSelectedRwaChainChange: (chain: string) => void = (rest as any).onSelectedRwaChainChange ?? (() => {})

	const { chains: rwaChains } = useRWAChainsList()

	const chainOptions = useMemo(() => {
		const opts = [{ value: 'All', label: 'All Chains' }]
		for (const { chain, tvl } of rwaChains) {
			opts.push({ value: chain, label: `${chain} (${formattedNum(tvl, true)})` })
		}
		return opts
	}, [rwaChains])

	const metricOptions = useMemo(() => getChartMetricOptions().map((o) => ({ value: o.key, label: o.label })), [])

	const chartViewOptions = useMemo(() => getChartViewOptions().map((o) => ({ value: o.key, label: o.name })), [])

	const isChainSpecific = selectedRwaChain && selectedRwaChain !== 'All'

	return (
		<div className="flex flex-col gap-4">
			<div className="space-y-3">
				<div className="flex rounded-md border border-(--cards-border) bg-(--cards-bg-alt)/40 p-0.5">
					<button
						type="button"
						onClick={() => onRwaModeChange('overview')}
						className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-all ${
							rwaMode === 'overview'
								? 'bg-(--cards-bg) text-(--text-primary) shadow-sm'
								: 'text-(--text-secondary) hover:text-(--text-primary)'
						}`}
					>
						Chain
					</button>
					<button
						type="button"
						onClick={() => onRwaModeChange('asset')}
						className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-all ${
							rwaMode === 'asset'
								? 'bg-(--cards-bg) text-(--text-primary) shadow-sm'
								: 'text-(--text-secondary) hover:text-(--text-primary)'
						}`}
					>
						By Asset
					</button>
				</div>
			</div>

			{rwaMode === 'overview' ? (
				<div className="flex flex-wrap gap-3">
					<AriakitSelect
						label="Chain"
						options={chainOptions}
						selectedValue={selectedRwaChain}
						onChange={(opt) => onSelectedRwaChainChange(opt.value)}
					/>
					<AriakitSelect
						label="Metric"
						options={metricOptions}
						selectedValue={selectedRwaMetric}
						onChange={(opt) => onSelectedRwaMetricChange(opt.value as RWAOverviewChartMetric)}
					/>
					<AriakitSelect
						label="Chart Type"
						options={chartViewOptions}
						selectedValue={selectedRwaChartView}
						onChange={(opt) => onSelectedRwaChartViewChange(opt.value as RWAOverviewChartView)}
					/>
					{!isChainSpecific ? (
						<AriakitSelect
							label="Breakdown"
							options={BREAKDOWN_OPTIONS}
							selectedValue={selectedRwaBreakdown}
							onChange={(opt) => onSelectedRwaBreakdownChange(opt.value as RWAOverviewChartBreakdown)}
						/>
					) : null}
				</div>
			) : (
				<AssetControls
					selectedAssetId={selectedRwaAssetId}
					selectedAssetName={selectedRwaAssetName}
					selectedMetrics={selectedRwaAssetMetrics}
					onAssetIdChange={onSelectedRwaAssetIdChange}
					onAssetNameChange={onSelectedRwaAssetNameChange}
					onMetricsChange={onSelectedRwaAssetMetricsChange}
				/>
			)}

			<div className="min-h-[320px] rounded-md border border-(--cards-border) bg-(--cards-bg)">
				{rwaMode === 'overview' ? (
					<OverviewPreview
						breakdown={selectedRwaBreakdown}
						metric={selectedRwaMetric}
						chartView={selectedRwaChartView}
						chain={selectedRwaChain}
					/>
				) : (
					<AssetPreview assetId={selectedRwaAssetId} metrics={selectedRwaAssetMetrics} />
				)}
			</div>
		</div>
	)
}

function AssetControls({
	selectedAssetId,
	selectedAssetName: _selectedAssetName,
	selectedMetrics,
	onAssetIdChange,
	onAssetNameChange,
	onMetricsChange
}: {
	selectedAssetId: string | null
	selectedAssetName: string | null
	selectedMetrics: RWAOverviewChartMetric[]
	onAssetIdChange: (id: string | null) => void
	onAssetNameChange: (name: string | null) => void
	onMetricsChange: (metrics: RWAOverviewChartMetric[]) => void
}) {
	const { assets, isLoading } = useRWAAssetsList()

	const assetOptions: VirtualizedSelectOption[] = useMemo(
		() =>
			assets.map((a) => ({
				value: a.id,
				label: a.assetName || a.ticker,
				description: a.totalActiveMcap > 0 ? formattedNum(a.totalActiveMcap, true) : a.ticker
			})),
		[assets]
	)

	const handleAssetChange = (option: VirtualizedSelectOption) => {
		onAssetIdChange(option.value)
		onAssetNameChange(option.label)
	}

	const handleMetricToggle = (metric: RWAOverviewChartMetric) => {
		const isSelected = selectedMetrics.includes(metric)
		if (isSelected && selectedMetrics.length === 1) return
		if (isSelected) {
			onMetricsChange(selectedMetrics.filter((m) => m !== metric))
		} else {
			onMetricsChange([...selectedMetrics, metric])
		}
	}

	return (
		<div className="flex flex-col gap-3">
			<AriakitVirtualizedSelect
				label="Select Asset"
				options={assetOptions}
				selectedValue={selectedAssetId}
				onChange={handleAssetChange}
				placeholder={isLoading ? 'Loading assets...' : 'Search for an RWA asset...'}
			/>
			<div className="flex flex-wrap gap-2">
				<span className="text-sm pro-text2">Metrics:</span>
				{ALL_METRICS.map((metric) => {
					const isSelected = selectedMetrics.includes(metric)
					return (
						<button
							key={metric}
							onClick={() => handleMetricToggle(metric)}
							className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
								isSelected
									? 'bg-(--primary) text-white'
									: 'border border-(--form-control-border) pro-text2 hover:border-(--primary)/40'
							}`}
						>
							{METRIC_LABELS[metric]}
						</button>
					)
				})}
			</div>
		</div>
	)
}

function OverviewPreview({
	breakdown,
	metric,
	chartView,
	chain
}: {
	breakdown: RWAOverviewChartBreakdown
	metric: RWAOverviewChartMetric
	chartView: RWAOverviewChartView
	chain?: string
}) {
	const { chartDataset, isLoading } = useRWABreakdownChartData(breakdown, metric, chain)

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
		return buildRwaTreemapTreeData(pieItems, breakdown)
	}, [chartDataset, chartView, breakdown])

	if (isLoading || !chartDataset) {
		return (
			<div className="flex h-[320px] items-center justify-center">
				<LocalLoader />
			</div>
		)
	}

	return (
		<Suspense fallback={<div className="min-h-[320px]" />}>
			{chartView === 'timeSeries' ? (
				<MultiSeriesChart2
					dataset={chartDataset}
					hideDefaultLegend={false}
					stacked
					showTotalInTooltip={!chartDataset.dimensions.some(isRwaTotalSeriesLabel)}
				/>
			) : chartView === 'pie' && pieData.length > 0 ? (
				<PieChart chartData={pieData} stackColors={pieColors} />
			) : chartView === 'hbar' && barData.categories.length > 0 ? (
				<HBarChart categories={barData.categories} values={barData.values} valueSymbol="$" />
			) : chartView === 'treemap' && treemapData.length > 0 ? (
				<TreemapChart treeData={treemapData} variant="rwa" height="320px" valueLabel={getChartMetricLabel(metric)} />
			) : (
				<div className="flex h-[320px] items-center justify-center text-sm pro-text2">No data available</div>
			)}
		</Suspense>
	)
}

function AssetPreview({ assetId, metrics }: { assetId: string | null; metrics: RWAOverviewChartMetric[] }) {
	const { chartDataset, isLoading } = useRWAAssetChartData(assetId)

	const filteredDataset = useMemo(() => {
		if (!chartDataset) return null
		const metricToDimension: Record<RWAOverviewChartMetric, string> = {
			activeMcap: 'Active Mcap',
			onChainMcap: 'Onchain Mcap',
			defiActiveTvl: 'DeFi Active TVL'
		}
		const selectedDimensions = ['timestamp', ...metrics.map((m) => metricToDimension[m])]
		const filteredDimensions = chartDataset.dimensions.filter((d) => selectedDimensions.includes(d))
		const filteredSource = chartDataset.source.map((row) => {
			const newRow: Record<string, any> = { timestamp: row.timestamp }
			for (const dim of filteredDimensions) {
				if (dim !== 'timestamp') {
					newRow[dim] = (row as any)[dim]
				}
			}
			return newRow
		})
		return { source: filteredSource, dimensions: filteredDimensions }
	}, [chartDataset, metrics])

	if (!assetId) {
		return (
			<div className="flex h-[320px] items-center justify-center text-sm pro-text2">Select an asset to see preview</div>
		)
	}

	if (isLoading || !filteredDataset) {
		return (
			<div className="flex h-[320px] items-center justify-center">
				<LocalLoader />
			</div>
		)
	}

	return (
		<Suspense fallback={<div className="min-h-[320px]" />}>
			<MultiSeriesChart2 dataset={filteredDataset} hideDefaultLegend={false} />
		</Suspense>
	)
}
