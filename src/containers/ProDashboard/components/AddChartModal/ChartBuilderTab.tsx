import { lazy, Suspense, useEffect, useMemo } from 'react'
import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '~/components/Icon'
import { CHAINS_API_V2, PROTOCOLS_API } from '~/constants'
import { TimePeriod } from '~/containers/ProDashboard/ProDashboardAPIContext'
import { filterDataByTimePeriod } from '~/containers/ProDashboard/queries'
import { useAppMetadata } from '../../AppMetadataContext'
import { useProDashboard } from '../../ProDashboardAPIContext'
import ProtocolSplitCharts from '../../services/ProtocolSplitCharts'
import { getItemIconUrl } from '../../utils'
import { AriakitSelect } from '../AriakitSelect'
import { AriakitMultiSelect } from '../AriakitMultiSelect'
import { AriakitVirtualizedSelect } from '../AriakitVirtualizedSelect'
import { AriakitVirtualizedMultiSelect } from '../AriakitVirtualizedMultiSelect'
import { ChartBuilderConfig } from './types'

const MultiSeriesChart = lazy(() => import('~/components/ECharts/MultiSeriesChart'))

interface ChartBuilderTabProps {
	chartBuilder: ChartBuilderConfig
	chartBuilderName: string
	chainOptions: Array<{ value: string; label: string }>
	protocolOptions: Array<{ value: string; label: string; logo?: string }>
	protocolsLoading: boolean
	onChartBuilderChange: (updates: Partial<ChartBuilderConfig>) => void
	onChartBuilderNameChange: (name: string) => void
	timePeriod: TimePeriod
}

const METRIC_OPTIONS = [
	{ value: 'tvl', label: 'TVL' },
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

const MODE_OPTIONS = [
	{ value: 'chains', label: 'Group by Protocol' }, // group by protocol filter by chains
	{ value: 'protocol', label: 'Group by Chains' } // group by chains filter by protocol
]

export function ChartBuilderTab({
	chartBuilder,
	chartBuilderName,
	chainOptions,
	protocolOptions,
	protocolsLoading,
	onChartBuilderChange,
	onChartBuilderNameChange,
	timePeriod
}: ChartBuilderTabProps) {
	const { loading: metaLoading, error: metaError, hasProtocolBuilderMetric } = useAppMetadata()
	const { getProtocolInfo } = useProDashboard()
	const { data: protocols } = useQuery({
		queryKey: ['protocols'],
		queryFn: async () => {
			const response = await fetch(PROTOCOLS_API)
			const data = await response.json()
			return data.protocols || []
		},
		staleTime: 60 * 60 * 1000
	})

	const { data: chainCategoriesList } = useQuery({
		queryKey: ['chains2-categories'],
		queryFn: async () => {
			const res = await fetch(CHAINS_API_V2)
			const data = await res.json()
			return (data?.categories as string[]) || []
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
		queryKey: [
			'chartBuilder',
			chartBuilder.mode,
			chartBuilder.metric,
			chartBuilder.protocol,
			chartBuilder.chains,
			chartBuilder.limit,
			chartBuilder.categories,
			chartBuilder.chainCategories,
			chartBuilder.groupByParent,
			chartBuilder.filterMode || 'include',
			timePeriod
		],
		queryFn: async () => {
			if (chartBuilder.mode === 'protocol') {
				const data = await ProtocolSplitCharts.getProtocolChainData(
					chartBuilder.protocol,
					chartBuilder.metric,
					chartBuilder.chains.length > 0 ? chartBuilder.chains : undefined,
					chartBuilder.limit,
					chartBuilder.filterMode || 'include',
					chartBuilder.chainCategories && chartBuilder.chainCategories.length > 0
						? chartBuilder.chainCategories
						: undefined
				)

				if (data && data.series.length > 0) {
					data.series = data.series.map((serie) => ({
						...serie,
						data: filterDataByTimePeriod(serie.data, timePeriod)
					}))
				}

				return data
			}

			const data = await ProtocolSplitCharts.getProtocolSplitData(
				chartBuilder.metric,
				chartBuilder.chains,
				chartBuilder.limit,
				chartBuilder.categories,
				chartBuilder.groupByParent,
				chartBuilder.filterMode || 'include'
			)

			if (data && data.series.length > 0) {
				data.series = data.series.map((serie) => ({
					...serie,
					data: filterDataByTimePeriod(serie.data, timePeriod)
				}))
			}

			return data
		},
		enabled: !!chartBuilder.metric,
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	const protocolOptionsFiltered = useMemo(() => {
		if (chartBuilder.mode !== 'protocol') return protocolOptions
		const metric = chartBuilder.metric
		if (!metric || metaLoading || metaError) return protocolOptions
		return protocolOptions.filter((opt) => hasProtocolBuilderMetric(opt.value, metric))
	}, [protocolOptions, chartBuilder.mode, chartBuilder.metric, hasProtocolBuilderMetric, metaLoading, metaError])

	const handleMetricChange = (option: any) => {
		const newMetric = option?.value || 'tvl'
		const newChartType = newMetric === 'tvl' ? 'stackedArea' : 'stackedBar'
		onChartBuilderChange({ metric: newMetric, chartType: newChartType })
	}

	const handleChainsChange = (chains: string[]) => {
		onChartBuilderChange({ chains })
	}

	const handleCategoriesChange = (categories: string[]) => {
		onChartBuilderChange({ categories })
	}

	const handleChainCategoriesChange = (chainCategories: string[]) => {
		onChartBuilderChange({ chainCategories })
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

	const handleFilterModeChange = (mode: 'include' | 'exclude') => {
		onChartBuilderChange({ filterMode: mode })
	}

	const handleModeChange = (mode: 'chains' | 'protocol') => {
		onChartBuilderChange({ mode, chains: [], protocol: undefined })
	}

	useEffect(() => {
		if (chartBuilder.mode === 'protocol') {
			const shouldHideOthers = (chartBuilder.chainCategories && chartBuilder.chainCategories.length > 0) || false
			if (chartBuilder.hideOthers !== shouldHideOthers) {
				onChartBuilderChange({ hideOthers: shouldHideOthers })
			}
		}
	}, [chartBuilder.mode, chartBuilder.chainCategories])

	const handleProtocolChange = (option: any) => {
		onChartBuilderChange({ protocol: option?.value || undefined })
	}

	return (
		<div className="flex h-full flex-col">
			<div className="mb-1">
				<input
					type="text"
					value={chartBuilderName}
					onChange={(e) => onChartBuilderNameChange(e.target.value)}
					placeholder="Enter chart name..."
					className="pro-text1 placeholder:pro-text3 w-full rounded-md border border-(--form-control-border) bg-(--bg-input) px-2 py-1.5 text-sm focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
				/>
			</div>

			<div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
				<div className="max-h-[calc(100vh-200px)] w-full flex-shrink-0 space-y-1.5 overflow-x-visible overflow-y-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 lg:w-[320px] xl:w-[360px]">
					<h3 className="pro-text1 text-[11px] font-semibold">Chart Configuration</h3>

					<div>
						<AriakitSelect
							label="Metric"
							options={METRIC_OPTIONS}
							selectedValue={chartBuilder.metric}
							onChange={handleMetricChange}
							placeholder="Select metric..."
							isLoading={false}
						/>
					</div>

					<div className="pro-border border-t pt-1.5">
						<h4 className="pro-text2 mb-1 text-[11px] font-medium">Mode</h4>
						<div className="mb-1.5 flex gap-0">
							{MODE_OPTIONS.map((option) => (
								<button
									key={option.value}
									onClick={() => handleModeChange(option.value as any)}
									className={`-ml-px flex-1 rounded-none border px-2 py-1 text-xs transition-colors first:ml-0 first:rounded-l-md last:rounded-r-md ${
										chartBuilder.mode === option.value
											? 'pro-border pro-btn-blue'
											: 'pro-border pro-hover-bg pro-text2 hover:pro-text1'
									}`}
								>
									{option.label}
								</button>
							))}
						</div>
					</div>

					<div className="pro-border border-t pt-1.5">
						<h4 className="pro-text2 mb-1 text-[11px] font-medium">Filters</h4>

						<div className="mb-1.5">
							<h5 className="pro-text2 mb-1 text-[11px] font-medium">Filter Mode</h5>
							<div className="mb-1.5 flex gap-0">
								{[
									{ value: 'include', label: 'Include' },
									{ value: 'exclude', label: 'Exclude' }
								].map((option) => (
									<button
										key={option.value}
										onClick={() => handleFilterModeChange(option.value as 'include' | 'exclude')}
										className={`-ml-px flex-1 rounded-none border px-2 py-1 text-xs transition-colors first:ml-0 first:rounded-l-md last:rounded-r-md ${
											(chartBuilder.filterMode || 'include') === option.value
												? 'pro-border pro-btn-blue'
												: 'pro-border pro-hover-bg pro-text2 hover:pro-text1'
										}`}
									>
										{option.label}
									</button>
								))}
							</div>
						</div>

						{chartBuilder.mode === 'chains' ? (
							<>
								<div className="mb-1.5">
									<AriakitVirtualizedMultiSelect
										label="Chains"
										options={chainOptions.length > 0 ? chainOptions.map((c) => ({ value: c.value, label: c.label })) : []}
										selectedValues={chartBuilder.chains}
										onChange={handleChainsChange}
										placeholder={
											(chartBuilder.filterMode || 'include') === 'exclude'
												? 'Select chains to exclude...'
												: 'Select chains...'
										}
										isLoading={protocolsLoading || chainOptions.length === 0}
										maxSelections={10}
										renderIcon={(option) => getItemIconUrl('chain', null, option.value)}
									/>
								</div>

								<div className="mb-1.5">
									<AriakitMultiSelect
										label="Categories"
										options={categoryOptions}
										selectedValues={chartBuilder.categories}
										onChange={handleCategoriesChange}
										placeholder={
											(chartBuilder.filterMode || 'include') === 'exclude'
												? 'Select categories to exclude...'
												: 'Select categories...'
										}
										isLoading={false}
										maxSelections={5}
									/>
								</div>

								<div className="mb-1.5">
									<AriakitSelect
										label="Number of Protocols"
										options={LIMIT_OPTIONS}
										selectedValue={chartBuilder.limit.toString()}
										onChange={handleLimitChange}
										placeholder="Select limit..."
										isLoading={false}
									/>
								</div>

								<div className="mb-1">
									<Ariakit.CheckboxProvider value={chartBuilder.hideOthers || false}>
										<label className="flex cursor-pointer items-center gap-1.5">
											<Ariakit.Checkbox
												onChange={(e) => onChartBuilderChange({ hideOthers: e.target.checked })}
												className="pro-border data-[checked]:bg-pro-blue-400 data-[checked]:border-pro-blue-100 dark:data-[checked]:bg-pro-blue-300/20 dark:data-[checked]:border-pro-blue-300/20 flex h-3 w-3 shrink-0 items-center justify-center rounded-[2px] border"
											/>
											<span className="pro-text2 text-[10px]">Hide "Others" (show only top {chartBuilder.limit})</span>
										</label>
									</Ariakit.CheckboxProvider>
								</div>

								<div className="mb-1">
									<Ariakit.CheckboxProvider value={chartBuilder.groupByParent || false}>
										<label className="flex cursor-pointer items-center gap-1.5">
											<Ariakit.Checkbox
												onChange={(e) => onChartBuilderChange({ groupByParent: e.target.checked })}
												className="pro-border data-[checked]:bg-pro-blue-400 data-[checked]:border-pro-blue-100 dark:data-[checked]:bg-pro-blue-300/20 dark:data-[checked]:border-pro-blue-300/20 flex h-3 w-3 shrink-0 items-center justify-center rounded-[2px] border"
											/>
											<span className="pro-text2 text-[10px]">Group by parent protocol</span>
										</label>
									</Ariakit.CheckboxProvider>
								</div>
							</>
						) : (
							<>
								<div className="mb-1.5">
									<AriakitVirtualizedSelect
										label="Protocol"
										options={protocolOptionsFiltered}
										selectedValue={chartBuilder.protocol || null}
										onChange={handleProtocolChange}
										placeholder="Select protocol..."
										isLoading={protocolsLoading}
										renderIcon={(option) => option.logo || getItemIconUrl('protocol', option, option.value)}
									/>
								</div>

								<div className="mb-1.5">
									<AriakitVirtualizedMultiSelect
										label="Chains"
										options={chainOptions.length > 0 ? chainOptions.map((c) => ({ value: c.value, label: c.label })) : []}
										selectedValues={chartBuilder.chains}
										onChange={handleChainsChange}
										placeholder={
											(chartBuilder.filterMode || 'include') === 'exclude'
												? 'Select chains to exclude...'
												: 'Select chains...'
										}
										isLoading={protocolsLoading || chainOptions.length === 0}
										maxSelections={10}
										renderIcon={(option) => getItemIconUrl('chain', null, option.value)}
									/>
								</div>
								<div className="mb-1.5">
									<AriakitMultiSelect
										label="Chain Categories"
										options={(chainCategoriesList || []).map((c) => ({ value: c, label: c }))}
										selectedValues={chartBuilder.chainCategories || []}
										onChange={handleChainCategoriesChange}
										placeholder={
											(chartBuilder.filterMode || 'include') === 'exclude'
												? 'Select chain categories to exclude...'
												: 'Select chain categories...'
										}
										isLoading={false}
										maxSelections={5}
									/>
								</div>
								<div className="mb-1.5">
									<AriakitSelect
										label="Number of Chains"
										options={LIMIT_OPTIONS}
										selectedValue={chartBuilder.limit.toString()}
										onChange={handleLimitChange}
										placeholder="Select limit..."
										isLoading={false}
									/>
								</div>
								{(!chartBuilder.chainCategories || chartBuilder.chainCategories.length === 0) && (
									<div className="mb-1">
										<Ariakit.CheckboxProvider value={chartBuilder.hideOthers || false}>
											<label className="flex cursor-pointer items-center gap-1.5">
												<Ariakit.Checkbox
													onChange={(e) => onChartBuilderChange({ hideOthers: e.target.checked })}
													className="flex h-3 w-3 shrink-0 items-center justify-center rounded-xs border border-[#28a2b5] data-[checked]:bg-[#28a2b5]"
												/>
												<span className="pro-text2 text-[10px]">
													Hide "Others" (show only top {chartBuilder.limit})
												</span>
											</label>
										</Ariakit.CheckboxProvider>
									</div>
								)}
							</>
						)}
					</div>

					<div className="pro-border border-t pt-1.5">
						<h4 className="pro-text2 mb-1 text-[11px] font-medium">Chart type</h4>
						<div className="grid grid-cols-3 gap-1">
							{CHART_TYPE_OPTIONS.map((option) => (
								<button
									key={option.value}
									onClick={() => handleChartTypeChange(option.value as any)}
									className={`flex flex-col items-center gap-0.5 rounded-md border p-1 transition-colors ${
										chartBuilder.chartType === option.value
											? 'border-pro-blue-100 bg-pro-blue-300/20 text-pro-blue-400 dark:border-pro-blue-300/20 dark:bg-pro-blue-300/20 dark:text-pro-blue-200'
											: 'pro-border pro-hover-bg pro-text2 hover:pro-text1'
									}`}
								>
									<Icon name={option.icon as any} height={14} width={14} />
									<span className="text-[10px]">{option.label}</span>
								</button>
							))}
						</div>
					</div>

					<div className="pro-border border-t pt-1.5">
						<h4 className="pro-text2 mb-1 text-[11px] font-medium">Display value as</h4>
						<div className="flex gap-0">
							{DISPLAY_OPTIONS.map((option) => (
								<button
									key={option.value}
									onClick={() => handleDisplayChange(option.value as any)}
									className={`-ml-px flex-1 rounded-none border px-2 py-1 text-xs transition-colors first:ml-0 first:rounded-l-md last:rounded-r-md ${
										chartBuilder.displayAs === option.value
											? 'pro-border pro-btn-blue'
											: 'pro-border pro-hover-bg pro-text2 hover:pro-text1'
									}`}
								>
									{option.label}
								</button>
							))}
						</div>
					</div>
				</div>

				<div className="flex min-h-0 flex-1 flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<div className="mb-2 flex flex-shrink-0 items-center justify-between">
						<h3 className="pro-text1 text-xs font-semibold">Preview</h3>
						<div className="pro-text3 flex items-center gap-1 text-[10px]">
							<span>ⓘ</span>
							<span>Updates as you configure</span>
						</div>
					</div>

					<div
						className="relative flex flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)"
						style={{ minHeight: '450px' }}
					>
						{previewLoading ? (
							<div className="text-center">
								<div className="border-pro-blue-100 dark:border-pro-blue-300/20 mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2"></div>
								<p className="pro-text2 text-sm">Loading preview...</p>
							</div>
						) : previewData && previewData.series.length > 0 ? (
							<div className="absolute inset-0 p-2">
								<Suspense
									fallback={
										<div className="h-full w-full animate-pulse rounded-md border border-(--cards-border) bg-(--cards-bg)"></div>
									}
								>
									<MultiSeriesChart
										height="450px"
										key={`chart-${chartBuilder.displayAs}-${chartBuilder.chartType}-${chartBuilder.hideOthers}`}
										series={(() => {
											const forceHideOthers =
												chartBuilder.mode === 'protocol' &&
												chartBuilder.chainCategories &&
												chartBuilder.chainCategories.length > 0
											let filteredSeries =
												chartBuilder.hideOthers || forceHideOthers
													? previewData.series.filter((s) => !s.name.startsWith('Others'))
													: previewData.series

											if (chartBuilder.metric !== 'tvl' && chartBuilder.mode === 'chains') {
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
											}

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
												outerBoundsMode: 'same',
												outerBoundsContain: 'axisLabel'
											},
											legend: {
												show: true,
												top: 10,
												type: 'scroll',
												selectedMode: 'multiple',
												pageButtonItemGap: 5,
												pageButtonGap: 20,
												data: (() => {
													const forceHideOthers =
														chartBuilder.mode === 'protocol' &&
														chartBuilder.chainCategories &&
														chartBuilder.chainCategories.length > 0
													let filteredSeries =
														chartBuilder.hideOthers || forceHideOthers
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
								<Icon name="bar-chart-2" height={48} width={48} className="pro-text3 mx-auto mb-2" />
								<p className="pro-text2 text-sm">Configure chart settings to see preview</p>
								<p className="pro-text3 mt-1 text-xs">Select a metric to generate chart (all chains by default)</p>
							</div>
						)}
					</div>

					<div className="pro-bg2 mt-2 flex-shrink-0 rounded p-2">
						<div className="flex items-start gap-1">
							<span className="pro-text3 text-[10px]">ⓘ</span>
							<p className="pro-text3 text-[10px] leading-relaxed">
								This chart shows {chartBuilder.metric}
								{chartBuilder.mode === 'protocol'
									? ` for ${
											chartBuilder.protocol
												? getProtocolInfo(chartBuilder.protocol)?.name || chartBuilder.protocol
												: 'All Protocols'
										} across different chains`
									: ` breakdown by top ${chartBuilder.limit} protocols`}
								{chartBuilder.mode === 'chains' &&
									chartBuilder.chains.length > 0 &&
									` on ${chartBuilder.chains.join(', ')}`}
								{chartBuilder.mode === 'protocol' &&
									chartBuilder.chainCategories &&
									chartBuilder.chainCategories.length > 0 &&
									` in ${chartBuilder.chainCategories.join(', ')} chain categories`}
								{chartBuilder.mode === 'chains' &&
									chartBuilder.categories.length > 0 &&
									` in ${chartBuilder.categories.join(', ')} categories`}
								. Data is displayed as{' '}
								{chartBuilder.displayAs === 'percentage' ? 'percentage of total' : 'absolute values'}.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
