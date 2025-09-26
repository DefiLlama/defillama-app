import { lazy, Suspense, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Select } from '~/components/Select'
import { filterDataByTimePeriod } from '~/containers/ProDashboard/queries'
import { download } from '~/utils'
import { useChartImageExport } from '../hooks/useChartImageExport'
import { useProDashboard } from '../ProDashboardAPIContext'
import ProtocolSplitCharts from '../services/ProtocolSplitCharts'
import { ProTableCSVButton } from './ProTable/CsvButton'
import { ImageExportButton } from './ProTable/ImageExportButton'

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
			mode: 'chains' | 'protocol'
			filterMode?: 'include' | 'exclude'
			protocol?: string
			chains: string[]
			chainCategories?: string[]
			categories: string[]
			groupBy: 'protocol'
			limit: number
			chartType: 'stackedBar' | 'stackedArea' | 'line'
			displayAs: 'timeSeries' | 'percentage'
			hideOthers?: boolean
			groupByParent?: boolean
			additionalFilters?: Record<string, any>
		}
		name?: string
		grouping?: 'day' | 'week' | 'month' | 'quarter'
	}
}

export function ChartBuilderCard({ builder }: ChartBuilderCardProps) {
	const {
		handlePercentageChange,
		handleGroupingChange,
		handleHideOthersChange,
		isReadOnly,
		timePeriod,
		getProtocolInfo
	} = useProDashboard()
	const { chartInstance, handleChartReady } = useChartImageExport()
	const config = builder.config
	const groupingOptions: ('day' | 'week' | 'month' | 'quarter')[] = ['day', 'week', 'month', 'quarter']

	const isTvlChart = config.metric === 'tvl'

	const { data: chartData, isLoading } = useQuery({
		queryKey: [
			'chartBuilder',
			config.mode,
			config.metric,
			config.protocol,
			config.chains,
			config.limit,
			config.categories,
			config.chainCategories,
			config.hideOthers,
			config.groupByParent,
			config.filterMode || 'include',
			timePeriod
		],
		queryFn: async () => {
			if (config.mode === 'protocol') {
				const data = await ProtocolSplitCharts.getProtocolChainData(
					config.protocol,
					config.metric,
					config.chains.length > 0 ? config.chains : undefined,
					config.limit,
					config.filterMode || 'include',
					config.chainCategories && config.chainCategories.length > 0 ? config.chainCategories : undefined
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

				if (
					config.hideOthers ||
					(config.mode === 'protocol' && config.chainCategories && config.chainCategories.length > 0)
				) {
					series = series.filter((s) => !s.name.startsWith('Others'))
				}

				return { series }
			}

			const data = await ProtocolSplitCharts.getProtocolSplitData(
				config.metric,
				config.chains,
				config.limit,
				config.categories,
				config.groupByParent,
				config.filterMode || 'include'
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

			if (config.hideOthers || (config.chainCategories && config.chainCategories.length > 0)) {
				series = series.filter((s) => !s.name.startsWith('Others'))
			}

			return { series }
		},
		enabled: !!config.metric,
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	const chartSeries = useMemo(() => {
		if (!chartData || !chartData.series) return []

		let processedSeries = chartData.series
		if (builder.grouping && builder.grouping !== 'day') {
			processedSeries = chartData.series.map((s: any) => {
				const aggregatedData: Map<number, { value: number; lastTimestamp: number }> = new Map()

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

					const existingEntry = aggregatedData.get(groupKey)
					if (isTvlChart) {
						if (!existingEntry || timestamp > existingEntry.lastTimestamp) {
							aggregatedData.set(groupKey, { value, lastTimestamp: timestamp })
						}
					} else {
						const currentValue = existingEntry?.value ?? 0
						const lastTimestamp = existingEntry?.lastTimestamp ?? timestamp
						aggregatedData.set(groupKey, {
							value: currentValue + value,
							lastTimestamp
						})
					}
				})

				return {
					...s,
					data: Array.from(aggregatedData.entries())
						.sort((a, b) => a[0] - b[0])
						.map(([periodStart, { value }]) => [periodStart, value])
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
		const fileName = `${
			builder.name || config.metric
		}_${config.chains.join('-')}_${config.categories.length > 0 ? config.categories.join('-') + '_' : ''}${
			config.chainCategories && config.chainCategories.length > 0 ? config.chainCategories.join('-') + '_' : ''
		}${new Date().toISOString().split('T')[0]}.csv`
		download(fileName, csvContent)
	}, [chartSeries, builder.name, config.metric, config.chains, config.categories, config.chainCategories])

	return (
		<div className="flex min-h-[422px] flex-col p-1 md:min-h-[438px]">
			<div className="flex flex-col gap-1 p-1 md:p-3">
				<div className="flex flex-wrap items-center justify-end gap-2">
					<h1 className="mr-auto text-base font-semibold">
						{builder.name ||
							(config.mode === 'protocol'
								? `${(config.protocol && (getProtocolInfo(config.protocol)?.name || config.protocol)) || 'All Protocols'} ${config.metric} by Chain`
								: `${config.metric} by Protocol`)}
					</h1>
					{!isReadOnly && chartSeries.length > 0 && (
						<div className="flex overflow-hidden rounded-md border border-(--form-control-border)">
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
									{option.slice(0, 1).toUpperCase()}
								</button>
							))}
						</div>
					)}
					{!isReadOnly && (
						<Select
							allValues={[
								{ name: 'Show absolute ($)', key: '$ Absolute' },
								{ name: `Show percentage (%)`, key: `% Percentage` }
							]}
							selectedValues={config.displayAs === 'percentage' ? '% Percentage' : '$ Absolute'}
							setSelectedValues={(value) => {
								handlePercentageChange(builder.id, value === '% Percentage' ? true : false)
							}}
							label={config.displayAs === 'percentage' ? '% Percentage' : '$ Absolute'}
							labelType="none"
							triggerProps={{
								className:
									'hover:not-disabled:pro-btn-blue focus-visible:not-disabled:pro-btn-blue flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent focus-visible:border-transparent disabled:border-(--cards-border) disabled:text-(--text-disabled)'
							}}
						/>
					)}
					{!isReadOnly &&
						(config.mode !== 'protocol' || !(config.chainCategories && config.chainCategories.length > 0)) && (
							<Select
								allValues={[
									{ name: config.mode === 'protocol' ? 'Show all chains' : 'Show all protocols', key: 'All' },
									{
										name: config.mode === 'protocol' ? `Show only top chains` : `Show only top protocols`,
										key: `Top ${config.limit}`
									}
								]}
								selectedValues={config.hideOthers ? `Top ${config.limit}` : 'All'}
								setSelectedValues={(value) => {
									handleHideOthersChange(builder.id, value === 'All' ? false : true)
								}}
								label={config.hideOthers ? `Top ${config.limit}` : 'All'}
								labelType="none"
								triggerProps={{
									className:
										'hover:not-disabled:pro-btn-blue focus-visible:not-disabled:pro-btn-blue flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent focus-visible:border-transparent disabled:border-(--cards-border) disabled:text-(--text-disabled)'
								}}
							/>
						)}
					{chartSeries.length > 0 && (
						<>
							<ImageExportButton
								chartInstance={chartInstance}
								filename={builder.name || config.metric}
								title={builder.name || `${config.metric} by Protocol`}
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
				{(() => {
					const parts: string[] = []
					if (config.mode === 'protocol') {
						const protoName = config.protocol
							? getProtocolInfo(config.protocol)?.name || config.protocol
							: 'All Protocols'
						parts.push(protoName)
						if ((config.filterMode || 'include') === 'exclude' && config.chains.length > 0) {
							parts.push(`Excluding ${config.chains.join(', ')}`)
						} else if (config.chains.length > 0) {
							parts.push(config.chains.join(', '))
						} else {
							parts.push('All chains')
						}
						if (config.chainCategories && config.chainCategories.length > 0) {
							const cats = config.chainCategories.join(', ')
							if ((config.filterMode || 'include') === 'exclude') parts.push(`Excluding ${cats}`)
							else parts.push(cats)
						}
					} else {
						parts.push(`${config.chains.join(', ')} • Top ${config.limit} protocols${config.hideOthers ? ' only' : ''}`)
						if (config.categories.length > 0) parts.push(config.categories.join(', '))
					}
					if (timePeriod && timePeriod !== 'all') parts.push(timePeriod.toUpperCase())
					return <p className="text-xs text-(--text-label)">{parts.join(' • ')}</p>
				})()}
			</div>

			{isLoading ? (
				<div className="flex flex-1 flex-col items-center justify-center">
					<div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-(--primary)"></div>
					<p className="text-sm text-(--text-form)">Loading chart...</p>
				</div>
			) : chartSeries.length > 0 ? (
				<Suspense fallback={<div className="min-h-[300px]" />}>
					<MultiSeriesChart
						key={`${builder.id}-${config.displayAs}-${builder.grouping || 'day'}-${config.hideOthers}-${config.limit}`}
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
						onReady={handleChartReady}
						chartOptions={{
							grid: {
								top: 40,
								bottom: 12,
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
				<div className="flex flex-1 flex-col items-center justify-center">
					<p className="text-sm text-(--text-label)">No data available</p>
				</div>
			)}
		</div>
	)
}
