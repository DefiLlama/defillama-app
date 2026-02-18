import { lazy, Suspense, useMemo } from 'react'
import { useProDashboardCatalog } from '../../ProDashboardAPIContext'
import { CHART_TYPES, type ChartConfig } from '../../types'
import { EXTENDED_COLOR_PALETTE } from '../../utils/colorManager'

const MultiSeriesChart = lazy(() => import('~/components/ECharts/MultiSeriesChart'))

const CHART_OPTIONS = {
	xAxis: { show: true },
	yAxis: { show: true }
}
const NON_MONETARY_TYPES = new Set(['users', 'activeUsers', 'newUsers', 'txs', 'gasUsed'])
const PERCENT_METRIC_TYPES = new Set(['medianApy'])

interface CombinedChartPreviewProps {
	composerItems: ChartConfig[]
}

const mapGroupingToGroupBy = (
	grouping: 'day' | 'week' | 'month' | 'quarter'
): 'daily' | 'weekly' | 'monthly' | 'quarterly' => {
	if (grouping === 'week') return 'weekly'
	if (grouping === 'month') return 'monthly'
	if (grouping === 'quarter') return 'quarterly'
	return 'daily'
}

export function CombinedChartPreview({ composerItems }: CombinedChartPreviewProps) {
	const { getProtocolInfo } = useProDashboardCatalog()

	const previewGrouping = useMemo<'day' | 'week' | 'month' | 'quarter'>(() => {
		const definedGroupings = composerItems
			.map((item) => item.grouping)
			.filter((grouping): grouping is NonNullable<typeof grouping> => Boolean(grouping))

		if (definedGroupings.length === 0) {
			return 'day'
		}

		const [firstGrouping] = definedGroupings
		const allMatch = definedGroupings.every((grouping) => grouping === firstGrouping)

		return allMatch ? firstGrouping : 'day'
	}, [composerItems])

	const { series, valueSymbol } = useMemo(() => {
		const result = []
		let colorIndex = 0
		let hasNonMonetaryMetrics = false
		let allPercentMetrics = true

		for (const item of composerItems) {
			if (item.data && Array.isArray(item.data) && item.data.length > 0) {
				const meta = CHART_TYPES[item.type]
				const displayName = item.protocol ? getProtocolInfo(item.protocol)?.name || item.protocol : item.chain || ''

				if (NON_MONETARY_TYPES.has(item.type)) {
					hasNonMonetaryMetrics = true
				}

				if (!PERCENT_METRIC_TYPES.has(item.type)) {
					allPercentMetrics = false
				}

				const processedData: [number, number][] = item.data
					.map((dataItem): [number, number] | null => {
						if (Array.isArray(dataItem) && dataItem.length >= 2) {
							const [timestamp, value] = dataItem
							const ts = typeof timestamp === 'string' ? Number(timestamp) : timestamp
							if (ts > 0) {
								return [ts, value || 0]
							}
						}
						return null
					})
					.filter((dataItem): dataItem is [number, number] => dataItem !== null)

				if (processedData.length > 0) {
					result.push({
						name: `${displayName} ${meta?.title || item.type}`,
						type: (meta?.chartType === 'bar' ? 'bar' : 'line') as 'bar' | 'line',
						data: processedData,
						color: item.color || EXTENDED_COLOR_PALETTE[colorIndex % EXTENDED_COLOR_PALETTE.length],
						metricType: item.type
					})
					colorIndex++
				}
			}
		}

		const symbol = result.length > 0 && allPercentMetrics ? '%' : hasNonMonetaryMetrics ? '' : '$'

		return { series: result, valueSymbol: symbol }
	}, [getProtocolInfo, composerItems])

	if (series.length === 0 && composerItems.length > 0) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-4 text-center">
					<div className="mb-2 text-sm pro-text2">Chart Preview</div>
					<div className="text-xs pro-text3">
						{composerItems.length} chart{composerItems.length > 1 ? 's' : ''} selected
					</div>
					<div className="mt-3 space-y-1">
						{composerItems.map((item) => (
							<div key={item.id} className="text-xs pro-text3">
								• {item.protocol || item.chain} - {CHART_TYPES[item.type]?.title || item.type}
							</div>
						))}
					</div>
				</div>
			</div>
		)
	}

	if (series.length === 0) return null

	return (
		<div className="h-full w-full">
			<Suspense
				fallback={
					<div className="h-[450px] w-full animate-pulse rounded-md border border-(--cards-border) bg-(--cards-bg)"></div>
				}
			>
				<MultiSeriesChart
					key={`combined-${composerItems.map((i) => i.id).join('-')}-${previewGrouping}`}
					series={series}
					valueSymbol={valueSymbol}
					groupBy={mapGroupingToGroupBy(previewGrouping)}
					hideDataZoom={true}
					height="450px"
					chartOptions={CHART_OPTIONS}
				/>
			</Suspense>
		</div>
	)
}
