import { useCallback, useEffect, useId, useMemo } from 'react'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart as EPieChart } from 'echarts/charts'
import { GridComponent, TitleComponent, TooltipComponent, GraphicComponent, LegendComponent } from 'echarts/components'
import type { IPieChartProps } from '../types'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { formattedNum } from '~/utils'
import { useMedia } from '~/hooks/useMedia'
import logoLight from '~/public/defillama-press-kit/defi/PNG/defillama-light-neutral.png'
import logoDark from '~/public/defillama-press-kit/defi/PNG/defillama-dark-neutral.png'

echarts.use([
	CanvasRenderer,
	EPieChart,
	TooltipComponent,
	TitleComponent,
	GridComponent,
	GraphicComponent,
	LegendComponent
])

export default function PieChart({
	height,
	stackColors,
	chartData,
	title,
	usdFormat = true,
	radius = null,
	showLegend = false,
	formatTooltip = null,
	customLabel,
	legendPosition,
	legendTextStyle,
	toRight = 0,
	...props
}: IPieChartProps) {
	const id = useId()
	const [isDark] = useDarkModeManager()
	const isSmall = useMedia(`(max-width: 37.5rem)`)

	const graphic = {
		type: 'image',
		z: 999,
		style: {
			image: isDark ? logoLight.src : logoDark.src,
			height: 40,
			opacity: 0.3
		},
		left: isSmall ? '35%' : '40%',
		top: '160px'
	}

	const series = useMemo(() => {
		const series: Record<string, any> = {
			name: '',
			type: 'pie',
			label: {
				fontFamily: 'sans-serif',
				color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
				formatter: (x) => {
					return `${x.name}: (${x.percent}%)`
				},
				show: showLegend ? false : true
			},
			tooltip: {
				formatter: formatTooltip
			},
			emphasis: {
				itemStyle: {
					shadowBlur: 10,
					shadowOffsetX: 0,
					shadowColor: 'rgba(0, 0, 0, 0.5)'
				}
			},

			data: chartData.map((item, idx) => ({
				name: item.name,
				value: item.value,
				itemStyle: {
					color: stackColors?.[item.name] ?? undefined
				}
			}))
		}
		if (radius) {
			series.radius = radius
		}

		return series
	}, [title, isDark, showLegend, formatTooltip, chartData, radius, stackColors])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		// create instance
		const chartInstance = createInstance()

		chartInstance.setOption({
			graphic,
			tooltip: {
				trigger: 'item',
				confine: true,
				valueFormatter: (value) => (usdFormat ? formattedNum(value, true) : formattedNum(value))
			},
			grid: {
				left: 0,
				containLabel: true,
				bottom: 0,
				top: 0,
				right: 0
			},
			legend: {
				show: showLegend,
				left: 'right', // Default
				orient: 'vertical', // Default
				...legendPosition, // Apply overrides from prop
				data: chartData.map((item) => item.name),
				icon: 'circle',
				itemWidth: 10,
				itemHeight: 10,
				itemGap: 10,
				textStyle: {
					color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)', // Default color
					...legendTextStyle // Apply overrides from prop
				},
				formatter: function (name) {
					const maxLength = 18 // Keep existing formatter
					return name.length > maxLength ? name.slice(0, maxLength) + '...' : name
				}
			},
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
	}, [createInstance, series, isDark, title, usdFormat, showLegend, chartData])

	return (
		<div className="relative" {...props}>
			{title && <h1 className="text-lg mr-auto font-bold px-2">{title}</h1>}
			<div id={id} className="min-h-[360px] my-auto mx-0" style={height ? { height } : undefined}></div>
		</div>
	)
}
