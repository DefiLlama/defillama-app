import { useCallback, useEffect, useId, useMemo } from 'react'
import * as echarts from 'echarts/core'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import type { ILineAndBarChartProps } from '../types'
import { useDefaults } from '../useDefaults'
import { mergeDeep } from '../utils'

export default function LineAndBarChart({
	charts,
	chartOptions,
	height,
	hallmarks,
	expandTo100Percent,
	valueSymbol,
	groupBy,
	alwaysShowTooltip,
	solidChartAreaStyle = false,
	hideDataZoom,
	onReady
}: ILineAndBarChartProps) {
	const id = useId()

	const [isThemeDark] = useDarkModeManager()

	const defaultChartSettings = useDefaults({
		isThemeDark,
		valueSymbol,
		groupBy:
			typeof groupBy === 'string' && ['daily', 'weekly', 'monthly'].includes(groupBy)
				? (groupBy as 'daily' | 'weekly' | 'monthly')
				: 'daily',
		alwaysShowTooltip
	})

	const series = useMemo(() => {
		const series = []

		for (const stack in charts) {
			series.push({
				name: charts[stack].name,
				type: charts[stack].type,
				stack: expandTo100Percent ? 'A' : charts[stack].stack,
				symbol: 'none',
				large: true,
				emphasis: {
					focus: 'series',
					shadowBlur: 10
				},
				itemStyle: {
					color: charts[stack].color ?? (isThemeDark ? '#000000' : '#ffffff')
				},
				areaStyle: expandTo100Percent
					? {}
					: solidChartAreaStyle
						? {
								color: charts[stack].color ?? (isThemeDark ? '#000000' : '#ffffff'),
								opacity: 0.7
							}
						: {
								color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
									{
										offset: 0,
										color: charts[stack].color ?? (isThemeDark ? '#000000' : '#ffffff')
									},
									{
										offset: 1,
										color: isThemeDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'
									}
								])
							},
				lineStyle: expandTo100Percent
					? {
							width: 0
						}
					: {},
				data: charts[stack].data
			})
		}
		if (hallmarks) {
			series[0].markLine = {
				data: hallmarks.map(([date, event], index) => [
					{
						name: event,
						xAxis: +date * 1e3,
						yAxis: 0,
						label: {
							color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
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
		return series
	}, [charts, isThemeDark, expandTo100Percent, hallmarks, solidChartAreaStyle])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		// create instance
		const chartInstance = createInstance()

		if (onReady) {
			onReady(chartInstance)
		}

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

		const { graphic, titleDefaults, tooltip, xAxis, yAxis, dataZoom } = defaultChartSettings

		chartInstance.setOption({
			graphic,
			tooltip,
			title: titleDefaults,
			grid: {
				left: 12,
				bottom: hideDataZoom ? 12 : 68,
				top: 12,
				right: 12,
				outerBoundsMode: 'same',
				outerBoundsContain: 'axisLabel'
			},
			xAxis,
			yAxis: {
				...yAxis,
				...(expandTo100Percent ? { max: 100, min: 0 } : {})
			},
			...(!hideDataZoom ? { dataZoom } : {}),
			series
		})

		if (alwaysShowTooltip) {
			chartInstance.dispatchAction({
				type: 'showTip',
				// index of series, which is optional when trigger of tooltip is axis
				seriesIndex: 0,
				// data index; could assign by name attribute when not defined
				dataIndex: series[0].data.length - 1,
				// Position of tooltip. Only works in this action.
				// Use tooltip.position in option by default.
				position: [60, 0]
			})

			chartInstance.on('globalout', () => {
				chartInstance.dispatchAction({
					type: 'showTip',
					// index of series, which is optional when trigger of tooltip is axis
					seriesIndex: 0,
					// data index; could assign by name attribute when not defined
					dataIndex: series[0].data.length - 1,
					// Position of tooltip. Only works in this action.
					// Use tooltip.position in option by default.
					position: [60, 0]
				})
			})
		}

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
		}
	}, [createInstance, defaultChartSettings, series, chartOptions, expandTo100Percent, alwaysShowTooltip, hideDataZoom])

	return <div id={id} className={height ? '' : 'min-h-[360px]'} style={height ? { height } : undefined}></div>
}
