import * as echarts from 'echarts/core'
import { useEffect, useId, useMemo, useRef } from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useChartResize } from '~/hooks/useChartResize'
import { slug } from '~/utils'
import type { IBarChartProps } from '../types'
import { useDefaults } from '../useDefaults'
import { mergeDeep } from '../utils'

export default function NonTimeSeriesBarChart({
	chartData,
	valueSymbol = '',
	title,
	color,
	chartOptions,
	height,
	tooltipOrderBottomUp,
	hideDataZoom = false,
	hideDownloadButton = false,
	containerClassName,
	customComponents,
	stackColors: _stackColors
}: IBarChartProps) {
	const id = useId()

	const [isThemeDark] = useDarkModeManager()
	const chartRef = useRef<echarts.ECharts | null>(null)

	// Stable resize listener - never re-attaches when dependencies change
	useChartResize(chartRef)

	const defaultChartSettings = useDefaults({
		color,
		title,
		valueSymbol,
		hideLegend: true,
		tooltipOrderBottomUp,
		isThemeDark,
		hideOthersInTooltip: true,
		tooltipValuesRelative: true
	})

	const series = useMemo(() => {
		const series = []

		const allStacks = new Set<string>()
		for (const item of chartData) {
			for (const key in item) {
				if (key !== 'date') {
					allStacks.add(key)
				}
			}
		}

		for (const stack of allStacks) {
			series.push({
				name: stack,
				data: chartData.map((item) => [item.date * 1e3, item[stack] ?? null]),
				type: 'bar',
				stack: 'chain',
				symbol: 'none',
				large: true,
				emphasis: {
					focus: 'series',
					shadowBlur: 10
				},
				itemStyle: {
					color: null
				},
				areaStyle: {
					color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
						{
							offset: 0,
							color: null
						},
						{
							offset: 1,
							color: isThemeDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'
						}
					])
				}
			})
		}

		return series
	}, [chartData, isThemeDark])

	useEffect(() => {
		// create instance
		const el = document.getElementById(id)
		if (!el) return
		const instance = echarts.getInstanceByDom(el) || echarts.init(el)
		chartRef.current = instance

		// override default chart settings
		for (const option in chartOptions) {
			if (option === 'overrides') {
				// update tooltip formatter
				defaultChartSettings['tooltip'] = { ...defaultChartSettings['inflowsTooltip'] }
			} else if (defaultChartSettings[option]) {
				defaultChartSettings[option] = mergeDeep(defaultChartSettings[option], chartOptions[option])
			} else {
				defaultChartSettings[option] = { ...chartOptions[option] }
			}
		}

		const { graphic, tooltip, xAxis, yAxis, dataZoom } = defaultChartSettings

		const shouldHideDataZoom = series.every((s) => s.data.length < 2) || hideDataZoom

		instance.setOption({
			graphic,
			tooltip,
			grid: {
				left: 12,
				bottom: shouldHideDataZoom ? 12 : 68,
				top: 12,
				right: 12,
				outerBoundsMode: 'same',
				outerBoundsContain: 'axisLabel'
			},
			xAxis,
			yAxis,
			dataZoom: shouldHideDataZoom ? [] : [...dataZoom],
			series
		})

		return () => {
			chartRef.current = null
			instance.dispose()
		}
	}, [id, defaultChartSettings, series, isThemeDark, chartOptions, valueSymbol, hideDataZoom])

	const prepareCsv = () => {
		let rows = [['Name', 'Value']]
		for (const item of chartData ?? []) {
			rows.push([item[0], item[1]])
		}
		const Mytitle = title ? slug(title) : 'data'
		const filename = `bar-chart-${Mytitle}-${new Date().toISOString().split('T')[0]}.csv`
		return { filename, rows }
	}

	return (
		<div className="relative">
			{title || !hideDownloadButton ? (
				<div className="mb-2 flex flex-wrap items-center justify-end gap-2 px-2">
					{title && <h1 className="mr-auto text-base font-semibold">{title}</h1>}
					{customComponents ?? null}
					{hideDownloadButton ? null : <CSVDownloadButton prepareCsv={prepareCsv} smol />}
				</div>
			) : null}
			<div
				id={id}
				className={containerClassName ? containerClassName : 'h-[360px]'}
				style={height ? { height } : undefined}
			></div>
		</div>
	)
}
