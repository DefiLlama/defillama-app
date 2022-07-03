import { useCallback, useEffect, useMemo, useState } from 'react'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
	TooltipComponent,
	TitleComponent,
	GridComponent,
	DataZoomComponent,
	GraphicComponent,
	MarkLineComponent
} from 'echarts/components'
import { v4 as uuid } from 'uuid'
import styled from 'styled-components'
import logoLight from '~/public/defillama-press-kit/defi/PNG/defillama-light-neutral.png'
import logoDark from '~/public/defillama-press-kit/defi/PNG/defillama-dark-neutral.png'
import { useMedia } from '~/hooks'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { toK } from '~/utils'
import { stringToColour } from './utils'
import { SelectLegendMultiple } from './shared'
import { IChartProps } from './types'

echarts.use([
	CanvasRenderer,
	LineChart,
	TooltipComponent,
	TitleComponent,
	GridComponent,
	DataZoomComponent,
	GraphicComponent,
	MarkLineComponent
])

const Wrapper = styled.div`
	--gradient-end: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)')};
`

export default function AreaChart({
	chartData,
	tokensUnique,
	moneySymbol = '$',
	title,
	color,
	hallmarks,
	hideLegend
}: IChartProps) {
	// For Tokens Chart
	const [legendOptions, setLegendOptions] = useState<string[]>(tokensUnique)

	const id = useMemo(() => uuid(), [])

	const [isDark] = useDarkModeManager()

	const series = useMemo(() => {
		const chartColor = color || stringToColour()

		if (!tokensUnique || tokensUnique?.length === 0) {
			const series = {
				name: '',
				type: 'line',
				stack: 'value',
				emphasis: {
					focus: 'series',
					shadowBlur: 10
				},
				symbol: 'none',
				itemStyle: {
					color: chartColor
				},
				areaStyle: {
					color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
						{
							offset: 0,
							color: chartColor
						},
						{
							offset: 1,
							color: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'
						}
					])
				},
				data: [],
				...(hallmarks && {
					markLine: {
						data: hallmarks.map(([date, event], index) => [
							{
								name: event,
								xAxis: new Date(date * 1000),
								yAxis: 0,
								label: {
									color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
									fontFamily: 'inter, sans-serif',
									fontSize: 14,
									fontWeight: 500
								}
							},
							{
								name: 'end',
								xAxis: new Date(date * 1000),
								yAxis: 'max',
								y: Math.max(hallmarks.length * 40 - index * 40, 40)
							}
						])
					}
				})
			}

			chartData.forEach(([date, value]) => {
				series.data.push([new Date(date * 1000), value])
			})

			return series
		} else {
			const series = tokensUnique.map((token, index) => {
				return {
					name: token,
					type: 'line',
					emphasis: {
						focus: 'series',
						shadowBlur: 10
					},
					symbol: 'none',
					itemStyle: {
						color: index === 0 ? chartColor : null
					},
					areaStyle: {
						color: index === 0 ? chartColor : null
					},
					data: [],
					...(hallmarks && {
						markLine: {
							data: hallmarks.map(([date, event], index) => [
								{
									name: event,
									xAxis: new Date(date * 1000),
									yAxis: 0,
									label: {
										color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
										fontFamily: 'inter, sans-serif',
										fontSize: 14,
										fontWeight: 500
									}
								},
								{
									name: 'end',
									xAxis: new Date(date * 1000),
									yAxis: 'max',
									y: Math.max(hallmarks.length * 40 - index * 40, 40)
								}
							])
						}
					})
				}
			})

			chartData.forEach(({ date, ...item }) => {
				tokensUnique.forEach((token) => {
					if (legendOptions.includes(token)) {
						series.find((t) => t.name === token)?.data.push([new Date(date * 1000), item[token] || 0])
					}
				})
			})

			return series
		}
	}, [chartData, tokensUnique, color, isDark, legendOptions, hallmarks])

	const isSmall = useMedia(`(max-width: 37.5rem)`)

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		// create instance
		const chartInstance = createInstance()

		chartInstance.setOption({
			graphic: {
				type: 'image',
				z: 0,
				style: {
					image: isDark ? logoLight.src : logoDark.src,
					height: 40,
					opacity: 0.3
				},
				left: isSmall ? '40%' : '45%',
				top: '130px'
			},
			tooltip: {
				trigger: 'axis',
				formatter: function (params) {
					const chartdate = new Date(params[0].value[0]).toLocaleDateString(undefined, {
						year: 'numeric',
						month: 'short',
						day: 'numeric'
					})

					const vals = params
						.sort((a, b) => b.value[1] - a.value[1])
						.reduce((prev, curr) => {
							if (curr.value[1] !== 0) {
								return (prev +=
									'<li style="list-style:none">' +
									curr.marker +
									curr.seriesName +
									'&nbsp;&nbsp;' +
									moneySymbol +
									toK(curr.value[1]) +
									'</li>')
							} else return prev
						}, '')

					return chartdate + vals
				}
			},
			title: {
				text: title,
				textStyle: {
					fontFamily: 'inter, sans-serif',
					fontWeight: 600,
					color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
				}
			},
			grid: {
				left: 20,
				containLabel: true,
				bottom: 60,
				top: title === '' ? 20 : 48,
				right: 20
			},
			xAxis: {
				type: 'time',
				boundaryGap: false,
				nameTextStyle: {
					fontFamily: 'inter, sans-serif',
					fontSize: 14,
					fontWeight: 400
				},
				axisLine: {
					lineStyle: {
						color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
						opacity: 0.2
					}
				}
			},
			yAxis: {
				type: 'value',
				axisLabel: {
					formatter: (value) => moneySymbol + toK(value)
				},
				axisLine: {
					lineStyle: {
						color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
						opacity: 0.1
					}
				},
				boundaryGap: false,
				nameTextStyle: {
					fontFamily: 'inter, sans-serif',
					fontSize: 14,
					fontWeight: 400,
					color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
				},
				splitLine: {
					lineStyle: {
						color: '#a1a1aa',
						opacity: 0.1
					}
				}
			},
			dataZoom: [
				{
					type: 'inside',
					start: 0,
					end: 100
				},
				{
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
							color
						},
						areaStyle: {
							color
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
					fillerColor: isDark ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
					labelFormatter: (val) => {
						const date = new Date(val)
						return date.toLocaleDateString()
					}
				}
			],
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
	}, [color, id, isDark, isSmall, moneySymbol, series, title, createInstance])

	const legendTitle = title === 'Chains' ? 'Chain' : 'Token'

	return (
		<div style={{ position: 'relative' }}>
			{tokensUnique?.length > 1 && !hideLegend && (
				<SelectLegendMultiple
					allOptions={tokensUnique}
					options={legendOptions}
					setOptions={setLegendOptions}
					title={legendTitle + (legendOptions.length !== 1 ? 's' : '')}
				/>
			)}
			<Wrapper id={id} style={{ height: '360px', margin: 'auto 0' }}></Wrapper>
		</div>
	)
}
