import { useCallback, useEffect, useMemo, useState } from 'react'
import * as echarts from 'echarts/core'
import { v4 as uuid } from 'uuid'
import { stringToColour } from '../utils'
import type { IChartProps } from '../types'
import { SelectLegendMultiple } from '../shared'
import { useDefaults } from '../useDefaults'

export default function BarChart({
	chartData,
	tokensUnique,
	moneySymbol = '$',
	title,
	color,
	legendName = 'Token'
}: IChartProps) {
	const id = useMemo(() => uuid(), [])

	const [legendOptions, setLegendOptions] = useState(tokensUnique)

	const defaultChartSettings = useDefaults({
		color,
		title,
		valueSymbol: moneySymbol
	})

	const series = useMemo(() => {
		const chartColor = color || stringToColour()

		if (!tokensUnique || tokensUnique?.length === 0) {
			const series = {
				name: '',
				type: 'bar',
				stack: 'value',
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
			const series = tokensUnique.map((token) => {
				return {
					name: token,
					type: 'bar',
					stack: 'value',
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
				tokensUnique.forEach((token) => {
					if (legendOptions.includes(token)) {
						series.find((t) => t.name === token)?.data.push([new Date(date * 1000), item[token] || 0])
					}
				})
			})

			return series
		}
	}, [chartData, color, tokensUnique, legendOptions])

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
	}, [createInstance, defaultChartSettings, series])

	return (
		<div style={{ position: 'relative' }}>
			{tokensUnique?.length > 1 && (
				<SelectLegendMultiple
					allOptions={tokensUnique}
					options={legendOptions}
					setOptions={setLegendOptions}
					title={legendOptions.length === 1 ? legendName : legendName + 's'}
				/>
			)}
			<div id={id} style={{ height: '360px', margin: 'auto 0' }}></div>
		</div>
	)
}
