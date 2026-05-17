import { TreemapChart as EChartTreemap } from 'echarts/charts'
import { GraphicComponent, ToolboxComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useEffect, useId, useRef } from 'react'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useChartResize } from '~/hooks/useChartResize'
import { useMedia } from '~/hooks/useMedia'

echarts.use([TooltipComponent, GraphicComponent, ToolboxComponent, EChartTreemap, CanvasRenderer])

interface TreeMapBuilderChartProps {
	data: Array<{
		name: string
		value: number
		itemStyle?: { color: string }
	}>
	height?: string
	onReady?: (instance: echarts.ECharts | null) => void
}

// Treemap does not clip to the series box when zoomed; outer padding + overflow:hidden preserves the inset.
const CHART_INSET_PX = 12

const formatValue = (rawValue?: number) => {
	const value = typeof rawValue === 'number' && Number.isFinite(rawValue) ? rawValue : 0
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

export default function TreeMapBuilderChart({ data, height = '450px', onReady }: TreeMapBuilderChartProps) {
	const id = useId()
	const [isDark] = useDarkModeManager()
	const isSmall = useMedia(`(max-width: 37.5rem)`)
	const chartRef = useRef<echarts.ECharts | null>(null)
	const onReadyRef = useRef(onReady)
	useEffect(() => {
		onReadyRef.current = onReady
	})

	// Stable resize listener - never re-attaches when dependencies change
	useChartResize(chartRef)

	useEffect(() => {
		const container = document.getElementById(id)
		if (!container) return

		const instance = echarts.init(container, null, { renderer: 'canvas' })
		chartRef.current = instance
		onReadyRef.current?.(instance)
		const handleTreemapClick = (params: any) => {
			if (params?.seriesType !== 'treemap') return
			const seriesModel = (instance as any).getModel?.()?.getSeriesByIndex?.(params.seriesIndex ?? 0)
			const node = seriesModel?.getData?.()?.tree?.getNodeByDataIndex?.(params.dataIndex)
			const nodeId = node?.getId?.()
			const nodePath = node
				?.getAncestors?.(true)
				?.map((ancestor: any) => ancestor?.name)
				?.filter((name: any) => typeof name === 'string' && name)
			if (typeof nodeId === 'string' && nodeId) {
				const chartWithTreemapFocus = instance as echarts.ECharts & {
					__llamaTreemapFocusNode?: { id: string; path?: string[] }
				}
				chartWithTreemapFocus.__llamaTreemapFocusNode = {
					id: nodeId,
					...(Array.isArray(nodePath) && nodePath.length > 0 ? { path: nodePath } : {})
				}
			}
		}
		const handleRestore = () => {
			delete (instance as any).__llamaTreemapFocusNode
			delete (instance as any).__llamaTreemapFocusNodeId
		}
		instance.on('click', handleTreemapClick)
		instance.on('restore', handleRestore)

		return () => {
			instance.off('click', handleTreemapClick)
			instance.off('restore', handleRestore)
			instance.dispose()
			chartRef.current = null
			onReadyRef.current?.(null)
		}
	}, [id])

	useEffect(() => {
		if (!chartRef.current || !data || data.length === 0) return

		const total = data.reduce(
			(sum, item) => sum + (typeof item.value === 'number' && Number.isFinite(item.value) ? item.value : 0),
			0
		)

		const graphic = {
			type: 'image',
			z: 100,
			style: {
				image: isDark ? '/assets/defillama-light-neutral.webp' : '/assets/defillama-dark-neutral.webp',
				height: 40,
				opacity: 0.3
			},
			left: isSmall ? '40%' : '45%',
			top: '45%'
		}

		const option = {
			graphic,
			toolbox: {
				show: false,
				feature: {
					restore: {
						title: 'Reset'
					}
				}
			},
			tooltip: {
				formatter: function (info: any) {
					const rawValue = typeof info?.value === 'number' && Number.isFinite(info.value) ? info.value : 0
					const pct = total > 0 ? ((rawValue / total) * 100).toFixed(1) : '0'
					return `<div style="font-weight:600">${info.name}</div><div>${formatValue(rawValue)} (${pct}%)</div>`
				}
			},
			series: [
				{
					type: 'treemap',
					data: data,
					sort: 'desc',
					squareRatio: 1,
					left: 0,
					right: 0,
					top: 0,
					bottom: 0,
					roam: true,
					nodeClick: 'zoomToNode',
					breadcrumb: { show: false },
					label: {
						show: true,
						position: 'insideTopLeft',
						padding: [4, 6],
						formatter: function (params: any) {
							const rawValue = typeof params?.value === 'number' && Number.isFinite(params.value) ? params.value : 0
							const pct = total > 0 ? ((rawValue / total) * 100).toFixed(1) : '0'
							return `{name|${params.name}}\n{value|${formatValue(rawValue)} (${pct}%)}`
						},
						rich: {
							name: {
								fontSize: 14,
								fontWeight: 600,
								color: '#fff',
								lineHeight: 20
							},
							value: {
								fontSize: 12,
								color: 'rgba(255,255,255,0.8)',
								lineHeight: 18
							}
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
				<p className="text-sm pro-text2">No data available for treemap</p>
			</div>
		)
	}

	return (
		<div
			className="w-full overflow-hidden"
			style={{
				height,

				padding: CHART_INSET_PX
			}}
		>
			<div id={id} className="h-full w-full" />
		</div>
	)
}
