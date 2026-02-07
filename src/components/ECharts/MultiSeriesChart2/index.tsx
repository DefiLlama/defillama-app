import { BarChart, LineChart } from 'echarts/charts'
import {
	DataZoomComponent,
	GraphicComponent,
	GridComponent,
	LegendComponent,
	MarkLineComponent,
	TitleComponent,
	TooltipComponent,
	DatasetComponent
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useEffect, useId, useMemo, useRef } from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { CHART_COLORS } from '~/constants/colors'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useChartResize } from '~/hooks/useChartResize'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { useMedia } from '~/hooks/useMedia'
import { formatNum, formattedNum, slug } from '~/utils'
import { formatChartEmphasisDate, formatTooltipChartDate } from '../formatters'
import type { IMultiSeriesChart2Props } from '../types'
import { mergeDeep } from '../utils'

echarts.use([
	CanvasRenderer,
	LineChart,
	BarChart,
	TooltipComponent,
	TitleComponent,
	GridComponent,
	DataZoomComponent,
	GraphicComponent,
	MarkLineComponent,
	LegendComponent,
	DatasetComponent
])

function formatAxisLabel(value: number, symbol: string): string {
	if (Math.abs(value) > 1000) return formattedNum(value, symbol === '$')
	return formatNum(value, 5, symbol || undefined)
}

type GroupBy = NonNullable<IMultiSeriesChart2Props['groupBy']>

const VALID_GROUP_BY = new Set<GroupBy>(['daily', 'weekly', 'monthly'])

function coerceGroupBy(groupBy: IMultiSeriesChart2Props['groupBy']): GroupBy {
	return groupBy && VALID_GROUP_BY.has(groupBy) ? groupBy : 'daily'
}

function buildHallmarksMarkLine(hallmarks: NonNullable<IMultiSeriesChart2Props['hallmarks']>, isThemeDark: boolean) {
	const labelColor = isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'

	return hallmarks.length > 8
		? {
				symbol: 'none',
				data: hallmarks.map(([date, event]) => [
					{
						name: event,
						xAxis: +date * 1e3,
						yAxis: 0,
						label: {
							show: false,
							color: labelColor,
							fontFamily: 'sans-serif',
							fontSize: 14,
							fontWeight: 500,
							position: 'insideEndTop'
						},
						emphasis: {
							label: {
								show: true, // Show on hover
								color: labelColor,
								fontFamily: 'sans-serif',
								fontSize: 14,
								fontWeight: 500,
								position: 'insideEndTop'
							}
						}
					},
					{
						name: 'end',
						xAxis: +date * 1e3,
						yAxis: 'max',
						y: 0
					}
				])
			}
		: {
				data: hallmarks.map(([date, event], index) => [
					{
						name: event,
						xAxis: +date * 1e3,
						yAxis: 0,
						label: {
							color: labelColor,
							fontFamily: 'sans-serif',
							fontSize: 14,
							fontWeight: 500
						}
					},
					{
						name: 'end',
						xAxis: +date * 1e3,
						yAxis: 'max',
						y: Math.max(hallmarks.length * 40 - index * 40, 40)
					}
				])
			}
}

function buildSeries({
	effectiveCharts,
	selectedCharts,
	expandTo100Percent,
	solidChartAreaStyle,
	isThemeDark,
	hallmarks
}: {
	effectiveCharts: IMultiSeriesChart2Props['charts']
	selectedCharts: IMultiSeriesChart2Props['selectedCharts']
	expandTo100Percent: boolean | undefined
	solidChartAreaStyle: boolean
	isThemeDark: boolean
	hallmarks: IMultiSeriesChart2Props['hallmarks']
}) {
	const out: any[] = []
	let someSeriesHasYAxisIndex = false

	const chartsList = effectiveCharts ?? []
	for (let i = 0; i < chartsList.length; i++) {
		const chart = chartsList[i]
		if (selectedCharts && !selectedCharts.has(chart.name)) continue
		if (chart.yAxisIndex != null) someSeriesHasYAxisIndex = true

		// If a chart doesn't provide an explicit color, we still need a stable color
		// so the area gradient doesn't default to theme background (and become invisible).
		const resolvedColor = chart.color ?? CHART_COLORS[i % CHART_COLORS.length]
		const showSymbol = chart.type === 'line' ? !!chart.showSymbol : false
		const symbol = showSymbol ? (chart.symbol ?? 'circle') : 'none'
		// ECharts large mode disables symbols; default to disabling large mode when symbols are requested.
		const large = chart.large ?? !showSymbol
		const symbolSize = showSymbol ? (chart.symbolSize ?? 6) : undefined

		const base: any = {
			name: chart.name,
			type: chart.type,
			symbol,
			showSymbol,
			...(symbolSize != null ? { symbolSize } : {}),
			large,
			encode: chart.encode,
			emphasis: { focus: 'series', shadowBlur: 10 },
			itemStyle: { color: resolvedColor },
			...(chart.yAxisIndex != null ? { yAxisIndex: chart.yAxisIndex } : {})
		}

		if (expandTo100Percent) {
			base.stack = 'A'
			if (chart.type === 'line') {
				base.lineStyle = { width: 0, color: resolvedColor }
				base.areaStyle = {}
			}
		} else {
			if (chart.stack != null) base.stack = chart.stack
			if (chart.type === 'line') {
				base.lineStyle = { color: resolvedColor }
				base.areaStyle = solidChartAreaStyle
					? { color: resolvedColor, opacity: 0.7 }
					: {
							color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
								{ offset: 0, color: resolvedColor },
								{
									offset: 1,
									color: isThemeDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'
								}
							])
						}
			}
		}

		out.push(base)
	}

	if (hallmarks && out.length > 0) {
		out[0].markLine = buildHallmarksMarkLine(hallmarks, isThemeDark)
	}

	if (someSeriesHasYAxisIndex) {
		return out.map((item) => {
			item.yAxisIndex = item.yAxisIndex ?? 0
			return item
		})
	}

	return out
}

function buildMultiYAxis({
	series,
	yAxis,
	expandTo100Percent,
	effectiveCharts,
	valueSymbol
}: {
	series: any[]
	yAxis: any
	expandTo100Percent: boolean | undefined
	effectiveCharts: IMultiSeriesChart2Props['charts']
	valueSymbol: string
}) {
	const yAxisIndexToColor = new Map<number, string | undefined>()
	const yAxisIndexToExplicitColor = new Map<number, string | undefined>()
	const yAxisIndexToSymbol = new Map<number, string | undefined>()
	let maxIndex = -1

	for (const item of series) {
		const idx = item?.yAxisIndex
		if (idx == null) continue
		if (!yAxisIndexToColor.has(idx)) yAxisIndexToColor.set(idx, item?.itemStyle?.color)
		if (idx > maxIndex) maxIndex = idx
	}

	// Derive per-axis symbols and colors from charts config
	// - symbols: first one wins
	// - colors: only use if caller explicitly provided a single unique color for that axis
	const axisColorCandidates = new Map<number, Set<string>>()
	for (const chart of effectiveCharts ?? []) {
		const idx = chart.yAxisIndex
		if (idx == null) continue
		if (chart.valueSymbol && !yAxisIndexToSymbol.has(idx)) {
			yAxisIndexToSymbol.set(idx, chart.valueSymbol)
		}
		if (chart.color) {
			const set = axisColorCandidates.get(idx) ?? new Set<string>()
			set.add(chart.color)
			axisColorCandidates.set(idx, set)
		}
	}

	for (const [idx, set] of axisColorCandidates.entries()) {
		if (set.size === 1) {
			yAxisIndexToExplicitColor.set(idx, Array.from(set)[0])
		}
	}

	if (maxIndex < 0) return null

	const noOffset = maxIndex < 2
	const out: any[] = []
	let prevOffset = 0
	for (let i = 0; i <= maxIndex; i++) {
		const isPrimary = i === 0
		// Primary axis is intentionally not auto-colored from series colors (can be misleading when multiple series share axis 0).
		// But if the caller explicitly assigns a unique color to that axis via charts config, apply it.
		const axisColor = yAxisIndexToExplicitColor.get(i) ?? (isPrimary ? undefined : yAxisIndexToColor.get(i))
		// Preserve historical behavior (no symbol on primary axis) unless explicitly provided via charts config.
		const axisSymbol = yAxisIndexToSymbol.get(i) ?? (isPrimary ? '' : valueSymbol)
		const offset = noOffset || i < 2 ? 0 : prevOffset + 40

		out.push({
			...yAxis,
			position: isPrimary ? 'left' : 'right',
			alignTicks: true,
			offset,
			axisLine: {
				show: !isPrimary,
				lineStyle: {
					type: [5, 10],
					dashOffset: 5,
					...(axisColor ? { color: axisColor } : {})
				}
			},
			axisLabel: {
				...yAxis.axisLabel,
				formatter: (value: number) => formatAxisLabel(value, axisSymbol),
				...(axisColor ? { color: axisColor } : {})
			},
			...(expandTo100Percent ? { max: 100, min: 0 } : {})
		})

		prevOffset = offset
	}

	return out
}

function getAxisValueFromTooltipParams(first: any): number {
	const dataObj =
		first?.data && typeof first.data === 'object' && !Array.isArray(first.data)
			? (first.data as Record<string, any>)
			: null
	if (dataObj && 'timestamp' in dataObj) {
		const ts = Number(dataObj.timestamp)
		if (Number.isFinite(ts)) return ts
	}

	if (Array.isArray(first?.value)) {
		const ts = Number(first.value[0])
		if (Number.isFinite(ts)) return ts
	}

	if (first?.value && typeof first.value === 'object' && 'timestamp' in first.value) {
		const ts = Number(first.value.timestamp)
		if (Number.isFinite(ts)) return ts
	}

	if (typeof first?.axisValue === 'number') return first.axisValue

	const axisValue = first?.axisValue
	if (axisValue == null) return Number.NaN
	const numeric = Number(axisValue)
	if (Number.isFinite(numeric)) return numeric
	const parsed = Date.parse(String(axisValue))
	return Number.isFinite(parsed) ? parsed : Number.NaN
}

function getTooltipRawYValue(item: any, seriesName: string): any {
	// ECharts can provide:
	// - item.data as object (dataset.source object rows)  <-- our canonical format
	// - item.value as array/number (fallbacks for safety)
	const dataObj =
		item?.data && typeof item.data === 'object' && !Array.isArray(item.data) ? (item.data as Record<string, any>) : null

	// 1) Object-row dataset: `data[seriesName]` is the most reliable.
	if (dataObj && seriesName in dataObj) return dataObj[seriesName]

	// 2) Fallback: value array (e.g. [ts, y]).
	if (Array.isArray(item?.value)) {
		return item.value[1]
	}

	// 3) Final fallback: direct value.
	return item?.value
}

function createTooltipFormatter({
	groupBy,
	valueSymbol,
	seriesSymbols
}: {
	groupBy: GroupBy
	valueSymbol: string
	seriesSymbols?: Map<string, string>
}) {
	return (params: any) => {
		const items = Array.isArray(params) ? params : params ? [params] : []
		if (items.length === 0) return ''

		const axisValue = getAxisValueFromTooltipParams(items[0])
		const chartdate = Number.isFinite(axisValue) ? formatTooltipChartDate(axisValue, groupBy) : ''

		const vals = items
			.map((item) => {
				const name = item?.seriesName
				if (!name) return null

				const rawValue = getTooltipRawYValue(item, name)
				const value =
					rawValue == null || rawValue === '-' ? null : typeof rawValue === 'number' ? rawValue : Number(rawValue)
				if (value == null || Number.isNaN(value)) return null

				const symbol = seriesSymbols?.get(name) ?? valueSymbol
				const hasOverride = seriesSymbols?.has(name) ?? false
				return [item.marker, name, value, symbol, hasOverride] as const
			})
			.filter(Boolean)
			// Series with per-series symbol overrides (e.g. Price, Market Cap) sort to the top,
			// then by value descending within each group.
			.sort((a, b) => {
				if (a[4] !== b[4]) return a[4] ? -1 : 1
				return b[2] - a[2]
			})

		return (
			chartdate +
			vals.reduce(
				(prev, curr) =>
					prev + `<li style="list-style:none;">${curr[0]} ${curr[1]}: ${formatAxisLabel(curr[2], curr[3])}</li>`,
				''
			)
		)
	}
}

export default function MultiSeriesChart2(props: IMultiSeriesChart2Props) {
	const {
		charts,
		chartOptions = {},
		height,
		hallmarks,
		expandTo100Percent,
		valueSymbol = '$',
		groupBy,
		alwaysShowTooltip,
		stacked = false,
		solidChartAreaStyle = false,
		hideDataZoom,
		onReady,
		hideDefaultLegend = true,
		selectedCharts,
		dataset,
		shouldEnableImageExport: shouldEnableImageExportProp,
		imageExportFilename,
		imageExportTitle,
		shouldEnableCSVDownload: shouldEnableCSVDownloadProp,
		title
	} = props

	const id = useId()

	const [isThemeDark] = useDarkModeManager()
	const isSmall = useMedia(`(max-width: 37.5rem)`)
	const chartRef = useRef<echarts.ECharts | null>(null)
	const { chartInstance, handleChartReady } = useGetChartInstance()

	// Stable resize listener - never re-attaches when dependencies change
	useChartResize(chartRef)

	const groupBySafe = coerceGroupBy(groupBy)

	const defaultChartSettings = useMemo(() => {
		const themeColor = isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'

		const graphic = {
			type: 'image',
			z: 0,
			style: {
				image: isThemeDark ? '/assets/defillama-light-neutral.webp' : '/assets/defillama-dark-neutral.webp',
				height: 40,
				opacity: 0.3
			},
			left: isSmall ? '40%' : '45%',
			top: '130px'
		}

		const xAxis = {
			type: 'time',
			boundaryGap: false,
			nameTextStyle: { fontFamily: 'sans-serif', fontSize: 14, fontWeight: 400 },
			axisLabel: { color: themeColor },
			axisLine: { lineStyle: { color: themeColor, opacity: 0.2 } },
			splitLine: {
				lineStyle: { color: isThemeDark ? '#ffffff' : '#000000', opacity: isThemeDark ? 0.02 : 0.03 }
			}
		}

		const yAxis = {
			type: 'value',
			boundaryGap: false,
			nameTextStyle: { fontFamily: 'sans-serif', fontSize: 14, fontWeight: 400 },
			axisLabel: {
				formatter: (value: number) => formatAxisLabel(value, valueSymbol),
				color: themeColor
			},
			axisLine: { lineStyle: { color: themeColor, opacity: 0.1 } },
			splitLine: {
				lineStyle: { color: isThemeDark ? '#ffffff' : '#000000', opacity: isThemeDark ? 0.02 : 0.03 }
			}
		}

		const legend = {
			// When legends are enabled, we want consistent placement (top)
			// so callers don't have to override per-chart.
			top: 0,
			left: 12,
			right: 12,
			textStyle: {
				fontFamily: 'sans-serif',
				fontSize: 12,
				fontWeight: 400,
				color: themeColor
			}
		}

		const dataZoom = [
			{ type: 'inside', start: 0, end: 100 },
			{
				start: 0,
				end: 100,
				left: 12,
				right: 12,
				textStyle: { color: themeColor },
				borderColor: isThemeDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
				handleStyle: {
					borderColor: isThemeDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
					color: isThemeDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.4)'
				},
				moveHandleStyle: {
					color: isThemeDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)'
				},
				emphasis: {
					handleStyle: {
						borderColor: isThemeDark ? 'rgba(255, 255, 255, 1)' : '#000',
						color: isThemeDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)'
					},
					moveHandleStyle: {
						borderColor: isThemeDark ? 'rgba(255, 255, 255, 1)' : '#000',
						color: isThemeDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
					}
				},
				fillerColor: isThemeDark ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
				labelFormatter: formatChartEmphasisDate
			}
		]

		return { graphic, xAxis, yAxis, legend, dataZoom }
	}, [isThemeDark, valueSymbol, isSmall])

	const { datasetSource, datasetDimensions, effectiveCharts } = useMemo(() => {
		const datasetSource = dataset.source
		const datasetDimensions = dataset.dimensions
		const seriesKeys = datasetDimensions.filter((k) => k !== 'timestamp')
		const shouldInferCharts = !charts || charts.length === 0
		const effectiveCharts = shouldInferCharts
			? seriesKeys.map((name, i) => ({
					type: 'line' as const,
					name,
					encode: { x: 'timestamp', y: name },
					color: CHART_COLORS[i % CHART_COLORS.length],
					yAxisIndex: undefined,
					...(stacked ? { stack: 'A' } : {})
				}))
			: charts

		return { datasetSource, datasetDimensions, effectiveCharts }
	}, [dataset, charts, stacked])

	// Default exports ON for line charts unless explicitly disabled by the caller.
	const hasLineSeries = useMemo(() => effectiveCharts.some((c) => c.type === 'line'), [effectiveCharts])
	// If a caller provides `onReady`, they often manage export instances + buttons outside the chart,
	// so avoid showing duplicate toolbars by default in that case.
	const shouldEnableImageExport = shouldEnableImageExportProp ?? (!onReady && hasLineSeries)
	const shouldEnableCSVDownload = shouldEnableCSVDownloadProp ?? (!onReady && hasLineSeries)

	const series = useMemo(() => {
		return buildSeries({
			effectiveCharts,
			selectedCharts,
			expandTo100Percent,
			solidChartAreaStyle,
			isThemeDark,
			hallmarks
		})
	}, [effectiveCharts, isThemeDark, expandTo100Percent, hallmarks, solidChartAreaStyle, selectedCharts])

	const seriesSymbols = useMemo(() => {
		const map = new Map<string, string>()
		for (const chart of effectiveCharts ?? []) {
			const sym = 'valueSymbol' in chart ? (chart.valueSymbol as string | undefined) : undefined
			if (sym) map.set(chart.name, sym)
		}
		return map.size > 0 ? map : undefined
	}, [effectiveCharts])

	const tooltipFormatter = useMemo(
		() => createTooltipFormatter({ groupBy: groupBySafe, valueSymbol, seriesSymbols }),
		[groupBySafe, valueSymbol, seriesSymbols]
	)

	const exportFilename = imageExportFilename || (title ? slug(title) : 'multi-series-chart')
	const exportTitle = imageExportTitle

	useEffect(() => {
		// create instance
		const el = document.getElementById(id)
		if (!el) return
		const instance = echarts.getInstanceByDom(el) || echarts.init(el)
		chartRef.current = instance
		if (shouldEnableCSVDownload || shouldEnableImageExport) {
			handleChartReady(instance)
		}

		if (onReady) {
			onReady(instance)
		}

		// avoid mutating memoized defaults
		const mergedChartSettings: any = { ...defaultChartSettings }

		// override default chart settings
		for (const option in chartOptions) {
			if (option === 'overrides') continue
			if (mergedChartSettings[option]) {
				mergedChartSettings[option] = mergeDeep(mergedChartSettings[option], chartOptions[option])
			} else {
				mergedChartSettings[option] = { ...chartOptions[option] }
			}
		}

		const { legend, graphic, xAxis, yAxis, dataZoom, dataset: datasetOptions } = mergedChartSettings
		const finalYAxis = buildMultiYAxis({ series, yAxis, expandTo100Percent, effectiveCharts, valueSymbol })

		const datasetLength = Array.isArray(datasetSource) ? datasetSource.length : 0
		const shouldHideDataZoom = datasetLength < 2 || hideDataZoom

		// Always use a scroll legend when the default legend is enabled.
		const finalLegend = hideDefaultLegend
			? undefined
			: Array.isArray(legend)
				? legend.map((l) => ({
						...l,
						type: 'scroll',
						orient: l?.orient ?? 'horizontal',
						pageButtonPosition: l?.pageButtonPosition ?? 'end',
						top: (l as any)?.top ?? 0,
						left: l?.left ?? 12,
						right: l?.right ?? 12
					}))
				: legend
					? {
							...legend,
							type: 'scroll',
							orient: (legend as any)?.orient ?? 'horizontal',
							pageButtonPosition: (legend as any)?.pageButtonPosition ?? 'end',
							top: (legend as any)?.top ?? 0,
							left: (legend as any)?.left ?? 12,
							right: (legend as any)?.right ?? 12
						}
					: undefined

		const datasetForOption = {
			...(datasetOptions ?? {}),
			source: datasetSource,
			...((datasetOptions?.dimensions ?? datasetDimensions)
				? { dimensions: datasetOptions?.dimensions ?? datasetDimensions }
				: {})
		}

		const baseTooltip = mergedChartSettings.tooltip ?? {}
		const customTooltipFormatter = chartOptions?.tooltip?.formatter
		const tooltipConfig = {
			trigger: 'axis',
			confine: true,
			...baseTooltip,
			formatter: customTooltipFormatter ?? tooltipFormatter
		}

		const baseGrid = {
			left: 12,
			bottom: shouldHideDataZoom ? 12 : 68,
			// Reserve enough space for a single-row scroll legend at the top
			// without creating the huge "dead band" many callers were compensating for.
			top: hideDefaultLegend ? 12 : 40,
			right: 12,
			outerBoundsMode: 'same',
			outerBoundsContain: 'axisLabel'
		}

		instance.setOption({
			...(hideDefaultLegend ? {} : { legend: finalLegend ?? legend }),
			graphic,
			tooltip: tooltipConfig,
			grid: mergedChartSettings.grid ? mergeDeep(baseGrid, mergedChartSettings.grid) : baseGrid,
			xAxis,
			yAxis:
				finalYAxis && finalYAxis.length > 0
					? finalYAxis
					: {
							...yAxis,
							...(expandTo100Percent ? { max: 100, min: 0 } : {})
						},
			...(shouldHideDataZoom ? {} : { dataZoom }),
			series,
			dataset: datasetForOption
		})

		if (alwaysShowTooltip && series.length > 0 && datasetLength > 0) {
			const dataIndex = datasetLength - 1
			const showTip = () =>
				instance.dispatchAction({
					type: 'showTip',
					// index of series, which is optional when trigger of tooltip is axis
					seriesIndex: 0,
					// data index; could assign by name attribute when not defined
					dataIndex,
					// Position of tooltip. Only works in this action.
					// Use tooltip.position in option by default.
					position: [60, 0]
				})

			showTip()

			const onGlobalOut = () => showTip()
			instance.on('globalout', onGlobalOut)

			return () => {
				instance.off('globalout', onGlobalOut)
				chartRef.current = null
				instance.dispose()
				handleChartReady(null)
				if (onReady) {
					onReady(null)
				}
			}
		}

		return () => {
			chartRef.current = null
			instance.dispose()
			handleChartReady(null)
			if (onReady) {
				onReady(null)
			}
		}
	}, [
		id,
		defaultChartSettings,
		series,
		chartOptions,
		expandTo100Percent,
		alwaysShowTooltip,
		hideDataZoom,
		hideDefaultLegend,
		datasetSource,
		datasetDimensions,
		valueSymbol,
		onReady,
		tooltipFormatter,
		effectiveCharts,
		handleChartReady,
		shouldEnableCSVDownload,
		shouldEnableImageExport
	])

	return (
		<div className="relative">
			{title || shouldEnableCSVDownload || shouldEnableImageExport ? (
				<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
					{title ? <h1 className="mr-auto text-base font-semibold">{title}</h1> : null}
					<ChartExportButtons
						chartInstance={chartInstance}
						filename={exportFilename}
						title={exportTitle}
						showCsv={shouldEnableCSVDownload}
						showPng={shouldEnableImageExport}
					/>
				</div>
			) : null}
			<div id={id} className="h-[360px]" style={height ? { height } : undefined}></div>
		</div>
	)
}
