import { useCallback, useEffect, useId, useMemo } from 'react'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { TreemapChart as EChartTreemap } from 'echarts/charts'
import { TooltipComponent, ToolboxComponent, DataZoomComponent, TitleComponent } from 'echarts/components'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { formattedNum } from '~/utils'

echarts.use([TitleComponent, TooltipComponent, ToolboxComponent, DataZoomComponent, EChartTreemap, CanvasRenderer])

export interface IChartProps {
	chartData: any
}

const visualMin = -100
const visualMax = 100
const visualMinBound = -40
const visualMaxBound = 40

function addColorGradientField(chartDataTree) {
	let min = Infinity
	let max = -Infinity
	for (let i = 0; i < chartDataTree.length; i++) {
		let node = chartDataTree[i]
		if (node) {
			let value = node.value
			value[2] != null && value[2] < min && (min = value[2])
			value[2] != null && value[2] > max && (max = value[2])
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

export default function TreemapChart({ chartData }: IChartProps) {
	const id = useId()

	const [isDark] = useDarkModeManager()

	const chartDataTree = useMemo(() => {
		const treeData = []

		const cData = chartData.filter((p) => p.apyPct1D !== null)

		// structure into hierarchy
		for (let project of [...new Set(cData.map((p) => p.projectName))]) {
			const projectData = cData.filter((p) => p.projectName === project)
			const projectTvl = projectData.map((p) => p.tvlUsd).reduce((a, b) => a + b, 0)

			treeData.push({
				value: [projectTvl, null, null],
				name: project,
				path: project,
				children: projectData.map((p) => ({
					value: [p.tvlUsd, parseFloat(p.apy.toFixed(2)), parseFloat(p.apyPct1D.toFixed(2))],
					name: p.symbol,
					path: `${p.projectName}/${p.symbol}`
				}))
			})
		}

		addColorGradientField(treeData)

		return treeData
	}, [chartData])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		const chartInstance = createInstance()

		const option = {
			title: {
				text: 'APY Trends - 1d Change',
				textStyle: {
					fontFamily: 'sans-serif',
					fontWeight: 600,
					color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
				}
			},
			tooltip: {
				formatter: function (info) {
					var treePathInfo = info.treePathInfo
					var treePath = []
					for (var i = 1; i < treePathInfo.length; i++) {
						treePath.push(treePathInfo[i].name)
					}
					if (treePath.length > 1) {
						return [
							'Project: ' + treePath[0] + '<br>',
							'Pool: ' + treePath[1] + '<br>',
							'TVL: ' + formattedNum(info.value[0], true) + '<br>',
							'APY: ' + info.value[1] + '%' + '<br>',
							'1d Change: ' + info.value[2] + '%'
						].join('')
					} else {
						return ['Project: ' + treePath[0]].join('')
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
					label: {
						position: 'insideTopRight',
						formatter: function (params) {
							let arr
							if (params?.data?.path?.split('/')?.length > 1) {
								arr = [
									'{name|' + params.data.path.split('/').slice(-1)[0] + '}',
									'Spot: {apy| ' + params.value[1] + '%' + '}',
									'Change {apy| ' + params.value[2] + '%' + '}'
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
					data: chartDataTree,
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
				}
			]
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
	}, [id, chartDataTree, createInstance, isDark])

	return (
		<div className="relative rounded-md p-3 bg-(--cards-bg) flex flex-col items-end">
			<div id={id} className="min-h-[800px] w-full" />
		</div>
	)
}
