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
	moneySymbol = '$',
	title,
	color,
	hideLegend,
	customLegendName
}: IBarChartProps) {
	const id = useMemo(() => uuid(), [])

	const stackKeys = stacks && Object.keys(stacks)

	const [legendOptions, setLegendOptions] = useState(stackKeys)

	const defaultChartSettings = useDefaults({
		color,
		title,
		valueSymbol: moneySymbol
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
					stack: stacks[stack],
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
					if (legendOptions.includes(stack)) {
						series.find((t) => t.name === stack)?.data.push([new Date(date * 1000), item[stack] || 0])
					}
				})
			})

			return series
		}
	}, [chartData, color, stacks, stackKeys, legendOptions])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		// create instance
		const chartInstance = createInstance()

		const { graphic, titleDefaults, grid, tooltip, timeAsXAxis, valueAsYAxis, dataZoom } = defaultChartSettings

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
				...timeAsXAxis
			},
			yAxis: {
				...valueAsYAxis
			},
			...((hideLegend || !customLegendName) && {
				legend: {
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
	}, [createInstance, defaultChartSettings, series, hideLegend, customLegendName, stackKeys])

	return (
		<div style={{ position: 'relative' }}>
			{stackKeys?.length > 1 && !hideLegend && customLegendName && (
				<SelectLegendMultiple
					allOptions={stackKeys}
					options={legendOptions}
					setOptions={setLegendOptions}
					title={legendOptions.length === 1 ? customLegendName : customLegendName + 's'}
				/>
			)}
			<div id={id} style={{ height: '360px', margin: 'auto 0' }}></div>
		</div>
	)
}
