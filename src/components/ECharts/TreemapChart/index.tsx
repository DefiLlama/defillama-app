import { TreemapChart as EChartTreemap } from 'echarts/charts'
import { DataZoomComponent, TitleComponent, ToolboxComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useEffect, useId, useMemo, useRef } from 'react'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useChartResize } from '~/hooks/useChartResize'
import { formattedNum } from '~/utils'

echarts.use([TitleComponent, TooltipComponent, ToolboxComponent, DataZoomComponent, EChartTreemap, CanvasRenderer])

type TreemapVariant = 'yields' | 'narrative'

export interface IChartProps {
	treeData: any[]
	variant?: TreemapVariant
	height?: string
}

const visualMin = -100
const visualMax = 100
const visualMinBound = -40
const visualMaxBound = 40

function cloneTreeData(nodes: any[]): any[] {
	return (nodes ?? []).map((node) => ({
		...node,
		value: Array.isArray(node?.value) ? [...node.value] : node?.value,
		children: node?.children ? cloneTreeData(node.children) : node?.children
	}))
}

function addColorGradientField(chartDataTree) {
	let min = Infinity
	let max = -Infinity
	for (let i = 0; i < chartDataTree.length; i++) {
		let node = chartDataTree[i]
		if (node) {
			let value = node.value
			if (value[2] != null && value[2] < min) {
				min = value[2]
			}
			if (value[2] != null && value[2] > max) {
				max = value[2]
			}
		}
	}
	for (let i = 0; i < chartDataTree.length; i++) {
		let node = chartDataTree[i]
		if (node) {
			let value = node.value
			// Scale value for visual effect
			if (value[2] != null && value[2] > 0) {
				value[3] = echarts.number.linearMap(value[2], [0, max], [visualMaxBound, visualMax], true)
			} else if (value[2] != null && value[2] < 0) {
				value[3] = echarts.number.linearMap(value[2], [min, 0], [visualMin, visualMinBound], true)
			} else {
				value[3] = 0
			}

			if (!isFinite(value[3])) {
				value[3] = 0
			}
			if (node.children) {
				addColorGradientField(node.children)
			}
		}
	}
}

export default function TreemapChart({ treeData, variant = 'yields', height }: IChartProps) {
	const id = useId()

	const [isDark] = useDarkModeManager()
	const chartRef = useRef<echarts.ECharts | null>(null)

	// Stable resize listener - never re-attaches when dependencies change
	useChartResize(chartRef)

	const chartDataTree = useMemo(() => {
		const cloned = cloneTreeData(treeData ?? [])
		addColorGradientField(cloned)
		return cloned
	}, [treeData])

	useEffect(() => {
		const el = document.getElementById(id)
		if (!el) return
		const instance = echarts.getInstanceByDom(el) || echarts.init(el)
		chartRef.current = instance

		const option = {
			title:
				variant === 'narrative'
					? {
							textStyle: {
								fontFamily: 'sans-serif',
								fontWeight: 600,
								color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
							}
						}
					: {
							text: 'APY Trends - 1d Change',
							textStyle: {
								fontFamily: 'sans-serif',
								fontWeight: 600,
								color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
							}
						},
			tooltip: {
				formatter: function (info) {
					let treePathInfo = info.treePathInfo
					let treePath = []
					for (let i = 1; i < treePathInfo.length; i++) {
						treePath.push(treePathInfo[i].name)
					}

					if (variant === 'narrative') {
						if (treePath.length > 1) {
							return [
								`${treePath[1]}<br>`,
								`Return: ${info.value[1]}%<br>`,
								`Market Cap: ${formattedNum(info.value[0], true)}<br>`
							].join('')
						} else {
							return null
						}
					}

					if (treePath.length > 1) {
						return [
							`Project: ${treePath[0]}<br>`,
							`Pool: ${treePath[1]}<br>`,
							`TVL: ${formattedNum(info.value[0], true)}<br>`,
							`APY: ${info.value[1]}%<br>`,
							`1d Change: ${info.value[2]}%`
						].join('')
					} else {
						return `Project: ${treePath[0]}`
					}
				}
			},
			toolbox: {
				feature: {
					restore: {}
				}
			},
			series: [
				{
					name: 'All',
					type: 'treemap',
					visualMin: visualMin,
					visualMax: visualMax,
					visualDimension: 3,
					...(variant === 'narrative'
						? {
								roam: false,
								nodeClick: false,
								breadcrumb: { show: false }
							}
						: {
								breadcrumb: {
									itemStyle: {
										color: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.4)'
									},
									textStyle: {
										fontFamily: 'sans-serif',
										fontWeight: 400,
										color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
									}
								}
							}),
					label: {
						position: 'insideTopRight',
						formatter: function (params) {
							let arr
							if (params?.data?.path?.split('/')?.length > 1) {
								arr =
									variant === 'narrative'
										? [
												`{name|${params.data.path.split('/').slice(-1)[0]}}`,
												`Return: {apy| ${params.value[1]}%}`,
												`Market Cap: {mcap| ${formattedNum(params.value[0], true)}}`
											]
										: [
												`{name|${params.data.path.split('/').slice(-1)[0]}}`,
												`Spot: {apy| ${params.value[1]}%}`,
												`Change {apy| ${params.value[2]}%}`
											]
							} else {
								arr = [params.name]
							}
							return arr.join('\n')
						},
						rich: {
							name: {
								fontSize: 15,
								color: '#fff',
								lineHeight: 20
							},
							apy: {
								fontSize: 13,
								color: '#fff',
								lineHeight: 20
							}
						}
					},
					upperLabel: {
						show: true,
						height: 20,
						color: '#fff'
					},
					itemStyle: {
						borderColor: '#fff'
					},
					levels: [
						{
							itemStyle: {
								borderColor: '#777',
								borderWidth: 0,
								gapWidth: 1
							},
							upperLabel: {
								show: false
							}
						},
						{
							color: ['#942e38', '#aaa', '#269f3c'],
							colorMappingBy: 'value',
							itemStyle: {
								borderColor: '#555',
								borderWidth: 5,
								gapWidth: 1
							},
							emphasis: {
								itemStyle: {
									borderColor: '#ddd'
								}
							}
						},
						{
							colorSaturation: [0, 1],
							itemStyle: {
								borderWidth: 5,
								gapWidth: 1,
								borderColorSaturation: 0.6
							}
						}
					],
					data: chartDataTree
				}
			]
		}
		instance.setOption(option)

		return () => {
			chartRef.current = null
			instance.dispose()
		}
	}, [id, chartDataTree, isDark, variant])

	useEffect(() => {
		const instance = chartRef.current
		if (!instance) return

		// Container height changes don't automatically trigger echarts resize.
		const raf = requestAnimationFrame(() => {
			instance.resize()
		})
		return () => cancelAnimationFrame(raf)
	}, [height])

	const resolvedHeight = height ?? (variant === 'narrative' ? '533px' : '800px')

	if (variant === 'narrative') {
		return <div id={id} className="my-auto w-full" style={{ height: resolvedHeight }} />
	}

	return (
		<div className="relative flex flex-col items-end rounded-md bg-(--cards-bg) p-3">
			<div id={id} className="w-full" style={{ height: resolvedHeight }} />
		</div>
	)
}
