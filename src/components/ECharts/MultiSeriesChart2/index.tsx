import { DatasetComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { useCallback, useEffect, useId, useMemo, useRef } from 'react'
import { ChartCsvExportButton } from '~/components/ButtonStyled/ChartCsvExportButton'
import { ChartExportButton } from '~/components/ButtonStyled/ChartExportButton'
import { CHART_COLORS } from '~/constants/colors'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useChartCsvExport } from '~/hooks/useChartCsvExport'
import { useChartImageExport } from '~/hooks/useChartImageExport'
import { useChartResize } from '~/hooks/useChartResize'
import { abbreviateNumber } from '~/utils'
import type { IMultiSeriesChart2Props } from '../types'
import { formatTooltipChartDate, useDefaults } from '../useDefaults'
import { mergeDeep } from '../utils'

echarts.use([DatasetComponent])

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

	for (const chart of effectiveCharts ?? []) {
		if (selectedCharts && !selectedCharts.has(chart.name)) continue
		if (chart.yAxisIndex != null) someSeriesHasYAxisIndex = true

		const baseColor = chart.color ?? (isThemeDark ? '#000000' : '#ffffff')
		const showSymbol = chart.type === 'line' ? !!(chart as any).showSymbol : false
		const symbol = showSymbol ? ((chart as any).symbol ?? 'circle') : 'none'
		// ECharts large mode disables symbols; default to disabling large mode when symbols are requested.
		const large = (chart as any).large ?? !showSymbol
		const symbolSize = showSymbol ? ((chart as any).symbolSize ?? 6) : undefined

		out.push({
			name: chart.name,
			type: chart.type,
			symbol,
			showSymbol,
			...(symbolSize != null ? { symbolSize } : {}),
			large,
			encode: chart.encode,
			emphasis: { focus: 'series', shadowBlur: 10 },
			...(chart.color ? { itemStyle: { color: chart.color } } : {}),
			...(expandTo100Percent
				? { stack: 'A', lineStyle: { width: 0 }, areaStyle: {} }
				: {
						...(chart.stack != null ? { stack: chart.stack } : {}),
						areaStyle: solidChartAreaStyle
							? { color: baseColor, opacity: 0.7 }
							: {
									color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
										{ offset: 0, color: baseColor },
										{
											offset: 1,
											color: isThemeDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'
										}
									])
								}
					}),
			...(chart.yAxisIndex != null ? { yAxisIndex: chart.yAxisIndex } : {})
		})
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
	expandTo100Percent
}: {
	series: any[]
	yAxis: any
	expandTo100Percent: boolean | undefined
}) {
	const yAxisIndexToColor = new Map<number, string | undefined>()
	let maxIndex = -1

	for (const item of series) {
		const idx = item?.yAxisIndex
		if (idx == null) continue
		if (!yAxisIndexToColor.has(idx)) yAxisIndexToColor.set(idx, item?.itemStyle?.color)
		if (idx > maxIndex) maxIndex = idx
	}

	if (maxIndex < 0) return null

	const out: any[] = []
	for (let i = 0; i <= maxIndex; i++) {
		const axisColor = i === 0 ? null : yAxisIndexToColor.get(i)
		out.push({
			...yAxis,
			axisLine: {
				show: true,
				lineStyle: {
					type: [5, 10],
					dashOffset: 5,
					...(axisColor ? { color: axisColor } : {})
				}
			},
			axisLabel: {
				...yAxis.axisLabel,
				...(axisColor ? { color: axisColor } : {})
			},
			...(expandTo100Percent ? { max: 100, min: 0 } : {})
		})
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

function createTooltipFormatter({ groupBy, valueSymbol }: { groupBy: GroupBy; valueSymbol: string }) {
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

				return [item.marker, name, value] as const
			})
			.filter(Boolean)
			.sort((a, b) => b[2] - a[2])

		return (
			chartdate +
			vals.reduce(
				(prev, curr) =>
					prev +
					`<li style="list-style:none;">${curr[0]} ${curr[1]}: ${abbreviateNumber(curr[2], 2, valueSymbol)}</li>`,
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
		shouldEnableImageExport,
		imageExportFilename,
		imageExportTitle,
		shouldEnableCSVDownload,
		title
	} = props

	const id = useId()

	const [isThemeDark] = useDarkModeManager()
	const chartRef = useRef<echarts.ECharts | null>(null)
	const { chartInstance: exportChartInstance, handleChartReady } = useChartImageExport()
	const { chartInstance: exportChartCsvInstance, handleChartReady: handleChartCsvReady } = useChartCsvExport()

	// Stable resize listener - never re-attaches when dependencies change
	useChartResize(chartRef)

	const groupBySafe = coerceGroupBy(groupBy)

	const defaultChartSettings = useDefaults({
		isThemeDark,
		valueSymbol,
		groupBy: groupBySafe,
		alwaysShowTooltip
	})

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

	const tooltipFormatter = useMemo(
		() => createTooltipFormatter({ groupBy: groupBySafe, valueSymbol }),
		[groupBySafe, valueSymbol]
	)

	const exportFilename = imageExportFilename || 'multi-series-chart'
	const exportTitle = imageExportTitle

	const updateExportInstance = useCallback(
		(instance: echarts.ECharts | null) => {
			if (shouldEnableImageExport) {
				handleChartReady(instance)
			}
			if (shouldEnableCSVDownload) {
				handleChartCsvReady(instance)
			}
		},
		[shouldEnableImageExport, handleChartReady, shouldEnableCSVDownload, handleChartCsvReady]
	)

	useEffect(() => {
		// create instance
		const el = document.getElementById(id)
		if (!el) return
		const instance = echarts.getInstanceByDom(el) || echarts.init(el)
		chartRef.current = instance
		updateExportInstance(instance)

		if (onReady) {
			onReady(instance)
		}

		// avoid mutating memoized defaults
		const mergedChartSettings: any = { ...defaultChartSettings }

		// override default chart settings
		for (const option in chartOptions) {
			if (option === 'overrides') {
				// update tooltip formatter
				mergedChartSettings['tooltip'] = { ...mergedChartSettings['inflowsTooltip'] }
			} else if (mergedChartSettings[option]) {
				mergedChartSettings[option] = mergeDeep(mergedChartSettings[option], chartOptions[option])
			} else {
				mergedChartSettings[option] = { ...chartOptions[option] }
			}
		}

		const { legend, graphic, xAxis, yAxis, dataZoom, dataset: datasetOptions } = mergedChartSettings
		const finalYAxis = buildMultiYAxis({ series, yAxis, expandTo100Percent })

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
						left: l?.left ?? 12,
						right: l?.right ?? 12
					}))
				: legend
					? {
							...legend,
							type: 'scroll',
							orient: (legend as any)?.orient ?? 'horizontal',
							pageButtonPosition: (legend as any)?.pageButtonPosition ?? 'end',
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

		instance.setOption({
			...(hideDefaultLegend ? {} : { legend: finalLegend ?? legend }),
			graphic,
			tooltip: tooltipConfig,
			grid: {
				left: 12,
				bottom: shouldHideDataZoom ? 12 : 68,
				top: hideDefaultLegend ? 12 : 24 + 4,
				right: 12,
				outerBoundsMode: 'same',
				outerBoundsContain: 'axisLabel'
			},
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
				updateExportInstance(null)
				if (onReady) {
					onReady(null)
				}
			}
		}

		return () => {
			chartRef.current = null
			instance.dispose()
			updateExportInstance(null)
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
		updateExportInstance
	])

	return (
		<div className="relative">
			{title || shouldEnableCSVDownload || shouldEnableImageExport ? (
				<div className="mb-2 flex flex-wrap items-center justify-end gap-2 px-2">
					{title ? <h1 className="mr-auto text-base font-semibold">{title}</h1> : null}
					{shouldEnableCSVDownload ? (
						<ChartCsvExportButton chartInstance={exportChartCsvInstance} filename={exportFilename} />
					) : null}
					{shouldEnableImageExport ? (
						<ChartExportButton chartInstance={exportChartInstance} filename={exportFilename} title={exportTitle} />
					) : null}
				</div>
			) : null}
			<div id={id} className="h-[360px]" style={height ? { height } : undefined}></div>
		</div>
	)
}
