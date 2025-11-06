import { useCallback, useEffect, useId, useMemo } from 'react'
import * as echarts from 'echarts/core'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { useDarkModeManager } from '~/contexts/LocalStorage'
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
	stackColors
}: IBarChartProps) {
	const id = useId()

	const [isThemeDark] = useDarkModeManager()

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
		chartData.forEach((item) => {
			Object.keys(item).forEach((key) => {
				if (key !== 'date') {
					allStacks.add(key)
				}
			})
		})

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
	}, [chartData, stackColors])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		// create instance
		const chartInstance = createInstance()

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

		chartInstance.setOption({
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
			yAxis,
			dataZoom: hideDataZoom ? [] : [...dataZoom],
			series
		})

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
		}
	}, [createInstance, defaultChartSettings, series, isThemeDark, chartOptions, valueSymbol, hideDataZoom])

	const prepareCsv = useCallback(() => {
		let rows = [['Name', 'Value']]
		for (const item of chartData ?? []) {
			rows.push([item[0], item[1]])
		}
		const Mytitle = title ? slug(title) : 'data'
		const filename = `bar-chart-${Mytitle}-${new Date().toISOString().split('T')[0]}.csv`
		return { filename, rows }
	}, [chartData, title])

	return (
		<div className="relative">
			{title || !hideDownloadButton ? (
				<div className="mb-2 flex items-center justify-end gap-2 px-2">
					{title && <h1 className="mr-auto text-lg font-bold">{title}</h1>}
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
