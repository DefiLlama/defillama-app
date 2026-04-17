import { CustomChart } from 'echarts/charts'
import { MarkAreaComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { useEffect, useId, useMemo, useRef } from 'react'
import {
	attachEventHoverHandlers,
	buildEventRailData,
	createEventRailSeries,
	createEventStripYAxis,
	type EventHoverState,
	getMainGridBottom,
	getSortedSeriesTimeBounds,
	mergeGraphicWithEventMarkLinePlaceholder
} from '~/components/ECharts/hallmarkEventRail'
import type { ChartTimeGrouping } from '~/components/ECharts/types'
import { useDefaults } from '~/components/ECharts/useDefaults'
import { mergeDeep } from '~/components/ECharts/utils'
import { useChartResize } from '~/hooks/useChartResize'
import { buildProtocolYAxis } from './chartYAxis'
import { BAR_CHARTS, type ProtocolChartsLabels, yAxisByChart } from './constants'
import type { IProtocolCoreChartProps } from './types'

echarts.use([MarkAreaComponent, CustomChart])

const PRIMARY_SERIES_ID_PREFIX = 'protocol-chart-series-'

export default function ProtocolChart({
	chartData,
	chartColors,
	valueSymbol = '',
	color,
	hallmarks,
	rangeHallmarks,
	chartOptions,
	height,
	unlockTokenSymbol = '',
	isThemeDark,
	groupBy,
	hideDataZoom = false,
	onReady,
	...props
}: IProtocolCoreChartProps) {
	const id = useId()
	const isCumulative = groupBy === 'cumulative'
	const chartRef = useRef<echarts.ECharts | null>(null)
	const tooltipGroupBy: ChartTimeGrouping = groupBy && groupBy !== 'cumulative' ? groupBy : 'daily'

	// Stable resize listener - never re-attaches when dependencies change
	useChartResize(chartRef)

	const defaultChartSettings = useDefaults({
		color,
		valueSymbol,
		tooltipSort: false,
		hideLegend: true,
		unlockTokenSymbol: unlockTokenSymbol ?? '',
		isThemeDark,
		groupBy: tooltipGroupBy
	})

	const eventRailData = useMemo(
		() => buildEventRailData({ hallmarks, rangeHallmarks, isThemeDark, dateInMs: true }).events,
		[hallmarks, rangeHallmarks, isThemeDark]
	)

	const { series, allYAxis } = useMemo(() => {
		const uniqueYAxis = new Set()
		const stacks: ProtocolChartsLabels[] = []
		for (const stack in chartData) {
			stacks.push(stack as ProtocolChartsLabels)
		}

		for (const stack of stacks) {
			uniqueYAxis.add(yAxisByChart[stack])
		}

		const indexByYAxis = Object.fromEntries(
			Array.from(uniqueYAxis).map((yAxis, index) => [yAxis, index === 0 ? undefined : index])
		) as Record<string, number | undefined>

		const series = stacks.map((stack, index) => {
			const stackColor = chartColors[stack]
			const type = BAR_CHARTS.includes(stack) && !isCumulative ? 'bar' : 'line'

			const options = {
				yAxisIndex: indexByYAxis[yAxisByChart[stack]]
			}

			return {
				id: `${PRIMARY_SERIES_ID_PREFIX}${index}`,
				name: stack,
				type,
				...options,
				scale: true,
				large: true,
				emphasis: {
					focus: 'series',
					shadowBlur: 10
				},
				symbol: 'none',
				itemStyle: {
					color: stackColor || null
				},
				...(type === 'line'
					? {
							areaStyle: {
								color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
									{
										offset: 0,
										color: stackColor ? stackColor : index === 0 ? chartColors[stack] : 'transparent'
									},
									{
										offset: 1,
										color: isThemeDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'
									}
								])
							}
						}
					: {}),
				data: chartData[stack] ?? [],
				...(index === 0 && (rangeHallmarks?.length ?? 0) > 0
					? {
							markArea: {
								itemStyle: {
									color: isThemeDark ? 'rgba(15, 52, 105, 0.4)' : 'rgba(70, 130, 180, 0.3)'
								},
								label: {
									fontFamily: 'sans-serif',
									fontWeight: 600,
									color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
								},
								data: (rangeHallmarks ?? []).map(([date, event]: [[number, number], string]) => [
									{
										name: event,
										xAxis: date[0]
									},
									{
										xAxis: date[1]
									}
								])
							}
						}
					: {})
			}
		})

		for (const seriesItem of series) {
			if (seriesItem.data.length === 0) {
				seriesItem.large = false
			}
		}

		return {
			series,
			allYAxis: Object.entries(indexByYAxis) as Array<[ProtocolChartsLabels, number | undefined]>
		}
	}, [chartData, chartColors, isThemeDark, isCumulative, rangeHallmarks])

	useEffect(() => {
		// create instance
		const el = document.getElementById(id)
		if (!el) return
		const instance = echarts.getInstanceByDom(el) || echarts.init(el, null, { renderer: 'canvas' })
		chartRef.current = instance
		if (onReady) {
			onReady(instance)
		}

		const mergedSettings = { ...defaultChartSettings } as Record<string, unknown>
		if (chartOptions) {
			for (const option in chartOptions) {
				const opts = chartOptions as Record<string, Record<string, unknown>>
				if (mergedSettings[option]) {
					mergedSettings[option] = mergeDeep(mergedSettings[option] as Record<string, unknown>, opts[option])
				} else {
					mergedSettings[option] = { ...opts[option] }
				}
			}
		}

		const { graphic, tooltip, xAxis, yAxis, dataZoom } = mergedSettings as typeof defaultChartSettings

		const chartsInSeries = new Set(series.map((s) => s.name))
		const finalYAxis = buildProtocolYAxis({
			allYAxis,
			baseYAxis: yAxis,
			chartColors,
			chartsInSeries,
			unlockTokenSymbol
		})

		const shouldHideDataZoom = hideDataZoom || series.every((s) => s.data.length < 2)
		const shouldShowEventRail = eventRailData.length > 0

		let timeRangeMin = Infinity
		let timeRangeMax = -Infinity
		if (shouldShowEventRail) {
			for (const s of series) {
				const data = (s.data ?? []) as Array<[number, number] | unknown>
				const { min, max } = getSortedSeriesTimeBounds(data)
				if (typeof min === 'number' && min < timeRangeMin) timeRangeMin = min
				if (typeof max === 'number' && max > timeRangeMax) timeRangeMax = max
			}
		}
		const hasTimeRange = Number.isFinite(timeRangeMin) && Number.isFinite(timeRangeMax) && timeRangeMin < timeRangeMax

		const mainGridBottom = getMainGridBottom({ shouldShowEventRail, shouldHideDataZoom })

		const mainGrid = {
			left: 12,
			bottom: mainGridBottom,
			top: (rangeHallmarks?.length ?? 0) > 0 ? 18 : 12,
			right: 12,
			outerBoundsMode: 'same',
			outerBoundsContain: 'axisLabel'
		}
		const finalGrid = mainGrid
		const finalXAxis = shouldShowEventRail && hasTimeRange ? { ...xAxis, min: timeRangeMin, max: timeRangeMax } : xAxis

		const eventStripYAxis = createEventStripYAxis()
		const eventStripYAxisIndex = finalYAxis.length
		const finalYAxisWithEvents = shouldShowEventRail ? [...finalYAxis, eventStripYAxis] : finalYAxis
		const finalDataZoom = dataZoom
		const hoverState: EventHoverState = { hoveredEventDate: null }

		const finalSeries = shouldShowEventRail
			? [
					...series,
					createEventRailSeries({
						eventRailData,
						eventStripYAxisIndex,
						hoverState,
						shouldHideDataZoom,
						tooltipGroupBy
					})
				]
			: series

		const finalGraphic = shouldShowEventRail ? mergeGraphicWithEventMarkLinePlaceholder(graphic, isThemeDark) : graphic

		instance.setOption({
			graphic: finalGraphic,
			tooltip,
			grid: finalGrid,
			xAxis: finalXAxis,
			yAxis: finalYAxisWithEvents,
			...(shouldHideDataZoom ? {} : { dataZoom: finalDataZoom }),
			series: finalSeries
		})
		const detachEventHoverHandlers = attachEventHoverHandlers({
			instance,
			eventRailData: shouldShowEventRail ? eventRailData : [],
			hoverState,
			getEventMarkLineShape: (eventDate) => {
				const x = instance.convertToPixel({ xAxisIndex: 0 }, eventDate)
				if (!Number.isFinite(x)) return null

				return {
					x1: x,
					y1: Number(mainGrid.top),
					x2: x,
					y2: instance.getHeight() - mainGridBottom
				}
			}
		})

		return () => {
			detachEventHoverHandlers()
			chartRef.current = null
			instance.dispose()
			if (onReady) {
				onReady(null)
			}
		}
	}, [
		id,
		defaultChartSettings,
		series,
		chartOptions,
		unlockTokenSymbol,
		chartColors,
		allYAxis,
		rangeHallmarks,
		eventRailData,
		isThemeDark,
		tooltipGroupBy,
		onReady,
		hideDataZoom
	])

	return (
		<div
			id={id}
			className="h-[360px]"
			style={height || props.style ? { height: height ?? '360px', ...(props.style ?? {}) } : undefined}
		/>
	)
}
