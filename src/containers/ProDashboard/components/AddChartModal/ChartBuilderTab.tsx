import { useMemo, useEffect, useState, lazy, Suspense } from 'react'
import { ChartBuilderConfig } from './types'
import { ItemSelect } from '../ItemSelect'
import { ItemMultiSelect } from '../ItemMultiSelect'
import { Icon } from '~/components/Icon'
import { ChartPreview } from '../ChartPreview'
import { useQuery } from '@tanstack/react-query'
import { PROTOCOLS_API } from '~/constants'
import ProtocolSplitCharts from '../../services/ProtocolSplitCharts'

const MultiSeriesChart = lazy(() => import('~/components/ECharts/MultiSeriesChart'))

interface ChartBuilderTabProps {
	chartBuilder: ChartBuilderConfig
	chartBuilderName: string
	chainOptions: Array<{ value: string; label: string }>
	protocolsLoading: boolean
	onChartBuilderChange: (updates: Partial<ChartBuilderConfig>) => void
	onChartBuilderNameChange: (name: string) => void
}

const METRIC_OPTIONS = [
	{ value: 'fees', label: 'Fees' },
	{ value: 'revenue', label: 'Revenue' },
	{ value: 'volume', label: 'DEX Volume' },
	{ value: 'protocol-revenue', label: 'Protocol Revenue' },
	{ value: 'supply-side-revenue', label: 'Supply Side Revenue' },
	{ value: 'holders-revenue', label: 'Holders Revenue' },
	{ value: 'user-fees', label: 'User Fees' },
	{ value: 'perps', label: 'Perps Volume' },
	{ value: 'dex-aggregators', label: 'DEX Aggregator Volume' },
	{ value: 'options-notional', label: 'Options Notional' },
	{ value: 'options-premium', label: 'Options Premium' },
	{ value: 'bridge-aggregators', label: 'Bridge Aggregator Volume' },
	{ value: 'perps-aggregators', label: 'Perps Aggregator Volume' }
]

const CHART_TYPE_OPTIONS = [
	{ value: 'stackedBar', label: 'Stacked Bar', icon: 'bar-chart-2' },
	{ value: 'stackedArea', label: 'Stacked Area', icon: 'trending-up' },
	{ value: 'line', label: 'Line Chart', icon: 'activity' }
]

const DISPLAY_OPTIONS = [
	{ value: 'timeSeries', label: 'Time Series' },
	{ value: 'percentage', label: 'Percentage' }
]

const LIMIT_OPTIONS = [
	{ value: '5', label: 'Top 5' },
	{ value: '10', label: 'Top 10' },
	{ value: '20', label: 'Top 20' }
]

export function ChartBuilderTab({
	chartBuilder,
	chartBuilderName,
	chainOptions,
	protocolsLoading,
	onChartBuilderChange,
	onChartBuilderNameChange
}: ChartBuilderTabProps) {
	const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

	const { data: protocols } = useQuery({
		queryKey: ['protocols'],
		queryFn: async () => {
			const response = await fetch(PROTOCOLS_API)
			const data = await response.json()
			return data.protocols || []
		},
		staleTime: 60 * 60 * 1000
	})

	const categoryOptions = useMemo(() => {
		if (!protocols) return []
		const categoriesSet = new Set<string>()
		protocols.forEach((protocol: any) => {
			if (protocol.category) {
				categoriesSet.add(protocol.category)
			}
		})
		return Array.from(categoriesSet)
			.sort()
			.map((cat) => ({
				value: cat,
				label: cat
			}))
	}, [protocols])

	const { data: previewData, isLoading: previewLoading } = useQuery({
		queryKey: ['chartBuilder', chartBuilder.metric, chartBuilder.chains, chartBuilder.limit, chartBuilder.categories],
		queryFn: async () => {
			if (chartBuilder.chains.length === 0) return null

			const data = await ProtocolSplitCharts.getProtocolSplitData(
				chartBuilder.metric,
				chartBuilder.chains,
				chartBuilder.limit,
				chartBuilder.categories
			)

			if (data && data.series.length > 0) {
				data.series = data.series.map((serie) => ({
					...serie,
					data: serie.data.slice(-365)
				}))
			}

			return data
		},
		enabled: chartBuilder.chains.length > 0,
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	const handleMetricChange = (option: any) => {
		onChartBuilderChange({ metric: option?.value || 'fees' })
	}

	const handleChainsChange = (options: any[]) => {
		const chains = options.map((opt) => opt.value)
		onChartBuilderChange({ chains })
	}

	const handleCategoriesChange = (options: any[]) => {
		const categories = options.map((opt) => opt.value)
		onChartBuilderChange({ categories })
	}

	const handleLimitChange = (option: any) => {
		onChartBuilderChange({ limit: parseInt(option?.value) || 10 })
	}

	const handleChartTypeChange = (type: 'stackedBar' | 'stackedArea' | 'line') => {
		onChartBuilderChange({ chartType: type })
	}

	const handleDisplayChange = (display: 'timeSeries' | 'percentage') => {
		onChartBuilderChange({ displayAs: display })
	}

	return (
		<div className="flex flex-col h-full">
			<div className="mb-1">
				<label className="block mb-1 text-xs font-medium pro-text2">Chart Name</label>
				<input
					type="text"
					value={chartBuilderName}
					onChange={(e) => onChartBuilderNameChange(e.target.value)}
					placeholder="Enter chart name..."
					className="w-full px-2 py-1.5 border pro-border pro-text1 placeholder-pro-text3 focus:border-(--primary1) focus:outline-hidden pro-bg2 text-sm"
				/>
			</div>

			<div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0">
				<div className="w-full lg:w-[320px] xl:w-[360px] border pro-border p-2 space-y-1.5 overflow-y-auto overflow-x-visible flex-shrink-0 max-h-[calc(100vh-200px)]">
					<h3 className="text-[11px] font-semibold pro-text1">Chart Configuration</h3>

					<div>
						<ItemSelect
							label="Metric"
							options={METRIC_OPTIONS}
							selectedValue={chartBuilder.metric}
							onChange={handleMetricChange}
							placeholder="Select metric..."
							isLoading={false}
						/>
					</div>

					<div className="border-t pro-border pt-1.5">
						<h4 className="text-[11px] font-medium pro-text2 mb-1">Filters</h4>

						<div className="mb-1.5">
							<ItemMultiSelect
								label="Chains"
								options={chainOptions}
								selectedValues={chartBuilder.chains}
								onChange={handleChainsChange}
								placeholder="Select chains..."
								isLoading={protocolsLoading}
								itemType="chain"
								maxSelections={10}
							/>
						</div>

						<div className="mb-1.5">
							<ItemMultiSelect
								label="Categories"
								options={categoryOptions}
								selectedValues={chartBuilder.categories}
								onChange={handleCategoriesChange}
								placeholder="Select categories..."
								isLoading={false}
								itemType="text"
								maxSelections={5}
							/>
						</div>

						<div className="mb-1.5">
							<ItemSelect
								label="Number of Protocols"
								options={LIMIT_OPTIONS}
								selectedValue={chartBuilder.limit.toString()}
								onChange={handleLimitChange}
								placeholder="Select limit..."
								isLoading={false}
							/>
						</div>

						<div className="mb-1.5">
							<label className="flex items-center gap-2 cursor-pointer">
								<div className="relative w-4 h-4">
									<input
										type="checkbox"
										checked={chartBuilder.hideOthers || false}
										onChange={(e) => onChartBuilderChange({ hideOthers: e.target.checked })}
										className="sr-only"
									/>
									<div
										className={`w-4 h-4 border-2 transition-all ${
											chartBuilder.hideOthers ? 'border-(--primary1) bg-(--primary1)' : 'border-gray-600 pro-bg2'
										}`}
									>
										{chartBuilder.hideOthers && (
											<svg
												viewBox="0 0 24 24"
												fill="none"
												stroke="white"
												strokeWidth="3"
												className="w-full h-full p-0.5"
											>
												<polyline points="20 6 9 17 4 12" />
											</svg>
										)}
									</div>
								</div>
								<span className="text-[11px] pro-text2">Hide "Others" (show only top {chartBuilder.limit})</span>
							</label>
						</div>
					</div>

					<div className="border-t pro-border pt-1.5">
						<h4 className="text-[11px] font-medium pro-text2 mb-1">Chart type</h4>
						<div className="grid grid-cols-3 gap-1">
							{CHART_TYPE_OPTIONS.map((option) => (
								<button
									key={option.value}
									onClick={() => handleChartTypeChange(option.value as any)}
									className={`flex flex-col items-center gap-0.5 p-1 border transition-colors ${
										chartBuilder.chartType === option.value
											? 'border-(--primary1) bg-(--primary1)/10 text-(--primary1)'
											: 'pro-border pro-hover-bg pro-text2'
									}`}
								>
									<Icon name={option.icon as any} height={14} width={14} />
									<span className="text-[10px]">{option.label}</span>
								</button>
							))}
						</div>
					</div>

					<div className="border-t pro-border pt-1.5">
						<h4 className="text-[11px] font-medium pro-text2 mb-1">Display value as</h4>
						<div className="flex gap-1">
							{DISPLAY_OPTIONS.map((option) => (
								<button
									key={option.value}
									onClick={() => handleDisplayChange(option.value as any)}
									className={`flex-1 px-2 py-1 text-xs border transition-colors ${
										chartBuilder.displayAs === option.value
											? 'border-(--primary1) bg-(--primary1) text-white'
											: 'pro-border pro-hover-bg pro-text2'
									}`}
								>
									{option.label}
								</button>
							))}
						</div>
					</div>
				</div>

				<div className="flex-1 border pro-border p-3 flex flex-col min-h-0">
					<div className="flex items-center justify-between mb-2 flex-shrink-0">
						<h3 className="text-xs font-semibold pro-text1">Preview</h3>
						<div className="flex items-center gap-1 text-[10px] pro-text3">
							<span>ⓘ</span>
							<span>Updates as you configure</span>
						</div>
					</div>

					<div
						className="flex-1 pro-bg2 rounded flex items-center justify-center relative"
						style={{ minHeight: '500px' }}
					>
						{previewLoading ? (
							<div className="text-center">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(--primary1) mx-auto mb-2"></div>
								<p className="text-sm pro-text2">Loading preview...</p>
							</div>
						) : previewData && previewData.series.length > 0 ? (
							<div className="absolute inset-0 p-2">
								<Suspense fallback={<div className="animate-pulse h-full w-full pro-bg3"></div>}>
									<MultiSeriesChart
										height="500px"
										key={`chart-${chartBuilder.displayAs}-${chartBuilder.chartType}-${chartBuilder.hideOthers}`}
										series={(() => {
											let filteredSeries = chartBuilder.hideOthers
												? previewData.series.filter((s) => !s.name.startsWith('Others'))
												: previewData.series

											filteredSeries = filteredSeries.map((s) => {
												const aggregatedData: Map<number, number> = new Map()

												s.data.forEach(([timestamp, value]: [number, number]) => {
													const date = new Date(timestamp * 1000)
													const weekDate = new Date(date)
													const day = weekDate.getDay()
													const diff = weekDate.getDate() - day + (day === 0 ? -6 : 1)
													weekDate.setDate(diff)
													weekDate.setHours(0, 0, 0, 0)
													const weekKey = Math.floor(weekDate.getTime() / 1000)

													aggregatedData.set(weekKey, (aggregatedData.get(weekKey) || 0) + value)
												})

												return {
													...s,
													data: Array.from(aggregatedData.entries()).sort((a, b) => a[0] - b[0])
												}
											})

											if (chartBuilder.displayAs === 'percentage') {
												const timestampTotals = new Map<number, number>()
												filteredSeries.forEach((s) => {
													s.data.forEach(([timestamp, value]) => {
														timestampTotals.set(timestamp, (timestampTotals.get(timestamp) || 0) + value)
													})
												})

												return filteredSeries.map((s) => ({
													name: s.name,
													data: s.data.map(([timestamp, value]) => {
														const total = timestampTotals.get(timestamp) || 0
														return [timestamp, total > 0 ? (value / total) * 100 : 0]
													}),
													color: s.color,
													type: chartBuilder.chartType === 'stackedBar' ? 'bar' : 'line',
													...(chartBuilder.chartType === 'stackedArea' && {
														areaStyle: { opacity: 0.7 },
														stack: 'total'
													}),
													...(chartBuilder.chartType === 'stackedBar' && {
														stack: 'total'
													})
												}))
											}

											return filteredSeries.map((s) => ({
												name: s.name,
												data: s.data,
												color: s.color,
												type: chartBuilder.chartType === 'stackedBar' ? 'bar' : 'line',
												...(chartBuilder.chartType === 'stackedArea' && {
													areaStyle: { opacity: 0.7 },
													stack: 'total'
												}),
												...(chartBuilder.chartType === 'stackedBar' && {
													stack: 'total'
												})
											}))
										})()}
										valueSymbol={chartBuilder.displayAs === 'percentage' ? '%' : '$'}
										hideDataZoom={true}
										chartOptions={{
											grid: {
												top: 40,
												bottom: 40,
												left: 12,
												right: 12,
												containLabel: true
											},
											legend: {
												show: true,
												top: 10,
												type: 'scroll',
												selectedMode: 'multiple',
												pageButtonItemGap: 5,
												pageButtonGap: 20,
												data: (() => {
													let filteredSeries = chartBuilder.hideOthers
														? previewData.series.filter((s) => !s.name.startsWith('Others'))
														: previewData.series
													return filteredSeries?.map((s) => s.name) || []
												})()
											},
											tooltip: {
												formatter: function (params: any) {
													const chartdate = new Date(params[0].value[0]).toLocaleDateString()

													let filteredParams = params.filter((item: any) => item.value[1] !== '-' && item.value[1])
													filteredParams.sort((a: any, b: any) => Math.abs(b.value[1]) - Math.abs(a.value[1]))

													const formatValue = (value: number) => {
														if (chartBuilder.displayAs === 'percentage') {
															return `${Math.round(value * 100) / 100}%`
														}
														const absValue = Math.abs(value)
														if (absValue >= 1e9) {
															return '$' + (value / 1e9).toFixed(2) + 'B'
														} else if (absValue >= 1e6) {
															return '$' + (value / 1e6).toFixed(2) + 'M'
														} else if (absValue >= 1e3) {
															return '$' + (value / 1e3).toFixed(2) + 'K'
														}
														return '$' + value.toFixed(2)
													}

													const vals = filteredParams.reduce((prev: string, curr: any) => {
														return (prev +=
															'<li style="list-style:none">' +
															curr.marker +
															curr.seriesName +
															'&nbsp;&nbsp;' +
															formatValue(curr.value[1]) +
															'</li>')
													}, '')

													return chartdate + vals
												}
											},
											yAxis:
												chartBuilder.displayAs === 'percentage'
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
							</div>
						) : (
							<div className="text-center">
								<Icon name="bar-chart-2" height={48} width={48} className="mx-auto mb-2 pro-text3" />
								<p className="text-sm pro-text2">Configure chart settings to see preview</p>
								<p className="text-xs pro-text3 mt-1">Select metric and chains to generate chart</p>
							</div>
						)}
					</div>

					<div className="mt-2 p-2 pro-bg2 rounded flex-shrink-0">
						<div className="flex items-start gap-1">
							<span className="text-[10px] pro-text3">ⓘ</span>
							<p className="text-[10px] pro-text3 leading-relaxed">
								This chart shows {chartBuilder.metric} breakdown by top {chartBuilder.limit} protocols
								{chartBuilder.chains.length > 0 && ` on ${chartBuilder.chains.join(', ')}`}
								{chartBuilder.categories.length > 0 && ` in ${chartBuilder.categories.join(', ')} categories`}. Data is
								displayed as {chartBuilder.displayAs === 'percentage' ? 'percentage of total' : 'absolute values'}.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
