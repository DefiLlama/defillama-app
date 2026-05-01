import type { ECharts } from 'echarts/core'
import { useRouter } from 'next/router'
import * as React from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import type { IMultiSeriesChart2Props, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { Select } from '~/components/Select/Select'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { CHART_COLORS } from '~/constants/colors'
import { formatNum, formattedNum, slug } from '~/utils'
import { pushShallowQuery, readSingleQueryValue } from '~/utils/routerQuery'
import type {
	LiquidationsDistributionChartBreakdownKey,
	LiquidationsDistributionChartData,
	LiquidationsDistributionChartView
} from './api.types'

const MultiSeriesChart2 = React.lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>

type Metric = 'usd' | 'amount'
type BreakdownMode = 'total' | 'protocol' | 'chain'
type ChartMode = 'cumulative' | 'distribution'
type LiquidationsChartState = {
	token: string | null
	tokenLabel: string
	tokenTotalUsd: number | null
	metric: Metric
	mode: ChartMode
	modeLabel: string
	breakdownMode: BreakdownMode
	breakdownLabel: string
}
const TOKEN_QUERY_PARAM = 'token'
const METRIC_QUERY_PARAM = 'metric'
const BREAKDOWN_QUERY_PARAM = 'breakdown'
const VIEW_QUERY_PARAM = 'view'
const BREAKDOWN_OPTIONS: ReadonlyArray<{ key: BreakdownMode; name: string }> = [
	{ key: 'total', name: 'Total' },
	{ key: 'protocol', name: 'Protocol Breakdown' },
	{ key: 'chain', name: 'Chain Breakdown' }
]
const CHART_MODE_OPTIONS: ReadonlyArray<{ key: ChartMode; name: string }> = [
	{ key: 'cumulative', name: 'Cumulative' },
	{ key: 'distribution', name: 'Distribution' }
]
const DEFAULT_BREAKDOWN_MODES = BREAKDOWN_OPTIONS.map((option) => option.key)

function LiquidationsDistributionChartCard({
	breakdownOptions,
	chartOptions,
	chartState,
	deferredChartModel,
	displayOptions,
	onChartReady,
	setBreakdownMode,
	setChartMode,
	setMetric,
	setSelectedToken,
	timestamp,
	title,
	tokenOptions,
	chartInstanceRef
}: {
	breakdownOptions: Array<{ key: BreakdownMode; name: string }>
	chartOptions: IMultiSeriesChart2Props['chartOptions']
	chartState: LiquidationsChartState
	deferredChartModel: { dataset: MultiSeriesChart2Dataset; charts: IMultiSeriesChart2Props['charts'] }
	displayOptions: {
		hideTokenSelector: boolean
		shouldHideDataZoom: boolean
		showBreakdownLegend: boolean
		showBreakdownSelector: boolean
	}
	onChartReady: (instance: ECharts | null) => void
	setBreakdownMode: (mode: BreakdownMode) => void
	setChartMode: (mode: ChartMode) => void
	setMetric: (metric: Metric) => void
	setSelectedToken: (token: string) => void
	timestamp: number
	title: string | undefined
	tokenOptions: Array<{ key: string; name: string }>
	chartInstanceRef: React.MutableRefObject<ECharts | null>
}) {
	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-wrap items-center gap-2 p-2">
				{displayOptions.hideTokenSelector ? (
					<div className="mr-auto" />
				) : (
					<div className="mr-auto flex min-w-0 flex-wrap items-center gap-2">
						<SelectWithCombobox
							allValues={tokenOptions}
							selectedValues={chartState.token ? [chartState.token] : []}
							setSelectedValues={(values) => {
								const nextToken = values[0]
								if (nextToken) setSelectedToken(nextToken)
							}}
							label={`Token: ${chartState.tokenLabel}`}
							singleSelect
							labelType="none"
							variant="filter"
							triggerProps={{
								className:
									'flex items-center justify-between gap-2 rounded-md border border-(--old-blue) bg-(--link-bg) px-2 py-1.5 text-xs font-medium text-(--link-text) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)'
							}}
							portal
						/>
						{chartState.tokenTotalUsd != null ? (
							<span className="text-xs text-(--text-label)">
								Collateral:{' '}
								<span className="font-medium text-(--text-primary)">
									{formattedNum(chartState.tokenTotalUsd, true)}
								</span>
							</span>
						) : null}
					</div>
				)}
				{displayOptions.showBreakdownSelector ? (
					<Select
						allValues={breakdownOptions}
						selectedValues={chartState.breakdownMode}
						setSelectedValues={(value: string) => setBreakdownMode(value as BreakdownMode)}
						label={chartState.breakdownLabel}
						labelType="none"
						variant="filter"
					/>
				) : null}
				<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
					<button
						data-active={chartState.mode === 'cumulative'}
						onClick={() => setChartMode('cumulative')}
						className="inline-flex shrink-0 items-center justify-center px-3 py-1.5 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
					>
						Cumulative
					</button>
					<button
						data-active={chartState.mode === 'distribution'}
						onClick={() => setChartMode('distribution')}
						className="inline-flex shrink-0 items-center justify-center px-3 py-1.5 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
					>
						Distribution
					</button>
				</div>
				<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
					<button
						data-active={chartState.metric === 'usd'}
						onClick={() => setMetric('usd')}
						className="inline-flex shrink-0 items-center justify-center px-3 py-1.5 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
					>
						USD
					</button>
					<button
						data-active={chartState.metric === 'amount'}
						onClick={() => setMetric('amount')}
						className="inline-flex shrink-0 items-center justify-center px-3 py-1.5 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
					>
						Amount
					</button>
				</div>
				<ChartExportButtons
					chartInstance={() => chartInstanceRef.current}
					filename={slug(
						[title ?? 'liquidation-distribution', chartState.token, chartState.modeLabel, chartState.breakdownLabel]
							.filter(Boolean)
							.join('-')
					)}
					title={[
						title ?? 'Liquidation Distribution',
						chartState.token,
						chartState.modeLabel,
						chartState.breakdownLabel
					]
						.filter(Boolean)
						.join(' - ')}
					smol
				/>
			</div>
			<React.Suspense fallback={<div className="min-h-[360px]" />}>
				<MultiSeriesChart2
					dataset={deferredChartModel.dataset}
					charts={deferredChartModel.charts}
					chartOptions={chartOptions}
					containerClassName="min-h-[360px]"
					hideDataZoom={displayOptions.shouldHideDataZoom}
					hideDefaultLegend={!displayOptions.showBreakdownLegend}
					onReady={onChartReady}
					valueSymbol={chartState.metric === 'usd' ? '$' : ''}
				/>
			</React.Suspense>
			<div className="flex items-center justify-end gap-1 px-4 pb-3 text-xs text-(--text-label) italic opacity-70">
				<span>Snapshot {new Date(timestamp * 1000).toUTCString()}</span>
			</div>
		</div>
	)
}

function formatLiqPrice(value: number): string {
	if (!Number.isFinite(value) || value <= 0) return '$0'
	if (value < 0.01) return formatNum(value, 5, '$') ?? '$0'
	if (value < 1) return formatNum(value, 4, '$') ?? '$0'
	if (value < 100) return formatNum(value, 2, '$') ?? '$0'
	return formattedNum(value, true)
}

function formatMetricValue(value: number, metric: Metric, tokenLabel: string): string {
	if (metric === 'usd') {
		if (!Number.isFinite(value) || value <= 0) return '$0'
		if (value < 0.01) return formatNum(value, 5, '$') ?? '$0'
		if (value < 1) return formatNum(value, 4, '$') ?? '$0'
		if (value < 100) return formatNum(value, 2, '$') ?? '$0'
		return formattedNum(value, true)
	}

	const amountLabel = !Number.isFinite(value) || value <= 0 ? '0' : formattedNum(value)
	return `${amountLabel} ${tokenLabel}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
		.replace(/\//g, '&#47;')
}

function normalizeLiquidationsChartTokenKey(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
}

export function getLiquidationsChartMetric(metricQuery: string | undefined): Metric {
	return metricQuery === 'amount' ? 'amount' : 'usd'
}

export function getLiquidationsChartMetricQueryPatch(nextMetric: Metric) {
	return {
		[METRIC_QUERY_PARAM]: nextMetric === 'usd' ? undefined : nextMetric
	}
}

export function getLiquidationsChartMode(
	modeQuery: string | undefined,
	defaultChartMode: ChartMode = 'cumulative'
): ChartMode {
	return CHART_MODE_OPTIONS.some((option) => option.key === modeQuery) ? (modeQuery as ChartMode) : defaultChartMode
}

export function getLiquidationsChartModeQueryPatch(
	nextChartMode: ChartMode,
	defaultChartMode: ChartMode = 'cumulative'
) {
	return {
		[VIEW_QUERY_PARAM]: nextChartMode === defaultChartMode ? undefined : nextChartMode
	}
}

function getLiquidationsChartBreakdownOptions(allowedBreakdownModes: ReadonlyArray<BreakdownMode>) {
	return BREAKDOWN_OPTIONS.filter((option) => allowedBreakdownModes.includes(option.key))
}

export function getLiquidationsChartBreakdownMode(
	breakdownQuery: string | undefined,
	allowedBreakdownModes: ReadonlyArray<BreakdownMode> = DEFAULT_BREAKDOWN_MODES,
	defaultBreakdownMode: BreakdownMode = 'total'
): BreakdownMode {
	return allowedBreakdownModes.some((mode) => mode === breakdownQuery)
		? (breakdownQuery as BreakdownMode)
		: allowedBreakdownModes.includes(defaultBreakdownMode)
			? defaultBreakdownMode
			: (allowedBreakdownModes[0] ?? 'total')
}

export function getLiquidationsChartBreakdownQueryPatch(
	nextBreakdownMode: BreakdownMode,
	defaultBreakdownMode: BreakdownMode = 'total'
) {
	return {
		[BREAKDOWN_QUERY_PARAM]: nextBreakdownMode === defaultBreakdownMode ? undefined : nextBreakdownMode
	}
}

export function getLiquidationsChartTokenQueryPatch(nextToken: string, defaultToken: string | null) {
	return {
		[TOKEN_QUERY_PARAM]: nextToken === defaultToken ? undefined : nextToken
	}
}

function getLiquidationsTooltipHtml(params: unknown, metric: Metric, tokenLabel: string): string {
	const paramList = (Array.isArray(params) ? params : []).filter((param) => {
		if (!isRecord(param)) return false
		const value = getTooltipValue(param)
		return value > 0
	})
	const first = paramList[0]
	const axisValue =
		isRecord(first) && 'axisValue' in first ? Number((first as { axisValue?: unknown }).axisValue) : Number.NaN
	const axisLabel = escapeHtml(Number.isFinite(axisValue) ? formatLiqPrice(axisValue) : '')
	const total = paramList.reduce((sum, param) => sum + getTooltipValue(param), 0)
	const totalLabel = escapeHtml(formatMetricValue(total, metric, tokenLabel))
	const rows: string[] = []

	for (const param of paramList) {
		if (!isRecord(param)) continue
		const value = getTooltipValue(param)
		const rowValue = escapeHtml(formatMetricValue(value, metric, tokenLabel))
		const seriesName = escapeHtml(typeof param.seriesName === 'string' ? param.seriesName : '')
		const marker = escapeHtml(typeof param.marker === 'string' ? param.marker : '')
		rows.push(`<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; font-size:12px;">
								<span style="display:inline-flex; align-items:center; gap:6px; min-width:0;">
									${marker}
									<span style="color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${seriesName}</span>
								</span>
								<span style="color:var(--text-primary); font-variant-numeric:tabular-nums; text-align:right;">${rowValue}</span>
							</div>`)
	}

	return `<div style="min-width:220px; background:var(--cards-bg); border:1px solid var(--cards-border); box-shadow:0 18px 48px var(--tooltip-shadow, rgba(0, 0, 0, 0.24)); backdrop-filter:blur(10px); color:var(--text-primary); border-radius:10px; padding:12px 14px; font-size:12px; line-height:1.45;">
						<div style="margin-bottom:8px;">
							<div style="font-size:11px; color:var(--text-label); text-transform:uppercase; letter-spacing:0.08em;">Liq Price</div>
							<div style="font-size:15px; font-weight:600; color:var(--text-primary);">${axisLabel}</div>
						</div>
						<div style="display:flex; flex-direction:column; gap:6px;">
							${rows.join('')}
						</div>
						<div style="margin-top:8px;">
							<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding-top:8px; border-top:1px solid var(--cards-border); font-size:12px;">
								<span style="color:var(--text-label);">Total</span>
								<span style="color:var(--text-primary); font-weight:600; font-variant-numeric:tabular-nums;">${totalLabel}</span>
							</div>
						</div>
					</div>`
}

export function resolveLiquidationsChartTokenKey(
	chart: LiquidationsDistributionChartData,
	tokenQuery: string | undefined
): string | null {
	if (chart.tokens.length === 0) return null
	if (!tokenQuery) return chart.tokens[0]?.key ?? null

	const normalizedTokenQuery = normalizeLiquidationsChartTokenKey(tokenQuery)
	const exactMatch = chart.tokens.find((entry) => entry.key === tokenQuery)
	if (exactMatch) return exactMatch.key

	const slugMatch = chart.tokens.find((entry) => normalizeLiquidationsChartTokenKey(entry.key) === normalizedTokenQuery)
	return slugMatch?.key ?? chart.tokens[0]?.key ?? null
}

export function getLiquidationsChartView(
	chart: LiquidationsDistributionChartData,
	tokenKey: string | null,
	breakdownMode: LiquidationsDistributionChartBreakdownKey
): LiquidationsDistributionChartView {
	if (!tokenKey) return { bins: [], series: [] }

	const selectedToken = chart.tokens.find((entry) => entry.key === tokenKey)
	if (!selectedToken) return { bins: [], series: [] }

	return trimLiquidationsChartView(selectedToken.breakdowns[breakdownMode])
}

function trimLiquidationsChartView(view: LiquidationsDistributionChartView): LiquidationsDistributionChartView {
	if (view.series.length === 0 || view.bins.length === 0) return view

	const hasValueAtIndex = (index: number) =>
		view.series.some((series) => series.usd[index] > 0 || (series.amount[index] ?? 0) > 0)

	const firstNonZeroIndex = view.bins.findIndex((_, index) => hasValueAtIndex(index))
	if (firstNonZeroIndex === -1) return view

	let lastNonZeroIndex = firstNonZeroIndex
	for (let index = firstNonZeroIndex + 1; index < view.bins.length; index += 1) {
		if (hasValueAtIndex(index)) {
			lastNonZeroIndex = index
		}
	}

	return {
		bins: view.bins.slice(firstNonZeroIndex, lastNonZeroIndex + 1),
		series: view.series.map((series) => ({
			...series,
			usd: series.usd.slice(firstNonZeroIndex, lastNonZeroIndex + 1),
			amount: series.amount.slice(firstNonZeroIndex, lastNonZeroIndex + 1)
		}))
	}
}

export function buildCumulativeLiquidationsChartView(
	view: LiquidationsDistributionChartView
): LiquidationsDistributionChartView {
	if (view.series.length === 0 || view.bins.length === 0) return view

	return {
		bins: view.bins,
		series: view.series.map((series) => {
			const usd = [...series.usd]
			const amount = [...series.amount]

			for (let index = usd.length - 2; index >= 0; index -= 1) {
				usd[index] += usd[index + 1] ?? 0
				amount[index] += amount[index + 1] ?? 0
			}

			return {
				...series,
				usd,
				amount
			}
		})
	}
}

export function LiquidationsDistributionChart({
	chart,
	timestamp,
	title,
	allowedBreakdownModes = DEFAULT_BREAKDOWN_MODES,
	defaultBreakdownMode = 'total',
	hideTokenSelector = false,
	defaultChartMode = 'cumulative',
	tokenStateMode = 'query'
}: {
	chart: LiquidationsDistributionChartData
	timestamp: number
	title?: string
	allowedBreakdownModes?: ReadonlyArray<BreakdownMode>
	defaultBreakdownMode?: BreakdownMode
	hideTokenSelector?: boolean
	defaultChartMode?: ChartMode
	tokenStateMode?: 'query' | 'local'
}) {
	const router = useRouter()
	const chartInstanceRef = React.useRef<ECharts | null>(null)
	const onChartReady = React.useCallback((instance: ECharts | null) => {
		chartInstanceRef.current = instance
	}, [])

	React.useEffect(() => {
		return () => {
			chartInstanceRef.current = null
		}
	}, [])

	const tokenOptions = React.useMemo(
		() => chart.tokens.map((entry) => ({ key: entry.key, name: entry.label })),
		[chart.tokens]
	)
	const breakdownOptions = React.useMemo(
		() => getLiquidationsChartBreakdownOptions(allowedBreakdownModes),
		[allowedBreakdownModes]
	)
	const defaultToken = chart.tokens[0]?.key ?? null
	const [localToken, setLocalToken] = React.useReducer((_: string | null, next: string | null) => next, defaultToken)
	const chartState = React.useMemo(() => {
		const selectedLocalToken =
			localToken && chart.tokens.some((entry) => entry.key === localToken) ? localToken : defaultToken
		const token = hideTokenSelector
			? defaultToken
			: tokenStateMode === 'local'
				? selectedLocalToken
				: resolveLiquidationsChartTokenKey(chart, readSingleQueryValue(router.query[TOKEN_QUERY_PARAM]))
		const metric = getLiquidationsChartMetric(readSingleQueryValue(router.query[METRIC_QUERY_PARAM]))
		const mode = getLiquidationsChartMode(readSingleQueryValue(router.query[VIEW_QUERY_PARAM]), defaultChartMode)
		const breakdownMode = getLiquidationsChartBreakdownMode(
			readSingleQueryValue(router.query[BREAKDOWN_QUERY_PARAM]),
			allowedBreakdownModes,
			defaultBreakdownMode
		)
		const selectedTokenEntry = chart.tokens.find((entry) => entry.key === token)
		const tokenLabel = selectedTokenEntry?.label ?? 'Token'
		const tokenTotalUsd = selectedTokenEntry?.totalUsd ?? null
		const breakdownLabel = breakdownOptions.find((option) => option.key === breakdownMode)?.name ?? 'Total'
		const modeLabel = CHART_MODE_OPTIONS.find((option) => option.key === mode)?.name ?? 'Cumulative'

		return {
			token,
			tokenLabel,
			tokenTotalUsd,
			metric,
			mode,
			modeLabel,
			breakdownMode,
			breakdownLabel
		}
	}, [
		allowedBreakdownModes,
		breakdownOptions,
		chart,
		defaultChartMode,
		defaultBreakdownMode,
		defaultToken,
		hideTokenSelector,
		localToken,
		router.query,
		tokenStateMode
	])

	const setSelectedToken = React.useCallback(
		(nextToken: string) => {
			if (nextToken === chartState.token) return
			if (tokenStateMode === 'local') {
				setLocalToken(nextToken)
				return
			}
			void pushShallowQuery(router, getLiquidationsChartTokenQueryPatch(nextToken, defaultToken))
		},
		[chartState.token, defaultToken, router, tokenStateMode]
	)
	const setMetric = React.useCallback(
		(nextMetric: Metric) => {
			if (nextMetric === chartState.metric) return
			void pushShallowQuery(router, getLiquidationsChartMetricQueryPatch(nextMetric))
		},
		[chartState.metric, router]
	)
	const setChartMode = React.useCallback(
		(nextChartMode: ChartMode) => {
			if (nextChartMode === chartState.mode) return
			void pushShallowQuery(router, getLiquidationsChartModeQueryPatch(nextChartMode, defaultChartMode))
		},
		[chartState.mode, defaultChartMode, router]
	)
	const setBreakdownMode = React.useCallback(
		(nextBreakdownMode: BreakdownMode) => {
			if (nextBreakdownMode === chartState.breakdownMode) return
			void pushShallowQuery(router, getLiquidationsChartBreakdownQueryPatch(nextBreakdownMode, defaultBreakdownMode))
		},
		[chartState.breakdownMode, defaultBreakdownMode, router]
	)

	const selectedChartView = React.useMemo(() => {
		const baseView = getLiquidationsChartView(chart, chartState.token, chartState.breakdownMode)
		return chartState.mode === 'cumulative' ? buildCumulativeLiquidationsChartView(baseView) : baseView
	}, [chart, chartState.breakdownMode, chartState.mode, chartState.token])
	const visibleDataPointCount = React.useMemo(() => {
		return selectedChartView.bins.reduce((count, _, index) => {
			const hasValueAtIndex = selectedChartView.series.some(
				(series) => series.usd[index] > 0 || (series.amount[index] ?? 0) > 0
			)
			return hasValueAtIndex ? count + 1 : count
		}, 0)
	}, [selectedChartView.bins, selectedChartView.series])
	const shouldHideDataZoom = visibleDataPointCount <= 2
	const showBreakdownLegend = chartState.breakdownMode !== 'total'
	const showBreakdownSelector = breakdownOptions.length > 1

	const chartModel = React.useMemo(() => {
		const dimensions = ['liqPrice', ...selectedChartView.series.map((entry) => entry.key)]
		const source = selectedChartView.bins.map((liqPrice, index) => {
			const row: Record<string, number> = { liqPrice }
			for (const entry of selectedChartView.series) {
				row[entry.key] = chartState.metric === 'usd' ? (entry.usd[index] ?? 0) : (entry.amount[index] ?? 0)
			}
			return row
		})

		const charts = selectedChartView.series.map((entry, index) => ({
			type: 'bar' as const,
			name: entry.label,
			encode: { x: 'liqPrice', y: entry.key },
			stack: 'liquidations',
			color: CHART_COLORS[index % CHART_COLORS.length],
			large: true
		}))

		return {
			dataset: { source, dimensions } satisfies MultiSeriesChart2Dataset,
			charts
		}
	}, [chartState.metric, selectedChartView.bins, selectedChartView.series])

	const chartOptions = React.useMemo(() => {
		const options = {
			grid: {
				top: showBreakdownLegend ? 40 : 24,
				left: 12,
				right: 12,
				bottom: shouldHideDataZoom ? 12 : 64
			},
			xAxis: {
				type: 'category',
				axisLabel: {
					hideOverlap: true,
					formatter: (value: number) => formatLiqPrice(Number(value))
				},
				axisTick: { alignWithLabel: true },
				splitLine: {
					lineStyle: { color: '#a1a1aa', opacity: 0.1 }
				}
			},
			yAxis: {
				type: 'value',
				position: 'right',
				axisLabel: {
					formatter: (value: number) => formatMetricValue(value, chartState.metric, chartState.tokenLabel)
				},
				splitLine: {
					lineStyle: { color: '#a1a1aa', opacity: 0.1 }
				}
			},
			dataZoom: {
				labelFormatter: (value: number) => formatLiqPrice(Number(value))
			},
			tooltip: {
				trigger: 'axis',
				confine: true,
				backgroundColor: 'transparent',
				borderWidth: 0,
				padding: 0,
				textStyle: {
					color: 'var(--text-primary)',
					fontSize: 12,
					fontFamily: 'inherit'
				},
				axisPointer: {
					type: 'cross',
					label: {
						backgroundColor: '#2f5ed4',
						color: '#fff',
						borderColor: '#2f5ed4',
						borderWidth: 1,
						borderRadius: 4,
						padding: [4, 8],
						formatter: (value: unknown) => {
							const raw = isRecord(value) && 'value' in value ? ((value as { value?: unknown }).value ?? value) : value
							const numeric = Number(raw)
							if (!Number.isFinite(numeric)) return String(raw)
							const axisDimension =
								isRecord(value) && 'axisDimension' in value
									? (value as { axisDimension?: unknown }).axisDimension
									: undefined
							if (axisDimension === 'x') {
								return formatLiqPrice(numeric)
							}
							return formatMetricValue(numeric, chartState.metric, chartState.tokenLabel)
						}
					}
				},
				formatter: (params: unknown) => getLiquidationsTooltipHtml(params, chartState.metric, chartState.tokenLabel)
			}
		}

		return options as unknown as IMultiSeriesChart2Props['chartOptions']
	}, [chartState.metric, chartState.tokenLabel, shouldHideDataZoom, showBreakdownLegend])

	const deferredChartModel = React.useDeferredValue(chartModel)

	if (chart.tokens.length === 0) {
		return (
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-5">
				<h2 className="text-lg font-semibold">{title ?? 'Liquidation Distribution'}</h2>
				<p className="mt-3 text-sm text-(--text-label)">No liquidation chart data available for this view.</p>
			</div>
		)
	}

	return (
		<LiquidationsDistributionChartCard
			breakdownOptions={breakdownOptions}
			chartOptions={chartOptions}
			chartState={chartState}
			deferredChartModel={deferredChartModel}
			displayOptions={{ hideTokenSelector, shouldHideDataZoom, showBreakdownLegend, showBreakdownSelector }}
			onChartReady={onChartReady}
			setBreakdownMode={setBreakdownMode}
			setChartMode={setChartMode}
			setMetric={setMetric}
			setSelectedToken={setSelectedToken}
			timestamp={timestamp}
			title={title}
			tokenOptions={tokenOptions}
			chartInstanceRef={chartInstanceRef}
		/>
	)
}

function getTooltipRowKey(param: Record<string, unknown>): string | number | null {
	if (!isRecord(param.encode)) return null

	const encodeY = param.encode.y
	if (Array.isArray(encodeY)) {
		const first = encodeY[0]
		return typeof first === 'string' || typeof first === 'number' ? first : null
	}

	return typeof encodeY === 'string' || typeof encodeY === 'number' ? encodeY : null
}

function getNumericValue(record: Record<string, unknown>, keys: Array<string | number | null>): number | null {
	for (const key of keys) {
		if (key == null) continue
		const value = record[String(key)]
		if (typeof value === 'number') return value
		const numeric = Number(value)
		if (Number.isFinite(numeric)) return numeric
	}

	return null
}

export function getTooltipValue(param: Record<string, unknown>): number {
	const dataKey = getTooltipRowKey(param)
	const seriesName = typeof param.seriesName === 'string' ? param.seriesName : null
	const seriesId = typeof param.seriesId === 'string' ? param.seriesId : null

	if (isRecord(param.data)) {
		const value = getNumericValue(param.data, [dataKey, seriesId, seriesName])
		if (value !== null) return value
	}

	if (isRecord(param.value)) {
		const value = getNumericValue(param.value, [dataKey, seriesId, seriesName])
		if (value !== null) return value
	}

	if (Array.isArray(param.value)) {
		const yIndex = typeof dataKey === 'number' ? dataKey : 1
		const value = param.value[yIndex]
		if (typeof value === 'number') return value
		const numeric = Number(value)
		return Number.isFinite(numeric) ? numeric : 0
	}

	if (typeof param.value === 'number') return param.value
	const numeric = Number(param.value)
	return Number.isFinite(numeric) ? numeric : 0
}
