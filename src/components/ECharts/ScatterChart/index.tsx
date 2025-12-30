import { useCallback, useEffect, useId } from 'react'
import { ScatterChart as EChartScatter } from 'echarts/charts'
import {
	AxisPointerComponent,
	BrushComponent,
	DataZoomComponent,
	GraphicComponent,
	GridComponent,
	LegendComponent,
	TitleComponent,
	ToolboxComponent,
	TooltipComponent
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { formattedNum } from '~/utils'
import type { IScatterChartProps } from '../types'

echarts.use([
	CanvasRenderer,
	EChartScatter,
	TooltipComponent,
	ToolboxComponent,
	TitleComponent,
	GridComponent,
	GraphicComponent,
	AxisPointerComponent,
	BrushComponent,
	LegendComponent,
	DataZoomComponent
])

export default function ScatterChart({
	chartData,
	title,
	xAxisLabel,
	yAxisLabel,
	valueSymbol = '',
	height = '600px',
	tooltipFormatter
}: IScatterChartProps) {
	const id = useId()

	const [isDark] = useDarkModeManager()

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		const chartInstance = createInstance()

		let series = []
		const isYieldData = chartData.length > 0 && chartData[0].projectName !== undefined

		if (isYieldData) {
			const projectNames = [...new Set(chartData.map((p) => p.projectName))]
			for (const project of projectNames) {
				series.push({
					name: project,
					type: 'scatter',
					symbols: 5,
					large: true,
					emphasis: {
						focus: 'series'
					},
					data: chartData
						.filter((p) => p.projectName === project)
						.map((p) => [p.sigma, p.mu, p.count, p.symbol, p.pool, p.tvlUsd, p.apy, p.chain])
				})
			}
		} else {
			series = [
				{
					name: title || 'Data',
					type: 'scatter',
					symbolSize: 8,
					emphasis: {
						focus: 'series'
					},
					data: chartData
				}
			]
		}

		const yieldTooltipFormatter = (params) => {
			if (params.value.length > 1) {
				return (
					'Symbol: ' +
					params.value[3] +
					'<br/>' +
					'Pool: ' +
					params.value[4] +
					'<br/>' +
					'TVL: ' +
					formattedNum(params.value[5], true) +
					'<br/>' +
					'APY Spot: ' +
					params.value[6].toFixed(2) +
					'%' +
					'<br/>' +
					'Chain: ' +
					params.value[7] +
					'<br/>' +
					'Project: ' +
					params.seriesName +
					'<br/>' +
					'APY Geometric Average: ' +
					params.value[1].toFixed(2) +
					'%' +
					'<br/>' +
					'APY Standard Deviation: ' +
					params.value[0].toFixed(2) +
					'%' +
					'<br/>' +
					'Nb of collected daily datapoints: ' +
					params.value[2]
				)
			} else {
				return params.seriesName + ' :<br/>' + params.name + ' : ' + params.value.toFixed(5) + 'mean '
			}
		}

		const genericTooltipFormatter = (params) => {
			if (params.value && params.value.length >= 2) {
				const xValue = params.value[0]
				const yValue = params.value[1]
				const entityName = params.value[2]
				const formatValue = (val) => {
					if (valueSymbol === '$') return formattedNum(val, true)
					if (valueSymbol === '%') return val.toFixed(2) + '%'
					return formattedNum(val)
				}
				let tooltip = ''
				if (entityName) {
					tooltip += `<strong>${entityName}</strong><br/>`
				}
				tooltip += `${xAxisLabel || 'X'}: ${formatValue(xValue)}<br/>`
				tooltip += `${yAxisLabel || 'Y'}: ${formatValue(yValue)}`
				return tooltip
			}
			return ''
		}

		const effectiveTooltipFormatter =
			tooltipFormatter || (isYieldData ? yieldTooltipFormatter : genericTooltipFormatter)

		const option = {
			title: {
				text: title || 'APY Average vs Volatility',
				textStyle: {
					fontFamily: 'sans-serif',
					fontWeight: 600,
					color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
				}
			},
			grid: {
				right: 12,
				bottom: 12,
				left: 12,
				outerBoundsMode: 'same'
			},
			tooltip: {
				showDelay: 0,
				confine: true,
				formatter: effectiveTooltipFormatter,
				axisPointer: {
					show: true,
					type: 'cross',
					lineStyle: {
						type: 'dashed',
						width: 1
					}
				}
			},
			toolbox: {
				feature: {
					dataZoom: {},
					restore: {}
				}
			},
			xAxis: [
				{
					type: 'value',
					scale: true,
					name: xAxisLabel || 'APY Standard Deviation',
					nameLocation: 'middle',
					nameTextStyle: {
						fontFamily: 'sans-serif',
						fontSize: 14,
						fontWeight: 500
					},
					axisLabel: {
						formatter: '{value}',
						color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
						inside: true
					},
					splitLine: {
						lineStyle: {
							color: '#a1a1aa',
							opacity: 0.1
						}
					}
				}
			],
			yAxis: [
				{
					type: 'value',
					scale: true,
					name: yAxisLabel || 'APY Geometric Average',
					nameLocation: 'middle',
					nameTextStyle: {
						fontFamily: 'sans-serif',
						fontSize: 14,
						fontWeight: 500
					},
					axisLabel: {
						formatter: '{value}',
						color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
						inside: true
					},
					splitLine: {
						lineStyle: {
							color: '#a1a1aa',
							opacity: 0.1
						}
					}
				}
			],
			dataZoom: [
				{
					type: 'inside',
					start: 0,
					end: 100,
					filterMode: 'none'
				}
			],
			series: series
		}

		chartInstance.setOption(option)

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
		}
	}, [id, chartData, createInstance, isDark, tooltipFormatter, xAxisLabel, yAxisLabel, valueSymbol, title])

	return (
		<div>
			<div id={id} className="h-[360px]" style={height ? { height } : undefined} />
		</div>
	)
}
