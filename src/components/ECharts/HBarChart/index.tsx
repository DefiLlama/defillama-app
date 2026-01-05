import { useEffect, useId } from 'react'
import * as echarts from 'echarts/core'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { formatTooltipValue } from '../useDefaults'

interface IHBarChartProps {
	categories: string[]
	values: number[]
	title?: string
	valueSymbol?: string
	height?: string
	color?: string
}

export default function HBarChart({
	categories,
	values,
	title,
	valueSymbol = '$',
	height = '360px',
	color = '#1f77b4'
}: IHBarChartProps) {
	const id = useId()
	const [isThemeDark] = useDarkModeManager()

	useEffect(() => {
		const chartDom = document.getElementById(id)
		if (!chartDom) return

		let chartInstance = echarts.getInstanceByDom(chartDom)
		if (!chartInstance) {
			chartInstance = echarts.init(chartDom)
		}

		const textColor = isThemeDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)'

		chartInstance.setOption({
			grid: {
				left: 120,
				right: 20,
				top: 20,
				bottom: 40
			},
			xAxis: {
				type: 'value',
				axisLabel: {
					color: textColor,
					formatter: (value: number) => formatTooltipValue(value, valueSymbol)
				},
				splitLine: {
					lineStyle: {
						color: isThemeDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
					}
				}
			},
			yAxis: {
				type: 'category',
				data: categories,
				inverse: true,
				axisLabel: {
					color: textColor,
					width: 100,
					overflow: 'truncate'
				}
			},
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'shadow' },
				formatter: (params: any) => {
					if (!Array.isArray(params) || !params[0]) return ''
					const { name, value } = params[0]
					return `<div style="font-weight: 600; margin-bottom: 4px;">${name}</div><div>${formatTooltipValue(value, valueSymbol)}</div>`
				}
			},
			series: [
				{
					type: 'bar',
					data: values,
					itemStyle: { color },
					emphasis: { focus: 'series' }
				}
			]
		})

		const resize = () => chartInstance?.resize()
		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance?.dispose()
		}
	}, [id, categories, values, valueSymbol, color, isThemeDark])

	return <div id={id} style={{ height }} />
}
