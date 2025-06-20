import dynamic from 'next/dynamic'
import { CHART_TYPES, MultiChartConfig } from '../types'
import { generateChartColor } from '../utils'
import { useProDashboard } from '../ProDashboardAPIContext'
import { Icon } from '~/components/Icon'
import { memo, useState, useMemo } from 'react'

const MultiSeriesChart = dynamic(() => import('~/components/ECharts/MultiSeriesChart'), {
	ssr: false
})

interface MultiChartCardProps {
	multi: MultiChartConfig
}

const MultiChartCard = memo(function MultiChartCard({ multi }: MultiChartCardProps) {
	const { getProtocolInfo } = useProDashboard()
	const [showPercentage, setShowPercentage] = useState(false)

	// Filter valid items and create series data
	const validItems = multi.items.filter((cfg) => {
		// Skip if loading, has error, or invalid data
		if (cfg.isLoading || cfg.hasError) return false

		// Check if data is a valid array
		const rawData = cfg.data as [string, number][] | undefined | null
		return Array.isArray(rawData) && rawData.length > 0
	})

	const failedItems = multi.items.filter((cfg) => {
		return cfg.hasError || !Array.isArray(cfg.data) || (Array.isArray(cfg.data) && cfg.data.length === 0)
	})

	const loadingItems = multi.items.filter((cfg) => cfg.isLoading)

	const series = useMemo(() => {
		const baseSeries = validItems.map((cfg, i) => {
			const rawData = cfg.data as [string, number][]
			const meta = CHART_TYPES[cfg.type]
			const name = cfg.protocol ? getProtocolInfo(cfg.protocol)?.name || cfg.protocol : cfg.chain

			const data: [number, number][] = rawData.map(([timestamp, value]) => [
				Math.floor(new Date(timestamp).getTime()),
				value
			])

			const itemIdentifier = cfg.protocol || cfg.chain || 'unknown'

			return {
				name: `${name} ${meta?.title || cfg.type}`,
				type: (meta?.chartType === 'bar' ? 'bar' : 'line') as 'bar' | 'line',
				data,
				color: generateChartColor(itemIdentifier, meta?.color || '#8884d8')
			}
		})

		if (!showPercentage) return baseSeries

		const allTimestamps = new Set<number>()
		baseSeries.forEach((serie) => {
			serie.data.forEach(([timestamp]) => allTimestamps.add(timestamp))
		})

		const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b)

		const totals = new Map<number, number>()
		sortedTimestamps.forEach((timestamp) => {
			let total = 0
			baseSeries.forEach((serie) => {
				const dataPoint = serie.data.find(([t]) => t === timestamp)
				if (dataPoint) {
					total += dataPoint[1]
				}
			})
			totals.set(timestamp, total)
		})

		const percentageColors = [
			'#FF6B6B',
			'#4ECDC4',
			'#45B7D1',
			'#96CEB4',
			'#FFEAA7',
			'#DDA0DD',
			'#98D8C8',
			'#F7DC6F',
			'#BB8FCE',
			'#85C1E9',
			'#F8C471',
			'#82E0AA',
			'#F1948A',
			'#85929E',
			'#D7BDE2'
		]

		const seriesWithAverages = baseSeries.map((serie) => {
			const percentageData: [number, number][] = sortedTimestamps.map((timestamp) => {
				const dataPoint = serie.data.find(([t]) => t === timestamp)
				const value = dataPoint ? dataPoint[1] : 0
				const total = totals.get(timestamp) || 0
				const percentage = total > 0 ? (value / total) * 100 : 0
				return [timestamp, percentage]
			})

			const avgPercentage = percentageData.reduce((sum, [_, pct]) => sum + pct, 0) / percentageData.length

			return {
				...serie,
				data: percentageData,
				type: 'line' as const,
				stack: 'total',
				avgPercentage
			}
		})

		const sortedSeries = seriesWithAverages.sort((a, b) => a.avgPercentage - b.avgPercentage)

		return sortedSeries.map((serie, index) => {
			const color = percentageColors[index % percentageColors.length]
			return {
				...serie,
				color: color,
				areaStyle: {
					color: color,
					opacity: 0.7
				}
			}
		})
	}, [validItems, showPercentage, getProtocolInfo])

	const hasAnyData = validItems.length > 0
	const isAllLoading = loadingItems.length === multi.items.length
	const hasPartialFailures = failedItems.length > 0 && validItems.length > 0

	return (
		<div className="p-4 h-full min-h-[340px] flex flex-col">
			<div className="flex items-center justify-between mb-2 pr-28">
				<div className="flex items-center gap-2">
					<h3 className="text-sm font-medium text-[var(--text1)]">
						{multi.name || `Multi-Chart (${multi.items.length})`}
					</h3>
					{hasPartialFailures && (
						<div className="flex items-center gap-1 text-xs text-yellow-500">
							<Icon name="alert-triangle" height={12} width={12} />
							<span>Partial data</span>
						</div>
					)}
				</div>
				{hasAnyData && (
					<button
						onClick={() => setShowPercentage(!showPercentage)}
						className="flex items-center gap-1 px-2 py-1 text-xs border pro-divider pro-hover-bg pro-text2 transition-colors pro-bg2"
					>
						<Icon name={showPercentage ? 'percent' : 'dollar-sign'} height={12} width={12} />
						<span>{showPercentage ? 'Percentage' : 'Absolute'}</span>
					</button>
				)}
			</div>

			{/* Status info for failures */}
			{(failedItems.length > 0 || loadingItems.length > 0) && (
				<div className="mb-2 text-xs text-[var(--text3)]">
					{loadingItems.length > 0 && (
						<div>
							Loading: {loadingItems.length} chart{loadingItems.length > 1 ? 's' : ''}
						</div>
					)}
					{failedItems.length > 0 && (
						<div>
							Failed: {failedItems.length} chart{failedItems.length > 1 ? 's' : ''}
						</div>
					)}
					{hasAnyData && (
						<div>
							Showing: {validItems.length} chart{validItems.length > 1 ? 's' : ''}
						</div>
					)}
				</div>
			)}

			<div style={{ height: '300px', flexGrow: 1 }}>
				{!hasAnyData && isAllLoading ? (
					<div className="flex items-center justify-center h-full">
						<div className="text-center">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary1)] mx-auto mb-2"></div>
							<p className="text-sm text-[var(--text3)]">Loading charts...</p>
						</div>
					</div>
				) : !hasAnyData ? (
					<div className="flex items-center justify-center h-full">
						<div className="text-center">
							<Icon name="alert-triangle" height={24} width={24} className="mx-auto mb-2 text-red-500" />
							<p className="text-sm text-[var(--text3)]">Failed to load chart data</p>
							<p className="text-xs text-[var(--text3)] mt-1">
								{failedItems.length} of {multi.items.length} charts failed
							</p>
						</div>
					</div>
				) : (
					<MultiSeriesChart
						series={series}
						valueSymbol={showPercentage ? '%' : '$'}
						hideDataZoom={true}
						chartOptions={
							showPercentage
								? {
										yAxis: {
											max: 100,
											min: 0,
											axisLabel: {
												formatter: '{value}%'
											}
										},
										tooltip: {
											valueFormatter: (value: number) => value.toFixed(2) + '%'
										},
										grid: {
											top: series.length > 5 ? 120 : 80,
											bottom: 68,
											left: 12,
											right: 12,
											containLabel: true
										},
										legend: {
											top: 10,
											type: 'scroll',
											pageButtonPosition: 'end',
											height: series.length > 5 ? 80 : 40
										}
								  }
								: {
										yAxis: {
											max: undefined,
											min: undefined,
											axisLabel: {
												formatter: (value: number) => {
													const absValue = Math.abs(value);
													if (absValue >= 1e9) {
														return (value / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
													} else if (absValue >= 1e6) {
														return (value / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
													} else if (absValue >= 1e3) {
														return (value / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
													}
													return value.toString();
												}
											}
										},
										grid: {
											top: series.length > 5 ? 120 : 80,
											bottom: 68,
											left: 12,
											right: 12,
											containLabel: true
										},
										legend: {
											top: 10,
											type: 'scroll',
											pageButtonPosition: 'end',
											height: series.length > 5 ? 80 : 40
										}
								  }
						}
					/>
				)}
			</div>
		</div>
	)
})

export default MultiChartCard
