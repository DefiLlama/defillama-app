import * as React from 'react'
import { ChartData, getReadableValue, PROTOCOL_NAMES_MAP_REVERSE } from '~/utils/liquidations'
import { useStackBy } from './utils'
import { LiquidationsContext } from '~/components/LiquidationsPage/context'
import { DownloadButtonSmol } from './DownloadButton'

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
			<h1>Total Liquidatable (USD)</h1>
			<p style={{ '--tile-text-color': '#4f8fea' } as React.CSSProperties}>${totalLiquidable}</p>
			<DownloadButtonSmol symbol={props.symbol} />
		</>
	)
}
