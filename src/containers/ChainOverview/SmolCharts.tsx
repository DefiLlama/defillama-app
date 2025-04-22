import { useCallback, useEffect, useId } from 'react'
import * as echarts from 'echarts/core'
import { formattedNum, slug } from '~/utils'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { SVGRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'

echarts.use([SVGRenderer, LineChart, BarChart, TooltipComponent, GridComponent])

export function FeesGeneratedChart({ series }: { series: Array<[string, number, string]> }) {
	const id = useId()

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id), null, { renderer: 'svg' })
	}, [id])

	useEffect(() => {
		// create instance
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
					type: 'category',
					nameTextStyle: {
						fontFamily: 'sans-serif',
						fontSize: 14,
						fontWeight: 400
					},
					splitLine: false,
					data: series.map((s) => s[0]),
					axisLine: {
						show: false
					},
					axisTick: {
						show: false
					},
					axisLabel: {
						interval: 0,
						formatter: function (value, index) {
							return `{${index}|}`
						},
						rich: Object.fromEntries(
							series.map((s, index) => [
								index,
								{
									height: 18,
									width: 18,
									backgroundColor: {
										image: s[2]
									}
								}
							])
						)
					},
					triggerEvent: true
				}
			],
			yAxis: [
				{
					type: 'value',
					splitLine: false,
					axisLabel: false
				}
			],
			tooltip: {
				trigger: 'axis',
				confine: false,
				formatter: function (params) {
					return params.reduce((prev, curr) => {
						return (
							(prev +=
								'<li style="list-style:none;display:flex;align-items:center;gap:4px;">' +
								`<img src="${curr.value[2]}" style="border-radius:1000px;flex-shrink:0;height:16px;width:16px;" />` +
								curr.name +
								'&nbsp;&nbsp;' +
								'$' +
								formattedNum(curr.value[1])) + '</li>'
						)
					}, '')
				}
			},
			series: {
				name: '24h Fees',
				type: 'bar',
				emphasis: {
					focus: 'series',
					shadowBlur: 10
				},
				data: series,
				color: '#1F67D2'
			}
		})

		chartInstance.on('click', function (params) {
			window.open(
				`/fees/${slug(params.name ?? (typeof params.value === 'string' ? params.value : params.value?.[0] ?? ''))}`
			)
		})

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
		}
	}, [createInstance, series])

	return (
		<div className="relative" id="fees-generated-chart">
			<div id={id} className="my-auto h-[156px]" />
		</div>
	)
}

export function SmolLineChart({
	series,
	name,
	color,
	className
}: {
	series: Array<[string, number]>
	name: string
	color: 'green' | 'red'
	className?: string
}) {
	const id = useId()
	const [isThemeDark] = useDarkModeManager()
	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id), null, { renderer: 'svg' })
	}, [id])

	useEffect(() => {
		// create instance
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
				formatter: function (params) {
					let chartdate = new Date(params[0].value[0]).toLocaleDateString('en-US', {
						year: 'numeric',
						month: 'short',
						day: 'numeric'
					})

					return (
						chartdate +
						params.reduce((prev, curr) => {
							return (
								(prev +=
									'<li style="list-style:none;display:flex;align-items:center;gap:4px;">' +
									curr.marker +
									'$' +
									formattedNum(curr.value[1])) + '</li>'
							)
						}, '')
					)
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
				data: series.map((s) => [new Date(s[0]), s[1]]),
				symbol: 'none',
				lineStyle: {
					color: isThemeDark ? (color === 'green' ? '#3fb84f' : '#e24a42') : color === 'green' ? '#008a13' : '#e60d02'
				},
				color: isThemeDark ? (color === 'green' ? '#3fb84f' : '#e24a42') : color === 'green' ? '#008a13' : '#e60d02'
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
		<div className="relative">
			<div id={id} className={className ?? 'my-auto h-[112px]'} />
		</div>
	)
}

export function SmolBarChart({
	series,
	name,
	className
}: {
	series: Array<[string, number]>
	name: string
	className?: string
}) {
	const id = useId()

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id), null, { renderer: 'svg' })
	}, [id])

	useEffect(() => {
		// create instance
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
					type: 'category',
					axisLine: {
						show: false
					},
					axisTick: {
						show: false
					},
					splitLine: false,
					axisLabel: false
				}
			],
			yAxis: [
				{
					type: 'value',
					splitLine: false,
					axisLabel: false,
					boundaryGap: false
				}
			],
			tooltip: {
				trigger: 'axis',
				confine: false,
				formatter: function (params) {
					let chartdate = new Date(+params[0].value[0]).toLocaleDateString('en-US', {
						year: 'numeric',
						month: 'short',
						day: 'numeric'
					})

					return (
						chartdate +
						params.reduce((prev, curr) => {
							return (
								(prev +=
									'<li style="list-style:none;display:flex;align-items:center;gap:4px;">' +
									curr.marker +
									'$' +
									formattedNum(curr.value[1])) + '</li>'
							)
						}, '')
					)
				}
			},
			series: {
				name,
				type: 'bar',
				emphasis: {
					focus: 'series',
					shadowBlur: 10
				},
				data: series,
				symbol: 'none',
				color: '#1F67D2'
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
	}, [createInstance, series, name])

	return (
		<div className="relative flex-1">
			<div id={id} className={className ?? 'my-auto h-[132px]'} />
		</div>
	)
}
