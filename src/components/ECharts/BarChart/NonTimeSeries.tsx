import { useCallback, useEffect, useMemo } from 'react'
import * as echarts from 'echarts/core'
import { v4 as uuid } from 'uuid'
import type { IBarChartProps } from '../types'
import { useDefaults } from '../useDefaults'
import { useDarkModeManager } from '~/contexts/LocalStorage'

export default function NonTimeSeriesBarChart({
	chartData,
	valueSymbol = '',
	title,
	color,
	chartOptions,
	height = '360px',
	tooltipOrderBottomUp
}: IBarChartProps) {
	const id = useMemo(() => uuid(), [])

	const [isThemeDark] = useDarkModeManager()

	const defaultChartSettings = useDefaults({
		color,
		title,
		valueSymbol,
		hideLegend: true,
		tooltipOrderBottomUp,
		isThemeDark
	})

	const getColorForValue = (value: number) => {
		if (value > 0) {
			return '#269f3c'
		} else if (value === 0) {
			return '#aaa'
		} else {
			return '#942e38'
		}
	}

	const series = useMemo(() => {
		return [
			{
				data: chartData.map((item) => ({
					value: item,
					itemStyle: {
						color: getColorForValue(item[1])
					}
				})),
				type: 'bar'
			}
		]
	}, [chartData])

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
				defaultChartSettings[option] = { ...defaultChartSettings[option], ...chartOptions[option] }
			} else {
				defaultChartSettings[option] = { ...chartOptions[option] }
			}
		}

		const { graphic, titleDefaults, grid, dataZoom } = defaultChartSettings

		const xAxis = {
			type: 'category',
			boundaryGap: true,
			nameTextStyle: {
				fontFamily: 'sans-serif',
				fontSize: 14,
				fontWeight: 400
			},
			axisLine: {
				lineStyle: {
					color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
					opacity: 0.2
				}
			},
			splitLine: {
				lineStyle: {
					color: '#a1a1aa',
					opacity: 0.1
				}
			},
			axisLabel: { interval: 0, rotate: 45 }
		}

		const yAxis = {
			type: 'value',
			axisLine: {
				lineStyle: {
					color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
					opacity: 0.1
				}
			},
			boundaryGap: false,
			nameTextStyle: {
				fontFamily: 'sans-serif',
				fontSize: 14,
				fontWeight: 400,
				color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
			},
			splitLine: {
				lineStyle: {
					color: '#a1a1aa',
					opacity: 0.1
				}
			}
		}

		const tooltip = {
			trigger: 'axis',
			confine: true,
			formatter: (params) => {
				const value = params[0].value
				return `<strong>${value[0]}</strong>: ${value[1]}${valueSymbol}`
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
	}, [createInstance, defaultChartSettings, series, isThemeDark, chartOptions, valueSymbol])

	return (
		<div style={{ position: 'relative' }}>
			<div id={id} style={{ height, margin: 'auto 0' }}></div>
		</div>
	)
}
