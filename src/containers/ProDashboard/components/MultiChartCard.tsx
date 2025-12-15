import { lazy, memo, Suspense, useCallback, useMemo } from 'react'
import { Icon } from '~/components/Icon'
import { Select } from '~/components/Select'
import { Tooltip } from '~/components/Tooltip'
import { capitalizeFirstLetter, download } from '~/utils'
import { useChartImageExport } from '../hooks/useChartImageExport'
import { useProDashboard } from '../ProDashboardAPIContext'
import { CHART_TYPES, MultiChartConfig } from '../types'
import { convertToCumulative, generateChartColor } from '../utils'
import { COLOR_PALETTE_2, EXTENDED_COLOR_PALETTE } from '../utils/colorManager'
import { ChartExportButton } from './ProTable/ChartExportButton'
import { ProTableCSVButton } from './ProTable/CsvButton'

const MultiSeriesChart = lazy(() => import('~/components/ECharts/MultiSeriesChart'))

interface MultiChartCardProps {
	multi: MultiChartConfig
}

const MultiChartCard = memo(function MultiChartCard({ multi }: MultiChartCardProps) {
	const {
		getProtocolInfo,
		handleGroupingChange,
		handleCumulativeChange,
		handlePercentageChange,
		handleStackedChange,
		isReadOnly
	} = useProDashboard()
	const { chartInstance, handleChartReady } = useChartImageExport()
	const showStacked = multi.showStacked !== false
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
		if (cfg.isLoading) return false
		return cfg.hasError || !Array.isArray(cfg.data) || (Array.isArray(cfg.data) && cfg.data.length === 0)
	})

	const loadingItems = multi.items.filter((cfg) => cfg.isLoading)

	const showPercentage = multi.showPercentage || false

	const series = useMemo(() => {
		const uniqueChains = new Set(validItems.filter((item) => !item.protocol).map((item) => item.chain))
		const uniqueProtocols = new Set(validItems.filter((item) => item.protocol).map((item) => item.protocol))
		const isSingleChain = uniqueChains.size === 1 && validItems.every((item) => !item.protocol)
		const isSingleProtocol = uniqueProtocols.size === 1 && validItems.every((item) => item.protocol)
		const color_uniqueItemIdsPerProtocol = new Map<string, string[]>()
		const color_uniqueItemIdsPerChain = new Map<string, string[]>()
		const color_uniqueItemIds = new Set<string>()
		for (const item of validItems) {
			if (item.protocol) {
				color_uniqueItemIdsPerProtocol.set(item.protocol, [
					...(color_uniqueItemIdsPerProtocol.get(item.protocol) || []),
					item.id
				])
			}
			if (item.chain) {
				color_uniqueItemIdsPerChain.set(item.chain, [...(color_uniqueItemIdsPerChain.get(item.chain) || []), item.id])
			}
		}

		for (const item in Object.fromEntries(color_uniqueItemIdsPerProtocol)) {
			if (color_uniqueItemIdsPerProtocol.get(item)?.length > 1) {
				;(color_uniqueItemIdsPerProtocol.get(item) || []).forEach((id) => {
					color_uniqueItemIds.add(id)
				})
			} else {
				color_uniqueItemIds.add(item)
			}
		}

		for (const item in Object.fromEntries(color_uniqueItemIdsPerChain)) {
			if (color_uniqueItemIdsPerChain.get(item)?.length > 1) {
				;(color_uniqueItemIdsPerChain.get(item) || []).forEach((id) => {
					color_uniqueItemIds.add(id)
				})
			} else {
				color_uniqueItemIds.add(item)
			}
		}

		const color_sortedItemIds = Array.from(color_uniqueItemIds).sort()
		const color_indexesTaken = new Set<number>()

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

			let color =
				cfg.color ||
				(isSingleChain || isSingleProtocol
					? EXTENDED_COLOR_PALETTE[index % EXTENDED_COLOR_PALETTE.length]
					: generateChartColor(itemIdentifier, meta?.color || '#8884d8'))

			let color_indexOfItemId = color_sortedItemIds.indexOf(itemIdentifier)
			if (color_indexesTaken.has(color_indexOfItemId)) {
				color_indexOfItemId = color_sortedItemIds.findIndex((id) => cfg.id === id)
			}

			if (!cfg.color && color_indexOfItemId !== -1) {
				color = COLOR_PALETTE_2[color_indexOfItemId % COLOR_PALETTE_2.length]
				color_indexesTaken.add(color_indexOfItemId)
			}

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

		if ((allBarType || allAreaType) && showStacked && !showCumulative && !showPercentage) {
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

		const seriesWithAverages = baseSeries.map((serie, serieIndex) => {
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

		const finalSeries = sortedSeries.map((serie, index) => {
			const color = serie.color || percentageColors[index % percentageColors.length]
			return {
				...serie,
				color: color,
				areaStyle: {
					color: color,
					opacity: 0.7
				}
			}
		})

		return finalSeries
	}, [validItems, showPercentage, showStacked, showCumulative, getProtocolInfo])

	const handleCsvExport = useCallback(() => {
		if (!series || series.length === 0) return

		const timestampSet = new Set<number>()
		series.forEach((s) => {
			s.data.forEach(([timestamp]) => timestampSet.add(timestamp))
		})
		const timestamps = Array.from(timestampSet).sort((a, b) => a - b)

		const headers = ['Date', ...series.map((s) => s.name)]

		const rows = timestamps.map((timestamp) => {
			const row = [new Date(timestamp * 1000).toLocaleDateString()]
			series.forEach((s) => {
				const dataPoint = s.data.find(([t]) => t === timestamp)
				row.push(dataPoint ? dataPoint[1].toString() : '0')
			})
			return row
		})

		const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')
		const fileName = `${multi.name || 'multi_chart'}_${new Date().toISOString().split('T')[0]}.csv`
		download(fileName, csvContent)
	}, [series, multi.name])

	const hasAnyData = validItems.length > 0
	const isAllLoading = loadingItems.length === multi.items.length

	const uniqueMetricTypes = new Set(validItems.map((item) => item.type))
	const percentMetricTypes = new Set(['medianApy'])
	const countMetricTypes = new Set(['txs', 'users', 'activeUsers', 'newUsers', 'gasUsed'])
	const allPercentMetrics = series.length > 0 && series.every((s: any) => percentMetricTypes.has(s.metricType))
	const allCountMetrics = series.length > 0 && series.every((s: any) => countMetricTypes.has(s.metricType))
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
		<div className="flex min-h-[402px] flex-col p-1 md:min-h-[418px]">
			<div className="flex flex-wrap items-center justify-end gap-2 p-1 md:p-3">
				<div className="mr-auto flex items-center gap-2">
					<h1 className="text-base font-semibold">{multi.name || `Multi-Chart (${multi.items.length})`}</h1>
				</div>
				{!isReadOnly && allChartsGroupable && hasAnyData && (
					<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
						{groupingOptions.map((dataInterval) => (
							<Tooltip
								content={capitalizeFirstLetter(dataInterval)}
								render={<button />}
								className="hover:not-disabled:pro-btn-blue focus-visible:not-disabled:pro-btn-blue shrink-0 px-2 py-1 text-xs whitespace-nowrap data-[active=true]:bg-(--old-blue) data-[active=true]:font-medium data-[active=true]:text-white"
								data-active={multi.grouping === dataInterval}
								onClick={() => handleGroupingChange(multi.id, dataInterval)}
								key={`${multi.id}-options-groupBy-${dataInterval}`}
							>
								{dataInterval.slice(0, 1).toUpperCase()}
							</Tooltip>
						))}
					</div>
				)}

				{!isReadOnly && hasAnyData && !hasMultipleMetrics && allChartsAreBarType && (
					<Select
						allValues={[
							{ name: 'Show individual values', key: 'Individual' },
							{ name: `Show cumulative values`, key: `Cumulative` }
						]}
						selectedValues={showCumulative ? 'Cumulative' : 'Individual'}
						setSelectedValues={(value) => {
							handleCumulativeChange(multi.id, value === 'Cumulative' ? true : false)
							if (value === 'Cumulative') {
								handleStackedChange(multi.id, false)
							}
						}}
						label={showCumulative ? 'Cumulative' : 'Individual'}
						labelType="none"
						triggerProps={{
							className:
								'hover:not-disabled:pro-btn-blue focus-visible:not-disabled:pro-btn-blue flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent focus-visible:border-transparent disabled:border-(--cards-border) disabled:text-(--text-disabled)'
						}}
					/>
				)}
				{!isReadOnly && hasAnyData && !hasMultipleMetrics && canStack && !showCumulative && (
					<Select
						allValues={[
							{ name: 'Show separate', key: 'Separate' },
							{ name: `Show stacked`, key: `Stacked` }
						]}
						selectedValues={showStacked ? 'Stacked' : 'Separate'}
						setSelectedValues={(value) => {
							handleStackedChange(multi.id, value === 'Separate' ? false : true)
							handlePercentageChange(multi.id, false)
						}}
						label={showStacked ? 'Stacked' : 'Separate'}
						labelType="none"
						triggerProps={{
							className:
								'hover:not-disabled:pro-btn-blue focus-visible:not-disabled:pro-btn-blue flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent focus-visible:border-transparent disabled:border-(--cards-border) disabled:text-(--text-disabled)'
						}}
					/>
				)}
				{!isReadOnly && hasAnyData && !hasMultipleMetrics && (
					<Select
						allValues={[
							{ name: 'Show absolute ($)', key: '$ Absolute' },
							{ name: `Show percentage (%)`, key: `% Percentage` }
						]}
						selectedValues={showPercentage ? '% Percentage' : '$ Absolute'}
						setSelectedValues={(value) => {
							handlePercentageChange(multi.id, value === '% Percentage' ? true : false)
							handleStackedChange(multi.id, false)
						}}
						label={showPercentage ? '% Percentage' : '$ Absolute'}
						labelType="none"
						triggerProps={{
							className:
								'hover:not-disabled:pro-btn-blue focus-visible:not-disabled:pro-btn-blue flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent focus-visible:border-transparent disabled:border-(--cards-border) disabled:text-(--text-disabled)'
						}}
					/>
				)}
				{series.length > 0 && (
					<>
						<ChartExportButton
							chartInstance={chartInstance}
							filename={multi.name || 'multi_chart'}
							title={multi.name || 'Multi Chart'}
							smol
						/>
						<ProTableCSVButton
							onClick={handleCsvExport}
							smol
							className="hover:not-disabled:pro-btn-blue focus-visible:not-disabled:pro-btn-blue flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent focus-visible:border-transparent disabled:border-(--cards-border) disabled:text-(--text-disabled)"
						/>
					</>
				)}
			</div>

			{loadingItems.length > 0 && failedItems.length < multi.items.length && (
				<div className="flex items-center gap-1.5 px-1 text-xs text-(--text-form) md:px-3">
					<div className="h-3 w-3 animate-spin rounded-full border-2 border-(--text-form) border-t-transparent" />
					<span>
						{validItems.length}/{multi.items.length - failedItems.length}
					</span>
				</div>
			)}

			{!hasAnyData && isAllLoading ? (
				<div className="flex flex-1 flex-col items-center justify-center">
					<div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-(--primary)"></div>
					<p className="text-sm text-(--text-form)">Loading charts...</p>
				</div>
			) : !hasAnyData ? (
				<div className="flex flex-1 flex-col items-center justify-center">
					<Icon name="alert-triangle" height={24} width={24} className="mx-auto mb-2 text-red-500" />
					<p className="text-sm text-(--text-label)">Failed to load chart data</p>
					<p className="mt-1 text-xs text-(--text-form)">
						{failedItems.length} of {multi.items.length} charts failed
					</p>
				</div>
			) : (
				<Suspense fallback={<div className="h-[360px]" />}>
					<MultiSeriesChart
						key={`${multi.id}-${showStacked}-${showPercentage}-${multi.grouping || 'day'}`}
						series={series}
						valueSymbol={showPercentage ? '%' : allPercentMetrics ? '%' : allCountMetrics ? '' : '$'}
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
						onReady={handleChartReady}
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
											top: series.length > 5 ? 80 : 80,
											bottom: 12,
											left: 12,
											right: 12,
											outerBoundsMode: 'same',
											outerBoundsContain: 'axisLabel'
										},
										legend: {
											top: 10,
											type: 'scroll',
											pageButtonPosition: 'end',
											height: series.length > 5 ? 80 : 40
										}
									}
								: allPercentMetrics
									? {
											yAxis: {
												max: undefined,
												min: undefined,
												axisLabel: {
													formatter: '{value}%'
												}
											},
											tooltip: {
												valueFormatter: (value: number) => value.toFixed(2) + '%'
											},
											grid: {
												top: series.length > 5 ? 80 : 40,
												bottom: 12,
												left: 12,
												right: 12,
												outerBoundsMode: 'same',
												outerBoundsContain: 'axisLabel'
											},
											legend: {
												top: 0,
												type: 'scroll',
												pageButtonPosition: 'end',
												height: series.length > 5 ? 80 : 40
											}
										}
									: allCountMetrics
										? {
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
													top: series.length > 5 ? 80 : 40,
													bottom: 12,
													left: 12,
													right: 12,
													outerBoundsMode: 'same',
													outerBoundsContain: 'axisLabel'
												},
												legend: {
													top: 0,
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
																return '$' + (value / 1e9).toFixed(1).replace(/\.0$/, '') + 'B'
															} else if (absValue >= 1e6) {
																return '$' + (value / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
															} else if (absValue >= 1e3) {
																return '$' + (value / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'
															}
															return '$' + value.toString()
														}
													}
												},
												grid: {
													top: series.length > 5 ? 80 : 40,
													bottom: 12,
													left: 12,
													right: 12,
													outerBoundsMode: 'same',
													outerBoundsContain: 'axisLabel'
												},
												legend: {
													top: 0,
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
	)
})

export default MultiChartCard
