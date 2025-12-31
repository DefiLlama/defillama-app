import { useEffect, useId, useRef } from 'react'
import { TreemapChart as EChartTreemap } from 'echarts/charts'
import { GraphicComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useMedia } from '~/hooks/useMedia'

echarts.use([TooltipComponent, GraphicComponent, EChartTreemap, CanvasRenderer])

interface TreeMapBuilderChartProps {
	data: Array<{
		name: string
		value: number
		itemStyle?: { color: string }
	}>
	height?: string
	onReady?: (instance: echarts.ECharts | null) => void
}

const formatValue = (value: number) => {
	const absValue = Math.abs(value)
	if (absValue >= 1e9) {
		return '$' + (value / 1e9).toFixed(1) + 'B'
	} else if (absValue >= 1e6) {
		return '$' + (value / 1e6).toFixed(1) + 'M'
	} else if (absValue >= 1e3) {
		return '$' + (value / 1e3).toFixed(0) + 'K'
	}
	return '$' + value.toFixed(0)
}

const NAME_LINE_HEIGHT = 20
const VALUE_LINE_HEIGHT = 18

export default function TreeMapBuilderChart({ data, height = '450px', onReady }: TreeMapBuilderChartProps) {
	const id = useId()
	const [isDark] = useDarkModeManager()
	const isSmall = useMedia(`(max-width: 37.5rem)`)
	const chartRef = useRef<echarts.ECharts | null>(null)
	const onReadyRef = useRef(onReady)
	onReadyRef.current = onReady

	useEffect(() => {
		const container = document.getElementById(id)
		if (!container) return

		const chartInstance = echarts.init(container)
		chartRef.current = chartInstance
		onReadyRef.current?.(chartInstance)

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
			chartRef.current = null
			onReadyRef.current?.(null)
		}
	}, [id])

	useEffect(() => {
		if (!chartRef.current || !data || data.length === 0) return

		const total = data.reduce((sum, item) => sum + item.value, 0)

		const graphic = {
			type: 'image',
			z: 100,
			style: {
				image: isDark ? '/icons/defillama-light-neutral.webp' : '/icons/defillama-dark-neutral.webp',
				height: 40,
				opacity: 0.3
			},
			left: isSmall ? '40%' : '45%',
			top: '45%'
		}

		const option = {
			graphic,
			tooltip: {
				formatter: function (info: any) {
					const pct = total > 0 ? ((info.value / total) * 100).toFixed(1) : '0'
					return `<div style="font-weight:600">${info.name}</div><div>${formatValue(info.value)} (${pct}%)</div>`
				}
			},
			series: [
				{
					type: 'treemap',
					data: data,
					left: 0,
					right: 0,
					top: 0,
					bottom: 0,
					width: '100%',
					height: '100%',
					roam: false,
					nodeClick: false,
					breadcrumb: { show: false },
					label: {
						show: true,
						position: 'inside',
						distance: 0,
						padding: 0,
						align: 'center',
						verticalAlign: 'middle',
						formatter: function (params: any) {
							const pct = total > 0 ? ((params.value / total) * 100).toFixed(1) : '0'
							return `{name|${params.name}}\n{value|${formatValue(params.value)} (${pct}%)}`
						},
						rich: {
							name: {
								fontSize: 14,
								fontWeight: 600,
								color: '#fff',
								lineHeight: NAME_LINE_HEIGHT,
								align: 'center'
							},
							value: {
								fontSize: 12,
								color: 'rgba(255,255,255,0.8)',
								lineHeight: VALUE_LINE_HEIGHT,
								align: 'center'
							}
						}
					},
					labelLayout: function (params: any) {
						const rect = params.rect
						if (!rect?.height) return

						const textBlockHeight = NAME_LINE_HEIGHT + VALUE_LINE_HEIGHT
						const dy = Math.max((rect.height - textBlockHeight) / 2, 0)

						return {
							dy
						}
					},
					upperLabel: {
						show: false
					},
					itemStyle: {
						borderColor: isDark ? '#1a1a1a' : '#fff',
						borderWidth: 2,
						gapWidth: 2,
						opacity: 0.9
					},
					levels: [
						{
							itemStyle: {
								borderColor: isDark ? '#333' : '#ddd',
								borderWidth: 0,
								gapWidth: 2
							}
						}
					]
				}
			]
		}

		chartRef.current.setOption(option, true)
	}, [data, isDark, isSmall])

	if (!data || data.length === 0) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="pro-text2 text-sm">No data available for treemap</p>
			</div>
		)
	}

	return <div id={id} style={{ width: '100%', height }} />
}
