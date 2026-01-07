import { useCallback, useEffect, useId, useMemo } from 'react'
import { BarChart, CandlestickChart, LineChart } from 'echarts/charts'
import {
	DatasetComponent,
	DataZoomComponent,
	GraphicComponent,
	GridComponent,
	MarkLineComponent,
	TooltipComponent,
	LegendComponent
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { oldBlue } from '~/constants/colors'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useMedia } from '~/hooks/useMedia'
import type { ICandlestickChartProps } from '../types'
import { formatChartEmphasisDate, formatTooltipChartDate, formatTooltipValue } from '../useDefaults'

echarts.use([
	CanvasRenderer,
	CandlestickChart,
	BarChart,
	LineChart,
	TooltipComponent,
	GridComponent,
	DataZoomComponent,
	GraphicComponent,
	MarkLineComponent,
	DatasetComponent,
	LegendComponent
])

const INDICATOR_COLORS = [
	'#ff7f0e', '#2ca02c', '#9467bd', '#e377c2', '#17becf', '#bcbd22', '#7f7f7f'
]

const PANEL_HEIGHT = 60
const VOLUME_HEIGHT = 80
const DATAZOOM_HEIGHT = 52
const BASE_BOTTOM = DATAZOOM_HEIGHT

export default function CandleStickAndVolumeChart({ data, indicators = [] }: ICandlestickChartProps) {
	const id = useId()
	const [isThemeDark] = useDarkModeManager()
	const isSmall = useMedia(`(max-width: 37.5rem)`)

	const overlays = useMemo(() => indicators.filter((i) => i.category === 'overlay'), [indicators])
	const panels = useMemo(() => indicators.filter((i) => i.category === 'panel'), [indicators])

	const chartHeight = useMemo(() => {
		const panelTotalHeight = panels.length * PANEL_HEIGHT
		return 480 + panelTotalHeight
	}, [panels.length])

	const defaultChartSettings = useMemo(() => {
		const panelCount = panels.length
		const volumeBottom = BASE_BOTTOM + panelCount * PANEL_HEIGHT
		const priceBottom = volumeBottom + VOLUME_HEIGHT + 20

		const grids: any[] = [
			{ left: 12, bottom: priceBottom, top: 12, right: 12 },
			{ height: VOLUME_HEIGHT, left: 54, right: 12, bottom: volumeBottom }
		]

		const xAxes: any[] = [
			{
				type: 'time',
				boundaryGap: false,
				axisLine: { onZero: false, lineStyle: { color: isThemeDark ? 'rgba(255,255,255,1)' : 'rgba(0,0,0,1)', opacity: 0.2 } },
				splitLine: { show: false },
				min: 'dataMin',
				max: 'dataMax',
				axisLabel: { color: isThemeDark ? 'rgba(255,255,255,1)' : 'rgba(0,0,0,1)' }
			},
			{
				type: 'time',
				gridIndex: 1,
				boundaryGap: false,
				axisLine: { onZero: false, lineStyle: { color: isThemeDark ? 'rgba(255,255,255,1)' : 'rgba(0,0,0,1)', opacity: 0.2 } },
				axisTick: { show: false },
				splitLine: { show: false },
				axisLabel: { show: false },
				min: 'dataMin',
				max: 'dataMax'
			}
		]

		const yAxes: any[] = [
			{
				scale: true,
				splitArea: { show: true, areaStyle: { color: [isThemeDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', ''] } },
				axisLabel: { formatter: (v) => formatTooltipValue(v, '$'), color: isThemeDark ? 'rgba(255,255,255,1)' : 'rgba(0,0,0,1)' },
				axisLine: { lineStyle: { color: isThemeDark ? 'rgba(255,255,255,1)' : 'rgba(0,0,0,1)', opacity: 0.1 } },
				splitLine: { lineStyle: { color: isThemeDark ? '#fff' : '#000', opacity: isThemeDark ? 0.02 : 0.03 } }
			},
			{
				scale: true,
				gridIndex: 1,
				splitNumber: 2,
				axisLabel: { show: false },
				axisLine: { show: false },
				axisTick: { show: false },
				splitLine: { show: false }
			}
		]

		panels.forEach((panel, idx) => {
			const gridIdx = idx + 2
			const bottom = BASE_BOTTOM + (panelCount - idx - 1) * PANEL_HEIGHT

			grids.push({ height: PANEL_HEIGHT - 10, left: 54, right: 12, bottom })

			xAxes.push({
				type: 'time',
				gridIndex: gridIdx,
				boundaryGap: false,
				axisLine: { show: false },
				axisTick: { show: false },
				splitLine: { show: false },
				axisLabel: { show: false },
				min: 'dataMin',
				max: 'dataMax'
			})

			const isOscillator = ['rsi', 'stoch', 'mfi', 'willr', 'cci'].some((t) => panel.name.toLowerCase().startsWith(t))
			yAxes.push({
				scale: !isOscillator,
				gridIndex: gridIdx,
				min: isOscillator ? 0 : undefined,
				max: isOscillator ? 100 : undefined,
				splitNumber: 2,
				axisLabel: { show: true, fontSize: 10, color: isThemeDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' },
				axisLine: { show: false },
				axisTick: { show: false },
				splitLine: { lineStyle: { color: isThemeDark ? '#fff' : '#000', opacity: 0.05 } }
			})
		})

		const allAxisIndices = Array.from({ length: grids.length }, (_, i) => i)

		return {
			graphic: {
				type: 'image',
				z: 0,
				style: {
					image: isThemeDark ? '/icons/defillama-light-neutral.webp' : '/icons/defillama-dark-neutral.webp',
					height: 40,
					opacity: 0.3
				},
				left: isSmall ? '40%' : '45%',
				top: '130px'
			},
			legend: {
				show: overlays.length > 0 || panels.length > 0,
				top: 0,
				right: 12,
				textStyle: { color: isThemeDark ? '#fff' : '#000', fontSize: 11 }
			},
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'line' },
				formatter: (params) => {
					const chartdate = formatTooltipChartDate(params[0].value[0], 'daily')
					let vals = ''
					for (const param of params) {
						if (param.componentSubType === 'candlestick') {
							vals += `<li style="list-style:none">Open: <b>${formatTooltipValue(param.value[1], '$')}</b></li>`
							vals += `<li style="list-style:none">High: <b>${formatTooltipValue(param.value[4], '$')}</b></li>`
							vals += `<li style="list-style:none">Low: <b>${formatTooltipValue(param.value[3], '$')}</b></li>`
							vals += `<li style="list-style:none">Close: <b>${formatTooltipValue(param.value[2], '$')}</b></li>`
						} else if (param.seriesName === 'Volume') {
							vals += `<li style="list-style:none">${param.marker}Vol: <b>${formatTooltipValue(param.value[5], '$')}</b></li>`
						} else {
							vals += `<li style="list-style:none">${param.marker}${param.seriesName}: <b>${formatTooltipValue(param.value[1], '')}</b></li>`
						}
					}
					return chartdate + vals
				}
			},
			grid: grids,
			xAxis: xAxes,
			yAxis: yAxes,
			dataZoom: [
				{ type: 'inside', xAxisIndex: allAxisIndices, start: 10, end: 100 },
				{
					show: true,
					xAxisIndex: allAxisIndices,
					type: 'slider',
					bottom: 10,
					start: 10,
					end: 100,
					textStyle: { color: isThemeDark ? 'rgba(255,255,255,1)' : 'rgba(0,0,0,1)' },
					borderColor: isThemeDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
					handleStyle: { borderColor: isThemeDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)', color: isThemeDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)' },
					moveHandleStyle: { color: isThemeDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' },
					selectedDataBackground: { lineStyle: { color: oldBlue }, areaStyle: { color: oldBlue } },
					fillerColor: isThemeDark ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
					labelFormatter: formatChartEmphasisDate
				}
			],
			visualMap: {
				show: false,
				seriesIndex: 1,
				dimension: 6,
				pieces: [
					{ value: 1, color: isThemeDark ? '#3eb84f' : '#018a13' },
					{ value: -1, color: isThemeDark ? '#e24a42' : '#e60d02' }
				]
			}
		}
	}, [isSmall, isThemeDark, panels, overlays.length])

	const series = useMemo(() => {
		const result: any[] = [
			{
				type: 'candlestick',
				symbol: 'none',
				large: true,
				itemStyle: {
					color: isThemeDark ? '#3eb84f' : '#018a13',
					color0: isThemeDark ? '#e24a42' : '#e60d02',
					borderColor: isThemeDark ? '#3eb84f' : '#018a13',
					borderColor0: isThemeDark ? '#e24a42' : '#e60d02'
				},
				encode: { x: 0, y: [1, 2, 3, 4] }
			},
			{
				name: 'Volume',
				type: 'bar',
				symbol: 'none',
				large: true,
				xAxisIndex: 1,
				yAxisIndex: 1,
				encode: { x: 0, y: 5 },
				itemStyle: { color: oldBlue }
			}
		]

		overlays.forEach((ind, idx) => {
			const color = ind.color || INDICATOR_COLORS[idx % INDICATOR_COLORS.length]
			if (ind.values && ind.name.toLowerCase().includes('bband')) {
				result.push({
					name: `${ind.name} Upper`,
					type: 'line',
					data: ind.values.map((v) => [v[0], v[1]?.upper]),
					lineStyle: { color, opacity: 0.5, width: 1 },
					symbol: 'none',
					showInLegend: false
				})
				result.push({
					name: ind.name,
					type: 'line',
					data: ind.values.map((v) => [v[0], v[1]?.middle]),
					lineStyle: { color, width: 1 },
					symbol: 'none'
				})
				result.push({
					name: `${ind.name} Lower`,
					type: 'line',
					data: ind.values.map((v) => [v[0], v[1]?.lower]),
					lineStyle: { color, opacity: 0.5, width: 1 },
					symbol: 'none',
					showInLegend: false,
					areaStyle: { color, opacity: 0.1 }
				})
			} else {
				result.push({
					name: ind.name,
					type: 'line',
					data: ind.data,
					lineStyle: { color, width: 1.5 },
					symbol: 'none'
				})
			}
		})

		panels.forEach((panel, idx) => {
			const gridIdx = idx + 2
			const color = panel.color || INDICATOR_COLORS[(overlays.length + idx) % INDICATOR_COLORS.length]

			if (panel.values && panel.name.toLowerCase().includes('macd')) {
				result.push({
					name: 'MACD',
					type: 'bar',
					xAxisIndex: gridIdx,
					yAxisIndex: gridIdx,
					data: panel.values.map((v) => [v[0], v[1]?.histogram]),
					itemStyle: { color: (params) => (params.value[1] >= 0 ? '#3eb84f' : '#e24a42') }
				})
				result.push({
					name: 'Signal',
					type: 'line',
					xAxisIndex: gridIdx,
					yAxisIndex: gridIdx,
					data: panel.values.map((v) => [v[0], v[1]?.signal]),
					lineStyle: { color: '#ff7f0e', width: 1 },
					symbol: 'none'
				})
				result.push({
					name: 'MACD Line',
					type: 'line',
					xAxisIndex: gridIdx,
					yAxisIndex: gridIdx,
					data: panel.values.map((v) => [v[0], v[1]?.macd]),
					lineStyle: { color: '#2ca02c', width: 1 },
					symbol: 'none'
				})
			} else if (panel.values && panel.name.toLowerCase().includes('stoch')) {
				result.push({
					name: '%K',
					type: 'line',
					xAxisIndex: gridIdx,
					yAxisIndex: gridIdx,
					data: panel.values.map((v) => [v[0], v[1]?.k]),
					lineStyle: { color: '#2ca02c', width: 1 },
					symbol: 'none'
				})
				result.push({
					name: '%D',
					type: 'line',
					xAxisIndex: gridIdx,
					yAxisIndex: gridIdx,
					data: panel.values.map((v) => [v[0], v[1]?.d]),
					lineStyle: { color: '#ff7f0e', width: 1 },
					symbol: 'none'
				})
			} else {
				result.push({
					name: panel.name,
					type: 'line',
					xAxisIndex: gridIdx,
					yAxisIndex: gridIdx,
					data: panel.data,
					lineStyle: { color, width: 1.5 },
					symbol: 'none'
				})
			}
		})

		return result
	}, [isThemeDark, overlays, panels])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))
		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		const chartInstance = createInstance()

		chartInstance.setOption({
			...defaultChartSettings,
			dataset: { source: data },
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
	}, [createInstance, series, data, defaultChartSettings])

	return <div id={id} style={{ height: `${chartHeight}px` }}></div>
}
