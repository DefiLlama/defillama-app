import { useCallback, useEffect, useMemo } from 'react'
import { v4 as uuid } from 'uuid'
import styled from 'styled-components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BoxplotChart as EChartBoxPlot } from 'echarts/charts'
import { UniversalTransition } from 'echarts/features'
import { aggregate } from 'echarts-simple-transform'
import {
	TooltipComponent,
	ToolboxComponent,
	TitleComponent,
	GridComponent,
	DataZoomComponent,
	LegendComponent,
	DatasetComponent,
	TransformComponent
} from 'echarts/components'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { YieldsChartWrapper } from '../shared'

echarts.use([
	CanvasRenderer,
	EChartBoxPlot,
	TooltipComponent,
	ToolboxComponent,
	TitleComponent,
	GridComponent,
	DataZoomComponent,
	LegendComponent,
	DatasetComponent,
	TransformComponent,
	UniversalTransition
])

export interface IChartProps {
	chartData: any
}

const Wrapper = styled.div`
	--gradient-end: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)')};
`

export default function BoxplotChart({ chartData }: IChartProps) {
	const id = useMemo(() => uuid(), [])

	const [isDark] = useDarkModeManager()

	// transform chartData into required structure
	const data = chartData.map((p) => [p.apy, p.projectName])
	data.unshift(['APY', 'Project'])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	// Register transform func
	echarts.registerTransform(aggregate)

	useEffect(() => {
		const chartInstance = createInstance()

		const option = {
			dataset: [
				{
					id: 'raw',
					source: data
				},
				{
					id: 'apy_aggregate',
					fromDatasetId: 'raw',
					transform: [
						{
							type: 'ecSimpleTransform:aggregate',
							config: {
								resultDimensions: [
									{ name: 'count', from: 'APY', method: 'count' },
									{ name: 'min', from: 'APY', method: 'min' },
									{ name: 'Q1', from: 'APY', method: 'Q1' },
									{ name: 'median', from: 'APY', method: 'median' },
									{ name: 'Q3', from: 'APY', method: 'Q3' },
									{ name: 'max', from: 'APY', method: 'max' },
									{ name: 'Project', from: 'Project' }
								],
								groupBy: 'Project'
							}
						},
						{
							type: 'sort',
							config: {
								dimension: 'Q3',
								order: 'asc'
							}
						}
					]
				}
			],
			title: {
				text: 'Spot APY distribution',
				textStyle: {
					fontFamily: 'inter, sans-serif',
					fontWeight: 600,
					color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
				}
			},
			tooltip: {
				trigger: 'axis',
				confine: true
			},
			toolbox: {
				feature: {
					restore: {}
				}
			},
			xAxis: {
				scale: true,
				boundaryGap: false,
				name: 'APY',
				nameLocation: 'middle',
				nameGap: 30,
				nameTextStyle: {
					fontFamily: 'inter, sans-serif',
					fontSize: 14,
					fontWeight: 500,
					color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
				},
				splitLine: {
					lineStyle: {
						color: '#a1a1aa',
						opacity: 0.1
					}
				}
			},
			yAxis: {
				type: 'category',
				boundaryGap: false,
				nameTextStyle: {
					fontFamily: 'inter, sans-serif',
					fontSize: 14,
					fontWeight: 600,
					color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
				},
				splitLine: {
					lineStyle: {
						color: '#a1a1aa',
						opacity: 0.1
					}
				}
			},
			grid: {
				bottom: 100
			},
			legend: {
				selected: { detail: false }
			},
			dataZoom: [
				{
					type: 'inside',
					start: 0,
					end: 100
				},
				{
					type: 'slider',
					start: 0,
					end: 100,
					textStyle: {
						color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
					},
					borderColor: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
					handleStyle: {
						borderColor: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
						color: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.4)'
					},
					moveHandleStyle: {
						color: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)'
					},
					selectedDataBackground: {
						lineStyle: {
							color: '#445ed0'
						},
						areaStyle: {
							color: '#445ed0'
						}
					},
					emphasis: {
						handleStyle: {
							borderColor: isDark ? 'rgba(255, 255, 255, 1)' : '#000',
							color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)'
						},
						moveHandleStyle: {
							borderColor: isDark ? 'rgba(255, 255, 255, 1)' : '#000',
							color: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
						}
					},
					fillerColor: isDark ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'
				}
			],
			series: [
				{
					type: 'boxplot',
					datasetId: 'apy_aggregate',
					itemStyle: {
						color: '#b8c5f2'
					},
					encode: {
						x: ['min', 'Q1', 'median', 'Q3', 'max'],
						y: 'Project',
						itemName: ['Project'],
						tooltip: ['count', 'min', 'Q1', 'median', 'Q3', 'max']
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
	}, [id, data, createInstance, isDark])

	return (
		<YieldsChartWrapper>
			<Wrapper id={id} style={{ height: '800px', margin: 'auto 0' }}></Wrapper>
		</YieldsChartWrapper>
	)
}
