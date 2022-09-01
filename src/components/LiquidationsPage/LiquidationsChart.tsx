/* eslint-disable no-unused-vars*/
import React, { useCallback, useContext, useEffect, useState } from 'react'
import * as echarts from 'echarts'
import { ChartData } from '~/utils/liquidations'
import { getOption, useStackBy } from './utils'
import { useMedia } from '~/hooks'
import { useDarkModeManager, useLiqsManager } from '~/contexts/LocalStorage'
import { LiquidationsContext } from '~/pages/liquidations/[symbol]'

export const LiquidationsChart = ({ chartData, uid }: { chartData: ChartData; uid: string }) => {
	const { setSelectedSeries } = useContext(LiquidationsContext)
	const [liqsSettings] = useLiqsManager()
	const isLiqsUsingUsd = liqsSettings['LIQS_USING_USD']

	const stackBy = useStackBy()
	const isSmall = useMedia(`(max-width: 37.5rem)`)
	const [isDark] = useDarkModeManager()

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(uid))
		return instance || echarts.init(document.getElementById(uid))
	}, [uid])

	useEffect(() => {
		setSelectedSeries(null)
		const chartInstance = createInstance()
		const option = getOption(chartData, stackBy, isSmall, isDark, isLiqsUsingUsd)
		chartInstance.on('legendselectchanged', (params: any) => {
			setSelectedSeries(params.selected)
		})
		chartInstance.setOption(option)

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
		}
	}, [uid, chartData, createInstance, stackBy, isSmall, isDark, setSelectedSeries, isLiqsUsingUsd])

	return (
		<div
			id={uid}
			style={{
				minHeight: '360px',
				margin: 'auto 0'
			}}
		/>
	)
}
