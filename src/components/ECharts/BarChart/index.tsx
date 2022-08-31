import { useCallback, useEffect, useMemo, useState } from 'react'
import * as echarts from 'echarts/core'
import { v4 as uuid } from 'uuid'
import { stringToColour } from '../utils'
import type { IBarChartProps } from '../types'
import { SelectLegendMultiple } from '../shared'
import { useDefaults } from '../useDefaults'

export default function BarChart({
	chartData,
	stacks,
	valueSymbol = '',
	title,
	color,
	hideDefaultLegend,
	customLegendName,
	customLegendOptions,
	chartOptions,
	height = '360px',
	barWidths
}: IBarChartProps) {
	const id = useMemo(() => uuid(), [])

	const defaultStacks = useMemo(() => {
		const values = stacks || {}

		if ((!values || Object.keys(values).length === 0) && customLegendOptions) {
			customLegendOptions.forEach((name) => {
				values[name] = 'stackA'
			})
		}

		return values
	}, [stacks, customLegendOptions])

	const stackKeys = Object.keys(defaultStacks)

	const [legendOptions, setLegendOptions] = useState(customLegendOptions)

	const defaultChartSettings = useDefaults({
		color,
		title,
		valueSymbol
	})

	const series = useMemo(() => {
		const chartColor = color || stringToColour()

		if (!stackKeys || stackKeys?.length === 0) {
			const series = {
				name: '',
				type: 'bar',
				stack: 'stackA',
				emphasis: {
					focus: 'series',
					shadowBlur: 10
				},
				itemStyle: {
					color: chartColor
				},
				data: []
			}

			chartData.forEach(([date, value]) => {
				series.data.push([new Date(date * 1000), value])
			})

			return series
		} else {
			const series = stackKeys.map((stack) => {
				return {
					name: stack,
					type: 'bar',
					stack: defaultStacks[stack],
					...(barWidths?.[defaultStacks[stack]] && { barMaxWidth: barWidths[defaultStacks[stack]] }),
					emphasis: {
						focus: 'series',
						shadowBlur: 10
					},
					itemStyle: {
						color
					},
					data: []
				}
			})

			chartData.forEach(({ date, ...item }) => {
				stackKeys.forEach((stack) => {
					if (legendOptions && customLegendName ? legendOptions.includes(stack) : true) {
						series.find((t) => t.name === stack)?.data.push([new Date(date * 1000), item[stack] || 0])
					}
				})
			})

			return series
		}
	}, [barWidths, chartData, color, customLegendName, defaultStacks, legendOptions, stackKeys])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		// create instance
		const chartInstance = createInstance()

		const { graphic, titleDefaults, grid, tooltip, xAxis, yAxis, legend, dataZoom } = defaultChartSettings

		for (const option in chartOptions) {
			if (defaultChartSettings[option]) {
				defaultChartSettings[option] = { ...defaultChartSettings[option], ...chartOptions[option] }
			} else {
				defaultChartSettings[option] = { ...chartOptions[option] }
			}
		}

		chartInstance.setOption({
			graphic: {
				...graphic
			},
			tooltip: {
				...tooltip
			},
			title: {
				...titleDefaults
			},
			grid: {
				...grid
			},
			xAxis: {
				...xAxis
			},
			yAxis: {
				...yAxis
			},
			...(!hideDefaultLegend && {
				legend: {
					...legend,
					data: stackKeys
				}
			}),
			dataZoom: [...dataZoom],
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
	}, [createInstance, defaultChartSettings, series, hideDefaultLegend, stackKeys, chartOptions])

	return (
		<div style={{ position: 'relative' }}>
			{customLegendName && customLegendOptions?.length > 1 && (
				<SelectLegendMultiple
					allOptions={customLegendOptions}
					options={legendOptions}
					setOptions={setLegendOptions}
					title={legendOptions.length === 1 ? customLegendName : customLegendName + 's'}
				/>
			)}
			<div id={id} style={{ height, margin: 'auto 0' }}></div>
		</div>
	)
}
