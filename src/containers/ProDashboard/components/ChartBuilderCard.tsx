import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { Select } from '~/components/Select/Select'
import { filterDataByTimePeriod } from '~/containers/ProDashboard/queries'
import { download } from '~/utils'
import { useChartImageExport } from '../hooks/useChartImageExport'
import {
	useProDashboardCatalog,
	useProDashboardEditorActions,
	useProDashboardPermissions,
	useProDashboardTime
} from '../ProDashboardAPIContext'
import ProtocolSplitCharts from '../services/ProtocolSplitCharts'
import { ConfirmationModal } from './ConfirmationModal'
import { ChartPngExportButton } from './ProTable/ChartPngExportButton'
import { ProTableCSVButton } from './ProTable/CsvButton'

const MultiSeriesChart = lazy(() => import('~/components/ECharts/MultiSeriesChart'))
const TreeMapBuilderChart = lazy(() => import('~/components/ECharts/TreeMapBuilderChart'))

const DEFAULT_SERIES_COLOR = '#3e61cc'
const EMPTY_SERIES_COLORS: Record<string, string> = {}
const EMPTY_SERIES_NAMES: string[] = []
const HEX_COLOR_REGEX = /^#([0-9a-f]{3}){1,2}$/i
const CHAIN_ONLY_METRICS = new Set(['stablecoins', 'chain-fees', 'chain-revenue'])
const CHART_TYPE_OPTIONS = [
	{ name: 'Stacked Bar', key: 'stackedBar' },
	{ name: 'Stacked Area', key: 'stackedArea' },
	{ name: 'Line', key: 'line' },
	{ name: 'Tree Map', key: 'treemap' }
]
const TREEMAP_VALUE_OPTIONS = [
	{ name: 'Last day (1d)', key: 'latest' },
	{ name: 'Sum 7d', key: 'sum7d' },
	{ name: 'Sum 30d', key: 'sum30d' }
]
const VALUE_TYPE_OPTIONS = [
	{ name: 'Show absolute ($)', key: '$ Absolute' },
	{ name: 'Show percentage (%)', key: '% Percentage' }
]
const buildHideOthersOptions = (mode: 'chains' | 'protocol', limit: number) => [
	{ name: mode === 'protocol' ? 'Show all chains' : 'Show all protocols', key: 'All' },
	{
		name: mode === 'protocol' ? 'Show only top chains' : 'Show only top protocols',
		key: `Top ${limit}`
	}
]

const resolveFilterMode = (value?: 'include' | 'exclude', fallback?: 'include' | 'exclude') => {
	if (value === 'include' || value === 'exclude') return value
	if (fallback === 'include' || fallback === 'exclude') return fallback
	return 'include'
}

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
				| 'open-interest'
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
				| 'stablecoins'
				| 'chain-fees'
				| 'chain-revenue'
			mode: 'chains' | 'protocol'
			filterMode?: 'include' | 'exclude'
			chainFilterMode?: 'include' | 'exclude'
			categoryFilterMode?: 'include' | 'exclude'
			chainCategoryFilterMode?: 'include' | 'exclude'
			protocolCategoryFilterMode?: 'include' | 'exclude'
			protocol?: string
			chains: string[]
			chainCategories?: string[]
			protocolCategories?: string[]
			categories: string[]
			groupBy: 'protocol'
			limit: number
			chartType: 'stackedBar' | 'stackedArea' | 'line' | 'treemap'
			treemapValue?: 'latest' | 'sum7d' | 'sum30d'
			displayAs: 'timeSeries' | 'percentage'
			hideOthers?: boolean
			groupByParent?: boolean
			additionalFilters?: Record<string, any>
			seriesColors?: Record<string, string>
		}
		name?: string
		grouping?: 'day' | 'week' | 'month' | 'quarter'
	}
}

type BuilderMetric = ChartBuilderCardProps['builder']['config']['metric']
type ProtocolSplitMetric = Exclude<BuilderMetric, 'stablecoins' | 'chain-fees' | 'chain-revenue'>

export function ChartBuilderCard({ builder }: ChartBuilderCardProps) {
	const {
		handlePercentageChange,
		handleGroupingChange,
		handleHideOthersChange,
		handleChartTypeChange,
		handleEditItem,
		handleDuplicateChartBuilder
	} = useProDashboardEditorActions()
	const { isReadOnly } = useProDashboardPermissions()
	const { timePeriod, customTimePeriod } = useProDashboardTime()
	const { getProtocolInfo } = useProDashboardCatalog()
	const { chartInstance, handleChartReady } = useChartImageExport()
	const config = builder.config
	const [showColors, setShowColors] = useState(false)
	const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false)
	const seriesColors = config.seriesColors ?? EMPTY_SERIES_COLORS
	let hasCustomSeriesColors = false
	for (const _ in seriesColors) {
		hasCustomSeriesColors = true
		break
	}
	const groupingOptions: ('day' | 'week' | 'month' | 'quarter')[] = ['day', 'week', 'month', 'quarter']
	const chainFilterMode = resolveFilterMode(config.chainFilterMode, config.filterMode)
	const categoryFilterMode = resolveFilterMode(config.categoryFilterMode, config.filterMode)
	const chainCategoryFilterMode = resolveFilterMode(config.chainCategoryFilterMode, config.filterMode)
	const protocolCategoryFilterMode = resolveFilterMode(config.protocolCategoryFilterMode, config.filterMode)

	useEffect(() => {
		if (isReadOnly) {
			setShowColors(() => false)
		}
	}, [isReadOnly])

	const isTvlChart = config.metric === 'tvl' || config.metric === 'stablecoins'
	const treemapValue = config.treemapValue || 'latest'
	const treemapMode = isTvlChart ? 'latest' : treemapValue
	const treemapLabel =
		TREEMAP_VALUE_OPTIONS.find((option) => option.key === treemapMode)?.name || TREEMAP_VALUE_OPTIONS[0].name
	const hideOthersOptions = useMemo(
		() => buildHideOthersOptions(config.mode, config.limit),
		[config.mode, config.limit]
	)

	const timeKey = useMemo(() => {
		if (timePeriod === 'custom' && customTimePeriod) {
			if (customTimePeriod.type === 'relative') {
				return `custom-relative-${customTimePeriod.relativeDays ?? ''}`
			}
			return `custom-absolute-${customTimePeriod.startDate ?? ''}-${customTimePeriod.endDate ?? ''}`
		}
		return timePeriod || 'all'
	}, [timePeriod, customTimePeriod])

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
			config.protocolCategories,
			config.hideOthers,
			config.groupByParent,
			chainFilterMode,
			categoryFilterMode,
			chainCategoryFilterMode,
			protocolCategoryFilterMode,
			timePeriod,
			customTimePeriod
		],
		queryFn: async () => {
			if (config.mode === 'protocol') {
				const data = await ProtocolSplitCharts.getProtocolChainData(
					config.protocol,
					config.metric,
					config.chains.length > 0 ? config.chains : undefined,
					config.limit,
					chainFilterMode,
					config.chainCategories && config.chainCategories.length > 0 ? config.chainCategories : undefined,
					config.protocolCategories && config.protocolCategories.length > 0 ? config.protocolCategories : undefined,
					chainCategoryFilterMode,
					protocolCategoryFilterMode
				)

				if (!data || !data.series) {
					return { series: [] }
				}

				let series = data.series
				if (timePeriod && timePeriod !== 'all') {
					series = series.map((s) => ({
						...s,
						data: filterDataByTimePeriod(s.data, timePeriod, customTimePeriod)
					}))
				}

				if (
					config.hideOthers ||
					(config.mode === 'protocol' &&
						((config.chainCategories && config.chainCategories.length > 0) ||
							(config.protocolCategories && config.protocolCategories.length > 0)))
				) {
					series = series.filter((s) => !s.name.startsWith('Others'))
				}

				return { series }
			}

			if (CHAIN_ONLY_METRICS.has(config.metric)) {
				return { series: [] }
			}

			const data = await ProtocolSplitCharts.getProtocolSplitData(
				config.metric as ProtocolSplitMetric,
				config.chains,
				config.limit,
				config.categories,
				config.groupByParent,
				chainFilterMode,
				categoryFilterMode
			)

			if (!data || !data.series) {
				return { series: [] }
			}

			let series = data.series
			if (timePeriod && timePeriod !== 'all') {
				series = series.map((s) => ({
					...s,
					data: filterDataByTimePeriod(s.data, timePeriod, customTimePeriod)
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

				for (const [timestamp, value] of s.data as [number, number][]) {
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
				}

				return {
					...s,
					data: Array.from(aggregatedData.entries())
						.sort((a, b) => a[0] - b[0])
						.map(([periodStart, { value }]) => [periodStart, value])
				}
			})
		}

		const resolveSeriesColor = (name: string, fallback?: string) => {
			const override = seriesColors[name]
			if (override) {
				return override
			}
			if (fallback && HEX_COLOR_REGEX.test(fallback)) {
				return fallback
			}
			return DEFAULT_SERIES_COLOR
		}

		if (config.displayAs === 'percentage') {
			const timestampTotals = new Map<number, number>()
			for (const s of processedSeries) {
				for (const [timestamp, value] of s.data as [number, number][]) {
					timestampTotals.set(timestamp, (timestampTotals.get(timestamp) || 0) + value)
				}
			}

			return processedSeries.map((s: any) => ({
				name: s.name,
				data: s.data.map(([timestamp, value]: [number, number]) => {
					const total = timestampTotals.get(timestamp) || 0
					return [timestamp, total > 0 ? (value / total) * 100 : 0]
				}),
				color: resolveSeriesColor(s.name, s.color),
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
			color: resolveSeriesColor(s.name, s.color),
			type: config.chartType === 'stackedBar' ? 'bar' : 'line',
			...(config.chartType === 'stackedArea' && {
				areaStyle: { opacity: 0.7 },
				stack: 'total'
			}),
			...(config.chartType === 'stackedBar' && {
				stack: 'total'
			})
		}))
	}, [chartData, config.displayAs, config.chartType, builder.grouping, isTvlChart, seriesColors])

	const chartSeriesNames = useMemo(() => {
		return chartSeries.length > 0 ? chartSeries.map((s: any) => s.name) : EMPTY_SERIES_NAMES
	}, [chartSeries])

	const treemapData = useMemo(() => {
		if (!chartData?.series || chartData.series.length === 0) return []

		const resolveColor = (name: string, fallback?: string) => {
			const override = seriesColors[name]
			if (override) return override
			if (fallback && HEX_COLOR_REGEX.test(fallback)) return fallback
			return DEFAULT_SERIES_COLOR
		}

		return chartData.series
			.map((s: any) => {
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
						color: resolveColor(s.name, s.color)
					}
				}
			})
			.filter((item: any) => item.value > 0)
	}, [chartData, seriesColors, treemapMode])

	const chartOptions = useMemo(() => {
		const tooltipFormatter = (params: any) => {
			const rawTimestamp = params[0].value[0]
			const millis = rawTimestamp < 10000000000 ? rawTimestamp * 1000 : rawTimestamp
			const date = new Date(millis)
			const chartdate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`

			let filteredParams = params.filter(
				(item: any) => item.value[1] !== '-' && item.value[1] !== null && item.value[1] !== undefined
			)
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
		}

		return {
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
				data: chartSeriesNames
			},
			tooltip: {
				formatter: tooltipFormatter,
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
		}
	}, [chartSeriesNames, config.displayAs, config.limit])

	const handleCsvExport = () => {
		if (!chartSeries || chartSeries.length === 0) return

		const timestampSet = new Set<number>()
		for (const s of chartSeries) {
			for (const [timestamp] of s.data as [number, number][]) {
				timestampSet.add(timestamp)
			}
		}
		const timestamps = Array.from(timestampSet).sort((a, b) => a - b)

		const headers = ['Date', ...chartSeries.map((s: any) => s.name)]

		const rows = timestamps.map((timestamp) => {
			const row = [new Date(timestamp * 1000).toLocaleDateString()]
			for (const s of chartSeries) {
				const dataPoint = s.data.find(([t]: [number, number]) => t === timestamp)
				row.push(dataPoint ? dataPoint[1].toString() : '0')
			}
			return row
		})

		const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')
		const fileName = `${
			builder.name || config.metric
		}_${config.chains.join('-')}_${config.categories.length > 0 ? config.categories.join('-') + '_' : ''}${
			config.chainCategories && config.chainCategories.length > 0 ? config.chainCategories.join('-') + '_' : ''
		}${
			config.protocolCategories && config.protocolCategories.length > 0 ? config.protocolCategories.join('-') + '_' : ''
		}${new Date().toISOString().split('T')[0]}.csv`
		download(fileName, csvContent)
	}

	const updateSeriesColors = (nextColors: Record<string, string>) => {
		if (isReadOnly) {
			return
		}
		handleEditItem(builder.id, {
			...builder,
			config: {
				...builder.config,
				seriesColors: nextColors
			}
		})
	}

	const handleSeriesColorChange = (seriesName: string, colorValue: string) => {
		const currentColors = builder.config.seriesColors || {}
		if (currentColors[seriesName] === colorValue) {
			return
		}
		updateSeriesColors({
			...currentColors,
			[seriesName]: colorValue
		})
	}

	const handleSeriesColorReset = (seriesName: string) => {
		if (!builder.config.seriesColors || !(seriesName in builder.config.seriesColors)) {
			return
		}
		const nextColors = { ...builder.config.seriesColors }
		delete nextColors[seriesName]
		updateSeriesColors(nextColors)
	}

	const handleResetAllSeriesColors = () => {
		if (!builder.config.seriesColors) return
		let hasColors = false
		for (const _ in builder.config.seriesColors) {
			hasColors = true
			break
		}
		if (!hasColors) return
		updateSeriesColors({})
	}

	const handleTreemapValueChange = (nextValue: string) => {
		if (isReadOnly) {
			return
		}
		if (nextValue !== 'latest' && nextValue !== 'sum7d' && nextValue !== 'sum30d') {
			return
		}
		if (config.treemapValue === nextValue) {
			return
		}
		handleEditItem(builder.id, {
			...builder,
			config: {
				...builder.config,
				treemapValue: nextValue
			}
		})
	}

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
					{!isReadOnly && chartSeries.length > 0 && config.chartType !== 'treemap' && (
						<div className="flex overflow-hidden rounded-md border border-(--form-control-border)">
							{groupingOptions.map((option, index) => (
								<button
									key={option}
									onClick={() => handleGroupingChange(builder.id, option)}
									className={`px-2 py-1 text-xs font-medium transition-colors duration-150 ease-in-out sm:px-3 ${index > 0 ? 'border-l border-(--form-control-border)' : ''} ${
										builder.grouping === option || (!builder.grouping && option === 'day')
											? 'bg-(--primary) text-white focus:ring-2 focus:ring-(--primary)/50 focus:outline-hidden'
											: 'bg-transparent pro-hover-bg pro-text2 focus:ring-1 focus:ring-(--form-control-border) focus:outline-hidden'
									}`}
								>
									{option.slice(0, 1).toUpperCase()}
								</button>
							))}
						</div>
					)}
					{!isReadOnly && (
						<Select
							allValues={CHART_TYPE_OPTIONS}
							selectedValues={config.chartType}
							setSelectedValues={(value) => {
								handleChartTypeChange(builder.id, value as 'stackedBar' | 'stackedArea' | 'line' | 'treemap')
							}}
							label={
								config.chartType === 'stackedBar'
									? 'Stacked Bar'
									: config.chartType === 'stackedArea'
										? 'Stacked Area'
										: config.chartType === 'treemap'
											? 'Tree Map'
											: 'Line'
							}
							labelType="none"
							variant="pro"
						/>
					)}
					{!isReadOnly && config.chartType === 'treemap' && !isTvlChart && (
						<Select
							allValues={TREEMAP_VALUE_OPTIONS}
							selectedValues={treemapMode}
							setSelectedValues={(value) => handleTreemapValueChange(value as string)}
							label={treemapLabel}
							labelType="none"
							variant="pro"
						/>
					)}
					{!isReadOnly && config.chartType !== 'treemap' && (
						<Select
							allValues={VALUE_TYPE_OPTIONS}
							selectedValues={config.displayAs === 'percentage' ? '% Percentage' : '$ Absolute'}
							setSelectedValues={(value) => {
								handlePercentageChange(builder.id, value === '% Percentage')
							}}
							label={config.displayAs === 'percentage' ? '% Percentage' : '$ Absolute'}
							labelType="none"
							variant="pro"
						/>
					)}
					{chartSeries.length > 0 && (
						<button
							type="button"
							onClick={() => setShowColors((prev) => !prev)}
							disabled={isReadOnly}
							aria-pressed={showColors}
							className={`flex items-center gap-1 rounded-md border px-1.5 py-1 text-xs transition-colors disabled:cursor-not-allowed ${
								showColors
									? 'border-transparent bg-(--primary) text-white'
									: 'border-(--form-control-border) hover:not-disabled:pro-btn-blue focus-visible:not-disabled:pro-btn-blue'
							} disabled:border-(--cards-border) disabled:text-(--text-disabled)`}
						>
							Colors
						</button>
					)}
					{!isReadOnly &&
						(config.mode !== 'protocol' || !(config.chainCategories && config.chainCategories.length > 0)) && (
							<Select
								allValues={hideOthersOptions}
								selectedValues={config.hideOthers ? `Top ${config.limit}` : 'All'}
								setSelectedValues={(value) => {
									handleHideOthersChange(builder.id, value !== 'All')
								}}
								label={config.hideOthers ? `Top ${config.limit}` : 'All'}
								labelType="none"
								variant="pro"
							/>
						)}
					{!isReadOnly && (
						<button
							type="button"
							onClick={() => setShowDuplicateConfirm(true)}
							className="flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent hover:not-disabled:pro-btn-blue focus-visible:border-transparent focus-visible:not-disabled:pro-btn-blue disabled:border-(--cards-border) disabled:text-(--text-disabled)"
						>
							<Icon name="copy" height={14} width={14} />
							<span>Duplicate</span>
						</button>
					)}
					{chartSeries.length > 0 && (
						<>
							<ChartPngExportButton
								chartInstance={chartInstance}
								filename={builder.name || config.metric}
								title={config.chartType === 'treemap' ? undefined : builder.name || `${config.metric} by Protocol`}
								expandLegend
								smol
							/>
							<ProTableCSVButton
								onClick={handleCsvExport}
								smol
								className="flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent hover:not-disabled:pro-btn-blue focus-visible:border-transparent focus-visible:not-disabled:pro-btn-blue disabled:border-(--cards-border) disabled:text-(--text-disabled)"
							/>
						</>
					)}
				</div>
				{showColors && chartSeries.length > 0 && (
					<div className="flex thin-scrollbar items-center gap-2 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) px-2 py-2">
						<span className="shrink-0 text-xs font-medium text-(--text-label)">Series Colors</span>
						{chartSeries.map((series: any) => {
							const colorValue = seriesColors[series.name] || series.color || DEFAULT_SERIES_COLOR
							const hasOverride = Boolean(seriesColors[series.name])
							return (
								<div
									key={series.name}
									className="flex shrink-0 items-center gap-1.5 rounded border border-(--cards-border) bg-(--bg-input) px-2 py-1 text-xs"
								>
									<span className="max-w-[140px] truncate" title={series.name}>
										{series.name}
									</span>
									<input
										type="color"
										value={colorValue}
										onChange={(event) => handleSeriesColorChange(series.name, event.target.value)}
										disabled={isReadOnly}
										className="h-5 w-5 cursor-pointer rounded border border-(--cards-border) bg-transparent p-0 disabled:cursor-not-allowed"
										aria-label={`Select color for ${series.name}`}
									/>
									<button
										type="button"
										onClick={() => handleSeriesColorReset(series.name)}
										disabled={isReadOnly || !hasOverride}
										className={`text-[10px] font-medium transition-colors disabled:cursor-not-allowed ${
											isReadOnly || !hasOverride
												? 'text-(--text-disabled)'
												: 'text-(--text-tertiary) hover:text-(--text-primary)'
										}`}
									>
										Reset
									</button>
								</div>
							)
						})}
						<button
							type="button"
							onClick={handleResetAllSeriesColors}
							disabled={isReadOnly || !hasCustomSeriesColors}
							className={`flex shrink-0 items-center rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
								isReadOnly || !hasCustomSeriesColors
									? 'border-(--cards-border) text-(--text-disabled)'
									: 'border-(--form-control-border) text-(--text-tertiary) hover:text-(--text-primary)'
							}`}
						>
							Reset All
						</button>
					</div>
				)}
				{(() => {
					const parts: string[] = []
					if (config.mode === 'protocol') {
						const protoName = config.protocol
							? getProtocolInfo(config.protocol)?.name || config.protocol
							: 'All Protocols'
						parts.push(protoName)
						if (chainFilterMode === 'exclude' && config.chains.length > 0) {
							parts.push(`Excluding ${config.chains.join(', ')}`)
						} else if (config.chains.length > 0) {
							parts.push(config.chains.join(', '))
						} else {
							parts.push('All chains')
						}
						if (config.chainCategories && config.chainCategories.length > 0) {
							const cats = config.chainCategories.join(', ')
							if (chainCategoryFilterMode === 'exclude') parts.push(`Excluding ${cats}`)
							else parts.push(cats)
						}
						if (config.protocolCategories && config.protocolCategories.length > 0) {
							const cats = config.protocolCategories.join(', ')
							if (protocolCategoryFilterMode === 'exclude') parts.push(`Excluding ${cats}`)
							else parts.push(cats)
						}
					} else {
						const chainLabel = config.chains.length > 0 ? config.chains.join(', ') : 'All chains'
						const chainDisplay =
							chainFilterMode === 'exclude' && config.chains.length > 0 ? `Excluding ${chainLabel}` : chainLabel
						parts.push(`${chainDisplay} • Top ${config.limit} protocols${config.hideOthers ? ' only' : ''}`)
						if (config.categories.length > 0) {
							const cats = config.categories.join(', ')
							if (categoryFilterMode === 'exclude') parts.push(`Excluding ${cats}`)
							else parts.push(cats)
						}
					}
					if (config.chartType === 'treemap') {
						const treemapSummary = treemapMode === 'latest' ? 'Latest' : treemapMode === 'sum7d' ? '7D' : '30D'
						parts.push(treemapSummary)
					} else if (timePeriod && timePeriod !== 'all') {
						parts.push(timePeriod.toUpperCase())
					}
					return <p className="text-xs text-(--text-label)">{parts.join(' • ')}</p>
				})()}
			</div>

			{isLoading ? (
				<div className="flex flex-1 flex-col items-center justify-center">
					<div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-(--primary)"></div>
					<p className="text-sm text-(--text-form)">Loading chart...</p>
				</div>
			) : chartSeries.length > 0 || treemapData.length > 0 ? (
				<Suspense fallback={<div className="min-h-[300px]" />}>
					{config.chartType === 'treemap' ? (
						<TreeMapBuilderChart data={treemapData} height="350px" onReady={handleChartReady} />
					) : (
						<MultiSeriesChart
							key={`${builder.id}-${config.displayAs}-${builder.grouping || 'day'}-${config.hideOthers}-${config.limit}-${timeKey}`}
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
							chartOptions={chartOptions}
						/>
					)}
				</Suspense>
			) : (
				<div className="flex flex-1 flex-col items-center justify-center">
					<p className="text-sm text-(--text-label)">No data available</p>
				</div>
			)}
			<ConfirmationModal
				isOpen={showDuplicateConfirm}
				onClose={() => setShowDuplicateConfirm(false)}
				onConfirm={() => handleDuplicateChartBuilder(builder)}
				title="Duplicate Chart"
				message="Create a duplicate of this chart in the dashboard?"
				confirmText="Duplicate"
				cancelText="Cancel"
				confirmButtonClass="pro-btn-blue"
			/>
		</div>
	)
}
