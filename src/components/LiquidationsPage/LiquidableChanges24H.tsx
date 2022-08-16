import React, { useContext, useMemo } from 'react'
import { ChartData } from '~/utils/liquidations'
import { useStackBy } from './utils'
import { LiquidationsContext } from '~/pages/liquidations/[symbol]'

export const LiquidableChanges24H = (props: { data: ChartData; prevData: ChartData }) => {
	const stackBy = useStackBy()
	const { selectedSeries } = useContext(LiquidationsContext)

	const liquidableChanges = useMemo(
		() => getLiquidableChangesRatio(props.data, props.prevData, stackBy, selectedSeries),
		[props.data, props.prevData, stackBy, selectedSeries]
	)
	return (
		<>
			<h2>Liquidable value change (24h)</h2>
			<p style={{ '--tile-text-color': '#fd3c99' } as React.CSSProperties}>
				{(liquidableChanges * 100).toFixed(1) || 0}%
			</p>
		</>
	)
}

const getLiquidableChangesRatio = (
	data: ChartData,
	prevData: ChartData,
	stackBy: 'chains' | 'protocols',
	selectedSeries: {
		[key: string]: boolean
	}
) => {
	let current = 0
	let prev = 0
	if (!selectedSeries) {
		current = data.totalLiquidable
		prev = prevData.totalLiquidable
	} else if (stackBy === 'chains') {
		Object.keys(selectedSeries)
			.filter((chain) => selectedSeries[chain])
			.forEach((chain) => {
				if (!prevData.totalLiquidables.chains[chain]) {
					return
				}
				current += data.totalLiquidables.chains[chain]
				prev += prevData.totalLiquidables.chains[chain]
			})
	} else {
		Object.keys(selectedSeries)
			.filter((protocol) => selectedSeries[protocol])
			.forEach((protocol) => {
				if (!prevData.totalLiquidables.protocols[protocol]) {
					return
				}
				current += data.totalLiquidables.protocols[protocol]
				prev += prevData.totalLiquidables.protocols[protocol]
			})
	}

	const changesRatio = (current - prev) / prev
	return isNaN(changesRatio) ? 0 : changesRatio
}
