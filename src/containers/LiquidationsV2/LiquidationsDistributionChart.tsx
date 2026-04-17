import type { ECharts } from 'echarts/core'
import * as React from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import type { IMultiSeriesChart2Props, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { CHART_COLORS } from '~/constants/colors'
import { formatNum, formattedNum, slug } from '~/utils'
import type { LiquidationsDistributionChartData } from './api.types'

const MultiSeriesChart2 = React.lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>

type Metric = 'usd' | 'amount'

function formatLiqPrice(value: number): string {
	if (!Number.isFinite(value) || value <= 0) return '$0'
	if (value < 0.01) return formatNum(value, 5, '$') ?? '$0'
	if (value < 1) return formatNum(value, 4, '$') ?? '$0'
	if (value < 100) return formatNum(value, 2, '$') ?? '$0'
	return formattedNum(value, true)
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

export function LiquidationsDistributionChart({
	chart,
	timestamp,
	title
}: {
	chart: LiquidationsDistributionChartData
	timestamp: number
	title?: string
}) {
	const [metric, setMetric] = React.useState<Metric>('usd')
	const chartInstanceRef = React.useRef<ECharts | null>(null)
	const onChartReady = React.useCallback((instance: ECharts | null) => {
		chartInstanceRef.current = instance
	}, [])

	React.useEffect(() => {
		return () => {
			chartInstanceRef.current = null
		}
	}, [])

	const chartModel = React.useMemo(() => {
		const dimensions = ['liqPrice', ...chart.series.map((entry) => entry.key)]
		const source = chart.bins.map((liqPrice, index) => {
			const row: Record<string, number> = { liqPrice }
			for (const entry of chart.series) {
				row[entry.key] = metric === 'usd' ? (entry.usd[index] ?? 0) : (entry.amount[index] ?? 0)
			}
			return row
		})

		const charts = chart.series.map((entry, index) => ({
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
	}, [chart.bins, chart.series, metric])

	const chartOptions = React.useMemo(() => {
		const options = {
			legend: {
				type: 'scroll',
				top: 0,
				left: 8,
				right: 8
			},
			grid: {
				top: 72,
				left: 12,
				right: 12,
				bottom: 64
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
					formatter: (value: number) => (metric === 'usd' ? formattedNum(value, true) : formattedNum(value))
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
							return metric === 'usd' ? formattedNum(numeric, true) : formattedNum(numeric)
						}
					}
				},
				formatter: (params: unknown) => {
					const paramList = (Array.isArray(params) ? params : []).filter((param) => {
						if (!isRecord(param)) return false
						const value = getTooltipValue(param)
						return value > 0
					})
					const first = paramList[0]
					const axisValue =
						isRecord(first) && 'axisValue' in first ? Number((first as { axisValue?: unknown }).axisValue) : Number.NaN
					const axisLabel = Number.isFinite(axisValue) ? formatLiqPrice(axisValue) : ''
					const total = paramList.reduce((sum, param) => sum + getTooltipValue(param), 0)
					const totalLabel = metric === 'usd' ? formattedNum(total, true) : formattedNum(total)
					const rows = paramList
						.map((param) => {
							if (!isRecord(param)) return null
							const value = getTooltipValue(param)
							const rowValue = metric === 'usd' ? formattedNum(value, true) : formattedNum(value)
							const seriesName = typeof param.seriesName === 'string' ? param.seriesName : ''
							const marker = typeof param.marker === 'string' ? param.marker : ''
							return `<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; font-size:12px;">
								<span style="display:inline-flex; align-items:center; gap:6px; min-width:0;">
									${marker}
									<span style="color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${seriesName}</span>
								</span>
								<span style="color:var(--text-primary); font-variant-numeric:tabular-nums; text-align:right;">${rowValue}</span>
							</div>`
						})
						.filter((row): row is string => typeof row === 'string')
						.join('')
					const totalBlock =
						metric === 'usd'
							? `<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding-top:8px; border-top:1px solid rgba(255, 255, 255, 0.08); font-size:12px;">
								<span style="color:var(--text-label);">Total</span>
								<span style="color:var(--text-primary); font-weight:600; font-variant-numeric:tabular-nums;">${totalLabel}</span>
							</div>`
							: ''

					return `<div style="min-width:220px; background:linear-gradient(180deg, rgba(24, 27, 34, 0.98) 0%, rgba(16, 18, 24, 0.98) 100%); border:1px solid rgba(93, 111, 158, 0.45); box-shadow:0 18px 48px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.03) inset; backdrop-filter:blur(10px); color:var(--text-primary); border-radius:10px; padding:12px 14px; font-size:12px; line-height:1.45;">
						<div style="margin-bottom:8px;">
							<div style="font-size:11px; color:rgba(201, 208, 224, 0.72); text-transform:uppercase; letter-spacing:0.08em;">Liq Price</div>
							<div style="font-size:15px; font-weight:600; color:#f8fafc;">${axisLabel}</div>
						</div>
						<div style="display:flex; flex-direction:column; gap:6px;">
							${rows}
						</div>
						${totalBlock ? `<div style="margin-top:8px;">${totalBlock}</div>` : ''}
					</div>`
				}
			}
		}

		return options as unknown as IMultiSeriesChart2Props['chartOptions']
	}, [metric])

	const deferredChartModel = React.useDeferredValue(chartModel)

	if (chart.series.length === 0 || chart.bins.length === 0) {
		return (
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-5">
				<h2 className="text-lg font-semibold">{title ?? 'Liquidation Distribution'}</h2>
				<p className="mt-3 text-sm text-(--text-label)">No liquidation chart data available for this view.</p>
			</div>
		)
	}

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-wrap items-center gap-2 p-2">
				<div className="mr-auto" />
				<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
					<button
						data-active={metric === 'usd'}
						onClick={() => setMetric('usd')}
						className="inline-flex shrink-0 items-center justify-center px-3 py-1.5 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
					>
						USD
					</button>
					<button
						data-active={metric === 'amount'}
						onClick={() => setMetric('amount')}
						className="inline-flex shrink-0 items-center justify-center px-3 py-1.5 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
					>
						Amount
					</button>
				</div>
				<ChartExportButtons
					chartInstance={() => chartInstanceRef.current}
					filename={slug(title ?? 'liquidation-distribution')}
					title={title ?? 'Liquidation Distribution'}
					smol
				/>
			</div>
			<React.Suspense fallback={<div className="min-h-[360px]" />}>
				<MultiSeriesChart2
					dataset={deferredChartModel.dataset}
					charts={deferredChartModel.charts}
					chartOptions={chartOptions}
					containerClassName="min-h-[360px]"
					hideDefaultLegend={false}
					onReady={onChartReady}
					valueSymbol={metric === 'usd' ? '$' : ''}
				/>
			</React.Suspense>
			<div className="flex items-center justify-end gap-1 px-4 pb-3 text-xs text-(--text-label) italic opacity-70">
				<span>Snapshot {new Date(timestamp * 1000).toUTCString()}</span>
			</div>
		</div>
	)
}

function getTooltipValue(param: Record<string, unknown>): number {
	const seriesName = typeof param.seriesName === 'string' ? param.seriesName : null

	if (isRecord(param.data) && seriesName) {
		const value = param.data[seriesName]
		return typeof value === 'number' ? value : 0
	}

	if (Array.isArray(param.value)) {
		const encodeY = isRecord(param.encode) ? param.encode.y : undefined
		const yIndex = typeof encodeY === 'number' ? encodeY : 1
		const value = param.value[yIndex]
		return typeof value === 'number' ? value : 0
	}

	return typeof param.value === 'number' ? param.value : 0
}
