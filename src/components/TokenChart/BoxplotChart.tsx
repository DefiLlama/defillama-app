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
	TitleComponent,
	GridComponent,
	DataZoomComponent,
	LegendComponent,
	DatasetComponent,
	TransformComponent
} from 'echarts/components'

echarts.use([
	CanvasRenderer,
	EChartBoxPlot,
	TooltipComponent,
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

	// transform chartData into required structure
	const data = chartData.filter((p) => p.apy > 0).map((p) => [p.apy, p.projectName])
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
				text: 'Current APY distribution'
			},
			tooltip: {
				trigger: 'axis',
				confine: true
			},
			xAxis: {
				name: 'APY',
				nameLocation: 'middle',
				nameGap: 30,
				scale: true
			},
			yAxis: {
				type: 'category'
			},
			grid: {
				bottom: 100
			},
			legend: {
				selected: { detail: false }
			},
			dataZoom: [
				{
					type: 'inside'
				},
				{
					type: 'slider',
					height: 20
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
						tooltip: ['min', 'Q1', 'median', 'Q3', 'max']
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
	}, [id, data, createInstance])

	return (
		<div style={{ position: 'relative' }}>
			<Wrapper id={id} style={{ height: '800px', margin: 'auto 0' }}></Wrapper>
		</div>
	)
}
