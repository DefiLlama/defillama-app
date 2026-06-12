import * as echarts from 'echarts/core'
import { useEffect, useEffectEvent, useId, useMemo, useRef } from 'react'
import type { ChartTimeGrouping } from '~/components/ECharts/types'
import { useDefaults } from '~/components/ECharts/useDefaults'
import { mergeDeep } from '~/components/ECharts/utils'
import { useChartResize } from '~/hooks/useChartResize'
import { buildChainYAxis } from './chartYAxis'
import {
	BAR_CHARTS,
	type ChainChartLabels,
	chainOverviewChartColors,
	DISABLED_CUMULATIVE_CHARTS,
	yAxisByChart
} from './constants'

const BAR_CHARTS_SET = new Set<ChainChartLabels>(BAR_CHARTS)
const DISABLED_CUMULATIVE_CHARTS_SET = new Set<ChainChartLabels>(DISABLED_CUMULATIVE_CHARTS)

export default function ChainCoreChart({
	chartData,
	valueSymbol = '',
	color,
	chartOptions,
	height,
	unlockTokenSymbol = '',
	gasUsedValueSymbol,
	isThemeDark,
	groupBy,
	hideDataZoom = false,
	onReady,
	...props
}) {
	const id = useId()
	const isCumulative = groupBy === 'cumulative'
	const chartRef = useRef<echarts.ECharts | null>(null)
	const tooltipGroupBy: ChartTimeGrouping = groupBy && groupBy !== 'cumulative' ? groupBy : 'daily'
	const seriesValueSymbols = useMemo(
		() => (gasUsedValueSymbol ? { 'Gas Used': gasUsedValueSymbol } : undefined),
		[gasUsedValueSymbol]
	)

	// Stable resize listener - never re-attaches when dependencies change
	useChartResize(chartRef)

	const defaultChartSettings = useDefaults({
		color,
		valueSymbol,
		tooltipSort: false,
		hideLegend: true,
		unlockTokenSymbol,
		seriesValueSymbols,
		isThemeDark,
		groupBy: tooltipGroupBy
	})

	const { series, allYAxis, chartsInSeries } = useMemo(() => {
		const indexByYAxis = {} as Record<ChainChartLabels, number | undefined>
		const allYAxis: Array<[ChainChartLabels, number | undefined]> = []
		const chartsInSeries = new Set<ChainChartLabels>()
		const stacks: ChainChartLabels[] = []
		for (const stack in chartData) {
			const chartLabel = stack as ChainChartLabels
			const yAxis = yAxisByChart[chartLabel]
			stacks.push(chartLabel)
			chartsInSeries.add(chartLabel)
			if (!(yAxis in indexByYAxis)) {
				const yAxisIndex = allYAxis.length === 0 ? undefined : allYAxis.length
				indexByYAxis[yAxis] = yAxisIndex
				allYAxis.push([yAxis, yAxisIndex])
			}
		}

		const series = stacks.map((stack, index) => {
			const stackColor = chainOverviewChartColors[stack]
			const data = chartData[stack] ?? []

			let type = BAR_CHARTS_SET.has(stack) && !isCumulative ? 'bar' : 'line'
			type = DISABLED_CUMULATIVE_CHARTS_SET.has(stack) ? 'bar' : type

			const options = {
				yAxisIndex: indexByYAxis[yAxisByChart[stack]]
			}

			return {
				name: stack,
				type,
				...options,
				scale: true,
				large: data.length > 0,
				emphasis: {
					focus: 'series',
					shadowBlur: 10
				},
				symbol: 'none',
				itemStyle: {
					color: stackColor
				},
				...(type === 'line'
					? {
							areaStyle: {
								color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
									{
										offset: 0,
										color: stackColor ? stackColor : index === 0 ? chainOverviewChartColors[stack] : 'transparent'
									},
									{
										offset: 1,
										color: isThemeDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'
									}
								])
							}
						}
					: {}),
				markLine: {},
				data
			}
		})

		return { series, allYAxis, chartsInSeries }
	}, [chartData, isThemeDark, isCumulative])

	const emitReady = useEffectEvent((instance: echarts.ECharts | null) => {
		onReady?.(instance)
	})

	useEffect(() => {
		const el = document.getElementById(id)
		if (!el) return
		const instance = echarts.getInstanceByDom(el) || echarts.init(el, null, { renderer: 'canvas' })
		chartRef.current = instance
		emitReady(instance)

		return () => {
			chartRef.current = null
			instance.dispose()
			emitReady(null)
		}
	}, [id])

	useEffect(() => {
		const instance = chartRef.current
		if (!instance) return

		const settings = { ...defaultChartSettings }

		for (const option in chartOptions) {
			if (settings[option]) {
				settings[option] = mergeDeep(settings[option], chartOptions[option])
			} else {
				settings[option] = { ...chartOptions[option] }
			}
		}

		const { graphic, tooltip, xAxis, yAxis, dataZoom } = settings
		const finalYAxis = buildChainYAxis({
			allYAxis,
			baseYAxis: yAxis,
			chartColors: chainOverviewChartColors,
			chartsInSeries,
			isThemeDark,
			gasUsedValueSymbol: gasUsedValueSymbol ?? valueSymbol
		})

		instance.setOption(
			{
				graphic,
				tooltip,
				grid: {
					left: 12,
					bottom: hideDataZoom ? 12 : 68,
					top: 12,
					right: 12,
					outerBoundsMode: 'same',
					outerBoundsContain: 'axisLabel'
				},
				xAxis,
				yAxis: finalYAxis,
				dataZoom,
				series
			},
			{ notMerge: true, lazyUpdate: true }
		)
	}, [
		defaultChartSettings,
		series,
		chartOptions,
		allYAxis,
		chartsInSeries,
		isThemeDark,
		hideDataZoom,
		gasUsedValueSymbol,
		valueSymbol
	])

	return (
		<div
			id={id}
			className="h-[360px]"
			style={height || props.style ? { height: height ?? '360px', ...(props.style ?? {}) } : undefined}
		/>
	)
}
