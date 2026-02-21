import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense, useCallback, useEffect, useMemo } from 'react'
import { Icon } from '~/components/Icon'
import { fetchChainsCategories } from '~/containers/Chains/api'
import { fetchProtocols } from '~/containers/Protocols/api'
import type { CustomTimePeriod, TimePeriod } from '~/containers/ProDashboard/ProDashboardAPIContext'
import { filterDataByTimePeriod } from '~/containers/ProDashboard/queries'
import { useAppMetadata } from '../../AppMetadataContext'
import { useProDashboardCatalog } from '../../ProDashboardAPIContext'
import ProtocolSplitCharts from '../../services/ProtocolSplitCharts'
import { getItemIconUrl } from '../../utils'
import { AriakitMultiSelect } from '../AriakitMultiSelect'
import { AriakitSelect } from '../AriakitSelect'
import { AriakitVirtualizedMultiSelect } from '../AriakitVirtualizedMultiSelect'
import { AriakitVirtualizedSelect } from '../AriakitVirtualizedSelect'
import type { ChartBuilderConfig } from './types'

const MultiSeriesChart = lazy(() => import('~/components/ECharts/MultiSeriesChart'))
const TreeMapBuilderChart = lazy(() => import('~/components/ECharts/TreeMapBuilderChart'))

const EMPTY_PROTOCOLS: any[] = []
const EMPTY_CATEGORIES: string[] = []
const EMPTY_SELECT_OPTIONS: Array<{ value: string; label: string }> = []

const DEFAULT_SERIES_COLOR = '#3e61cc'
const HEX_COLOR_REGEX = /^#([0-9a-f]{3}){1,2}$/i

interface ChartBuilderTabProps {
	chartBuilder: ChartBuilderConfig
	chartBuilderName: string
	chainOptions: Array<{ value: string; label: string }>
	protocolOptions: Array<{ value: string; label: string; logo?: string }>
	protocolsLoading: boolean
	onChartBuilderChange: (updates: Partial<ChartBuilderConfig>) => void
	onChartBuilderNameChange: (name: string) => void
	timePeriod: TimePeriod
	customTimePeriod?: CustomTimePeriod | null
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
	{ value: 'open-interest', label: 'Open Interest' },
	{ value: 'dex-aggregators', label: 'DEX Aggregator Volume' },
	{ value: 'options-notional', label: 'Options Notional' },
	{ value: 'options-premium', label: 'Options Premium' },
	{ value: 'bridge-aggregators', label: 'Bridge Aggregator Volume' },
	{ value: 'perps-aggregators', label: 'Perps Aggregator Volume' },
	{ value: 'stablecoins', label: 'Stablecoin Mcap (Chains only)' },
	{ value: 'chain-fees', label: 'Chain Fees (Chains only)' },
	{ value: 'chain-revenue', label: 'Chain Revenue (Chains only)' }
]

const CHAIN_ONLY_METRICS = new Set(['stablecoins', 'chain-fees', 'chain-revenue'])

const CHART_TYPE_OPTIONS = [
	{ value: 'stackedBar', label: 'Bar', icon: 'bar-chart-2' },
	{ value: 'stackedArea', label: 'Area', icon: 'trending-up' },
	{ value: 'line', label: 'Line', icon: 'activity' },
	{ value: 'treemap', label: 'Tree Map', icon: 'layout-grid' }
]

const DISPLAY_OPTIONS = [
	{ value: 'timeSeries', label: 'Time Series' },
	{ value: 'percentage', label: 'Percentage' }
]

const TREEMAP_VALUE_OPTIONS = [
	{ value: 'latest', label: 'Last day (1d)' },
	{ value: 'sum7d', label: 'Sum 7d' },
	{ value: 'sum30d', label: 'Sum 30d' }
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

const FILTER_MODE_OPTIONS = [
	{ value: 'include', label: 'Include' },
	{ value: 'exclude', label: 'Exclude' }
]

const resolveFilterMode = (value?: 'include' | 'exclude', fallback?: 'include' | 'exclude') => {
	if (value === 'include' || value === 'exclude') return value
	if (fallback === 'include' || fallback === 'exclude') return fallback
	return 'include'
}

const FilterModeToggle = ({
	value,
	onChange
}: {
	value: 'include' | 'exclude'
	onChange: (mode: 'include' | 'exclude') => void
}) => (
	<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg-alt)/60 p-0.5">
		<div className="grid grid-cols-2 gap-0.5">
			{FILTER_MODE_OPTIONS.map((option) => (
				<button
					key={option.value}
					onClick={() => onChange(option.value as 'include' | 'exclude')}
					className={`rounded-md px-2 py-1 text-[10px] font-medium transition-all duration-200 ${
						value === option.value
							? 'bg-(--old-blue) text-white shadow-sm'
							: 'text-(--text-secondary) hover:bg-(--cards-bg)/80 hover:text-(--text-primary)'
					}`}
				>
					{option.label}
				</button>
			))}
		</div>
	</div>
)

export function ChartBuilderTab({
	chartBuilder,
	chartBuilderName,
	chainOptions,
	protocolOptions,
	protocolsLoading,
	onChartBuilderChange,
	onChartBuilderNameChange,
	timePeriod,
	customTimePeriod
}: ChartBuilderTabProps) {
	const { loading: metaLoading, error: metaError, hasProtocolBuilderMetric } = useAppMetadata()
	const { getProtocolInfo } = useProDashboardCatalog()
	const { data: protocols } = useQuery({
		queryKey: ['protocols'],
		queryFn: async () => {
			const data = await fetchProtocols()
			return data.protocols ?? EMPTY_PROTOCOLS
		},
		staleTime: 60 * 60 * 1000
	})

	const { data: chainCategoriesList } = useQuery({
		queryKey: ['chains2-categories'],
		queryFn: async () => {
			const data = await fetchChainsCategories()
			return (data?.categories as string[]) ?? EMPTY_CATEGORIES
		},
		staleTime: 60 * 60 * 1000
	})

	const categoryOptions = useMemo(() => {
		if (!protocols) return EMPTY_SELECT_OPTIONS
		const categoriesSet = new Set<string>()
		for (const protocol of protocols as any[]) {
			if (protocol.category) {
				categoriesSet.add(protocol.category)
			}
		}
		return Array.from(categoriesSet)
			.sort()
			.map((cat) => ({
				value: cat,
				label: cat
			}))
	}, [protocols])

	const chainCategoryOptions = useMemo(
		() => (chainCategoriesList ?? EMPTY_CATEGORIES).map((c) => ({ value: c, label: c })),
		[chainCategoriesList]
	)

	const metricOptions = useMemo(() => {
		return METRIC_OPTIONS.filter(
			(option) =>
				!CHAIN_ONLY_METRICS.has(option.value) ||
				chartBuilder.mode === 'protocol' ||
				option.value === chartBuilder.metric
		)
	}, [chartBuilder.mode, chartBuilder.metric])

	const chainFilterMode = resolveFilterMode(chartBuilder.chainFilterMode, chartBuilder.filterMode)
	const categoryFilterMode = resolveFilterMode(chartBuilder.categoryFilterMode, chartBuilder.filterMode)
	const chainCategoryFilterMode = resolveFilterMode(chartBuilder.chainCategoryFilterMode, chartBuilder.filterMode)
	const protocolCategoryFilterMode = resolveFilterMode(chartBuilder.protocolCategoryFilterMode, chartBuilder.filterMode)

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
			chartBuilder.protocolCategories,
			chartBuilder.groupByParent,
			chainFilterMode,
			categoryFilterMode,
			chainCategoryFilterMode,
			protocolCategoryFilterMode,
			timePeriod,
			customTimePeriod
		],
		queryFn: async () => {
			if (chartBuilder.mode === 'protocol') {
				const data = await ProtocolSplitCharts.getProtocolChainData(
					chartBuilder.protocol,
					chartBuilder.metric,
					chartBuilder.chains.length > 0 ? chartBuilder.chains : undefined,
					chartBuilder.limit,
					chainFilterMode,
					chartBuilder.chainCategories && chartBuilder.chainCategories.length > 0
						? chartBuilder.chainCategories
						: undefined,
					chartBuilder.protocolCategories && chartBuilder.protocolCategories.length > 0
						? chartBuilder.protocolCategories
						: undefined,
					chainCategoryFilterMode,
					protocolCategoryFilterMode
				)

				if (data && data.series.length > 0) {
					data.series = data.series.map((serie) => ({
						...serie,
						data: filterDataByTimePeriod(serie.data, timePeriod, customTimePeriod)
					}))
				}

				return data
			}

			if (CHAIN_ONLY_METRICS.has(chartBuilder.metric)) {
				return {
					series: [],
					metadata: {
						chain: chartBuilder.chains.join(','),
						chains: chartBuilder.chains,
						categories: chartBuilder.categories,
						metric: chartBuilder.metric,
						topN: chartBuilder.limit,
						totalProtocols: 0,
						othersCount: 0,
						marketSector: chartBuilder.categories.join(',') || null
					}
				}
			}

			const data = await ProtocolSplitCharts.getProtocolSplitData(
				chartBuilder.metric as Exclude<ChartBuilderConfig['metric'], 'stablecoins' | 'chain-fees' | 'chain-revenue'>,
				chartBuilder.chains,
				chartBuilder.limit,
				chartBuilder.categories,
				chartBuilder.groupByParent,
				chainFilterMode,
				categoryFilterMode
			)

			if (data && data.series.length > 0) {
				data.series = data.series.map((serie) => ({
					...serie,
					data: filterDataByTimePeriod(serie.data, timePeriod, customTimePeriod)
				}))
			}

			return data
		},
		enabled: !!chartBuilder.metric,
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	const seriesColors = chartBuilder.seriesColors
	let hasCustomSeriesColors = false
	if (seriesColors) {
		for (const _ in seriesColors) {
			hasCustomSeriesColors = true
			break
		}
	}

	const visibleSeries = useMemo(() => {
		if (!previewData?.series) {
			return []
		}

		const hasChainCategoryFilter = (chartBuilder.chainCategories?.length || 0) > 0
		const hasProtocolCategoryFilter = (chartBuilder.protocolCategories?.length || 0) > 0
		const forceHideOthers = chartBuilder.mode === 'protocol' && (hasChainCategoryFilter || hasProtocolCategoryFilter)

		return chartBuilder.hideOthers || forceHideOthers
			? previewData.series.filter((s) => !s.name.startsWith('Others'))
			: previewData.series
	}, [
		previewData,
		chartBuilder.hideOthers,
		chartBuilder.mode,
		chartBuilder.chainCategories,
		chartBuilder.protocolCategories
	])

	const resolveSeriesColor = useCallback(
		(seriesName: string, fallback?: string) => {
			const override = seriesColors?.[seriesName]
			if (override) {
				return override
			}
			if (fallback && HEX_COLOR_REGEX.test(fallback)) {
				return fallback
			}
			return DEFAULT_SERIES_COLOR
		},
		[seriesColors]
	)

	const isChainOnlyMetric = chartBuilder.metric ? CHAIN_ONLY_METRICS.has(chartBuilder.metric) : false
	const isTvlMetric = chartBuilder.metric === 'tvl' || chartBuilder.metric === 'stablecoins'
	const treemapValue = chartBuilder.treemapValue || 'latest'
	const treemapMode = !isTvlMetric ? treemapValue : 'latest'

	const treemapData = useMemo(() => {
		if (!visibleSeries || visibleSeries.length === 0) return []

		return visibleSeries
			.map((s) => {
				const dataLength = s.data?.length || 0
				const pointIndex = Math.max(0, dataLength - 2)
				const latestPoint = dataLength > 0 ? s.data[pointIndex] : undefined
				const latestTimestamp = latestPoint?.[0]
				let value = latestPoint?.[1] || 0

				if (latestTimestamp !== undefined && treemapMode !== 'latest') {
					const windowDays = treemapMode === 'sum7d' ? 7 : 30
					const windowStart = latestTimestamp - windowDays * 24 * 60 * 60 + 1
					value = s.data.reduce((sum: number, [timestamp, val]: [number, number]) => {
						if (timestamp >= windowStart && timestamp <= latestTimestamp) {
							return sum + (val || 0)
						}
						return sum
					}, 0)
				}

				return {
					name: s.name,
					value: value,
					itemStyle: {
						color: resolveSeriesColor(s.name, s.color)
					}
				}
			})
			.filter((item) => item.value > 0)
	}, [visibleSeries, resolveSeriesColor, treemapMode])

	const previewChartOptions = useMemo(
		() => ({
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
				data: visibleSeries.map((s) => s.name)
			},
			tooltip: {
				formatter: function (params: any) {
					const rawTimestamp = params[0].value[0]
					const millis = rawTimestamp < 10000000000 ? rawTimestamp * 1000 : rawTimestamp
					const chartdate = new Date(millis).toLocaleDateString()

					let filteredParams = params.filter(
						(item: any) => item.value[1] !== '-' && item.value[1] !== null && item.value[1] !== undefined
					)
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
		}),
		[chartBuilder.displayAs, visibleSeries]
	)

	const protocolOptionsFiltered = useMemo(() => {
		if (chartBuilder.mode !== 'protocol') return protocolOptions
		const metric = chartBuilder.metric
		if (!metric || metaLoading || metaError) return protocolOptions
		return protocolOptions.filter((opt) => hasProtocolBuilderMetric(opt.value, metric))
	}, [protocolOptions, chartBuilder.mode, chartBuilder.metric, hasProtocolBuilderMetric, metaLoading, metaError])

	const handleMetricChange = (option: any) => {
		const newMetric = option?.value || 'tvl'
		let newChartType: 'stackedBar' | 'stackedArea' | 'line' = 'stackedBar'
		if (newMetric === 'tvl' || newMetric === 'stablecoins') {
			newChartType = 'stackedArea'
		}
		const updates: Partial<ChartBuilderConfig> = {
			metric: newMetric,
			chartType: newChartType
		}
		if (CHAIN_ONLY_METRICS.has(newMetric)) {
			updates.protocol = undefined
		}
		if (newMetric === 'tvl' || CHAIN_ONLY_METRICS.has(newMetric)) {
			updates.protocolCategories = undefined
		}
		onChartBuilderChange(updates)
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

	const handleProtocolCategoriesChange = (protocolCategories: string[]) => {
		onChartBuilderChange({ protocolCategories })
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

	const handleTreemapValueChange = (option: any) => {
		const nextValue = option?.value
		if (nextValue === 'sum7d' || nextValue === 'sum30d' || nextValue === 'latest') {
			onChartBuilderChange({ treemapValue: nextValue })
			return
		}
		onChartBuilderChange({ treemapValue: 'latest' })
	}

	const handleChainFilterModeChange = (mode: 'include' | 'exclude') => {
		onChartBuilderChange({ chainFilterMode: mode })
	}

	const handleCategoryFilterModeChange = (mode: 'include' | 'exclude') => {
		onChartBuilderChange({ categoryFilterMode: mode })
	}

	const handleChainCategoryFilterModeChange = (mode: 'include' | 'exclude') => {
		onChartBuilderChange({ chainCategoryFilterMode: mode })
	}

	const handleProtocolCategoryFilterModeChange = (mode: 'include' | 'exclude') => {
		onChartBuilderChange({ protocolCategoryFilterMode: mode })
	}

	const handleModeChange = (mode: 'chains' | 'protocol') => {
		const updates: Partial<ChartBuilderConfig> = {
			mode,
			chains: [],
			protocol: undefined
		}
		if (mode === 'chains' && chartBuilder.metric && CHAIN_ONLY_METRICS.has(chartBuilder.metric)) {
			updates.metric = 'tvl'
			updates.chartType = 'stackedArea'
		}
		onChartBuilderChange(updates)
	}

	const handleSeriesColorChange = (seriesName: string, color: string) => {
		onChartBuilderChange({
			seriesColors: {
				...(chartBuilder.seriesColors || {}),
				[seriesName]: color
			}
		})
	}

	const handleSeriesColorReset = (seriesName: string) => {
		const current = chartBuilder.seriesColors || {}
		if (!(seriesName in current)) {
			return
		}
		const next = { ...current }
		delete next[seriesName]
		onChartBuilderChange({ seriesColors: next })
	}

	const handleResetAllSeriesColors = () => {
		if (!hasCustomSeriesColors) {
			return
		}
		onChartBuilderChange({ seriesColors: {} })
	}

	useEffect(() => {
		if (chartBuilder.mode === 'chains' && chartBuilder.metric && CHAIN_ONLY_METRICS.has(chartBuilder.metric)) {
			onChartBuilderChange({ metric: 'tvl', chartType: 'stackedArea' })
		}
	}, [chartBuilder.mode, chartBuilder.metric, onChartBuilderChange])

	useEffect(() => {
		if (chartBuilder.mode === 'protocol' && isChainOnlyMetric && chartBuilder.protocol) {
			onChartBuilderChange({ protocol: undefined })
		}
	}, [chartBuilder.mode, isChainOnlyMetric, chartBuilder.protocol, onChartBuilderChange])

	useEffect(() => {
		if (chartBuilder.mode === 'protocol') {
			const shouldHideOthers =
				(chartBuilder.chainCategories && chartBuilder.chainCategories.length > 0) ||
				!!(chartBuilder.protocolCategories && chartBuilder.protocolCategories.length > 0)
			if (chartBuilder.hideOthers !== shouldHideOthers) {
				onChartBuilderChange({ hideOthers: shouldHideOthers })
			}
		}
	}, [
		chartBuilder.mode,
		chartBuilder.chainCategories,
		chartBuilder.protocolCategories,
		chartBuilder.hideOthers,
		onChartBuilderChange
	])

	const handleProtocolChange = (option: any) => {
		const updates: Partial<ChartBuilderConfig> = {
			protocol: option?.value || undefined
		}
		if (option?.value) {
			updates.protocolCategories = undefined
		}
		onChartBuilderChange(updates)
	}

	return (
		<div className="flex h-full flex-col">
			<div className="mb-1">
				<input
					type="text"
					value={chartBuilderName}
					onChange={(e) => onChartBuilderNameChange(e.target.value)}
					placeholder="Enter chart name..."
					className="w-full rounded-md border border-(--form-control-border) bg-(--bg-input) px-2 py-1.5 text-sm pro-text1 placeholder:pro-text3 focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
				/>
			</div>

			<div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
				<div className="max-h-[calc(100vh-200px)] w-full shrink-0 space-y-1.5 overflow-x-visible overflow-y-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 lg:w-[320px] xl:w-[360px]">
					<h3 className="text-[11px] font-semibold pro-text1">Chart Configuration</h3>

					<div>
						<AriakitSelect
							label="Metric"
							options={metricOptions}
							selectedValue={chartBuilder.metric}
							onChange={handleMetricChange}
							placeholder="Select metric..."
							isLoading={false}
						/>
					</div>

					<div className="border-t pro-border pt-1.5">
						<h4 className="mb-1 text-[11px] font-medium pro-text2">Mode</h4>
						<div className="mb-1.5 rounded-lg border border-(--cards-border) bg-(--cards-bg-alt)/60 p-0.5">
							<div className="grid grid-cols-2 gap-0.5">
								{MODE_OPTIONS.map((option) => (
									<button
										key={option.value}
										onClick={() => handleModeChange(option.value as any)}
										className={`rounded-md px-2 py-1.5 text-xs font-medium transition-all duration-200 ${
											chartBuilder.mode === option.value
												? 'bg-(--old-blue) text-white shadow-sm'
												: 'text-(--text-secondary) hover:bg-(--cards-bg)/80 hover:text-(--text-primary)'
										}`}
									>
										{option.label}
									</button>
								))}
							</div>
						</div>
					</div>

					<div className="border-t pro-border pt-1.5">
						<h4 className="mb-1 text-[11px] font-medium pro-text2">Filters</h4>

						{chartBuilder.mode === 'chains' ? (
							<>
								<div className="mb-1.5">
									<div className="mb-1 flex items-center justify-between">
										<span className="text-[10px] font-medium pro-text2">Chains Filter</span>
										<FilterModeToggle value={chainFilterMode} onChange={handleChainFilterModeChange} />
									</div>
									<AriakitVirtualizedMultiSelect
										label="Chains"
										options={
											chainOptions.length > 0
												? chainOptions.map((c) => ({
														value: c.value,
														label: c.label
													}))
												: []
										}
										selectedValues={chartBuilder.chains}
										onChange={handleChainsChange}
										placeholder={chainFilterMode === 'exclude' ? 'Select chains to exclude...' : 'Select chains...'}
										isLoading={protocolsLoading || chainOptions.length === 0}
										maxSelections={10}
										renderIcon={(option) => getItemIconUrl('chain', null, option.value)}
									/>
								</div>

								<div className="mb-1.5">
									<div className="mb-1 flex items-center justify-between">
										<span className="text-[10px] font-medium pro-text2">Categories Filter</span>
										<FilterModeToggle value={categoryFilterMode} onChange={handleCategoryFilterModeChange} />
									</div>
									<AriakitMultiSelect
										label="Categories"
										options={categoryOptions}
										selectedValues={chartBuilder.categories}
										onChange={handleCategoriesChange}
										placeholder={
											categoryFilterMode === 'exclude' ? 'Select categories to exclude...' : 'Select categories...'
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
												className="flex h-3 w-3 shrink-0 items-center justify-center rounded-[2px] border pro-border data-checked:border-pro-blue-100 data-checked:bg-pro-blue-400 dark:data-checked:border-pro-blue-300/20 dark:data-checked:bg-pro-blue-300/20"
											/>
											<span className="text-[10px] pro-text2">Hide "Others" (show only top {chartBuilder.limit})</span>
										</label>
									</Ariakit.CheckboxProvider>
								</div>

								<div className="mb-1">
									<Ariakit.CheckboxProvider value={chartBuilder.groupByParent || false}>
										<div className="flex cursor-pointer items-center gap-1.5">
											<Ariakit.Checkbox
												onChange={(e) =>
													onChartBuilderChange({
														groupByParent: e.target.checked
													})
												}
												className="flex h-3 w-3 shrink-0 items-center justify-center rounded-[2px] border pro-border data-checked:border-pro-blue-100 data-checked:bg-pro-blue-400 dark:data-checked:border-pro-blue-300/20 dark:data-checked:bg-pro-blue-300/20"
											/>
											<span className="text-[10px] pro-text2">Group by parent protocol</span>
										</div>
									</Ariakit.CheckboxProvider>
								</div>
							</>
						) : (
							<>
								{isChainOnlyMetric ? (
									<div className="mb-1.5 rounded-md border border-(--cards-border) bg-(--cards-bg-alt)/40 px-2 py-1.5">
										<p className="text-[10px] pro-text3">This metric is available only for All Protocols.</p>
									</div>
								) : (
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
								)}

								<div className="mb-1.5">
									<div className="mb-1 flex items-center justify-between">
										<span className="text-[10px] font-medium pro-text2">Chains Filter</span>
										<FilterModeToggle value={chainFilterMode} onChange={handleChainFilterModeChange} />
									</div>
									<AriakitVirtualizedMultiSelect
										label="Chains"
										options={
											chainOptions.length > 0
												? chainOptions.map((c) => ({
														value: c.value,
														label: c.label
													}))
												: []
										}
										selectedValues={chartBuilder.chains}
										onChange={handleChainsChange}
										placeholder={chainFilterMode === 'exclude' ? 'Select chains to exclude...' : 'Select chains...'}
										isLoading={protocolsLoading || chainOptions.length === 0}
										maxSelections={10}
										renderIcon={(option) => getItemIconUrl('chain', null, option.value)}
									/>
								</div>
								{!isChainOnlyMetric && chartBuilder.metric !== 'tvl' && !chartBuilder.protocol && (
									<div className="mb-1.5">
										<div className="mb-1 flex items-center justify-between">
											<span className="text-[10px] font-medium pro-text2">Protocol Categories Filter</span>
											<FilterModeToggle
												value={protocolCategoryFilterMode}
												onChange={handleProtocolCategoryFilterModeChange}
											/>
										</div>
										<AriakitMultiSelect
											label="Protocol Categories"
											options={categoryOptions}
											selectedValues={chartBuilder.protocolCategories ?? EMPTY_CATEGORIES}
											onChange={handleProtocolCategoriesChange}
											placeholder={
												protocolCategoryFilterMode === 'exclude'
													? 'Select protocol categories to exclude...'
													: 'Select protocol categories...'
											}
											isLoading={false}
											maxSelections={5}
										/>
									</div>
								)}
								<div className="mb-1.5">
									<div className="mb-1 flex items-center justify-between">
										<span className="text-[10px] font-medium pro-text2">Chain Categories Filter</span>
										<FilterModeToggle value={chainCategoryFilterMode} onChange={handleChainCategoryFilterModeChange} />
									</div>
									<AriakitMultiSelect
										label="Chain Categories"
										options={chainCategoryOptions}
										selectedValues={chartBuilder.chainCategories ?? EMPTY_CATEGORIES}
										onChange={handleChainCategoriesChange}
										placeholder={
											chainCategoryFilterMode === 'exclude'
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
													onChange={(e) =>
														onChartBuilderChange({
															hideOthers: e.target.checked
														})
													}
													className="flex h-3 w-3 shrink-0 items-center justify-center rounded-xs border border-[#28a2b5] data-checked:bg-[#28a2b5]"
												/>
												<span className="text-[10px] pro-text2">
													Hide "Others" (show only top {chartBuilder.limit})
												</span>
											</label>
										</Ariakit.CheckboxProvider>
									</div>
								)}
							</>
						)}
					</div>

					<div className="border-t pro-border pt-1.5">
						<h4 className="mb-1 text-[11px] font-medium pro-text2">Chart type</h4>
						<div className="grid grid-cols-4 gap-1">
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

					{chartBuilder.chartType === 'treemap' && !isTvlMetric && (
						<div className="border-t pro-border pt-1.5">
							<AriakitSelect
								label="Treemap value"
								options={TREEMAP_VALUE_OPTIONS}
								selectedValue={treemapMode}
								onChange={handleTreemapValueChange}
								placeholder="Select value..."
								isLoading={false}
							/>
						</div>
					)}

					<div className="border-t pro-border pt-1.5">
						<h4 className="mb-1 text-[11px] font-medium pro-text2">Display value as</h4>
						<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg-alt)/60 p-0.5">
							<div className="grid grid-cols-2 gap-0.5">
								{DISPLAY_OPTIONS.map((option) => (
									<button
										key={option.value}
										onClick={() => handleDisplayChange(option.value as any)}
										className={`rounded-md px-2 py-1.5 text-xs font-medium transition-all duration-200 ${
											chartBuilder.displayAs === option.value
												? 'bg-(--old-blue) text-white shadow-sm'
												: 'text-(--text-secondary) hover:bg-(--cards-bg)/80 hover:text-(--text-primary)'
										}`}
									>
										{option.label}
									</button>
								))}
							</div>
						</div>
					</div>
				</div>

				<div className="flex min-h-0 flex-1 flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<div className="mb-2 flex shrink-0 items-center justify-between">
						<h3 className="text-xs font-semibold pro-text1">Preview</h3>
						<div className="flex items-center gap-1 text-[10px] pro-text3">
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
								<div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-pro-blue-100 dark:border-pro-blue-300/20"></div>
								<p className="text-sm pro-text2">Loading preview...</p>
							</div>
						) : previewData && previewData.series.length > 0 ? (
							<div className="absolute inset-0 p-2">
								<Suspense
									fallback={
										<div className="h-full w-full animate-pulse rounded-md border border-(--cards-border) bg-(--cards-bg)"></div>
									}
								>
									{chartBuilder.chartType === 'treemap' ? (
										<TreeMapBuilderChart data={treemapData} height="450px" />
									) : (
										<MultiSeriesChart
											height="450px"
											key={`chart-${chartBuilder.displayAs}-${chartBuilder.chartType}-${chartBuilder.hideOthers}`}
											series={(() => {
												let filteredSeries = visibleSeries

												if (chartBuilder.metric !== 'tvl' && chartBuilder.mode === 'chains') {
													filteredSeries = filteredSeries.map((s) => {
														const aggregatedData: Map<number, number> = new Map()

														for (const [timestamp, value] of s.data as [number, number][]) {
															const date = new Date(timestamp * 1000)
															const weekDate = new Date(date)
															const day = weekDate.getDay()
															const diff = weekDate.getDate() - day + (day === 0 ? -6 : 1)
															weekDate.setDate(diff)
															weekDate.setHours(0, 0, 0, 0)
															const weekKey = Math.floor(weekDate.getTime() / 1000)

															aggregatedData.set(weekKey, (aggregatedData.get(weekKey) || 0) + value)
														}

														return {
															...s,
															data: Array.from(aggregatedData.entries()).sort((a, b) => a[0] - b[0])
														}
													})
												}

												if (chartBuilder.displayAs === 'percentage') {
													const timestampTotals = new Map<number, number>()
													for (const s of filteredSeries) {
														for (const [timestamp, value] of s.data) {
															timestampTotals.set(timestamp, (timestampTotals.get(timestamp) || 0) + value)
														}
													}

													return filteredSeries.map((s) => ({
														name: s.name,
														data: s.data.map(([timestamp, value]) => {
															const total = timestampTotals.get(timestamp) || 0
															return [timestamp, total > 0 ? (value / total) * 100 : 0]
														}),
														color: resolveSeriesColor(s.name, s.color),
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
													color: resolveSeriesColor(s.name, s.color),
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
											chartOptions={previewChartOptions}
										/>
									)}
								</Suspense>
							</div>
						) : (
							<div className="text-center">
								<Icon name="bar-chart-2" height={48} width={48} className="mx-auto mb-2 pro-text3" />
								<p className="text-sm pro-text2">Configure chart settings to see preview</p>
								<p className="mt-1 text-xs pro-text3">Select a metric to generate chart (all chains by default)</p>
							</div>
						)}
					</div>

					{visibleSeries.length > 0 && (
						<div className="mt-2 flex flex-col gap-1">
							<div className="flex items-center justify-between gap-2">
								<h4 className="text-[11px] font-medium pro-text2">Series Colors</h4>
								<button
									type="button"
									onClick={handleResetAllSeriesColors}
									disabled={!hasCustomSeriesColors}
									className={`text-[10px] font-medium transition-colors disabled:cursor-not-allowed ${
										hasCustomSeriesColors ? 'pro-text2 hover:pro-text1' : 'cursor-not-allowed pro-text3'
									}`}
								>
									Reset All
								</button>
							</div>
							<div className="flex thin-scrollbar items-center gap-2 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) px-2 py-2">
								{visibleSeries.map((series) => {
									const activeColor = resolveSeriesColor(series.name, series.color)
									const hasOverride = !!seriesColors?.[series.name]
									return (
										<div
											key={series.name}
											className="flex shrink-0 items-center gap-1.5 rounded border border-(--cards-border) bg-(--bg-input) px-2 py-1 text-xs"
										>
											<span className="max-w-[140px] truncate pro-text2" title={series.name}>
												{series.name}
											</span>
											<input
												type="color"
												value={activeColor}
												onChange={(event) => handleSeriesColorChange(series.name, event.target.value)}
												className="h-5 w-5 cursor-pointer rounded border border-(--cards-border) bg-transparent p-0"
												aria-label={`Select color for ${series.name}`}
											/>
											<button
												type="button"
												onClick={() => handleSeriesColorReset(series.name)}
												disabled={!hasOverride}
												className={`text-[10px] font-medium transition-colors disabled:cursor-not-allowed ${
													hasOverride ? 'pro-text3 hover:pro-text1' : 'pro-text4 cursor-not-allowed'
												}`}
											>
												Reset
											</button>
										</div>
									)
								})}
							</div>
						</div>
					)}

					<div className="mt-2 shrink-0 rounded pro-bg2 p-2">
						<div className="flex items-start gap-1">
							<span className="text-[10px] pro-text3">ⓘ</span>
							<p className="text-[10px] leading-relaxed pro-text3">
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
									` ${chainFilterMode === 'exclude' ? 'excluding' : 'on'} ${chartBuilder.chains.join(', ')}`}
								{chartBuilder.mode === 'protocol' &&
									chartBuilder.chains.length > 0 &&
									` ${chainFilterMode === 'exclude' ? 'excluding' : 'on'} ${chartBuilder.chains.join(', ')}`}
								{chartBuilder.mode === 'protocol' &&
									chartBuilder.chainCategories &&
									chartBuilder.chainCategories.length > 0 &&
									` ${chainCategoryFilterMode === 'exclude' ? 'excluding' : 'in'} ${chartBuilder.chainCategories.join(
										', '
									)} chain categories`}
								{chartBuilder.mode === 'protocol' &&
									chartBuilder.protocolCategories &&
									chartBuilder.protocolCategories.length > 0 &&
									` ${
										protocolCategoryFilterMode === 'exclude' ? 'excluding' : 'focusing on'
									} ${chartBuilder.protocolCategories.join(', ')} protocol categories`}
								{chartBuilder.mode === 'chains' &&
									chartBuilder.categories.length > 0 &&
									` ${
										categoryFilterMode === 'exclude' ? 'excluding' : 'in'
									} ${chartBuilder.categories.join(', ')} categories`}
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
