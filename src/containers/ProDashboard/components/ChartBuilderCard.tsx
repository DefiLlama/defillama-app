import { useMemo, lazy, Suspense, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useProDashboard } from '../ProDashboardAPIContext'
import { download } from '~/utils'
import { ProTableCSVButton } from './ProTable/CsvButton'
import { Icon } from '~/components/Icon'
import dayjs from 'dayjs'
import ProtocolSplitCharts from '../services/ProtocolSplitCharts'

const MultiSeriesChart = lazy(() => import('~/components/ECharts/MultiSeriesChart'))


interface ChartBuilderCardProps {
	builder: {
		id: string
		kind: 'builder'
		config: {
			metric: 'fees' | 'revenue' | 'volume' | 'perps' | 'options-notional' | 'options-premium' | 
				'bridge-aggregators' | 'dex-aggregators' | 'perps-aggregators' | 
				'user-fees' | 'holders-revenue' | 'protocol-revenue' | 'supply-side-revenue'
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
	const { handlePercentageChange, handleGroupingChange, handleHideOthersChange, isReadOnly, timePeriod } = useProDashboard()
	const config = builder.config
	const groupingOptions: ('day' | 'week' | 'month' | 'quarter')[] = ['day', 'week', 'month', 'quarter']
	
	const { data: chartData, isLoading } = useQuery({
		queryKey: ['chartBuilder', config.metric, config.chains, config.limit, config.categories, config.hideOthers, timePeriod],
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
				series = series.map(s => ({
					...s,
					data: filterDataByTimePeriod(s.data, timePeriod)
				}))
			}
			
			if (config.hideOthers) {
				series = series.filter(s => !s.name.startsWith('Others'))
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
		if (builder.grouping && builder.grouping !== 'day') {
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
		}, [chartData, config.displayAs, config.chartType, builder.grouping])
	
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
	}, [chartSeries, builder.name, config.metric, config.chains])
	
	return (
		<div className="px-4 pb-4 pt-2 h-full min-h-[340px] flex flex-col">
			<div className="mb-2">
				<div className={``}>
					<div className="flex items-center gap-2 mb-2">
						<h3 className="text-sm font-medium text-(--text1)">
							{builder.name || `${config.metric} by Protocol`}
						</h3>
					</div>
					<div className="flex items-center justify-end gap-2">
						{!isReadOnly && (
							<div className="flex border border-(--form-control-border) overflow-hidden">
								{groupingOptions.map((option, index) => (
									<button
										key={option}
										onClick={() => handleGroupingChange(builder.id, option)}
										className={`px-2 sm:px-3 py-1 text-xs font-medium transition-colors duration-150 ease-in-out 
										${index > 0 ? 'border-l border-(--form-control-border)' : ''}
										${
											builder.grouping === option || (!builder.grouping && option === 'day')
												? 'bg-(--primary) text-white focus:outline-hidden focus:ring-2 focus:ring-(--primary) focus:ring-opacity-50'
												: 'bg-transparent pro-hover-bg pro-text2 focus:outline-hidden focus:ring-1 focus:ring-(--form-control-border)'
										}`}
									>
										<span className="hidden xs:inline">{option.charAt(0).toUpperCase() + option.slice(1)}</span>
										<span className="xs:hidden">{option.charAt(0).toUpperCase()}</span>
									</button>
								))}
							</div>
						)}
						{!isReadOnly && (
							<button
								onClick={() => handlePercentageChange(builder.id, config.displayAs !== 'percentage')}
								className="flex items-center gap-1 px-2 py-1 text-xs border pro-divider pro-hover-bg pro-text2 transition-colors pro-bg2 min-h-[25px]"
								title={config.displayAs === 'percentage' ? 'Show absolute values' : 'Show percentage'}
							>
								<Icon name={config.displayAs === 'percentage' ? 'percent' : 'dollar-sign'} height={12} width={12} />
								<span className="hidden xl:inline">{config.displayAs === 'percentage' ? 'Percentage' : 'Absolute'}</span>
							</button>
						)}
						{!isReadOnly && (
							<button
								onClick={() => handleHideOthersChange(builder.id, !config.hideOthers)}
								className="flex items-center gap-1 px-2 py-1 text-xs border pro-divider pro-hover-bg pro-text2 transition-colors pro-bg2 min-h-[25px]"
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
								customClassName="flex items-center gap-1 px-2 py-1 text-xs border pro-divider pro-hover-bg pro-text2 transition-colors pro-bg2 min-h-[25px]"
							/>
						)}
					</div>
				</div>
				<div className="text-xs text-(--text3) mt-1">
					{config.chains.join(', ')} • Top {config.limit} protocols{config.hideOthers ? ' only' : ''}
					{config.categories.length > 0 && ` • ${config.categories.join(', ')}`}
					{timePeriod && timePeriod !== 'all' && ` • ${timePeriod.toUpperCase()}`}
				</div>
			</div>
			
			<div style={{ height: '300px', flexGrow: 1 }}>
				{isLoading ? (
					<div className="flex items-center justify-center h-full">
						<div className="text-center">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(--primary) mx-auto mb-2"></div>
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
									containLabel: true
								},
								legend: {
									show: true,
									top: 10,
									type: 'scroll'
								},
								yAxis: config.displayAs === 'percentage' ? {
									max: 100,
									min: 0,
									axisLabel: {
										formatter: '{value}%'
									}
								} : {
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
					<div className="flex items-center justify-center h-full">
						<p className="text-sm text-(--text3)">No data available</p>
					</div>
				)}
			</div>
		</div>
	)
}
