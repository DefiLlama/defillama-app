import { useCallback, useEffect, useMemo } from 'react'
import * as echarts from 'echarts/core'
import { LegendComponent } from 'echarts/components'
import { v4 as uuid } from 'uuid'
import type { IStackedChartProps } from '../types'
import { useDefaults } from '../useDefaults'

echarts.use([LegendComponent])

export default function BarChart({ chartData, stacks, moneySymbol = '$', title, color }: IStackedChartProps) {
	const id = useMemo(() => uuid(), [])

	const defaultChartSettings = useDefaults({
		color,
		title,
		valueSymbol: moneySymbol
	})

	const { xAxisDates, series } = useMemo(() => {
		const xAxisDates = []
		const series = stacks.map((token) => {
			return {
				name: token,
				type: 'bar',
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

		chartData.forEach(({ date, ...item }, i) => {
			xAxisDates.push(i)

			stacks.forEach((token) => {
				series.find((t) => t.name === token)?.data.push(item[token] || null)
			})
		})

		return { xAxisDates, series }
	}, [chartData, color, stacks])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		// create instance
		const chartInstance = createInstance()

		const { graphic, titleDefaults, grid, timeAsXAxis, valueAsYAxis, dataZoom } = defaultChartSettings

		chartInstance.setOption({
			graphic: {
				...graphic
			},
			tooltip: {
				trigger: 'axis'
			},
			title: {
				...titleDefaults
			},
			grid: {
				...grid
			},
			xAxis: [
				{
					...timeAsXAxis,
					type: 'category',
					data: xAxisDates
				}
			],
			yAxis: [
				{
					...valueAsYAxis
				}
			],
			legend: {
				data: stacks
			},
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
	}, [createInstance, defaultChartSettings, series, xAxisDates, stacks])

	return (
		<div style={{ position: 'relative' }}>
			<div id={id} style={{ height: '360px', margin: 'auto 0' }}></div>
		</div>
	)
}
