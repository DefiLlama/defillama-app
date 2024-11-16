import * as React from 'react'
import { ChartData, getReadableValue, PROTOCOL_NAMES_MAP_REVERSE } from '~/utils/liquidations'
import { useStackBy } from './utils'
import { LiquidationsContext } from '~/containers/LiquidationsPage/context'

export const TotalLiquidable = (props: ChartData) => {
	const stackBy = useStackBy()
	const { selectedSeries } = React.useContext(LiquidationsContext)

	let totalLiquidable: string
	if (!selectedSeries) {
		totalLiquidable = getReadableValue(props.totalLiquidable)
	} else {
		const _totalLiquidable = Object.entries(selectedSeries)
			.filter((x) => x[1])
			.map((x) => x[0])
			.reduce((acc, cur) => {
				return acc + props.totalLiquidables[stackBy][PROTOCOL_NAMES_MAP_REVERSE[cur]]
			}, 0)
		totalLiquidable = getReadableValue(_totalLiquidable)
	}

	return (
		<>
			<span className="text-[#545757] dark:text-[#cccccc]">Total Liquidatable (USD)</span>
			<span className="font-semibold text-2xl font-jetbrains">${totalLiquidable}</span>
		</>
	)
}
