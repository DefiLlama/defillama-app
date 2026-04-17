import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { Icon } from '~/components/Icon'
import { ChartControls } from '~/containers/LlamaAI/components/charts/ChartControls'
import type { ChartConfiguration } from '~/containers/LlamaAI/types'
import type { AdaptedChartData } from '~/containers/LlamaAI/utils/chartAdapter'
import { adaptCandlestickData, adaptChartData } from '~/containers/LlamaAI/utils/chartAdapter'
import {
	deriveCapabilities,
	normalizeViewState,
	type ChartViewState
} from '~/containers/LlamaAI/utils/chartCapabilities'
import { areChartDataEqual, areChartsEqual, areStringArraysEqual } from '~/containers/LlamaAI/utils/chartComparison'
import { ChartDataTransformer } from '~/containers/LlamaAI/utils/chartDataTransformer'
import { buildRenderPlan, type ChartRenderPlan } from '~/containers/LlamaAI/utils/chartRenderPlan'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'

const CandlestickChart = lazy(() => import('~/components/ECharts/CandlestickChart'))
const HBarChart = lazy(() => import('~/components/ECharts/HBarChart'))
const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))
const PieChart = lazy(() => import('~/components/ECharts/PieChart'))
const ScatterChart = lazy(() => import('~/components/ECharts/ScatterChart'))

interface ChartRendererProps {
	charts: ChartConfiguration[]
	chartData: any[] | Record<string, any[]>
	isLoading?: boolean
	hasError?: boolean
	chartTypes?: string[]
	resizeTrigger?: number
}

interface SingleChartProps {
	config: ChartConfiguration
	data: any[]
	isActive: boolean
	title?: string
}

type ChartAction =
	| { type: 'SET_STACKED'; payload: boolean }
	| { type: 'SET_PERCENTAGE'; payload: boolean }
	| { type: 'SET_CUMULATIVE'; payload: boolean }
	| { type: 'SET_GROUPING'; payload: ChartViewState['grouping'] }
	| { type: 'SET_HALLMARKS'; payload: boolean }
	| { type: 'SET_LABELS'; payload: boolean }

const chartReducer = (state: ChartViewState, action: ChartAction): ChartViewState => {
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

function createInitialChartState(config: ChartConfiguration): ChartViewState {
	return {
		stacked: config.displayOptions?.defaultStacked || false,
		percentage: config.displayOptions?.defaultPercentage || false,
		cumulative: false,
		grouping: 'day',
		showHallmarks: true,
		showLabels: config.displayOptions?.showLabels || false
	}
}

function removeAdaptedChartTitle<T extends AdaptedChartData>(adaptedChart: T): T {
	if (!adaptedChart.props || !('title' in adaptedChart.props)) return adaptedChart
	const { title: _title, ...restProps } = adaptedChart.props
	return { ...adaptedChart, props: restProps } as T
}

function buildChartPresentation(config: ChartConfiguration, data: any[], chartState: ChartViewState): ChartRenderPlan {
	// Pipeline order matters:
	// adapt base data -> derive intrinsic capabilities -> normalize view state -> transform -> render plan.
	const baseAdaptedChart = removeAdaptedChartTitle(adaptChartData(config, data))
	const capabilities = deriveCapabilities(config, baseAdaptedChart)
	const normalizedState = normalizeViewState(chartState, capabilities, config)
	const transformedChart = ChartDataTransformer.applyViewState(baseAdaptedChart, normalizedState, capabilities)
	return buildRenderPlan(config, transformedChart, normalizedState, capabilities)
}

function renderChartContent(renderPlan: ChartRenderPlan, chartKey: string, onChartReady: (instance: any) => void) {
	switch (renderPlan.rendererKind) {
		case 'cartesian':
			return (
				<Suspense fallback={<div className="h-[338px]" />}>
					<MultiSeriesChart2 key={chartKey} {...renderPlan.rendererProps} onReady={onChartReady} />
				</Suspense>
			)
		case 'hbar':
			return (
				<Suspense fallback={<div className="h-[338px]" />}>
					<HBarChart key={chartKey} {...renderPlan.rendererProps} onReady={onChartReady} />
				</Suspense>
			)
		case 'pie':
			return (
				<Suspense fallback={<div className="h-[338px]" />}>
					<PieChart key={chartKey} {...renderPlan.rendererProps} onReady={onChartReady} />
				</Suspense>
			)
		case 'scatter':
			return (
				<Suspense fallback={<div className="h-[360px]" />}>
					<ScatterChart key={chartKey} {...renderPlan.rendererProps} onReady={onChartReady} />
				</Suspense>
			)
		default:
			return (
				<div className="flex flex-col items-center justify-center gap-2 rounded-md bg-red-50 p-1 py-8 text-red-700 dark:bg-red-900/10 dark:text-red-300">
					<Icon name="alert-triangle" height={16} width={16} />
					<p>Unsupported chart type</p>
				</div>
			)
	}
}

function ChartExportButtonsSlot({
	chartInstance,
	exportModel,
	renderPlan,
	chartTitle
}: {
	chartInstance: () => any
	exportModel: ChartRenderPlan['exportModel']
	renderPlan: ChartRenderPlan
	chartTitle: string | undefined
}) {
	const prepareCsvDirect = useMemo(
		() => (exportModel ? () => ({ filename: exportModel.csvFilename, rows: exportModel.csvRows }) : undefined),
		[exportModel]
	)

	return (
		<ChartExportButtons
			chartInstance={chartInstance}
			filename={renderPlan.filename}
			title={chartTitle}
			smol
			showCsv={!!exportModel}
			prepareCsvDirect={prepareCsvDirect}
			pngProfile={exportModel?.pngProfile}
		/>
	)
}

type PresentationResult = { ok: true; plan: ChartRenderPlan } | { ok: false; error: unknown }

function tryBuildPresentation(config: ChartConfiguration, data: any[], chartState: ChartViewState): PresentationResult {
	try {
		return { ok: true, plan: buildChartPresentation(config, data, chartState) }
	} catch (error) {
		console.error('Chart render error:', error)
		return { ok: false, error }
	}
}

function SingleChart({ config, data, isActive, title }: SingleChartProps) {
	const [chartState, dispatch] = useReducer(chartReducer, config, createInitialChartState)
	const { chartInstance, handleChartReady } = useGetChartInstance()
	const handleStackedChange = useCallback((stacked: boolean) => dispatch({ type: 'SET_STACKED', payload: stacked }), [])
	const handlePercentageChange = useCallback(
		(percentage: boolean) => dispatch({ type: 'SET_PERCENTAGE', payload: percentage }),
		[]
	)
	const handleCumulativeChange = useCallback(
		(cumulative: boolean) => dispatch({ type: 'SET_CUMULATIVE', payload: cumulative }),
		[]
	)
	const handleGroupingChange = useCallback(
		(grouping: ChartViewState['grouping']) => dispatch({ type: 'SET_GROUPING', payload: grouping }),
		[]
	)
	const handleHallmarksChange = useCallback(
		(showHallmarks: boolean) => dispatch({ type: 'SET_HALLMARKS', payload: showHallmarks }),
		[]
	)
	const handleLabelsChange = useCallback(
		(showLabels: boolean) => dispatch({ type: 'SET_LABELS', payload: showLabels }),
		[]
	)

	const presentation = useMemo(
		() => (config.type === 'candlestick' ? null : tryBuildPresentation(config, data, chartState)),
		[config, data, chartState]
	)

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

	if (!presentation) {
		return null
	}

	if (presentation.ok === false) {
		const errorMsg = presentation.error instanceof Error ? presentation.error.message : 'Unknown error'
		return (
			<div className="flex flex-col items-center justify-center gap-2 rounded-md bg-red-50 p-1 py-8 text-red-700 dark:bg-red-900/10 dark:text-red-300">
				<Icon name="alert-triangle" height={16} width={16} />
				<p>{errorMsg}</p>
			</div>
		)
	}

	const renderPlan = presentation.plan

	if (!renderPlan.hasData) {
		return (
			<div className="flex flex-col items-center justify-center gap-2 p-1 py-8 text-[#666] dark:text-[#919296]">
				<Icon name="bar-chart" height={16} width={16} />
				<p>No data available for chart</p>
			</div>
		)
	}

	const normalizedState = renderPlan.controls.state
	const exportModel = renderPlan.exportModel
	const chartTitle = title ?? config.title
	const chartKey = `${config.id}-${normalizedState.stacked}-${normalizedState.percentage}-${normalizedState.cumulative}-${normalizedState.grouping}-${normalizedState.showHallmarks}-${normalizedState.showLabels}`
	const chartContent = renderChartContent(renderPlan, chartKey, handleChartReady)

	return (
		<div className="flex flex-col *:[2n-1]:m-2" data-chart-id={config.id}>
			<ChartControls
				controls={{ ...renderPlan.controls, title }}
				onStackedChange={handleStackedChange}
				onPercentageChange={handlePercentageChange}
				onCumulativeChange={handleCumulativeChange}
				onGroupingChange={handleGroupingChange}
				onHallmarksChange={handleHallmarksChange}
				onLabelsChange={handleLabelsChange}
			>
				<ChartExportButtonsSlot
					chartInstance={chartInstance}
					exportModel={exportModel}
					renderPlan={renderPlan}
					chartTitle={chartTitle}
				/>
			</ChartControls>
			{chartContent}
		</div>
	)
}

const ChartLoadingSpinner = () => <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-500"></div>

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
	hasError = false,
	chartTypes,
	resizeTrigger = 0
}: ChartRendererProps) {
	return <ChartRendererMemoized {...{ charts, chartData, isLoading, hasError, chartTypes, resizeTrigger }} />
}

function ChartRendererImpl({
	charts,
	chartData,
	isLoading = false,
	hasError = false,
	chartTypes,
	resizeTrigger = 0
}: ChartRendererProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const [activeTabIndex, setActiveTab] = useReducer((state: number, action: number) => action, 0)

	useEffect(() => {
		const el = containerRef.current
		if (!el) return
		let lastWidth = el.getBoundingClientRect().width
		let timer: ReturnType<typeof setTimeout> | null = null
		const observer = new ResizeObserver((entries) => {
			const w = entries[0]?.contentRect.width ?? 0
			if (Math.abs(w - lastWidth) < 1) return
			lastWidth = w
			if (timer) clearTimeout(timer)
			timer = setTimeout(() => window.dispatchEvent(new CustomEvent('chartResize')), 150)
		})
		observer.observe(el)
		return () => {
			observer.disconnect()
			if (timer) clearTimeout(timer)
		}
	}, [])

	useEffect(() => {
		if (resizeTrigger > 0) {
			const timer = setTimeout(() => {
				window.dispatchEvent(new CustomEvent('chartResize'))
			}, 100)
			return () => clearTimeout(timer)
		}
	}, [resizeTrigger])

	if (hasError && (!charts || charts.length === 0)) {
		return <ChartErrorPlaceholder />
	}

	if (isLoading && (!charts || charts.length === 0)) {
		return <ChartLoadingPlaceholder chartTypes={chartTypes} />
	}

	if (!isLoading && !hasError && (!charts || charts.length === 0)) {
		return null
	}

	const hasMultipleCharts = charts.length > 1

	return (
		<div ref={containerRef} className="flex flex-col gap-2 rounded-md border border-(--old-blue) pt-2">
			{hasMultipleCharts ? (
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
			) : null}
			{charts.map((chart, index) => (
				<SingleChart
					key={chart.id}
					config={chart}
					data={Array.isArray(chartData) ? chartData : chartData?.[chart.datasetName || chart.id] || []}
					isActive={!hasMultipleCharts || activeTabIndex === index}
					title={chart.title}
				/>
			))}
		</div>
	)
}

const ChartRendererMemoized = memo(ChartRendererImpl, (prev, next) => {
	return (
		prev.isLoading === next.isLoading &&
		prev.hasError === next.hasError &&
		prev.resizeTrigger === next.resizeTrigger &&
		areStringArraysEqual(prev.chartTypes, next.chartTypes) &&
		areChartsEqual(prev.charts, next.charts) &&
		areChartDataEqual(prev.chartData, next.chartData)
	)
})

ChartRendererMemoized.displayName = 'ChartRenderer'
