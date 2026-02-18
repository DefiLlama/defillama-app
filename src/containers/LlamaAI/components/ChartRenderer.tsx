/**
 * Server-Side Improvements for Chart Data Pipeline
 * =================================================
 *
 * CURRENT FRONTEND BURDEN:
 * The client currently handles significant data transformation and type detection:
 *
 * 1. FORMAT DETECTION (chartAdapter.ts, ChartRenderer.tsx)
 *    - Check if chartData is array vs object: `Array.isArray(chartData) ? chartData : chartData?.[chart.id]`
 *    - Detect keyed vs flat data structures
 *    - Handle missing/undefined data gracefully
 *
 * 2. CHART TYPE INFERENCE (chartAdapter.ts ~680 lines)
 *    - Detect if data is time-series vs categorical
 *    - Infer pie chart data from value/name/label fields
 *    - Detect scatter plot dimensions (x, y, size, color)
 *    - Identify candlestick OHLCV fields
 *
 * 3. DATA NORMALIZATION (chartAdapter.ts, chartDataTransformer.ts)
 *    - Normalize timestamps (unix seconds/ms → Date objects)
 *    - Convert string numbers to actual numbers
 *    - Fill missing values with nulls/zeros
 *    - Align multi-series data to common time axis
 *
 * RECOMMENDED SERVER CHANGES:
 *
 * 1. PRE-ADAPTED CHART DATA FORMAT
 *    Instead of sending raw query results, send render-ready data:
 *    ```json
 *    {
 *      "type": "charts",
 *      "charts": [{
 *        "id": "tvl-chart",
 *        "chartType": "area",           // Explicit, no inference needed
 *        "renderConfig": {              // Ready for ECharts
 *          "xAxisType": "time",
 *          "yAxisType": "value",
 *          "seriesType": "line",
 *          "areaStyle": true
 *        },
 *        "data": [                      // Always array, always for THIS chart
 *          { "date": 1704067200000, "value": 50000000000 }
 *        ],
 *        "series": ["TVL"],             // Pre-extracted series names
 *        "colors": ["#2172E5"]          // Pre-assigned colors
 *      }]
 *    }
 *    ```
 *
 * 2. ELIMINATE chartData OBJECT KEYING
 *    Current: `chartData: { "chart-1": [...], "chart-2": [...] }` OR `chartData: [...]`
 *    Proposed: Each chart carries its own data, no lookup needed:
 *    ```json
 *    { "id": "chart-1", "data": [...] }  // Data embedded in chart object
 *    ```
 *    This eliminates: `Array.isArray(chartData) ? chartData : chartData?.[chart.id]`
 *
 * 3. PRE-COMPUTED TRANSFORMATIONS
 *    If server knows the chart supports stacking/cumulative, pre-compute:
 *    ```json
 *    {
 *      "data": [...],
 *      "transformedData": {
 *        "stacked": [...],
 *        "cumulative": [...],
 *        "percentage": [...]
 *      }
 *    }
 *    ```
 *    Frontend simply swaps data arrays instead of recomputing.
 *
 * 4. EXPLICIT FIELD MAPPING
 *    Instead of inferring fields, server specifies them:
 *    ```json
 *    {
 *      "fieldMapping": {
 *        "x": "date",
 *        "y": ["tvl", "volume"],
 *        "tooltip": ["tvl", "volume", "change24h"]
 *      }
 *    }
 *    ```
 *
 * 5. NORMALIZED TIMESTAMPS
 *    Always send timestamps as milliseconds (JS-native), not seconds.
 *    Current adapter does: `timestamp * 1000` detection. Server should normalize.
 *
 * CURRENT PIPELINE ASSESSMENT:
 * ============================
 * The current pipeline is FUNCTIONAL but has O(n) overhead per chart:
 * - adaptChartData: ~50 lines of type inference
 * - Time detection: Check first few values for timestamp format
 * - Series extraction: Iterate to find all unique keys
 * - Color assignment: Iterate to map series to colors
 *
 * For typical responses (1-3 charts, <1000 data points), this is acceptable.
 * For large responses (5+ charts, 10k+ points), server pre-processing would help.
 *
 * MIGRATION PATH:
 * 1. Server adds optional `renderConfig` to chart objects
 * 2. Frontend checks for `renderConfig` → skip adaptation if present
 * 3. Gradually migrate chart types to server-side formatting
 * 4. Remove adapter fallback code once all charts migrated
 */

import { lazy, memo, Suspense, useEffect, useReducer, useRef } from 'react'
import { AddToDashboardButton } from '~/components/AddToDashboard'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { formatTooltipValue } from '~/components/ECharts/formatters'
import type {
	IBarChartProps,
	ICandlestickChartProps,
	IChartProps,
	IPieChartProps,
	IScatterChartProps
} from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import type { ChartConfiguration } from '../types'
import { adaptCandlestickData, adaptChartData, adaptMultiSeriesData } from '../utils/chartAdapter'
import { areChartDataEqual, areChartsEqual, areStringArraysEqual } from '../utils/chartComparison'
import { ChartDataTransformer } from '../utils/chartDataTransformer'
import { ChartControls } from './ChartControls'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>
const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>
const CandlestickChart = lazy(() => import('~/components/ECharts/CandlestickChart')) as React.FC<ICandlestickChartProps>
const HBarChart = lazy(() => import('~/components/ECharts/HBarChart'))
const MultiSeriesChart = lazy(() => import('~/components/ECharts/MultiSeriesChart'))
const PieChart = lazy(() => import('~/components/ECharts/PieChart'))
const ScatterChart = lazy(() => import('~/components/ECharts/ScatterChart'))

interface ChartRendererProps {
	charts: ChartConfiguration[]
	chartData: any[]
	isLoading?: boolean
	isAnalyzing?: boolean
	hasError?: boolean
	expectedChartCount?: number
	chartTypes?: string[]
	resizeTrigger?: number
	messageId?: string
}

interface SingleChartProps {
	config: ChartConfiguration
	data: any[]
	isActive: boolean
	messageId?: string
}

type ChartState = {
	stacked: boolean
	percentage: boolean
	cumulative: boolean
	grouping: 'day' | 'week' | 'month' | 'quarter'
	showHallmarks: boolean
	showLabels: boolean
}

type ChartAction =
	| { type: 'SET_STACKED'; payload: boolean }
	| { type: 'SET_PERCENTAGE'; payload: boolean }
	| { type: 'SET_CUMULATIVE'; payload: boolean }
	| { type: 'SET_GROUPING'; payload: 'day' | 'week' | 'month' | 'quarter' }
	| { type: 'SET_HALLMARKS'; payload: boolean }
	| { type: 'SET_LABELS'; payload: boolean }

const chartReducer = (state: ChartState, action: ChartAction): ChartState => {
	switch (action.type) {
		case 'SET_STACKED':
			return { ...state, stacked: action.payload }
		case 'SET_PERCENTAGE':
			return { ...state, percentage: action.payload }
		case 'SET_CUMULATIVE':
			return { ...state, cumulative: action.payload }
		case 'SET_GROUPING':
			return { ...state, grouping: action.payload }
		case 'SET_HALLMARKS':
			return { ...state, showHallmarks: action.payload }
		case 'SET_LABELS':
			return { ...state, showLabels: action.payload }
		default:
			return state
	}
}

function SingleChart({ config, data, isActive, messageId }: SingleChartProps) {
	const [chartState, dispatch] = useReducer(chartReducer, {
		stacked: config.displayOptions?.defaultStacked || false,
		percentage: config.displayOptions?.defaultPercentage || false,
		cumulative: false,
		grouping: 'day' as const,
		showHallmarks: true,
		showLabels: config.displayOptions?.showLabels || false
	})
	const handleStackedChange = (stacked: boolean) => dispatch({ type: 'SET_STACKED', payload: stacked })
	const handlePercentageChange = (percentage: boolean) => dispatch({ type: 'SET_PERCENTAGE', payload: percentage })
	const handleCumulativeChange = (cumulative: boolean) => dispatch({ type: 'SET_CUMULATIVE', payload: cumulative })
	const handleGroupingChange = (grouping: ChartState['grouping']) =>
		dispatch({ type: 'SET_GROUPING', payload: grouping })
	const handleHallmarksChange = (showHallmarks: boolean) => dispatch({ type: 'SET_HALLMARKS', payload: showHallmarks })
	const handleLabelsChange = (showLabels: boolean) => dispatch({ type: 'SET_LABELS', payload: showLabels })

	if (!isActive) return null

	if (config.type === 'candlestick') {
		const candlestickData = adaptCandlestickData(config, data)
		return (
			<div className="flex flex-col p-2" data-chart-id={config.id}>
				<Suspense fallback={<div className="h-[480px]" />}>
					<CandlestickChart data={candlestickData.data} indicators={candlestickData.indicators} />
				</Suspense>
			</div>
		)
	}

	try {
		const isMultiSeries = config.series && config.series.length > 1
		let adaptedChart = isMultiSeries ? adaptMultiSeriesData(config, data) : adaptChartData(config, data)

		if (config.type === 'pie' && chartState.percentage) {
			const pieData = (adaptedChart.props as any).chartData || []
			const total = pieData.reduce((sum: number, item: any) => sum + item.value, 0)
			const percentageData = pieData.map((item: any) => ({
				...item,
				value: total > 0 ? (item.value / total) * 100 : 0
			}))
			adaptedChart = {
				...adaptedChart,
				props: {
					...(adaptedChart.props as any),
					chartData: percentageData,
					valueSymbol: '%'
				}
			}
		}

		const dataLength = isMultiSeries
			? (adaptedChart.props as any).series?.[0]?.data?.length || 0
			: adaptedChart.data?.length || data?.length || 0

		const shouldTransform =
			isMultiSeries &&
			(chartState.stacked || chartState.percentage || chartState.cumulative || chartState.grouping !== 'day')

		if (shouldTransform) {
			let transformedSeries = (adaptedChart.props as any).series || []

			if (chartState.grouping !== 'day' && config.displayOptions?.supportsGrouping) {
				transformedSeries = ChartDataTransformer.groupByInterval(transformedSeries, chartState.grouping, config.type)
			}

			if (chartState.cumulative && config.displayOptions?.canShowCumulative) {
				transformedSeries = ChartDataTransformer.applyCumulativeToSeries(transformedSeries)
			}

			if (chartState.stacked && config.displayOptions?.canStack && !chartState.percentage) {
				transformedSeries = ChartDataTransformer.toStacked(transformedSeries, config.type)
			}

			if (chartState.percentage && config.displayOptions?.canShowPercentage) {
				transformedSeries = ChartDataTransformer.toPercentage(transformedSeries, chartState.stacked)
			}

			adaptedChart = {
				...adaptedChart,
				props: {
					...(adaptedChart.props as any),
					series: transformedSeries,
					groupBy:
						chartState.grouping === 'week'
							? 'weekly'
							: chartState.grouping === 'month'
								? 'monthly'
								: chartState.grouping === 'quarter'
									? 'quarterly'
									: 'daily'
				}
			}
		}

		const valueSymbol = chartState.percentage
			? '%'
			: config.valueSymbol || (config.axes.yAxes?.length === 1 ? config.axes.yAxes[0]?.valueSymbol : undefined) || '$'
		adaptedChart = {
			...adaptedChart,
			props: {
				...(adaptedChart.props as any),
				valueSymbol,
				...(!chartState.showHallmarks && { hallmarks: undefined }),
				...(chartState.percentage && {
					chartOptions: {
						yAxis: {
							max: 100,
							min: 0,
							axisLabel: {
								formatter: '{value}%'
							}
						},
						grid: {
							top: 24,
							right: 12,
							bottom: 68,
							left: 12
						},
						tooltip: {
							valueFormatter: (value: number) => value.toFixed(2) + '%'
						}
					}
				})
			}
		}

		const hasData =
			adaptedChart.chartType === 'multi-series'
				? (adaptedChart.props as any).series?.length > 0
				: adaptedChart.data.length > 0

		const prepareCsv = () => {
			const filename = `${adaptedChart.title}-${adaptedChart.chartType}-${new Date().toISOString().split('T')[0]}.csv`
			const isTimeSeries = config.axes.x.type === 'time'
			const xLabel = config.axes.x.label || (isTimeSeries ? 'Date' : 'Category')
			const yLabel = config.axes.yAxes?.[0]?.label || config.series?.[0]?.name || 'Value'

			if (['multi-series', 'combo'].includes(adaptedChart.chartType)) {
				const seriesNames = (adaptedChart.props as any).series.map((s: any) => s.name)
				const rows: Array<Array<string | number | boolean>> = [
					isTimeSeries ? ['Timestamp', 'Date', ...seriesNames] : [xLabel, ...seriesNames]
				]
				const valuesByKey: Record<string | number, Record<string, number>> = {}
				for (const s of (adaptedChart.props as any).series ?? []) {
					for (const [key, val] of s.data ?? []) {
						valuesByKey[key] = valuesByKey[key] || {}
						valuesByKey[key][s.name] = val
					}
				}
				const sortedKeys: string[] = []
				for (const key in valuesByKey) {
					sortedKeys.push(key)
				}
				sortedKeys.sort((a, b) => +a - +b)
				for (const key of sortedKeys) {
					const base = isTimeSeries ? [key, new Date(+key * 1e3).toLocaleDateString()] : [key]
					rows.push([...base, ...seriesNames.map((name: string) => valuesByKey[key][name] ?? '')])
				}
				return { filename, rows }
			}

			if (adaptedChart.chartType === 'pie') {
				const rows: Array<Array<string | number | boolean>> = [['Name', 'Value']]
				for (const item of (adaptedChart.props as any).chartData ?? []) {
					rows.push([item.name, item.value])
				}
				return { filename, rows }
			}

			if (adaptedChart.chartType === 'scatter') {
				const xAxisLabel = config.axes.x.label || 'X'
				const yAxisLabel = config.axes.yAxes?.[0]?.label || 'Y'
				const rows: Array<Array<string | number | boolean>> = [[xAxisLabel, yAxisLabel, 'Entity']]
				for (const point of (adaptedChart.props as any).chartData ?? []) {
					rows.push([point[0], point[1], point[2] ?? ''])
				}
				return { filename, rows }
			}

			if (['area', 'line', 'bar', 'hbar'].includes(adaptedChart.chartType)) {
				const chartData = adaptedChart.data as Array<[string | number, number | null]>
				if (isTimeSeries) {
					const rows: Array<Array<string | number | boolean>> = [['Timestamp', 'Date', yLabel]]
					for (const [ts, val] of chartData) {
						rows.push([ts, new Date(+ts * 1e3).toLocaleDateString(), val ?? ''])
					}
					return { filename, rows }
				}
				const rows: Array<Array<string | number | boolean>> = [[xLabel, yLabel]]
				for (const [category, val] of chartData) {
					rows.push([category, val ?? ''])
				}
				return { filename, rows }
			}

			return { filename, rows: [] }
		}

		if (!hasData) {
			return (
				<div className="flex flex-col items-center justify-center gap-2 p-1 py-8 text-[#666] dark:text-[#919296]">
					<Icon name="bar-chart" height={16} width={16} />
					<p>No data available for chart</p>
				</div>
			)
		}

		const chartKey = `${config.id}-${chartState.stacked}-${chartState.percentage}-${chartState.cumulative}-${chartState.grouping}-${chartState.showHallmarks}`

		let chartContent: React.ReactNode

		switch (adaptedChart.chartType) {
			case 'bar':
				const isTimeSeriesChart = config.axes.x.type === 'time'
				if (isTimeSeriesChart) {
					chartContent = (
						<Suspense fallback={<div className="h-[338px]" />}>
							<div className="flex items-center justify-end gap-1 p-2 pt-0">
								{(adaptedChart.props as IBarChartProps).title ? (
									<h1 className="mr-auto text-base font-semibold">{(adaptedChart.props as IBarChartProps).title}</h1>
								) : null}
								<AddToDashboardButton
									chartConfig={null}
									llamaAIChart={messageId ? { messageId, chartId: config.id, title: config.title } : null}
									smol
								/>
								<CSVDownloadButton prepareCsv={prepareCsv} smol />
							</div>
							<BarChart
								key={chartKey}
								chartData={adaptedChart.data}
								{...(adaptedChart.props as IBarChartProps)}
								title={undefined}
								hideDownloadButton={true}
							/>
						</Suspense>
					)
				} else {
					const seriesData = (adaptedChart.data as Array<[any, number]>).map(([x, y]) => [x, y])
					const multiSeriesProps: any = {
						series: [
							{
								data: seriesData,
								type: 'bar',
								name: config.series[0]?.name || 'Value',
								color: config.series[0]?.styling?.color || '#1f77b4'
							}
						],
						title: config.title,
						valueSymbol: config.valueSymbol || '$',
						height: '360px',
						xAxisType: 'category',
						chartOptions: {
							grid: {
								bottom: 68,
								left: 12,
								right: 12
							},
							tooltip: {
								formatter: (params: any) => {
									if (!Array.isArray(params)) return ''
									const xValue = params[0]?.value?.[0]
									const yValue = params[0]?.value?.[1]
									const seriesName = params[0]?.seriesName
									const valueSymbol = config.valueSymbol || '$'
									const formattedValue = formatTooltipValue(yValue, valueSymbol)
									return `<div style="margin-bottom: 4px; font-weight: 600;">${xValue}</div><div>${seriesName}: ${formattedValue}</div>`
								}
							}
						}
					}
					const resolvedNtsTitle = (adaptedChart.props as any)?.title || config.title
					chartContent = (
						<Suspense fallback={<div className="h-[338px]" />}>
							<div className="flex items-center justify-end gap-1 p-2 pt-0">
								{resolvedNtsTitle ? <h1 className="mr-auto text-base font-semibold">{resolvedNtsTitle}</h1> : null}
								<AddToDashboardButton
									chartConfig={null}
									llamaAIChart={messageId ? { messageId, chartId: config.id, title: resolvedNtsTitle } : null}
									smol
								/>
								<CSVDownloadButton prepareCsv={prepareCsv} smol />
							</div>
							<MultiSeriesChart key={chartKey} {...multiSeriesProps} title={undefined} />
						</Suspense>
					)
				}
				break

			case 'hbar':
				const hbarData = adaptedChart.data as Array<[any, number]>
				const hbarCategories = hbarData.map(([cat]) => cat)
				const hbarValues = hbarData.map(([, val]) => val)
				const resolvedHbarTitle = (adaptedChart.props as any)?.title || config.title
				chartContent = (
					<Suspense fallback={<div className="h-[338px]" />}>
						<div className="flex items-center justify-end gap-1 p-2 pt-0">
							{resolvedHbarTitle ? <h1 className="mr-auto text-base font-semibold">{resolvedHbarTitle}</h1> : null}
							<AddToDashboardButton
								chartConfig={null}
								llamaAIChart={messageId ? { messageId, chartId: config.id, title: resolvedHbarTitle } : null}
								smol
							/>
							<CSVDownloadButton prepareCsv={prepareCsv} smol />
						</div>
						<HBarChart
							key={chartKey}
							categories={hbarCategories}
							values={hbarValues}
							valueSymbol={config.valueSymbol || '$'}
							color={config.series[0]?.styling?.color || '#1f77b4'}
						/>
					</Suspense>
				)
				break

			case 'line':
			case 'area':
				chartContent = (
					<Suspense fallback={<div className="h-[338px]" />}>
						<div className="flex items-center justify-end gap-1 p-2 pt-0">
							{(adaptedChart.props as IChartProps).title ? (
								<h1 className="mr-auto text-base font-semibold">{(adaptedChart.props as IChartProps).title}</h1>
							) : null}
							<AddToDashboardButton
								chartConfig={null}
								llamaAIChart={messageId ? { messageId, chartId: config.id, title: config.title } : null}
								smol
							/>
							<CSVDownloadButton prepareCsv={prepareCsv} smol />
						</div>
						<AreaChart
							key={chartKey}
							chartData={adaptedChart.data}
							{...(adaptedChart.props as IChartProps)}
							title={undefined}
							connectNulls={true}
							hideDownloadButton={true}
						/>
					</Suspense>
				)
				break

			case 'combo':
				chartContent = (
					<Suspense fallback={<div className="h-[338px]" />}>
						<div className="flex items-center justify-end gap-1 p-2 pt-0">
							{(adaptedChart.props as any).title ? (
								<h1 className="mr-auto text-base font-semibold">{(adaptedChart.props as any).title}</h1>
							) : null}
							<AddToDashboardButton
								chartConfig={null}
								llamaAIChart={messageId ? { messageId, chartId: config.id, title: config.title } : null}
								smol
							/>
							<CSVDownloadButton prepareCsv={prepareCsv} smol />
						</div>
						<MultiSeriesChart key={chartKey} {...(adaptedChart.props as any)} title={undefined} connectNulls={true} />
					</Suspense>
				)
				break

			case 'multi-series':
				chartContent = (
					<Suspense fallback={<div className="h-[338px]" />}>
						<div className="flex items-center justify-end gap-1 p-2 pt-0">
							{(adaptedChart.props as any).title ? (
								<h1 className="mr-auto text-base font-semibold">{(adaptedChart.props as any).title}</h1>
							) : null}
							<AddToDashboardButton
								chartConfig={null}
								llamaAIChart={messageId ? { messageId, chartId: config.id, title: config.title } : null}
								smol
							/>
							<CSVDownloadButton prepareCsv={prepareCsv} smol />
						</div>
						<MultiSeriesChart key={chartKey} {...(adaptedChart.props as any)} title={undefined} connectNulls={true} />
					</Suspense>
				)
				break

			case 'pie':
				chartContent = (
					<Suspense fallback={<div className="h-[338px]" />}>
						<div className="flex items-center justify-end gap-1 p-2 pt-0">
							{(adaptedChart.props as IPieChartProps).title ? (
								<h1 className="mr-auto text-base font-semibold">{(adaptedChart.props as IPieChartProps).title}</h1>
							) : null}
							<AddToDashboardButton
								chartConfig={null}
								llamaAIChart={messageId ? { messageId, chartId: config.id, title: config.title } : null}
								smol
							/>
							<CSVDownloadButton prepareCsv={prepareCsv} smol />
						</div>
						<PieChart key={chartKey} {...(adaptedChart.props as IPieChartProps)} title={undefined} />
					</Suspense>
				)
				break

			case 'scatter':
				chartContent = (
					<Suspense fallback={<div className="min-h-[360px]" />}>
						<div className="flex items-center justify-end gap-1 p-2 pt-0">
							{(adaptedChart.props as IScatterChartProps).title ? (
								<h1 className="mr-auto text-base font-semibold">{(adaptedChart.props as IScatterChartProps).title}</h1>
							) : null}
							<AddToDashboardButton
								chartConfig={null}
								llamaAIChart={messageId ? { messageId, chartId: config.id, title: config.title } : null}
								smol
							/>
							<CSVDownloadButton prepareCsv={prepareCsv} smol />
						</div>
						<ScatterChart
							key={chartKey}
							{...(adaptedChart.props as IScatterChartProps)}
							title={undefined}
							height="360px"
							showLabels={chartState.showLabels}
						/>
					</Suspense>
				)
				break

			default:
				chartContent = (
					<div className="flex flex-col items-center justify-center gap-2 rounded-md bg-red-50 p-1 py-8 text-red-700 dark:bg-red-900/10 dark:text-red-300">
						<Icon name="alert-triangle" height={16} width={16} />
						<p>Unsupported chart type: {adaptedChart.chartType}</p>
					</div>
				)
		}

		return (
			<div className="flex flex-col *:[2n-1]:m-2" data-chart-id={config.id}>
				{config.displayOptions && (
					<ChartControls
						displayOptions={config.displayOptions}
						stacked={chartState.stacked}
						percentage={chartState.percentage}
						cumulative={chartState.cumulative}
						grouping={chartState.grouping}
						dataLength={dataLength}
						showHallmarks={chartState.showHallmarks}
						hasHallmarks={!!config.hallmarks?.length}
						showLabels={chartState.showLabels}
						isScatter={adaptedChart.chartType === 'scatter'}
						onStackedChange={handleStackedChange}
						onPercentageChange={handlePercentageChange}
						onCumulativeChange={handleCumulativeChange}
						onGroupingChange={handleGroupingChange}
						onHallmarksChange={handleHallmarksChange}
						onLabelsChange={handleLabelsChange}
					/>
				)}
				{chartContent}
			</div>
		)
	} catch (error) {
		console.log('Chart render error:', error)
		return (
			<div className="flex flex-col items-center justify-center gap-2 rounded-md bg-red-50 p-1 py-8 text-red-700 dark:bg-red-900/10 dark:text-red-300">
				<Icon name="alert-triangle" height={16} width={16} />
				<p>{error instanceof Error ? error.message : 'Unknown error'}</p>
			</div>
		)
	}
}

const ChartLoadingSpinner = () => <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-500"></div>

const ChartAnalysisPlaceholder = () => (
	<div className="flex flex-col items-center justify-center gap-2 rounded-md border border-[#e6e6e6] px-1 py-8 dark:border-[#222324]">
		<ChartLoadingSpinner />
		<p className="text-[#666] dark:text-[#919296]">Determining the best visualizations for your data...</p>
	</div>
)

const ChartLoadingPlaceholder = ({ chartTypes }: { chartTypes?: string[] }) => (
	<div className="flex flex-col items-center justify-center gap-2 rounded-md border border-[#e6e6e6] px-1 py-8 dark:border-[#222324]">
		<ChartLoadingSpinner />
		<p className="text-[#666] dark:text-[#919296]">
			{chartTypes?.length
				? `Creating ${chartTypes.join(', ')} visualization${chartTypes.length > 1 ? 's' : ''}...`
				: 'Creating visualization...'}
		</p>
	</div>
)

const ChartErrorPlaceholder = () => (
	<div className="flex flex-col items-center justify-center gap-2 rounded-md bg-red-50 p-1 py-8 text-red-700 dark:bg-red-900/10 dark:text-red-300">
		<Icon name="alert-triangle" height={16} width={16} />
		<p>Chart generation encountered an issue</p>
	</div>
)

export function ChartRenderer({
	charts,
	chartData,
	isLoading = false,
	isAnalyzing = false,
	hasError = false,
	expectedChartCount: _expectedChartCount,
	chartTypes,
	resizeTrigger = 0,
	messageId
}: ChartRendererProps) {
	return (
		<ChartRendererMemoized
			{...{ charts, chartData, isLoading, isAnalyzing, hasError, chartTypes, resizeTrigger, messageId }}
		/>
	)
}

function ChartRendererImpl({
	charts,
	chartData,
	isLoading = false,
	isAnalyzing = false,
	hasError = false,
	expectedChartCount: _expectedChartCount,
	chartTypes,
	resizeTrigger = 0,
	messageId
}: ChartRendererProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const [activeTabIndex, setActiveTab] = useReducer((state: number, action: number) => action, 0)

	useEffect(() => {
		if (!containerRef.current) return

		const resizeObserver = new ResizeObserver(() => {
			const event = new CustomEvent('chartResize')
			window.dispatchEvent(event)
		})

		resizeObserver.observe(containerRef.current)
		return () => resizeObserver.disconnect()
	}, [])

	useEffect(() => {
		if (resizeTrigger > 0) {
			const timer = setTimeout(() => {
				const event = new CustomEvent('chartResize')
				window.dispatchEvent(event)
			}, 100)
			return () => clearTimeout(timer)
		}
	}, [resizeTrigger])

	if (hasError && (!charts || charts.length === 0)) {
		return <ChartErrorPlaceholder />
	}

	if (isAnalyzing && (!charts || charts.length === 0)) {
		return <ChartAnalysisPlaceholder />
	}

	if (isLoading && (!charts || charts.length === 0)) {
		return <ChartLoadingPlaceholder chartTypes={chartTypes} />
	}

	if (!isLoading && !isAnalyzing && !hasError && (!charts || charts.length === 0)) {
		return null
	}

	const hasMultipleCharts = charts.length > 1

	return (
		<div ref={containerRef} className="flex flex-col gap-2 rounded-md border border-(--old-blue) pt-2">
			{hasMultipleCharts && (
				<div className="-mt-2 flex border-b border-[#e6e6e6] dark:border-[#222324]">
					{charts.map((chart, index) => (
						<button
							key={`toggle-${chart.id}`}
							onClick={() => setActiveTab(index)}
							className={`border-b-2 px-2 py-1.5 text-sm transition-colors ${
								activeTabIndex === index
									? 'border-(--old-blue) text-(--old-blue)'
									: 'border-transparent text-[#666] hover:text-black dark:text-[#919296] dark:hover:text-white'
							}`}
						>
							{chart.title}
						</button>
					))}
				</div>
			)}
			{charts.map((chart, index) => (
				<SingleChart
					key={chart.id}
					config={chart}
					data={Array.isArray(chartData) ? chartData : chartData?.[chart.datasetName || chart.id] || []}
					isActive={!hasMultipleCharts || activeTabIndex === index}
					messageId={messageId}
				/>
			))}
		</div>
	)
}

const ChartRendererMemoized = memo(ChartRendererImpl, (prev, next) => {
	return (
		prev.isLoading === next.isLoading &&
		prev.isAnalyzing === next.isAnalyzing &&
		prev.hasError === next.hasError &&
		prev.resizeTrigger === next.resizeTrigger &&
		prev.messageId === next.messageId &&
		areStringArraysEqual(prev.chartTypes, next.chartTypes) &&
		areChartsEqual(prev.charts, next.charts) &&
		areChartDataEqual(prev.chartData, next.chartData)
	)
})

ChartRendererMemoized.displayName = 'ChartRenderer'
