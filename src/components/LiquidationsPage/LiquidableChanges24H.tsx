import React, { useContext } from 'react'
import { ChartData } from '~/utils/liquidations'
import { useStackBy } from './utils'
import { LiquidationsContext } from '~/pages/liquidations/[symbol]'

export const LiquidableChanges24H = (props: { data: ChartData; prevData: ChartData }) => {
	const stackBy = useStackBy()
	const { selectedSeries } = useContext(LiquidationsContext)
	return (
		<>
			<h2>Change (24h)</h2>
			<p style={{ '--tile-text-color': '#fd3c99' } as React.CSSProperties}>
				{/* {(props.historicalChange[24] * 100).toFixed(1) || 0}% */}
				TODO: WIP
			</p>
		</>
	)
}
