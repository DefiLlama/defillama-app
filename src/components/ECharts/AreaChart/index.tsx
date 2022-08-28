import { useCallback, useEffect, useMemo, useState } from 'react'
import * as echarts from 'echarts/core'
import { v4 as uuid } from 'uuid'
import styled from 'styled-components'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { stringToColour } from '../utils'
import { SelectLegendMultiple } from '../shared'
import type { IChartProps } from '../types'
import { useDefaults } from '../useDefaults'

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
	hideLegend,
	tooltipSort = true,
	...props
}: IChartProps) {
	// For Tokens Chart
	const [legendOptions, setLegendOptions] = useState<string[]>(tokensUnique)

	const id = useMemo(() => uuid(), [])

	const [isDark] = useDarkModeManager()

	const defaultChartSettings = useDefaults({
		color,
		title,
		valueSymbol: moneySymbol,
		tooltipSort
	})

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
						color: hideLegend
							? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
									{
										offset: 0,
										color: index === 0 ? chartColor : 'transparent'
									},
									{
										offset: 1,
										color: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'
									}
							  ])
							: null
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
					if (legendOptions.includes(token) || hideLegend) {
						series.find((t) => t.name === token)?.data.push([new Date(date * 1000), item[token] || 0])
					}
				})
			})

			return series
		}
	}, [chartData, tokensUnique, color, isDark, legendOptions, hallmarks, hideLegend])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		// create instance
		const chartInstance = createInstance()

		const { graphic, titleDefaults, grid, tooltip, timeAsXAxis, valueAsYAxis, dataZoom } = defaultChartSettings

		chartInstance.setOption({
			graphic: { ...graphic },
			tooltip: {
				...tooltip
			},
			title: {
				...titleDefaults
			},
			grid: {
				...grid
			},
			xAxis: {
				...timeAsXAxis
			},
			yAxis: {
				...valueAsYAxis
			},
			dataZoom: [...dataZoom],
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
	}, [createInstance, defaultChartSettings, series])

	const legendName = title === 'Chains' ? 'Chain' : 'Token'

	return (
		<div style={{ position: 'relative' }} {...props}>
			{tokensUnique?.length > 1 && !hideLegend && (
				<SelectLegendMultiple
					allOptions={tokensUnique}
					options={legendOptions}
					setOptions={setLegendOptions}
					title={legendOptions.length === 1 ? legendName : legendName + 's'}
				/>
			)}
			<Wrapper id={id} style={{ height: '360px', margin: 'auto 0' }}></Wrapper>
		</div>
	)
}
