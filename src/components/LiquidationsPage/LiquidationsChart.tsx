/* eslint-disable no-unused-vars*/
import React, { useCallback, useEffect, useState } from 'react'
import * as echarts from 'echarts'
import { ChartData } from '~/utils/liquidations'
import { getOption } from './utils'

export const LiquidationsChart = ({ chartData, uid }: { chartData: ChartData; uid: string }) => {
	const [aggregateBy, setAggregateBy] = useState<'chain' | 'protocol'>('chain')
	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(uid))

		return instance || echarts.init(document.getElementById(uid))
	}, [uid])

	useEffect(() => {
		const chartInstance = createInstance()
		const option = getOption(chartData, aggregateBy)
		chartInstance.setOption(option)

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
		}
	}, [uid, chartData, createInstance, aggregateBy])

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
