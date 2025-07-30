import { CHART_TYPES, MultiChartConfig } from '../types'
import { generateChartColor, convertToCumulative } from '../utils'
import { EXTENDED_COLOR_PALETTE } from '../utils/colorManager'
import { useProDashboard } from '../ProDashboardAPIContext'
import { Icon } from '~/components/Icon'
import { memo, useState, useMemo, lazy, Suspense } from 'react'

const MultiSeriesChart = lazy(() => import('~/components/ECharts/MultiSeriesChart'))

interface MultiChartCardProps {
	multi: MultiChartConfig
}

const MultiChartCard = memo(function MultiChartCard({ multi }: MultiChartCardProps) {
	const { getProtocolInfo, handleGroupingChange, handleCumulativeChange, isReadOnly } = useProDashboard()
	const [showPercentage, setShowPercentage] = useState(false)
	const [showStacked, setShowStacked] = useState(true)
	const showCumulative = multi.showCumulative || false

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
		const uniqueChains = new Set(validItems.filter((item) => !item.protocol).map((item) => item.chain))
		const uniqueProtocols = new Set(validItems.filter((item) => item.protocol).map((item) => item.protocol))
		const isSingleChain = uniqueChains.size === 1 && validItems.every((item) => !item.protocol)
		const isSingleProtocol = uniqueProtocols.size === 1 && validItems.every((item) => item.protocol)

		const baseSeries = validItems.map((cfg, index) => {
			const rawData = cfg.data as [string, number][]
			const meta = CHART_TYPES[cfg.type]
			const name = cfg.protocol ? getProtocolInfo(cfg.protocol)?.name || cfg.protocol : cfg.chain

			// Apply cumulative transformation if enabled
			const processedData = showCumulative ? convertToCumulative(rawData) : rawData

			const data: [number, number][] = processedData.map(([timestamp, value]) => [
				typeof timestamp === 'string' && !isNaN(Number(timestamp))
					? Number(timestamp)
					: Math.floor(new Date(timestamp).getTime()),
				value
			])

			const itemIdentifier = cfg.protocol || cfg.chain || 'unknown'

			const color =
				isSingleChain || isSingleProtocol
					? EXTENDED_COLOR_PALETTE[index % EXTENDED_COLOR_PALETTE.length]
					: generateChartColor(itemIdentifier, meta?.color || '#8884d8')

			return {
				name: `${name} ${meta?.title || cfg.type}`,
				type: (meta?.chartType === 'bar' && !showCumulative ? 'bar' : 'line') as 'bar' | 'line',
				data,
				color,
				metricType: cfg.type
			}
		})

		const uniqueTypes = new Set(validItems.map((item) => item.type))
		const allBarType =
			uniqueTypes.size === 1 &&
			validItems.every((item) => {
				const chartType = CHART_TYPES[item.type]
				return chartType?.chartType === 'bar'
			})

		const allAreaType =
			uniqueTypes.size === 1 &&
			validItems.every((item) => {
				const chartType = CHART_TYPES[item.type]
				return chartType?.chartType === 'area'
			})

		if ((allBarType || allAreaType) && showStacked && !showCumulative) {
			const allTimestamps = new Set<number>()
			baseSeries.forEach((serie) => {
				serie.data.forEach(([timestamp]) => allTimestamps.add(timestamp))
			})

			const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b)

			const alignedSeries = baseSeries.map((serie) => {
				const dataMap = new Map(serie.data)
				const alignedData: [number, number][] = sortedTimestamps.map((timestamp) => [
					timestamp,
					dataMap.get(timestamp) || 0
				])

				return {
					...serie,
					data: alignedData,
					stack: 'total',
					...(allAreaType && {
						areaStyle: {
							opacity: 0.7
						}
					})
				}
			})

			return alignedSeries
		}

		if (!showPercentage) {
			return baseSeries.map((serie) => {
				const { stack, ...rest } = serie as any
				// Add area style for cumulative view
				if (showCumulative) {
					return {
						...rest,
						areaStyle: {
							opacity: 0.2
						}
					}
				}
				return rest
			})
		}

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
	}, [validItems, showPercentage, showStacked, showCumulative, getProtocolInfo])

	const hasAnyData = validItems.length > 0
	const isAllLoading = loadingItems.length === multi.items.length
	const hasPartialFailures = failedItems.length > 0 && validItems.length > 0

	const uniqueMetricTypes = new Set(validItems.map((item) => item.type))
	const hasMultipleMetrics = uniqueMetricTypes.size > 1

	const allChartsGroupable = multi.items.every((item) => {
		const chartType = CHART_TYPES[item.type]
		return chartType?.groupable === true
	})

	const allChartsAreBarType =
		!hasMultipleMetrics &&
		validItems.every((item) => {
			const chartType = CHART_TYPES[item.type]
			return chartType?.chartType === 'bar'
		})

	const allChartsAreAreaType =
		!hasMultipleMetrics &&
		validItems.every((item) => {
			const chartType = CHART_TYPES[item.type]
			return chartType?.chartType === 'area'
		})

	const canStack = allChartsAreBarType || allChartsAreAreaType

	const groupingOptions: ('day' | 'week' | 'month' | 'quarter')[] = ['day', 'week', 'month', 'quarter']

	return (
		<div className="p-4 h-full min-h-[340px] flex flex-col">
			<div className="mb-2">
				<div className={`flex flex-wrap items-start justify-between gap-2 ${!isReadOnly ? 'pr-[86px]' : ''}`}>
					<div className="flex items-center gap-2 min-w-0 flex-1">
						<h3 className="text-sm font-medium text-(--text1) truncate">
							{multi.name || `Multi-Chart (${multi.items.length})`}
						</h3>
						{hasPartialFailures && (
							<div className="flex items-center gap-1 text-xs text-yellow-500 shrink-0">
								<Icon name="alert-triangle" height={12} width={12} />
								<span className="hidden sm:inline">Partial data</span>
								<span className="sm:hidden">!</span>
							</div>
						)}
					</div>
					<div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
						{allChartsGroupable && hasAnyData && (
							<div className="flex border border-(--form-control-border) overflow-hidden">
								{groupingOptions.map((option, index) => (
									<button
										key={option}
										onClick={() => handleGroupingChange(multi.id, option)}
										className={`px-2 sm:px-3 py-1 text-xs font-medium transition-colors duration-150 ease-in-out 
										${index > 0 ? 'border-l border-(--form-control-border)' : ''}
										${
											multi.grouping === option
												? 'bg-(--primary1) text-white focus:outline-hidden focus:ring-2 focus:ring-(--primary1) focus:ring-opacity-50'
												: 'bg-transparent pro-hover-bg pro-text2 focus:outline-hidden focus:ring-1 focus:ring-(--form-control-border)'
										}`}
									>
										<span className="hidden xs:inline">{option.charAt(0).toUpperCase() + option.slice(1)}</span>
										<span className="xs:hidden">{option.charAt(0).toUpperCase()}</span>
									</button>
								))}
							</div>
						)}
						{hasAnyData && !hasMultipleMetrics && (
							<>
								{allChartsAreBarType && (
									<button
										onClick={() => {
											handleCumulativeChange(multi.id, !showCumulative)
											if (!showCumulative) {
												setShowStacked(false)
											}
										}}
										className="flex items-center gap-1 px-2 py-1 text-xs border pro-divider pro-hover-bg pro-text2 transition-colors pro-bg2"
										title={showCumulative ? 'Show individual values' : 'Show cumulative values'}
									>
										<Icon name="trending-up" height={12} width={12} />
										<span className="hidden lg:inline">{showCumulative ? 'Cumulative' : 'Individual'}</span>
									</button>
								)}
								{canStack && !showCumulative && (
									<button
										onClick={() => {
											setShowStacked(!showStacked)
											setShowPercentage(false)
										}}
										className="flex items-center gap-1 px-2 py-1 text-xs border pro-divider pro-hover-bg pro-text2 transition-colors pro-bg2"
										title={showStacked ? 'Show separate' : 'Show stacked'}
									>
										<Icon name="layers" height={12} width={12} />
										<span className="hidden lg:inline">{showStacked ? 'Stacked' : 'Separate'}</span>
									</button>
								)}
								<button
									onClick={() => {
										setShowPercentage(!showPercentage)
										setShowStacked(false)
									}}
									className="flex items-center gap-1 px-2 py-1 text-xs border pro-divider pro-hover-bg pro-text2 transition-colors pro-bg2"
									title={showPercentage ? 'Show absolute values' : 'Show percentage'}
								>
									<Icon name={showPercentage ? 'percent' : 'dollar-sign'} height={12} width={12} />
									<span className="hidden lg:inline">{showPercentage ? 'Percentage' : 'Absolute'}</span>
								</button>
							</>
						)}
					</div>
				</div>
			</div>

			{/* Status info for failures */}
			{(failedItems.length > 0 || loadingItems.length > 0) && (
				<div className="mb-2 text-xs text-(--text3)">
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
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(--primary1) mx-auto mb-2"></div>
							<p className="text-sm text-(--text3)">Loading charts...</p>
						</div>
					</div>
				) : !hasAnyData ? (
					<div className="flex items-center justify-center h-full">
						<div className="text-center">
							<Icon name="alert-triangle" height={24} width={24} className="mx-auto mb-2 text-red-500" />
							<p className="text-sm text-(--text3)">Failed to load chart data</p>
							<p className="text-xs text-(--text3) mt-1">
								{failedItems.length} of {multi.items.length} charts failed
							</p>
						</div>
					</div>
				) : (
					<Suspense fallback={<></>}>
						<MultiSeriesChart
							key={`${showStacked}-${showPercentage}`}
							series={series}
							valueSymbol={showPercentage ? '%' : '$'}
							groupBy={
								multi.grouping === 'week'
									? 'weekly'
									: multi.grouping === 'month'
									? 'monthly'
									: multi.grouping === 'quarter'
									? 'quarterly'
									: 'daily'
							}
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
														const absValue = Math.abs(value)
														if (absValue >= 1e9) {
															return (value / 1e9).toFixed(1).replace(/\.0$/, '') + 'B'
														} else if (absValue >= 1e6) {
															return (value / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
														} else if (absValue >= 1e3) {
															return (value / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'
														}
														return value.toString()
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
					</Suspense>
				)}
			</div>
		</div>
	)
})

export default MultiChartCard
