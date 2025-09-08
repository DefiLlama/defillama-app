import { lazy, Suspense, useMemo } from 'react'
import { useProDashboard } from '../../ProDashboardAPIContext'
import { CHART_TYPES, ChartConfig } from '../../types'
import { EXTENDED_COLOR_PALETTE } from '../../utils/colorManager'

const MultiSeriesChart = lazy(() => import('~/components/ECharts/MultiSeriesChart'))

interface CombinedChartPreviewProps {
	composerItems: ChartConfig[]
}

export function CombinedChartPreview({ composerItems }: CombinedChartPreviewProps) {
	const { getProtocolInfo } = useProDashboard()

	const { series, valueSymbol } = useMemo(() => {
		const result = []
		let colorIndex = 0
		let hasNonMonetaryMetrics = false
		let allPercentMetrics = true

		composerItems.forEach((item) => {
			if (item.data && Array.isArray(item.data) && item.data.length > 0) {
				const meta = CHART_TYPES[item.type]
				const displayName = item.protocol ? getProtocolInfo(item.protocol)?.name || item.protocol : item.chain || ''

				const nonMonetaryTypes = ['users', 'activeUsers', 'newUsers', 'txs', 'gasUsed']
				const percentMetricTypes = ['medianApy']
				if (nonMonetaryTypes.includes(item.type)) {
					hasNonMonetaryMetrics = true
				}

				if (!percentMetricTypes.includes(item.type)) {
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
						color: EXTENDED_COLOR_PALETTE[colorIndex % EXTENDED_COLOR_PALETTE.length],
						metricType: item.type
					})
					colorIndex++
				}
			}
		})

		const symbol = result.length > 0 && allPercentMetrics ? '%' : hasNonMonetaryMetrics ? '' : '$'

		return { series: result, valueSymbol: symbol }
	}, [getProtocolInfo, composerItems])

	if (series.length === 0 && composerItems.length > 0) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-4 text-center">
					<div className="pro-text2 mb-2 text-sm">Chart Preview</div>
					<div className="pro-text3 text-xs">
						{composerItems.length} chart{composerItems.length > 1 ? 's' : ''} selected
					</div>
					<div className="mt-3 space-y-1">
						{composerItems.map((item) => (
							<div key={item.id} className="pro-text3 text-xs">
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
					key={`combined-${composerItems.map((i) => i.id).join('-')}`}
					series={series}
					valueSymbol={valueSymbol}
					hideDataZoom={true}
					height="450px"
					chartOptions={{
						xAxis: {
							show: true
						},
						yAxis: {
							show: true
						}
					}}
				/>
			</Suspense>
		</div>
	)
}
