import * as React from 'react'
import { LiquidationsContext } from '~/containers/Liquidations/context'
import { ChartData, PROTOCOL_NAMES_MAP_REVERSE } from '~/containers/Liquidations/utils'
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
			<span className="text-(--text-label)">Liquidatable value change (24h)</span>
			<span className="font-jetbrains text-2xl font-semibold">{(liquidableChanges * 100).toFixed(1) || 0}%</span>
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
			for (const chain in data.totalLiquidables.chains) {
				if (!prevData.totalLiquidables.chains[chain]) {
					continue
				}
				current += data.totalLiquidables.chains[chain]
				prev += prevData.totalLiquidables.chains[chain]
			}
		} else {
			for (const protocol in data.totalLiquidables.protocols) {
				if (!prevData.totalLiquidables.protocols[protocol]) {
					continue
				}
				current += data.totalLiquidables.protocols[protocol]
				prev += prevData.totalLiquidables.protocols[protocol]
			}
		}
	} else {
		if (stackBy === 'chains') {
			for (const chain in selectedSeries) {
				if (!selectedSeries[chain]) continue
				const _chain = PROTOCOL_NAMES_MAP_REVERSE[chain]
				if (!prevData.totalLiquidables.chains[_chain]) {
					continue
				}
				current += data.totalLiquidables.chains[_chain]
				prev += prevData.totalLiquidables.chains[_chain]
			}
		} else {
			for (const protocol in selectedSeries) {
				if (!selectedSeries[protocol]) continue
				const _protocol = PROTOCOL_NAMES_MAP_REVERSE[protocol]
				if (!prevData.totalLiquidables.protocols[_protocol]) {
					continue
				}
				current += data.totalLiquidables.protocols[_protocol]
				prev += prevData.totalLiquidables.protocols[_protocol]
			}
		}
	}

	const changesRatio = (current - prev) / prev
	return isNaN(changesRatio) ? 0 : changesRatio
}
