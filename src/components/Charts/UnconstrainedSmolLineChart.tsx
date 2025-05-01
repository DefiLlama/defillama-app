import { useCallback, useEffect, useId } from 'react'
import * as echarts from 'echarts/core'
import { formattedNum } from '~/utils'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { SVGRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, MarkLineComponent } from 'echarts/components'
import { formatTooltipChartDate } from '~/components/ECharts/useDefaults'

echarts.use([SVGRenderer, LineChart, TooltipComponent, GridComponent, MarkLineComponent])
export function UnconstrainedSmolLineChart({
	series,
	name,
	color,
	className,
	extraData
}: {
	series: Array<[string, number]>
	name: string
	color: 'green' | 'red'
	className?: string
	extraData?: any
}) {
	const id = useId()
	const [isThemeDark] = useDarkModeManager()
	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))
		return instance || echarts.init(document.getElementById(id), null, { renderer: 'svg' })
	}, [id])

	useEffect(() => {
		if (!series?.length) return

		const chartInstance = createInstance()
		chartInstance.setOption({
			animation: false,
			grid: {
				left: 0,
				containLabel: true,
				bottom: 0,
				top: 0,
				right: 0
			},
			xAxis: [
				{
					type: 'time',
					nameTextStyle: {
						fontFamily: 'sans-serif',
						fontSize: 14,
						fontWeight: 400
					},
					splitLine: false,
					axisLabel: false,
					boundaryGap: false
				}
			],
			yAxis: [
				{
					type: 'value',
					splitLine: false,
					axisLabel: false,
					boundaryGap: false,
					scale: true
				}
			],
			tooltip: {
				trigger: 'axis',
				confine: false,
				position: function (point) {
					return [point[0], point[1]]
				},
				appendToBody: true,
				axisPointer: {
					type: 'line',
					lineStyle: {
						color: isThemeDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
						width: 1
					}
				},
				formatter: (params) => {
					const point = params[0]
					if (!point) return ''

					const hoveredTimestamp = point.value[0]
					const hoveredValue = point.value[1]
					const marker = point.marker
					const unlockIndex = 7
					const unlockValue = series[unlockIndex][1]
					const lastEvent = extraData?.lastEvent

					let tooltipHtml = `<div style="font-size: 12px; line-height: 1.4;">`
					tooltipHtml += `<div>${formatTooltipChartDate(hoveredTimestamp, 'daily', true)}</div>`
					tooltipHtml += `<div style="display: flex; align-items: center; gap: 4px;">${marker}Price: $${formattedNum(
						hoveredValue
					)}</div>`
					const dayPosition = params[0].dataIndex - unlockIndex
					tooltipHtml += `<div style="opacity: 0.8; margin-top: 4px;">`
					if (dayPosition === 0) {
						if (lastEvent && lastEvent.length > 0) {
							const parseEventData = (event) => {
								const { description, noOfTokens, timestamp, category } = event // get category instead of unlockType
								const regex =
									/(?:of (.+?) tokens (?:will be|were) unlocked)|(?:will (?:increase|decrease) from \{tokens\[0\]\} to \{tokens\[1\]\} tokens per week from (.+?) on {timestamp})|(?:from (.+?) on {timestamp})|(?:was (?:increased|decreased) from \{tokens\[0\]\} to \{tokens\[1\]\} tokens per week from (.+?) on {timestamp})/
								const matches = description?.match(regex)
								const name = matches?.[1] || matches?.[2] || matches?.[3] || matches?.[4] || ''
								const amount = noOfTokens?.reduce((a, b) => a + b, 0) || 0
								return { name, amount, timestamp, category }
							}

							// Parse all events and combine data
							const eventDatas = lastEvent.map(parseEventData)
							const totalAmount = eventDatas.reduce((sum, event) => sum + event.amount, 0)
							const uniqueCategories = Array.from(new Set(eventDatas.map((event) => event.category).filter(Boolean)))

							tooltipHtml += `<div style="margin-top: 4px; opacity: 1;">`
							tooltipHtml += `<div style="color: #000000">Unlocked: ${formattedNum(
								totalAmount * unlockValue,
								true
							)}</div>`

							if (uniqueCategories.length > 0) {
								tooltipHtml += `<div style="color: #666666; font-size: 11px;">`
								tooltipHtml += `Categories: ${uniqueCategories
									.map((cat: string) => cat.charAt(0).toUpperCase() + cat.slice(1))
									.join(', ')}`
								tooltipHtml += `</div>`
							}
							tooltipHtml += `</div>`
						}
					} else {
						tooltipHtml += `Day ${dayPosition > 0 ? '+' : ''}${dayPosition} from unlock`
					}
					tooltipHtml += `</div>`
					if (dayPosition !== 0 && unlockValue && typeof unlockValue === 'number' && unlockValue !== 0) {
						const percentChange = ((hoveredValue - unlockValue) / unlockValue) * 100
						const changeColor =
							percentChange >= 0 ? (color === 'green' ? '#3fb84f' : '#008a13') : color === 'red' ? '#e24a42' : '#e60d02'
						tooltipHtml += `<div style="opacity: 0.8; color: ${changeColor};">`
						tooltipHtml += `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}% from unlock`
						tooltipHtml += `</div>`
					}

					tooltipHtml += `</div>`
					return tooltipHtml
				}
			},
			series: {
				name,
				type: 'line',
				smooth: true,
				emphasis: {
					focus: 'series',
					shadowBlur: 10
				},
				data: series,
				symbol: 'none',
				lineStyle: {
					color: isThemeDark ? (color === 'green' ? '#3fb84f' : '#e24a42') : color === 'green' ? '#008a13' : '#e60d02'
				},
				color: isThemeDark ? (color === 'green' ? '#3fb84f' : '#e24a42') : color === 'green' ? '#008a13' : '#e60d02',
				markLine: {
					symbol: ['none', 'none'],
					silent: true,
					data: [
						{
							xAxis: series[7][0],
							label: {
								formatter: name,
								position: 'middle'
							},
							lineStyle: {
								color: isThemeDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)',
								type: 'line',
								width: 1.5
							}
						}
					]
				}
			}
		})

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
		}
	}, [createInstance, series, color, isThemeDark, name])

	return (
		<div className="relative overflow-visible">
			<div id={id} className={className ?? 'my-auto h-[53px] overflow-visible'} />
		</div>
	)
}
