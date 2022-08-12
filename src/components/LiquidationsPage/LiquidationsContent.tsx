/* eslint-disable no-unused-vars*/
import React from 'react'
import { ChartData, getReadableValue } from '~/utils/liquidations'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper, PanelHiddenMobile } from '~/components'
import { LiquidationsChart } from './LiquidationsChart'
import { TotalLiquidable } from './TotalLiquidable'
import { LiquidableChanges24H } from './LiquidableChanges24H'

export const LiquidationsContent = (props: { data: ChartData; prevData: ChartData }) => {
	const { data, prevData } = props
	return (
		<ChartAndValuesWrapper>
			<BreakpointPanels>
				<BreakpointPanel>
					<TotalLiquidable {...data} />
				</BreakpointPanel>
				<PanelHiddenMobile>
					<LiquidableChanges24H data={data} prevData={prevData} />
				</PanelHiddenMobile>
				<PanelHiddenMobile>
					<h2>Within -20% of current price</h2>
					<p style={{ '--tile-text-color': '#46acb7' } as React.CSSProperties}>
						${getReadableValue(data.dangerousPositionsAmount)}
					</p>
				</PanelHiddenMobile>
			</BreakpointPanels>
			<BreakpointPanel>
				<LiquidationsChart chartData={data} uid={data.symbol} />
			</BreakpointPanel>
		</ChartAndValuesWrapper>
	)
}
