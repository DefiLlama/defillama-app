import * as React from 'react'
import { LiquidationsContext } from '~/containers/LiquidationsPage/context'
import { ChartData, PROTOCOL_NAMES_MAP_REVERSE } from '~/utils/liquidations'
import { useStackBy } from './utils'

export const LiquidableChanges24H = (props: { data: ChartData; prevData: ChartData }) => {
	const stackBy = useStackBy()
	const { selectedSeries } = React.useContext(LiquidationsContext)

	const liquidableChanges = React.useMemo(
		() => getLiquidableChangesRatio(props.data, props.prevData, stackBy, selectedSeries),
		[props.data, props.prevData, stackBy, selectedSeries]
	)
	return (
		<>
			<span className="text-[#545757] dark:text-[#cccccc]">Liquidatable value change (24h)</span>
			<span className="font-semibold text-2xl font-jetbrains">{(liquidableChanges * 100).toFixed(1) || 0}%</span>
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
		if (stackBy === 'chains') {
			Object.keys(data.totalLiquidables.chains).forEach((chain) => {
				if (!prevData.totalLiquidables.chains[chain]) {
					return
				}
				current += data.totalLiquidables.chains[chain]
				prev += prevData.totalLiquidables.chains[chain]
			})
		} else {
			Object.keys(data.totalLiquidables.protocols).forEach((protocol) => {
				if (!prevData.totalLiquidables.protocols[protocol]) {
					return
				}
				current += data.totalLiquidables.protocols[protocol]
				prev += prevData.totalLiquidables.protocols[protocol]
			})
		}
	} else {
		if (stackBy === 'chains') {
			Object.keys(selectedSeries)
				.filter((chain) => selectedSeries[chain])
				.forEach((chain) => {
					const _chain = PROTOCOL_NAMES_MAP_REVERSE[chain]
					if (!prevData.totalLiquidables.chains[_chain]) {
						return
					}
					current += data.totalLiquidables.chains[_chain]
					prev += prevData.totalLiquidables.chains[_chain]
				})
		} else {
			Object.keys(selectedSeries)
				.filter((protocol) => selectedSeries[protocol])
				.forEach((protocol) => {
					const _protocol = PROTOCOL_NAMES_MAP_REVERSE[protocol]
					if (!prevData.totalLiquidables.protocols[_protocol]) {
						return
					}
					current += data.totalLiquidables.protocols[_protocol]
					prev += prevData.totalLiquidables.protocols[_protocol]
				})
		}
	}

	const changesRatio = (current - prev) / prev
	return isNaN(changesRatio) ? 0 : changesRatio
}
