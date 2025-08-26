import { lazy, Suspense, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Icon } from '~/components/Icon'
import { download } from '~/utils'
import { useProDashboard } from '../ProDashboardAPIContext'
import ProtocolSplitCharts from '../services/ProtocolSplitCharts'
import { ProTableCSVButton } from './ProTable/CsvButton'

const MultiSeriesChart = lazy(() => import('~/components/ECharts/MultiSeriesChart'))

interface ChartBuilderCardProps {
	builder: {
		id: string
		kind: 'builder'
		config: {
			metric:
				| 'fees'
				| 'revenue'
				| 'volume'
				| 'perps'
				| 'options-notional'
				| 'options-premium'
				| 'bridge-aggregators'
				| 'dex-aggregators'
				| 'perps-aggregators'
				| 'user-fees'
				| 'holders-revenue'
				| 'protocol-revenue'
				| 'supply-side-revenue'
				| 'tvl'
			chains: string[]
			categories: string[]
			groupBy: 'protocol'
			limit: number
			chartType: 'stackedBar' | 'stackedArea' | 'line'
			displayAs: 'timeSeries' | 'percentage'
			hideOthers?: boolean
			additionalFilters?: Record<string, any>
		}
		name?: string
		grouping?: 'day' | 'week' | 'month' | 'quarter'
	}
}

function filterDataByTimePeriod(data: any[], timePeriod: string): any[] {
	if (timePeriod === 'all' || !data.length) {
		return data
	}

	const now = dayjs()
	let cutoffDate: dayjs.Dayjs

	switch (timePeriod) {
		case '30d':
			cutoffDate = now.subtract(30, 'day')
			break
		case '90d':
			cutoffDate = now.subtract(90, 'day')
			break
		case '365d':
			cutoffDate = now.subtract(365, 'day')
			break
		case 'ytd':
			cutoffDate = now.startOf('year')
			break
		case '3y':
			cutoffDate = now.subtract(3, 'year')
			break
		default:
			return data
	}

	const cutoffTimestamp = cutoffDate.unix()
	return data.filter(([timestamp]: [number, any]) => timestamp >= cutoffTimestamp)
}

export function ChartBuilderCard({ builder }: ChartBuilderCardProps) {
	const { handlePercentageChange, handleGroupingChange, handleHideOthersChange, isReadOnly, timePeriod } =
		useProDashboard()
	const config = builder.config
	const groupingOptions: ('day' | 'week' | 'month' | 'quarter')[] = ['day', 'week', 'month', 'quarter']

	const isTvlChart = config.metric === 'tvl'

	const { data: chartData, isLoading } = useQuery({
		queryKey: [
			'chartBuilder',
			config.metric,
			config.chains,
			config.limit,
			config.categories,
			config.hideOthers,
			timePeriod
		],
		queryFn: async () => {
			if (config.chains.length === 0) return { series: [] }

			const data = await ProtocolSplitCharts.getProtocolSplitData(
				config.metric,
				config.chains,
				config.limit,
				config.categories
			)

			if (!data || !data.series) {
				return { series: [] }
			}

			let series = data.series
			if (timePeriod && timePeriod !== 'all') {
				series = series.map((s) => ({
					...s,
					data: filterDataByTimePeriod(s.data, timePeriod)
				}))
			}

			if (config.hideOthers) {
				series = series.filter((s) => !s.name.startsWith('Others'))
			}

			return { series }
		},
		enabled: config.chains.length > 0,
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	const chartSeries = useMemo(() => {
		if (!chartData || !chartData.series) return []

		let processedSeries = chartData.series
		if (builder.grouping && builder.grouping !== 'day' && !isTvlChart) {
			processedSeries = chartData.series.map((s: any) => {
				const aggregatedData: Map<number, number> = new Map()

				s.data.forEach(([timestamp, value]: [number, number]) => {
					const date = new Date(timestamp * 1000)
					let groupKey: number

					switch (builder.grouping) {
						case 'week':
							const weekDate = new Date(date)
							const day = weekDate.getDay()
							const diff = weekDate.getDate() - day + (day === 0 ? -6 : 1)
							weekDate.setDate(diff)
							weekDate.setHours(0, 0, 0, 0)
							groupKey = Math.floor(weekDate.getTime() / 1000)
							break
						case 'month':
							groupKey = Math.floor(new Date(date.getFullYear(), date.getMonth(), 1).getTime() / 1000)
							break
						case 'quarter':
							const quarter = Math.floor(date.getMonth() / 3)
							groupKey = Math.floor(new Date(date.getFullYear(), quarter * 3, 1).getTime() / 1000)
							break
						default:
							groupKey = timestamp
					}

					aggregatedData.set(groupKey, (aggregatedData.get(groupKey) || 0) + value)
				})

				return {
					...s,
					data: Array.from(aggregatedData.entries()).sort((a, b) => a[0] - b[0])
				}
			})
		}

		if (config.displayAs === 'percentage') {
			const timestampTotals = new Map<number, number>()
			processedSeries.forEach((s: any) => {
				s.data.forEach(([timestamp, value]: [number, number]) => {
					timestampTotals.set(timestamp, (timestampTotals.get(timestamp) || 0) + value)
				})
			})

			return processedSeries.map((s: any) => ({
				name: s.name,
				data: s.data.map(([timestamp, value]: [number, number]) => {
					const total = timestampTotals.get(timestamp) || 0
					return [timestamp, total > 0 ? (value / total) * 100 : 0]
				}),
				color: s.color,
				type: config.chartType === 'stackedBar' ? 'bar' : 'line',
				...(config.chartType === 'stackedArea' && {
					areaStyle: { opacity: 0.7 },
					stack: 'total'
				}),
				...(config.chartType === 'stackedBar' && {
					stack: 'total'
				})
			}))
		}

		return processedSeries.map((s: any) => ({
			name: s.name,
			data: s.data,
			color: s.color,
			type: config.chartType === 'stackedBar' ? 'bar' : 'line',
			...(config.chartType === 'stackedArea' && {
				areaStyle: { opacity: 0.7 },
				stack: 'total'
			}),
			...(config.chartType === 'stackedBar' && {
				stack: 'total'
			})
		}))
	}, [chartData, config.displayAs, config.chartType, builder.grouping, isTvlChart])

	const handleCsvExport = useCallback(() => {
		if (!chartSeries || chartSeries.length === 0) return

		const timestampSet = new Set<number>()
		chartSeries.forEach((s: any) => {
			s.data.forEach(([timestamp]: [number, number]) => timestampSet.add(timestamp))
		})
		const timestamps = Array.from(timestampSet).sort((a, b) => a - b)

		const headers = ['Date', ...chartSeries.map((s: any) => s.name)]

		const rows = timestamps.map((timestamp) => {
			const row = [new Date(timestamp * 1000).toLocaleDateString()]
			chartSeries.forEach((s: any) => {
				const dataPoint = s.data.find(([t]: [number, number]) => t === timestamp)
				row.push(dataPoint ? dataPoint[1].toString() : '0')
			})
			return row
		})

		const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')
		const fileName = `${builder.name || config.metric}_${config.chains.join('-')}_${config.categories.length > 0 ? config.categories.join('-') + '_' : ''}${new Date().toISOString().split('T')[0]}.csv`
		download(fileName, csvContent)
	}, [chartSeries, builder.name, config.metric, config.chains, config.categories])

	return (
		<div className="flex h-full min-h-[340px] flex-col gap-2 px-4 pt-2 pb-4">
			<div>
				<div className="flex items-center justify-end gap-2">
					<h3 className="mr-auto text-sm font-medium text-(--text1)">
						{builder.name || `${config.metric} by Protocol`}
					</h3>
					{!isReadOnly && !isTvlChart && (
						<div className="flex overflow-hidden border border-(--form-control-border)">
							{groupingOptions.map((option, index) => (
								<button
									key={option}
									onClick={() => handleGroupingChange(builder.id, option)}
									className={`px-2 py-1 text-xs font-medium transition-colors duration-150 ease-in-out sm:px-3 ${index > 0 ? 'border-l border-(--form-control-border)' : ''} ${
										builder.grouping === option || (!builder.grouping && option === 'day')
											? 'focus:ring-opacity-50 bg-(--primary) text-white focus:ring-2 focus:ring-(--primary) focus:outline-hidden'
											: 'pro-hover-bg pro-text2 bg-transparent focus:ring-1 focus:ring-(--form-control-border) focus:outline-hidden'
									}`}
								>
									<span className="xs:inline hidden">{option.charAt(0).toUpperCase() + option.slice(1)}</span>
									<span className="xs:hidden">{option.charAt(0).toUpperCase()}</span>
								</button>
							))}
						</div>
					)}
					{!isReadOnly && (
						<button
							onClick={() => handlePercentageChange(builder.id, config.displayAs !== 'percentage')}
							className="pro-divider pro-hover-bg pro-text2 pro-bg2 flex min-h-[25px] items-center gap-1 border px-2 py-1 text-xs transition-colors"
							title={config.displayAs === 'percentage' ? 'Show absolute values' : 'Show percentage'}
						>
							<Icon name={config.displayAs === 'percentage' ? 'percent' : 'dollar-sign'} height={12} width={12} />
							<span className="hidden xl:inline">{config.displayAs === 'percentage' ? 'Percentage' : 'Absolute'}</span>
						</button>
					)}
					{!isReadOnly && (
						<button
							onClick={() => handleHideOthersChange(builder.id, !config.hideOthers)}
							className="pro-divider pro-hover-bg pro-text2 pro-bg2 flex min-h-[25px] items-center gap-1 border px-2 py-1 text-xs transition-colors"
							title={config.hideOthers ? 'Show all protocols' : 'Show only top protocols'}
						>
							<Icon name="layers" height={12} width={12} />
							<span className="hidden xl:inline">{config.hideOthers ? `Top ${config.limit}` : 'All'}</span>
						</button>
					)}
					{chartSeries.length > 0 && (
						<ProTableCSVButton
							onClick={handleCsvExport}
							smol
							className="pro-divider pro-hover-bg pro-text2 pro-bg2 flex min-h-[25px] items-center gap-1 border px-2 py-1 text-xs transition-colors"
						/>
					)}
				</div>
				<p className="mt-1 text-xs text-(--text3)">
					{config.chains.join(', ')} • Top {config.limit} protocols{config.hideOthers ? ' only' : ''}
					{config.categories.length > 0 && ` • ${config.categories.join(', ')}`}
					{timePeriod && timePeriod !== 'all' && ` • ${timePeriod.toUpperCase()}`}
				</p>
			</div>
			<div className="min-h-[300px] flex-1">
				{isLoading ? (
					<div className="flex h-full items-center justify-center">
						<div className="text-center">
							<div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-(--primary)"></div>
							<p className="text-sm text-(--text3)">Loading chart...</p>
						</div>
					</div>
				) : chartSeries.length > 0 ? (
					<Suspense fallback={<></>}>
						<MultiSeriesChart
							key={`chart-${config.displayAs}-${config.chartType}-${builder.grouping || 'day'}-${config.hideOthers ? 'top' : 'all'}`}
							series={chartSeries as any}
							valueSymbol={config.displayAs === 'percentage' ? '%' : '$'}
							groupBy={
								builder.grouping === 'week'
									? 'weekly'
									: builder.grouping === 'month'
										? 'monthly'
										: builder.grouping === 'quarter'
											? 'quarterly'
											: 'daily'
							}
							hideDataZoom={true}
							chartOptions={{
								grid: {
									top: 40,
									bottom: 68,
									left: 12,
									right: 12,
									outerBoundsMode: 'same',
									outerBoundsContain: 'axisLabel'
								},
								legend: {
									show: true,
									top: 0,
									type: 'scroll',
									selectedMode: 'multiple',
									pageButtonItemGap: 5,
									pageButtonGap: 20,
									data: chartSeries?.map((s) => s.name) || []
								},
								tooltip: {
									formatter: function (params: any) {
										const date = new Date(params[0].value[0])
										const chartdate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`

										let filteredParams = params.filter((item: any) => item.value[1] !== '-' && item.value[1])
										filteredParams.sort((a: any, b: any) => Math.abs(b.value[1]) - Math.abs(a.value[1]))

										const formatValue = (value: number) => {
											if (config.displayAs === 'percentage') {
												return `${Math.round(value * 100) / 100}%`
											}
											const absValue = Math.abs(value)
											if (absValue >= 1e9) {
												return '$' + (value / 1e9).toFixed(1) + 'B'
											} else if (absValue >= 1e6) {
												return '$' + (value / 1e6).toFixed(1) + 'M'
											} else if (absValue >= 1e3) {
												return '$' + (value / 1e3).toFixed(0) + 'K'
											}
											return '$' + value.toFixed(0)
										}

										const useTwoColumns = config.limit > 10

										const createItem = (curr: any, nameLength: number = 20) => {
											let name = curr.seriesName
											if (name.length > nameLength) {
												name = name.substring(0, nameLength - 2) + '..'
											}

											return (
												'<div style="display:flex;align-items:center;font-size:11px;line-height:1.4;white-space:nowrap">' +
												curr.marker +
												'<span style="margin-right:4px">' +
												name +
												'</span>' +
												'<span style="margin-left:auto;font-weight:500">' +
												formatValue(curr.value[1]) +
												'</span>' +
												'</div>'
											)
										}

										let content = ''

										if (useTwoColumns) {
											const midpoint = Math.ceil(filteredParams.length / 2)
											const leftColumn = filteredParams.slice(0, midpoint)
											const rightColumn = filteredParams.slice(midpoint)

											const leftColumnHtml = leftColumn.map((item: any) => createItem(item, 15)).join('')
											const rightColumnHtml = rightColumn.map((item: any) => createItem(item, 15)).join('')

											content =
												`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">` +
												`<div>${leftColumnHtml}</div>` +
												`<div>${rightColumnHtml}</div>` +
												`</div>`
										} else {
											const singleColumnHtml = filteredParams.map((item: any) => createItem(item, 20)).join('')
											content = `<div>${singleColumnHtml}</div>`
										}

										return (
											`<div style="max-width:${useTwoColumns ? '400px' : '300px'}">` +
											`<div style="font-size:12px;margin-bottom:4px;font-weight:500">${chartdate}</div>` +
											content +
											`</div>`
										)
									},
									confine: true
								},
								yAxis:
									config.displayAs === 'percentage'
										? {
												max: 100,
												min: 0,
												axisLabel: {
													formatter: '{value}%'
												}
											}
										: {
												type: 'value',
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
														return '$' + value.toFixed(0)
													}
												}
											}
							}}
						/>
					</Suspense>
				) : (
					<div className="flex h-full items-center justify-center">
						<p className="text-sm text-(--text3)">No data available</p>
					</div>
				)}
			</div>
		</div>
	)
}
