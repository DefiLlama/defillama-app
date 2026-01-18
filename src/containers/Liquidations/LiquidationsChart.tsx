import { BarChart } from 'echarts/charts'
import {
	DataZoomComponent,
	GraphicComponent,
	GridComponent,
	LegendComponent,
	TooltipComponent
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useContext, useEffect, useRef } from 'react'
import { LiquidationsContext } from '~/containers/Liquidations/context'
import { ChartData } from '~/containers/Liquidations/utils'
import { useDarkModeManager, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useChartResize } from '~/hooks/useChartResize'
import { useMedia } from '~/hooks/useMedia'
import { getOption, useStackBy } from './utils'

echarts.use([
	CanvasRenderer,
	BarChart,
	TooltipComponent,
	GridComponent,
	DataZoomComponent,
	GraphicComponent,
	LegendComponent
])

export const LiquidationsChart = ({ chartData, uid, bobo }: { chartData: ChartData; uid: string; bobo: boolean }) => {
	const { setSelectedSeries } = useContext(LiquidationsContext)
	const [liqsSettings] = useLocalStorageSettingsManager('liquidations')
	const isLiqsUsingUsd = liqsSettings['LIQS_USING_USD']
	const isLiqsCumulative = liqsSettings['LIQS_CUMULATIVE']

	const stackBy = useStackBy()
	const isSmall = useMedia(`(max-width: 37.5rem)`)
	const [isDark] = useDarkModeManager()
	const chartRef = useRef<echarts.ECharts | null>(null)

	// Stable resize listener - never re-attaches when dependencies change
	useChartResize(chartRef)

	useEffect(() => {
		setSelectedSeries(null)
		const el = document.getElementById(uid)
		if (!el) return
		const instance = echarts.getInstanceByDom(el) || echarts.init(el)
		chartRef.current = instance
		const option = getOption(chartData, stackBy, isSmall, isDark, isLiqsUsingUsd, isLiqsCumulative)
		instance.on('legendselectchanged', (params: any) => {
			setSelectedSeries(params.selected)
		})
		instance.setOption(option)

		return () => {
			chartRef.current = null
			instance.dispose()
		}
	}, [uid, chartData, stackBy, isSmall, isDark, setSelectedSeries, isLiqsUsingUsd, isLiqsCumulative])

	return (
		<>
			<div
				style={{
					position: 'absolute',
					...(bobo && {
						height: '80%',
						width: '90%',
						backgroundImage: 'url("/assets/bobo.png")',
						backgroundSize: '100% 360px',
						backgroundRepeat: 'no-repeat',
						backgroundPosition: 'bottom',
						zIndex: 1
					})
				}}
			/>
			<div
				id={uid}
				style={{
					minHeight: '360px',
					margin: 'auto 0'
				}}
			/>
		</>
	)
}
